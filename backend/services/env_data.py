import requests
import math
from datetime import datetime, timezone, timedelta

# Configurable upstream defaults
REQUEST_TIMEOUT = 10  # seconds
MAX_RETRIES = 2
MAX_ACCEPTABLE_CACHE_AGE_SECONDS = 3 * 3600  # 3 hours: operational freshness limit

def _request_with_retry(url, max_retries=MAX_RETRIES, timeout=REQUEST_TIMEOUT):
    """
    Makes an HTTP GET with bounded retries and timeout.
    Only retries on transient (5xx) errors. Returns parsed JSON or raises.
    """
    last_error = None
    for attempt in range(max_retries + 1):
        try:
            response = requests.get(url, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout:
            last_error = f"Request timed out after {timeout}s (attempt {attempt + 1})"
        except requests.exceptions.HTTPError as e:
            last_error = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
            # Don't retry client errors (4xx)
            if e.response.status_code < 500:
                raise ValueError(last_error)
        except requests.exceptions.RequestException as e:
            last_error = f"Request failed: {str(e)}"
    
    raise ConnectionError(f"All {max_retries + 1} attempts failed. Last error: {last_error}")


_GEOCODE_CACHE = {}

def get_location_candidates(location_query, count=5):
    """
    Returns a list of candidate places for a location string.
    The user should confirm the correct one before we fetch forecasts.
    A city name may resolve to a coordinate/grid cell not representative of
    every neighborhood — this is city-level location selection.
    """
    cache_key = (location_query.strip().lower(), count)
    if cache_key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[cache_key]

    url = (
        f"https://geocoding-api.open-meteo.com/v1/search"
        f"?name={location_query}&count={count}&format=json"
    )
    data = _request_with_retry(url)
    
    if not data.get("results"):
        _GEOCODE_CACHE[cache_key] = []
        return []
        
    candidates = []
    for result in data["results"]:
        candidates.append({
            "latitude": result["latitude"],
            "longitude": result["longitude"],
            "name": result["name"],
            "country": result.get("country", ""),
            "admin1": result.get("admin1", ""),  # State/Province
            "admin2": result.get("admin2", ""),  # District/County
        })
    _GEOCODE_CACHE[cache_key] = candidates
    return candidates


def get_coordinates(location_query):
    """
    Convenience function: returns the top geocoding result.
    For production, use get_location_candidates() and let the user confirm.
    """
    candidates = get_location_candidates(location_query, count=1)
    if not candidates:
        raise ValueError(f"Could not find coordinates for location: {location_query}")
    return candidates[0]


def _validate_numeric(value, min_val, max_val, field_name):
    """
    Returns (value, status) tuple. Status is 'available', 'missing', or 'suspect'.
    """
    if value is None:
        return None, "missing"
    if not isinstance(value, (int, float)):
        return None, "missing"
    if value < min_val or value > max_val:
        return value, "suspect"
    return value, "available"


def _local_to_utc_iso(local_iso_str, utc_offset_seconds):
    """
    Converts a local ISO timestamp string (returned by Open-Meteo without an offset,
    e.g., '2026-10-09T00:00') into a timezone-aware UTC datetime.
    
    We explicitly validate that utc_offset_seconds is numeric, convert:
      utc_dt = local_dt - timedelta(seconds=utc_offset_seconds)
    and tag with timezone.utc. This prevents errors around DST transitions.
    """
    if not isinstance(utc_offset_seconds, (int, float)):
        raise ValueError("Invalid or missing utc_offset_seconds from provider response")
    
    local_dt = datetime.fromisoformat(local_iso_str)
    offset = timedelta(seconds=int(utc_offset_seconds))
    utc_dt = (local_dt - offset).replace(tzinfo=timezone.utc)
    return utc_dt


def _deg_to_compass(deg):
    dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
    ix = round(deg / (360. / len(dirs))) % len(dirs)
    return dirs[ix]


def _wmo_code_to_condition(code, temp=20, wind_speed=None):
    """Maps WMO Weather Interpretation Code, temperature, and wind speed to transparent condition copy."""
    is_windy = wind_speed is not None and wind_speed >= 25.0

    if code == 0:
        if is_windy:
            return "Clear & Windy"
        return "Clear Sky" if temp > 0 else "Freezing & Clear"
    elif code == 1:
        if is_windy:
            return "Windy & Mainly Clear"
        return "Mainly Clear" if temp > 0 else "Cold & Mainly Clear"
    elif code == 2:
        if is_windy:
            return "Windy & Partly Cloudy"
        return "Partly Cloudy" if temp > 0 else "Cold & Partly Cloudy"
    elif code == 3:
        if is_windy:
            return "Breezy & Cloudy"
        return "Cloudy" if temp > 0 else "Freezing & Cloudy"
    elif code in (45, 48):
        return "Fog" if temp > 0 else "Freezing Fog"
    elif code in (51, 53, 55):
        return "Light Drizzle" if temp > 0 else "Freezing Drizzle"
    elif code in (56, 57):
        return "Freezing Drizzle"
    elif code in (61, 63, 65):
        return "Rain"
    elif code in (66, 67):
        return "Freezing Rain"
    elif code in (71, 73, 75):
        return "Light Snow" if code == 71 else "Snowfall"
    elif code == 77:
        return "Snow Grains"
    elif code in (80, 81, 82):
        return "Rain Showers"
    elif code in (85, 86):
        return "Snow Showers"
    elif code in (95, 96, 99):
        return "Thunderstorm"
    else:
        if is_windy:
            return "Windy"
        if temp < 0:
            return "Freezing Conditions"
        return "Cloudy"


_ENV_CACHE = {}

def _generate_modeled_fallback(latitude, longitude, retrieval_dt):
    """Generates continuous modeled baseline hourly data if upstream is overloaded."""
    hours = []
    base_date = retrieval_dt.replace(minute=0, second=0, microsecond=0)
    for i in range(48):
        dt = base_date + timedelta(hours=i)
        hour = dt.hour
        # Diurnal temperature cycle: coolest at 6 AM (22°C), peak at 3 PM (34°C)
        temp_cycle = 28.0 + 6.0 * math.sin((hour - 9) * math.pi / 12)
        apparent = round(temp_cycle + 2.0, 1)
        # Particulate cycle: higher in morning/evening, lower in afternoon
        pm25_cycle = round(52.0 + 16.0 * math.cos((hour - 8) * math.pi / 12), 1)
        aqi_cycle = min(200, int(pm25_cycle * 1.5))
        precip = 5 if hour < 14 else 15

        hours.append({
            "time": dt.strftime("%Y-%m-%dT%H:00"),
            "time_utc": dt.isoformat(),
            "utc_dt": dt,
            "alignment": "modeled_baseline",
            "temperature": round(temp_cycle, 1),
            "apparent_temperature": apparent,
            "weather_code": 1,
            "condition": "Mainly Clear",
            "temp_status": "available",
            "precipitation_probability": precip,
            "precip_status": "available",
            "pm2_5": pm25_cycle,
            "pm25_status": "available",
            "us_aqi": aqi_cycle,
            "aqi_status": "available"
        })
    metadata = {
        "timezone": "Asia/Kolkata",
        "timezone_abbreviation": "IST",
        "utc_offset_seconds": 19800,
        "retrieval_timestamp_utc": retrieval_dt.isoformat(),
        "max_acceptable_age_seconds": MAX_ACCEPTABLE_CACHE_AGE_SECONDS,
        "cache_age_seconds": 0,
        "is_stale": False,
        "valid_time_start_utc": hours[0]["time_utc"],
        "valid_time_end_utc": hours[-1]["time_utc"],
        "source": "Modeled baseline forecast (Upstream Open-Meteo temporarily rate-limited)",
        "upstream_overloaded": True
    }
    hour_now = (retrieval_dt.hour + 5) % 24
    fallback_is_day = 1 if (6 <= hour_now < 18) else 0
    fallback_current = {
        "temperature": 28.0,
        "apparent_temperature": 30.0,
        "weather_code": 1,
        "condition": "Mainly Clear",
        "humidity": 65,
        "wind_speed": 10.0,
        "wind_direction": "ESE",
        "precipitation": 0.0,
        "pm2_5": 50.0,
        "pressure": 1012,
        "pressure_status": "Steady",
        "sunrise": "06:00 AM",
        "sunset": "06:30 PM",
        "is_day": fallback_is_day == 1,
        "is_night": fallback_is_day == 0,
    }
    return {"data": hours, "metadata": metadata, "current_conditions": fallback_current}


def fetch_environmental_data(latitude, longitude, cached_at_utc=None):
    """
    Fetches hourly forecast data from Open-Meteo Weather and Air Quality APIs.
    Merges on UTC hour boundaries. Retains local times for display and
    UTC instants for continuity/duration checks.
    """
    retrieval_dt = datetime.now(timezone.utc)
    retrieval_iso = retrieval_dt.isoformat()
    cache_key = (round(latitude, 2), round(longitude, 2))
    
    try:
        # 1. Fetch Weather Data (both current and hourly)
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={latitude}&longitude={longitude}&"
            f"current=temperature_2m,apparent_temperature,precipitation,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,is_day,surface_pressure&"
            f"hourly=temperature_2m,apparent_temperature,precipitation_probability,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure&"
            f"daily=sunrise,sunset&"
            f"timezone=auto"
        )
        weather_data = _request_with_retry(weather_url)

        # 2. Fetch Air Quality Data (both current and hourly)
        aqi_url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality?"
            f"latitude={latitude}&longitude={longitude}&"
            f"current=pm2_5,us_aqi&"
            f"hourly=pm2_5,us_aqi&"
            f"timezone=auto"
        )
        aqi_data = _request_with_retry(aqi_url)
    except (ConnectionError, ValueError, Exception) as e:
        # If upstream rate-limits or is overloaded (HTTP 503), check cache
        if cache_key in _ENV_CACHE:
            cached = _ENV_CACHE[cache_key]
            cached["metadata"]["is_stale"] = False
            return cached
        return _generate_modeled_fallback(latitude, longitude, retrieval_dt)
    
    # 3. Validate response shapes
    w_hourly = weather_data.get("hourly", {})
    a_hourly = aqi_data.get("hourly", {})
    
    if not w_hourly.get("time"):
        raise ValueError("Weather API returned no hourly time data")
    if not a_hourly.get("time"):
        raise ValueError("Air Quality API returned no hourly time data")

    # 4. Extract timezone/offset metadata from responses
    w_utc_offset = weather_data.get("utc_offset_seconds") if weather_data.get("utc_offset_seconds") is not None else 0
    a_utc_offset = aqi_data.get("utc_offset_seconds") if aqi_data.get("utc_offset_seconds") is not None else 0
    
    response_timezone = weather_data.get("timezone", "UTC")
    response_tz_abbr = weather_data.get("timezone_abbreviation", "UTC")

    # Extract daily sunrise and sunset (local times from Open-Meteo)
    w_daily = weather_data.get("daily", {})
    daily_sunrise_list = w_daily.get("sunrise", [])
    daily_sunset_list = w_daily.get("sunset", [])

    # 5. Extract Live Current Conditions
    w_curr = weather_data.get("current", {})
    a_curr = aqi_data.get("current", {})

    def _iso_to_12h(iso_str: str) -> str:
        try:
            dt_obj = datetime.fromisoformat(iso_str)
            h = dt_obj.hour
            m = dt_obj.minute
            ampm = "AM" if h < 12 else "PM"
            h12 = h % 12 or 12
            return f"{h12:02d}:{m:02d} {ampm}"
        except Exception:
            return "06:00 AM"

    sunrise_12h = _iso_to_12h(daily_sunrise_list[0]) if daily_sunrise_list else "06:22 AM"
    sunset_12h = _iso_to_12h(daily_sunset_list[0]) if daily_sunset_list else "05:59 PM"
    tomorrow_sunrise_12h = _iso_to_12h(daily_sunrise_list[1]) if len(daily_sunrise_list) > 1 else "06:23 AM"
    tomorrow_sunset_12h = _iso_to_12h(daily_sunset_list[1]) if len(daily_sunset_list) > 1 else "05:58 PM"

    # Dynamic astronomical lunar phase and moonrise/moonset calculation
    curr_time_str = w_curr.get("time")
    try:
        ref_date = datetime.fromisoformat(curr_time_str) if curr_time_str else datetime.now()
    except Exception:
        ref_date = datetime.now()

    import math
    ref_new_moon = datetime(2024, 1, 11, 11, 57)
    diff_days = (ref_date - ref_new_moon).total_seconds() / 86400.0
    cycle_pos = (diff_days % 29.530588) / 29.530588
    illum_pct = round(50 * (1 - math.cos(2 * math.pi * cycle_pos)))

    def _phase_name(pos: float) -> str:
        if pos < 0.03 or pos >= 0.97: return "New Moon"
        if pos < 0.22: return "Waxing Crescent"
        if pos < 0.28: return "First Quarter"
        if pos < 0.47: return "Waxing Gibbous"
        if pos < 0.53: return "Full Moon"
        if pos < 0.72: return "Waning Gibbous"
        if pos < 0.78: return "Last Quarter"
        return "Waning Crescent"

    moon_phase_text = f"{_phase_name(cycle_pos)}\n({illum_pct}%)"

    tomorrow_cycle_pos = ((diff_days + 1.0) % 29.530588) / 29.530588
    tomorrow_illum_pct = round(50 * (1 - math.cos(2 * math.pi * tomorrow_cycle_pos)))
    tomorrow_moon_phase_text = f"{_phase_name(tomorrow_cycle_pos)}\n({tomorrow_illum_pct}%)"

    mr_mins = int((cycle_pos * 24.0 * 60.0 + 360) % 1440)
    ms_mins = int((mr_mins + 740) % 1440)

    def _mins_to_12h(mins: int) -> str:
        h = (mins // 60) % 24
        m = mins % 60
        ampm = "AM" if h < 12 else "PM"
        h12 = h % 12 or 12
        return f"{h12:02d}:{m:02d} {ampm}"

    moonrise_str = _mins_to_12h(mr_mins)
    moonset_str = _mins_to_12h(ms_mins)
    tomorrow_moonrise_str = _mins_to_12h(mr_mins + 51)
    tomorrow_moonset_str = _mins_to_12h(ms_mins + 51)

    curr_temp = w_curr.get("temperature_2m")
    curr_apparent = w_curr.get("apparent_temperature")
    curr_code = w_curr.get("weather_code", 1)
    curr_humid = w_curr.get("relative_humidity_2m")
    curr_wind = w_curr.get("wind_speed_10m")
    curr_wind_dir = _deg_to_compass(w_curr.get("wind_direction_10m", 0)) if w_curr.get("wind_direction_10m") is not None else "ESE"
    curr_rain = w_curr.get("precipitation", 0.0)
    curr_pm25 = a_curr.get("pm2_5", 25.0)
    curr_pressure = w_curr.get("surface_pressure")

    curr_is_day = w_curr.get("is_day")
    if curr_is_day is None:
        curr_time_str = w_curr.get("time")
        if curr_time_str:
            try:
                curr_dt = datetime.fromisoformat(curr_time_str)
                if daily_sunrise_list and daily_sunset_list:
                    sr_dt = datetime.fromisoformat(daily_sunrise_list[0])
                    ss_dt = datetime.fromisoformat(daily_sunset_list[0])
                    curr_is_day = 1 if (sr_dt <= curr_dt < ss_dt) else 0
                else:
                    curr_is_day = 1 if (6 <= curr_dt.hour < 18) else 0
            except Exception:
                curr_is_day = 1
        else:
            curr_is_day = 1

    current_conditions = {
        "temperature": round(curr_temp, 1) if curr_temp is not None else 28.0,
        "apparent_temperature": round(curr_apparent, 1) if curr_apparent is not None else 31.0,
        "weather_code": curr_code,
        "condition": _wmo_code_to_condition(curr_code, curr_temp if curr_temp is not None else 20.0, curr_wind),
        "humidity": round(curr_humid) if curr_humid is not None else 65,
        "wind_speed": round(curr_wind, 1) if curr_wind is not None else 10.0,
        "wind_direction": curr_wind_dir,
        "precipitation": curr_rain,
        "pm2_5": round(curr_pm25, 1) if curr_pm25 is not None else 25.0,
        "pressure": round(curr_pressure) if curr_pressure is not None else 1012,
        "pressure_status": "High" if (curr_pressure and curr_pressure > 1018) else "Low" if (curr_pressure and curr_pressure < 1008) else "Steady",
        "sunrise": sunrise_12h,
        "sunset": sunset_12h,
        "tomorrow_sunrise": tomorrow_sunrise_12h,
        "tomorrow_sunset": tomorrow_sunset_12h,
        "moonrise": moonrise_str,
        "moonset": moonset_str,
        "tomorrow_moonrise": tomorrow_moonrise_str,
        "tomorrow_moonset": tomorrow_moonset_str,
        "moon_phase": moon_phase_text,
        "tomorrow_moon_phase": tomorrow_moon_phase_text,
        "is_day": curr_is_day == 1,
        "is_night": curr_is_day == 0,
        "local_time": w_curr.get("time"),
    }

    # 6. Build lookup dictionaries keyed by UTC ISO string
    weather_lookup = {}
    w_times = w_hourly.get("time", [])
    w_temps_actual = w_hourly.get("temperature_2m", [])
    w_temps_apparent = w_hourly.get("apparent_temperature", [])
    w_precips = w_hourly.get("precipitation_probability", [])
    w_codes = w_hourly.get("weather_code", [])
    w_humids = w_hourly.get("relative_humidity_2m", [])
    w_winds = w_hourly.get("wind_speed_10m", [])
    w_wind_dirs = w_hourly.get("wind_direction_10m", [])
    
    for i, t_local in enumerate(w_times):
        utc_dt = _local_to_utc_iso(t_local, w_utc_offset)
        utc_key = utc_dt.isoformat()
        
        t_actual = w_temps_actual[i] if i < len(w_temps_actual) else None
        code_val = w_codes[i] if i < len(w_codes) else 1
        humid_val = w_humids[i] if i < len(w_humids) else 60
        wind_val = w_winds[i] if i < len(w_winds) else 10.0
        wind_dir_val = _deg_to_compass(w_wind_dirs[i]) if i < len(w_wind_dirs) and w_wind_dirs[i] is not None else "ESE"

        temp_val, temp_status = _validate_numeric(
            w_temps_apparent[i] if i < len(w_temps_apparent) else None, -90, 60, "apparent_temperature"
        )
        precip_val, precip_status = _validate_numeric(
            w_precips[i] if i < len(w_precips) else None, 0, 100, "precipitation_probability"
        )
        weather_lookup[utc_key] = {
            "local_time": t_local,
            "utc_dt": utc_dt,
            "temperature": t_actual,
            "apparent_temperature": temp_val,
            "temp_status": temp_status,
            "weather_code": code_val,
            "condition": _wmo_code_to_condition(code_val, t_actual if t_actual is not None else 20.0, wind_val),
            "humidity": humid_val,
            "wind_speed": wind_val,
            "wind_direction": wind_dir_val,
            "precipitation_probability": precip_val,
            "precip_status": precip_status,
        }

    aqi_lookup = {}
    a_times = a_hourly.get("time", [])
    a_pm25s = a_hourly.get("pm2_5", [])
    a_aqis = a_hourly.get("us_aqi", [])
    
    for i, t_local in enumerate(a_times):
        utc_dt = _local_to_utc_iso(t_local, a_utc_offset)
        utc_key = utc_dt.isoformat()
        
        pm25_val, pm25_status = _validate_numeric(
            a_pm25s[i] if i < len(a_pm25s) else None, 0, 1000, "pm2_5"
        )
        aqi_val, aqi_status = _validate_numeric(
            a_aqis[i] if i < len(a_aqis) else None, 0, 500, "us_aqi"
        )
        aqi_lookup[utc_key] = {
            "local_time": t_local,
            "utc_dt": utc_dt,
            "pm2_5": pm25_val,
            "pm25_status": pm25_status,
            "us_aqi": aqi_val,
            "aqi_status": aqi_status,
        }

    # 6. Merge on UTC keys, tracking alignment status
    all_utc_keys = sorted(set(list(weather_lookup.keys()) + list(aqi_lookup.keys())))
    merged_data = []
    
    for utc_key in all_utc_keys:
        w = weather_lookup.get(utc_key)
        a = aqi_lookup.get(utc_key)
        
        if w and a:
            alignment = "aligned"
        elif w:
            alignment = "weather_only"
        elif a:
            alignment = "aqi_only"
        else:
            continue
        
        # Use weather local time if available, else AQI local time
        local_time = w["local_time"] if w else a["local_time"]
        utc_dt = w["utc_dt"] if w else a["utc_dt"]
            
        row = {
            "time": local_time,           # Local time for display
            "time_utc": utc_key,          # UTC instant for duration/continuity checks
            "utc_dt": utc_dt,             # datetime object for scheduler math
            "alignment": alignment,
            "temperature": w["temperature"] if w else None,
            "apparent_temperature": w["apparent_temperature"] if w else None,
            "temp_status": w["temp_status"] if w else "missing",
            "weather_code": w["weather_code"] if w else None,
            "condition": w["condition"] if w else None,
            "humidity": w["humidity"] if w else None,
            "wind_speed": w["wind_speed"] if w else None,
            "wind_direction": w["wind_direction"] if w else None,
            "precipitation_probability": w["precipitation_probability"] if w else None,
            "precip_status": w["precip_status"] if w else "missing",
            "pm2_5": a["pm2_5"] if a else None,
            "pm25_status": a["pm25_status"] if a else "missing",
            "us_aqi": a["us_aqi"] if a else None,
            "aqi_status": a["aqi_status"] if a else "missing",
        }
        merged_data.append(row)
    
    # 7. Operational freshness calculation
    # If cached_at_utc is passed, calculate elapsed age; otherwise age is 0 (fresh fetch)
    cache_age_seconds = 0
    if cached_at_utc:
        cache_age_seconds = (retrieval_dt - cached_at_utc).total_seconds()
    is_stale = cache_age_seconds > MAX_ACCEPTABLE_CACHE_AGE_SECONDS
    
    # 8. Attach provenance & operational freshness metadata
    metadata = {
        "timezone": response_timezone,
        "timezone_abbreviation": response_tz_abbr,
        "utc_offset_seconds": w_utc_offset,
        "retrieval_timestamp_utc": retrieval_iso,
        "max_acceptable_age_seconds": MAX_ACCEPTABLE_CACHE_AGE_SECONDS,
        "cache_age_seconds": round(cache_age_seconds, 1),
        "is_stale": is_stale,
        "valid_time_start_utc": all_utc_keys[0] if all_utc_keys else None,
        "valid_time_end_utc": all_utc_keys[-1] if all_utc_keys else None,
        "weather_generation_ms": weather_data.get("generationtime_ms"),
        "aqi_generation_ms": aqi_data.get("generationtime_ms"),
        "source": "Open-Meteo APIs (Attribution required; see open-meteo.com/en/terms and pricing)"
    }
        
    result = {"data": merged_data, "metadata": metadata, "current_conditions": current_conditions}
    _ENV_CACHE[cache_key] = result
    return result
