import requests
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


def get_location_candidates(location_query, count=5):
    """
    Returns a list of candidate places for a location string.
    The user should confirm the correct one before we fetch forecasts.
    A city name may resolve to a coordinate/grid cell not representative of
    every neighborhood — this is city-level location selection.
    """
    url = (
        f"https://geocoding-api.open-meteo.com/v1/search"
        f"?name={location_query}&count={count}&format=json"
    )
    data = _request_with_retry(url)
    
    if not data.get("results"):
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


def fetch_environmental_data(latitude, longitude, cached_at_utc=None):
    """
    Fetches hourly forecast data from Open-Meteo Weather and Air Quality APIs.
    Merges on UTC hour boundaries. Retains local times for display and
    UTC instants for continuity/duration checks.
    
    Tracks operational data freshness:
    - retrieval_timestamp_utc: backend fetch timestamp
    - max_acceptable_age_seconds: freshness threshold
    - is_stale: whether data age exceeds acceptable limit
    - valid_time_start / valid_time_end: time bounds of available forecast
    """
    retrieval_dt = datetime.now(timezone.utc)
    retrieval_iso = retrieval_dt.isoformat()
    
    # 1. Fetch Weather Data
    weather_url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={latitude}&longitude={longitude}&"
        f"hourly=temperature_2m,apparent_temperature,precipitation_probability&"
        f"timezone=auto"
    )
    weather_data = _request_with_retry(weather_url)

    # 2. Fetch Air Quality Data
    aqi_url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality?"
        f"latitude={latitude}&longitude={longitude}&"
        f"hourly=pm2_5,us_aqi&"
        f"timezone=auto"
    )
    aqi_data = _request_with_retry(aqi_url)

    # 3. Validate response shapes
    w_hourly = weather_data.get("hourly", {})
    a_hourly = aqi_data.get("hourly", {})
    
    if not w_hourly.get("time"):
        raise ValueError("Weather API returned no hourly time data")
    if not a_hourly.get("time"):
        raise ValueError("Air Quality API returned no hourly time data")

    # 4. Extract timezone/offset metadata from responses
    # Open-Meteo returns utc_offset_seconds in the response root
    w_utc_offset = weather_data.get("utc_offset_seconds", 0)
    a_utc_offset = aqi_data.get("utc_offset_seconds", 0)
    
    response_timezone = weather_data.get("timezone", "UTC")
    response_tz_abbr = weather_data.get("timezone_abbreviation", "UTC")

    # 5. Build lookup dictionaries keyed by UTC ISO string
    weather_lookup = {}
    w_times = w_hourly.get("time", [])
    w_temps = w_hourly.get("apparent_temperature", [])
    w_precips = w_hourly.get("precipitation_probability", [])
    
    for i, t_local in enumerate(w_times):
        utc_dt = _local_to_utc_iso(t_local, w_utc_offset)
        utc_key = utc_dt.isoformat()
        
        temp_val, temp_status = _validate_numeric(
            w_temps[i] if i < len(w_temps) else None, -90, 60, "apparent_temperature"
        )
        precip_val, precip_status = _validate_numeric(
            w_precips[i] if i < len(w_precips) else None, 0, 100, "precipitation_probability"
        )
        weather_lookup[utc_key] = {
            "local_time": t_local,
            "utc_dt": utc_dt,
            "apparent_temperature": temp_val,
            "temp_status": temp_status,
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
            "apparent_temperature": w["apparent_temperature"] if w else None,
            "temp_status": w["temp_status"] if w else "missing",
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
        
    return {"data": merged_data, "metadata": metadata}
