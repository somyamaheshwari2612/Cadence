import math
from datetime import datetime, timedelta

try:
    from services.cpcb_naqi import calculate_pm25_subindex, get_cpcb_category
except ImportError:
    try:
        from backend.services.cpcb_naqi import calculate_pm25_subindex, get_cpcb_category
    except ImportError:
        def calculate_pm25_subindex(pm25):
            if pm25 is None: return None
            if pm25 <= 30: return round((50.0 / 30.0) * pm25)
            elif pm25 <= 60: return round(50.0 + ((50.0 / 30.0) * (pm25 - 30.0)))
            elif pm25 <= 90: return round(100.0 + ((100.0 / 30.0) * (pm25 - 60.0)))
            elif pm25 <= 120: return round(200.0 + ((100.0 / 30.0) * (pm25 - 90.0)))
            elif pm25 <= 250: return round(300.0 + ((100.0 / 130.0) * (pm25 - 120.0)))
            else: return round(min(500.0, 400.0 + ((100.0 / 150.0) * (pm25 - 250.0))))
        def get_cpcb_category(val):
            if val is None: return {"category": "Unavailable", "color": "gray", "advisory": "Data unavailable"}
            v = round(val)
            if v <= 50: return {"category": "Good", "color": "emerald", "advisory": "Lowest category on the CPCB scale."}
            elif v <= 100: return {"category": "Satisfactory", "color": "lime", "advisory": "Generally acceptable; sensitive people may notice minor breathing discomfort."}
            elif v <= 200: return {"category": "Moderate", "color": "yellow", "advisory": "Sensitive groups may experience breathing discomfort; reduce prolonged outdoor exertion if that applies."}
            elif v <= 300: return {"category": "Poor", "color": "orange", "advisory": "Prolonged outdoor exposure may be uncomfortable for many people; surface an indoor/shorter/lower-intensity option."}
            elif v <= 400: return {"category": "Very Poor", "color": "red", "advisory": "Elevated concern for prolonged exposure; prominently show postponing/indoor alternatives."}
            else: return {"category": "Severe", "color": "rose", "advisory": "Highest CPCB category; prominently surface official local guidance and indoor/postpone choices."}

# Standard outcome types and labels
OUTCOME_PREFERENCE_QUALIFIED = "preference_qualified"
OUTCOME_BEST_ALTERNATIVE = "best_available_alternative"

LABEL_PREFERENCE_QUALIFIED = "Meets your preferences"
LABEL_BEST_ALTERNATIVE = "OUTSIDE YOUR PREFERENCES"

MSG_UNABLE_TO_COMPARE = "UNABLE TO COMPARE TIME SLOTS"
MSG_NO_SLOTS_MEET_PREFERENCES = "NO SLOT MEETS YOUR PREFERENCES TODAY"
MODEL_CAVEAT = "Forecasts are uncertain; this is not a safety or medical recommendation."

# Official Guidance Resources: Central Pollution Control Board (CPCB) and IMD
OFFICIAL_GUIDANCE = {
    "india_primary": {
        "agency": "Central Pollution Control Board (CPCB)",
        "url": "https://www.cpcb.nic.in/aqi_bulletin.php",
        "indicator_label": "CPCB PM indicator (forecast estimate)",
        "indicator_note": "Based on modeled PM2.5 concentrations; not an official CPCB station AQI."
    },
    "heat_guidance": {
        "agency": "India Meteorological Department (IMD) / NDMA",
        "url": "https://ndma.gov.in/Natural-Hazards/Heat-Wave",
        "advisory": "Advises avoiding direct sun and strenuous activity during 12 PM–3 PM in heat conditions."
    },
    "disclaimer": (
        "For individuals with pre-existing respiratory (e.g., asthma, COPD) or cardiovascular "
        "conditions, or for strenuous outdoor tasks, an opt-in fallback to outdoor activity during "
        "elevated pollution or heat is not assessed as safe. The application provides general informational "
        "options only and does not make personalized clinical or medical determinations. Consult official local "
        "guidance (e.g., CPCB bulletins or state pollution control boards) and your healthcare provider."
    )
}

# General exposure-reduction options (Informational only — NOT personalized medical advice)
GENERAL_EXPOSURE_REDUCTION_OPTIONS = [
    {
        "action": "indoor_alternative",
        "title": "Move indoors",
        "description": "General option: Moving the activity to an enclosed indoor environment with filtration can reduce ambient outdoor particulate exposure."
    },
    {
        "action": "postpone",
        "title": "Postpone",
        "description": "General option: Rescheduling the task to a later forecast cycle may allow waiting for more favorable meteorological dispersion."
    },
    {
        "action": "shorten_duration",
        "title": "Shorten duration",
        "description": "General option: Reducing total time spent outdoors lowers cumulative exposure to ambient air."
    },
    {
        "action": "reduce_exertion",
        "title": "Reduce exertion",
        "description": "General option: Lowering activity intensity reduces ventilation rate (volume of air inhaled per minute), thereby reducing inhaled particulate dose."
    }
]


def format_time_12h(dt):
    """Formats datetime to 12-hour format e.g. '6:00 AM' or '6:45 PM'."""
    hour = dt.hour
    minute = dt.minute
    ampm = "AM" if hour < 12 else "PM"
    h12 = hour % 12
    if h12 == 0:
        h12 = 12
    if minute == 0:
        return f"{h12}:00 {ampm}"
    return f"{h12}:{minute:02d} {ampm}"


def format_window_label(start_dt, end_dt, first_dt):
    """
    Formats the start and end datetime into the user-specified style:
    e.g. 'Today · 6:00–6:45 PM' or 'Tomorrow · 7:00–8:00 AM'
    """
    start_str = format_time_12h(start_dt)
    end_str = format_time_12h(end_dt)
    s_parts = start_str.split(" ")
    e_parts = end_str.split(" ")
    
    if s_parts[1] == e_parts[1]:
        time_span = f"{s_parts[0]}–{e_parts[0]} {e_parts[1]}"
    else:
        time_span = f"{start_str}–{end_str}"
        
    start_date = start_dt.date()
    first_date = first_dt.date()
    
    if start_date == first_date:
        day_prefix = "Today"
    elif start_date == first_date + timedelta(days=1):
        day_prefix = "Tomorrow"
    else:
        day_prefix = start_dt.strftime("%d %b")
        
    return f"{day_prefix} · {time_span}"


def format_duration_desc(duration_minutes):
    """Returns a clean user-facing duration label e.g. '45-minute', '1-hour', '2-hour'."""
    if duration_minutes < 60:
        return f"{duration_minutes}-minute"
    elif duration_minutes % 60 == 0:
        hours = duration_minutes // 60
        return f"{hours}-hour"
    else:
        return f"{duration_minutes}-minute"


# IndiaAware Activity Defaults (IndiaAware.md)
INDIA_ACTIVITY_DEFAULTS = {
    "walk": {
        "name": "Walk",
        "duration_minutes": 45,
        "max_pm25": 60.0,
        "max_temp": 35.0,
        "max_rain": 30.0,
        "rain_ok": True,
        "label": "Easy walk / errand"
    },
    "run": {
        "name": "Run",
        "duration_minutes": 45,
        "max_pm25": 45.0,
        "max_temp": 32.0,
        "max_rain": 20.0,
        "rain_ok": True,
        "label": "Outdoor workout / Run"
    },
    "cycling": {
        "name": "Cycling",
        "duration_minutes": 60,
        "max_pm25": 40.0,
        "max_temp": 30.0,
        "max_rain": 20.0,
        "rain_ok": True,
        "label": "Long run / cycling"
    },
    "commute": {
        "name": "Commute",
        "duration_minutes": 45,
        "max_pm25": 90.0,
        "max_temp": 39.0,
        "max_rain": 50.0,
        "rain_ok": True,
        "label": "Commute"
    },
    "custom": {
        "name": "Custom outdoor task",
        "duration_minutes": 45,
        "max_pm25": 90.0,
        "max_temp": 37.0,
        "max_rain": 40.0,
        "rain_ok": True,
        "label": "Flexible outdoor chore"
    }
}


def get_india_heat_tier(apparent_temp):
    """
    Categorizes apparent temperature according to IndiaAware.md UX tiers:
    - Below 28°C: Cooler conditions (no heat penalty)
    - 28–32°C: Warm (suitable for many activities; hydration reminder)
    - 32–36°C: Hot (rank lower for outdoor exercise)
    - 36–40°C: Very hot (strongly deprioritize strenuous tasks)
    - Above 40°C: Extreme heat conditions (prominent high heat notice)
    """
    if apparent_temp is None:
        return {"tier": "unknown", "label": "Normal", "penalty": 0.0, "advisory": None}
    
    t = float(apparent_temp)
    if t < 28.0:
        return {"tier": "cooler", "label": "Cooler conditions", "penalty": 0.0, "advisory": "Comfortable temperature profile."}
    elif t <= 32.0:
        return {"tier": "warm", "label": "Warm", "penalty": 2.0, "advisory": "Warm; hydration reminder for longer tasks."}
    elif t <= 36.0:
        return {"tier": "hot", "label": "Hot", "penalty": 8.0, "advisory": "Hot; ranked lower for outdoor exertion."}
    elif t <= 40.0:
        return {"tier": "very_hot", "label": "Very hot", "penalty": 18.0, "advisory": "Very hot; deprioritizing strenuous outdoor activity."}
    else:
        return {"tier": "extreme_heat", "label": "Extreme heat conditions", "penalty": 35.0, "advisory": "Extreme heat conditions; high heat advisory in effect."}


def experimental_product_score(temp, pm25, rain_prob=0, hour_of_day=None, is_strenuous=False):
    """
    India-Aware Product Ranking Score (IndiaAware.md):
    - Primary air metric: PM2.5 (µg/m³) scaled with weight 1.2
    - Apparent temperature: compared to 24°C comfortable baseline with weight 1.5
    - Rain probability: soft penalty with weight 0.3
    - Time-of-day rule: Soft midday penalty (12 PM–3 PM) for outdoor exercise during warm conditions (IMD/NDMA guidance).
    """
    if temp is None or pm25 is None:
        return 999.0
    temp_component = abs(temp - 24.0) * 1.5
    pm25_component = pm25 * 1.2
    rain_component = (rain_prob or 0) * 0.3
    
    midday_penalty = 0.0
    if hour_of_day is not None and 12 <= hour_of_day < 15 and temp > 28.0 and is_strenuous:
        midday_penalty = 8.0
        
    return round(temp_component + pm25_component + rain_component + midday_penalty, 2)


def is_slot_inside_availability(slot_start_dt, duration_minutes, avail_start_m, avail_end_m):
    """
    Checks if a candidate slot strictly fits inside the user's availability window.
    avail_start_m and avail_end_m are minute offsets from midnight (0 to 1440).
    """
    start_m = slot_start_dt.hour * 60 + slot_start_dt.minute
    end_m = start_m + duration_minutes

    if avail_start_m <= avail_end_m:
        # Standard daytime window within same day (e.g., 4:00 AM to 7:30 AM -> 240 to 450)
        # Block must start on or after start_m and end on or before end_m without crossing midnight
        return (start_m >= avail_start_m) and (end_m <= avail_end_m)
    else:
        # Window spans overnight past midnight (e.g., 10:00 PM to 6:00 AM -> 1320 to 360)
        if start_m >= avail_start_m and end_m <= 1440:
            return True
        if start_m < avail_end_m and end_m <= avail_end_m:
            return True
        if start_m >= avail_start_m and end_m > 1440 and (end_m - 1440) <= avail_end_m:
            return True
        return False


def find_optimal_schedule(
    env_data_result,
    duration_hours=1,
    max_temp=45.0,
    max_pm25=None,
    rain_ok=False,
    rain_threshold=20,
    enable_fallback=False,
    max_aqi=None,
    duration_minutes=None,
    availability_start_hour=6,
    availability_end_hour=21,
    availability_start_minutes=None,
    availability_end_minutes=None,
    task_name="Walk",
    **kwargs
):
    """
    Evaluates forecast slots with:
    1. Data-quality exclusions (missing values, temporal discontinuities, stale data).
    2. Exact duration in minutes (15, 30, 45, 60, 120, etc.) spanning continuous hourly periods.
    3. User availability window filtering (e.g. 6:00 AM - 9:00 PM or custom minutes).
    4. Deterministic explainability bullets ("Why this window?" / "Why this alternative?").
    5. Complete 24-hour hourly decision timeline payload for the evidence track.
    6. Strict adherence to user-specified copy and outcome states.
    """
    if max_pm25 is None and max_aqi is None:
        max_pm25 = 60.0

    # Resolve duration_minutes from duration_hours or explicit duration_minutes
    if duration_minutes is None:
        duration_minutes = int(float(duration_hours) * 60)
    duration_minutes = max(15, min(720, int(duration_minutes)))

    # Parse availability bounds into minutes from midnight (0 to 1440)
    if availability_start_minutes is not None:
        try:
            avail_start_m = int(float(availability_start_minutes))
        except (ValueError, TypeError):
            avail_start_m = int(float(availability_start_hour) * 60)
    else:
        avail_start_m = int(float(availability_start_hour) * 60)

    if availability_end_minutes is not None:
        try:
            avail_end_m = int(float(availability_end_minutes))
        except (ValueError, TypeError):
            avail_end_m = int(float(availability_end_hour) * 60)
    else:
        avail_end_m = int(float(availability_end_hour) * 60)
    
    # Hours required to span this continuous block
    continuous_hours = max(1, math.ceil(duration_minutes / 60))
    duration_desc = format_duration_desc(duration_minutes)

    env_data = env_data_result.get("data", [])
    metadata = env_data_result.get("metadata", {})
    
    # -----------------------------------------------------------------
    # Step 1: Data-Quality Exclusions (Physical & Data Feasibility)
    # -----------------------------------------------------------------
    if not env_data or len(env_data) < continuous_hours:
        return {
            "status": "unable_to_compare",
            "message": MSG_UNABLE_TO_COMPARE,
            "reason": "Forecast data are incomplete or unavailable for the requested duration. Try again later or choose a different time window.",
            "data_quality_exclusions": ["insufficient_records_for_duration"],
            "metadata": metadata
        }
    
    if metadata.get("is_stale", False):
        return {
            "status": "unable_to_compare",
            "message": MSG_UNABLE_TO_COMPARE,
            "reason": "Forecast data are incomplete or unavailable for the requested duration. Try again later or choose a different time window.",
            "data_quality_exclusions": ["stale_forecast_data"],
            "metadata": metadata
        }

    retrieval_iso = metadata.get("retrieval_timestamp_utc")
    retrieval_dt = datetime.fromisoformat(retrieval_iso) if retrieval_iso else datetime.now(timezone.utc)
    
    # Locate current hour index so the schedule and timeline reflect the next 24 hours from NOW
    start_idx = 0
    for idx, s in enumerate(env_data):
        utc_dt = s.get("utc_dt")
        if utc_dt and utc_dt >= (retrieval_dt - timedelta(minutes=45)):
            start_idx = idx
            break

    first_slot_dt = datetime.fromisoformat(env_data[start_idx]["time"]) if start_idx < len(env_data) else datetime.fromisoformat(env_data[0]["time"])
    
    # -----------------------------------------------------------------
    # Step 2: Form Candidate Continuous Blocks within Availability Window
    # -----------------------------------------------------------------
    # Limit evaluation to next 24-36 hours from current time
    max_eval_range = min(len(env_data) - continuous_hours + 1, start_idx + 36)
    
    candidate_blocks = []
    data_quality_rejected_count = 0
    
    for i in range(start_idx, max_eval_range):
        block_slots = env_data[i:i + continuous_hours]
        
        # Check temporal continuity
        is_contiguous = True
        for j in range(len(block_slots) - 1):
            utc_1 = block_slots[j].get("utc_dt")
            utc_2 = block_slots[j + 1].get("utc_dt")
            if not utc_1 or not utc_2 or (utc_2 - utc_1).total_seconds() != 3600:
                is_contiguous = False
                break
        
        if not is_contiguous:
            data_quality_rejected_count += 1
            continue
            
        # Data-quality check: missing apparent temperature or PM2.5/AQI
        has_missing_data = False
        for s in block_slots:
            if s.get("temp_status") == "missing" or s.get("apparent_temperature") is None:
                has_missing_data = True
                break
            if (s.get("pm25_status") == "missing" or s.get("pm2_5") is None) and (s.get("aqi_status") == "missing" or s.get("us_aqi") is None):
                has_missing_data = True
                break
        
        if has_missing_data:
            data_quality_rejected_count += 1
            continue
            
        slot_start_dt = datetime.fromisoformat(block_slots[0]["time"])
        slot_end_dt = slot_start_dt + timedelta(minutes=duration_minutes)
        
        # Check if strictly inside user's available window using minute offsets
        is_inside_availability = is_slot_inside_availability(
            slot_start_dt, duration_minutes, avail_start_m, avail_end_m
        )
        
        # Extract hourly values
        hourly_temps = [s["apparent_temperature"] for s in block_slots]
        hourly_aqis = [(s.get("us_aqi") or 0) for s in block_slots]
        hourly_precips = [(s.get("precipitation_probability") or 0) for s in block_slots]
        hourly_pm25s = [(s.get("pm2_5") or 0) for s in block_slots]
        
        mean_temp = round(sum(hourly_temps) / len(hourly_temps), 1)
        mean_us_aqi = round(sum(hourly_aqis) / len(hourly_aqis), 1)
        max_us_aqi = max(hourly_aqis)
        mean_pm25 = round(sum(hourly_pm25s) / len(hourly_pm25s), 1)
        max_pm25_val = max(hourly_pm25s)
        max_block_precip = max(hourly_precips)
        
        is_strenuous = task_name.lower() in ["run", "cycling", "workout", "outdoor workout"]
        block_scores = []
        for s in block_slots:
            dt_s = datetime.fromisoformat(s["time"])
            block_scores.append(experimental_product_score(
                s.get("apparent_temperature"),
                s.get("pm2_5"),
                s.get("precipitation_probability") or 0,
                dt_s.hour,
                is_strenuous
            ))
        score = round(sum(block_scores) / len(block_scores), 2)
        
        display_window = format_window_label(slot_start_dt, slot_end_dt, first_slot_dt)
        
        # -------------------------------------------------------------
        # Step 3: Preference Filtering (Separated from Data-Quality)
        # -------------------------------------------------------------
        cpcb_subindex = calculate_pm25_subindex(mean_pm25)
        cpcb_info = get_cpcb_category(cpcb_subindex)
        heat_tier = get_india_heat_tier(mean_temp)

        preference_violations = []
        exceeded_limits = []

        if mean_temp > max_temp:
            diff_t = round(mean_temp - max_temp, 1)
            preference_violations.append({
                "filter": "max_temp",
                "label": "Apparent temperature",
                "limit": max_temp,
                "summary_type": "mean",
                "forecast_value": mean_temp,
                "unit": "°C",
                "excess": diff_t,
                "description": f"Forecast: {mean_temp}°C · Your preference: {max_temp}°C"
            })
            exceeded_limits.append({
                "metric": "apparent_temperature_c",
                "label": "Apparent temperature",
                "forecast_value": mean_temp,
                "user_preference": max_temp,
                "difference": diff_t,
                "unit": "°C",
                "message": "Feels-like temperature is above your selected preference."
            })

        if max_pm25 is not None and mean_pm25 > max_pm25:
            diff_p = round(mean_pm25 - max_pm25, 1)
            preference_violations.append({
                "filter": "max_pm25",
                "label": "PM2.5",
                "limit": max_pm25,
                "summary_type": "mean",
                "forecast_value": mean_pm25,
                "unit": "µg/m³",
                "excess": diff_p,
                "description": f"Forecast: {mean_pm25} µg/m³ · Your preference: {max_pm25} µg/m³"
            })
            exceeded_limits.append({
                "metric": "pm2_5_ug_m3",
                "label": "PM2.5",
                "forecast_value": mean_pm25,
                "user_preference": max_pm25,
                "difference": diff_p,
                "unit": "µg/m³",
                "message": "Forecast PM2.5 is above your selected preference."
            })

        if max_aqi is not None and mean_us_aqi > max_aqi:
            preference_violations.append({
                "filter": "max_aqi",
                "label": "U.S. AQI",
                "limit": max_aqi,
                "summary_type": "mean",
                "forecast_value": mean_us_aqi,
                "unit": "",
                "excess": round(mean_us_aqi - max_aqi, 1),
                "description": f"Forecast: {mean_us_aqi} · Your preference: {max_aqi}"
            })

        if not rain_ok and max_block_precip > rain_threshold:
            diff_r = round(max_block_precip - rain_threshold, 1)
            preference_violations.append({
                "filter": "rain_threshold",
                "label": "Rain probability",
                "limit": rain_threshold,
                "summary_type": "max",
                "forecast_value": max_block_precip,
                "unit": "%",
                "excess": diff_r,
                "description": f"Forecast: {max_block_precip}% · Your preference: {rain_threshold}%"
            })
            exceeded_limits.append({
                "metric": "rain_probability_pct",
                "label": "Rain probability",
                "forecast_value": max_block_precip,
                "user_preference": rain_threshold,
                "difference": diff_r,
                "unit": "%",
                "message": "Rain probability is above your selected preference."
            })
        
        # Candidate must also be inside availability window to qualify
        meets_all_preferences = (len(preference_violations) == 0) and is_inside_availability
        
        clean_hourly_slots = []
        for s in block_slots:
            clean_hourly_slots.append({
                "time": s["time"],
                "time_utc": s.get("time_utc"),
                "apparent_temperature": s.get("apparent_temperature"),
                "forecast_us_aqi": s.get("us_aqi"),
                "pm2_5_ug_m3": s.get("pm2_5"),
                "precipitation_probability": s.get("precipitation_probability")
            })
            
        block_info = {
            "start_time": block_slots[0]["time"],
            "end_time": block_slots[-1]["time"],
            "start_time_formatted": format_time_12h(slot_start_dt),
            "end_time_formatted": format_time_12h(slot_end_dt),
            "display_window": display_window,
            "day_label": "Today" if slot_start_dt.date() == first_slot_dt.date() else ("Tomorrow" if slot_start_dt.date() == first_slot_dt.date() + timedelta(days=1) else slot_start_dt.strftime("%a")),
            "start_time_utc": block_slots[0]["time_utc"],
            "end_time_utc": (block_slots[-1]["utc_dt"] + timedelta(hours=1)).isoformat(),
            "duration_minutes": duration_minutes,
            "duration_hours": continuous_hours,
            "duration_desc": duration_desc,
            "mean_apparent_temperature": mean_temp,
            "mean_forecast_us_aqi": mean_us_aqi,
            "max_forecast_us_aqi": max_us_aqi,
            "mean_pm25": mean_pm25,
            "max_precipitation_probability": max_block_precip,
            "experimental_product_score": score,
            "is_inside_availability": is_inside_availability,
            "meets_preferences": meets_all_preferences,
            "preference_violations": preference_violations,
            "exceeded_limits": exceeded_limits,
            "cpcb_pm_indicator": cpcb_subindex,
            "cpcb_category": cpcb_info["category"],
            "cpcb_plain_language": cpcb_info.get("plain_language", cpcb_info["advisory"]),
            "heat_tier": heat_tier["tier"],
            "heat_label": heat_tier["label"],
            "heat_advisory": heat_tier["advisory"],
            "exclusion_reasons": [v["description"] for v in preference_violations],
            "hourly_forecast_breakdown": clean_hourly_slots,
            "start_hour_index": i,
            "end_hour_index": i + continuous_hours
        }
        candidate_blocks.append(block_info)
    
    if not candidate_blocks:
        return {
            "status": "unable_to_compare",
            "message": MSG_UNABLE_TO_COMPARE,
            "reason": "Forecast data are incomplete or unavailable for the requested duration. Try again later or choose a different time window.",
            "data_quality_rejected_count": data_quality_rejected_count,
            "metadata": metadata
        }
    
    # -----------------------------------------------------------------
    # Step 4: Decision Timeline Construction (Next 24 Hours from Current Time)
    # -----------------------------------------------------------------
    timeline_end_idx = min(len(env_data), start_idx + 24)
    decision_timeline = []
    current_conditions = env_data_result.get("current_conditions", {})
    
    for idx in range(start_idx, timeline_end_idx):
        s = env_data[idx]
        dt = datetime.fromisoformat(s["time"])
        hour_start_m = dt.hour * 60 + dt.minute
        hour_end_m = hour_start_m + 60
        if avail_start_m <= avail_end_m:
            in_avail = (hour_start_m >= avail_start_m and hour_end_m <= avail_end_m)
        else:
            in_avail = (hour_start_m >= avail_start_m or hour_end_m <= avail_end_m)
        
        temp_val = s.get("apparent_temperature")
        t_actual = s.get("temperature")
        pm25_val = s.get("pm2_5")
        precip_val = s.get("precipitation_probability") or 0
        
        # Check if individual hour qualifies on temperature, pm2.5 and rain
        hr_qualifies = True
        if temp_val is not None and temp_val > max_temp:
            hr_qualifies = False
        if pm25_val is not None and max_pm25 is not None and pm25_val > max_pm25:
            hr_qualifies = False
        if not rain_ok and precip_val > rain_threshold:
            hr_qualifies = False
            
        data_st = "available"
        if s.get("temp_status") == "missing" or s.get("apparent_temperature") is None:
            data_st = "missing"
        elif s.get("temp_status") == "suspect" or s.get("pm25_status") == "suspect":
            data_st = "suspect"
            
        cpcb_hr = calculate_pm25_subindex(pm25_val)
        cpcb_hr_info = get_cpcb_category(cpcb_hr)
        heat_hr = get_india_heat_tier(temp_val)
        score_hr = experimental_product_score(temp_val, pm25_val, precip_val, dt.hour, is_strenuous)
        
        decision_timeline.append({
            "hour_index": idx - start_idx,
            "time": s["time"],
            "hour_label": dt.strftime("%I %p").lstrip("0"),  # e.g. "6 AM"
            "full_time_label": format_time_12h(dt),
            "temperature": t_actual,
            "apparent_temperature": temp_val,
            "weather_code": s.get("weather_code"),
            "condition": s.get("condition"),
            "humidity": s.get("humidity"),
            "wind_speed": s.get("wind_speed"),
            "wind_direction": s.get("wind_direction"),
            "pm2_5": pm25_val,
            "cpcb_pm_indicator": cpcb_hr,
            "cpcb_category": cpcb_hr_info["category"],
            "heat_tier": heat_hr["tier"],
            "heat_label": heat_hr["label"],
            "precipitation_probability": precip_val,
            "data_status": data_st,
            "inside_availability": in_avail,
            "is_preference_qualified": hr_qualifies,
            "is_selected_block": False,  # Will be tagged below
            "score": score_hr
        })

    # Format human-readable availability string using minute offsets
    dummy_start = datetime(2000, 1, 1, (avail_start_m // 60) % 24, avail_start_m % 60)
    dummy_end = datetime(2000, 1, 1, (avail_end_m // 60) % 24, avail_end_m % 60)
    avail_start_str = format_time_12h(dummy_start)
    avail_end_str = format_time_12h(dummy_end)

    # -----------------------------------------------------------------
    # Candidate Partitioning & Dual-Window Strategy
    # -----------------------------------------------------------------
    # 1. Blocks strictly within user's availability schedule
    schedule_blocks = [b for b in candidate_blocks if b["is_inside_availability"]]
    
    # 2. Qualifying blocks strictly within user's availability schedule (0 violations)
    qualifying_schedule = [b for b in schedule_blocks if b["meets_preferences"]]
    qualifying_schedule.sort(key=lambda x: x["experimental_product_score"])
    
    # 3. Best block strictly within schedule (fewest violations, then lowest discomfort)
    best_schedule = None
    if schedule_blocks:
        sorted_schedule = sorted(
            schedule_blocks,
            key=lambda x: (len(x["preference_violations"]), x["experimental_product_score"])
        )
        best_schedule = sorted_schedule[0]
        
    # 4. Optimal weather block across entire day (cleanest air / lowest discomfort)
    qualifying_all = [b for b in candidate_blocks if len(b["preference_violations"]) == 0]
    if qualifying_all:
        qualifying_all.sort(key=lambda x: x["experimental_product_score"])
        best_overall = qualifying_all[0]
    else:
        best_overall = sorted(
            candidate_blocks,
            key=lambda x: (len(x["preference_violations"]), x["experimental_product_score"])
        )[0]

    # -----------------------------------------------------------------
    # Outcome 1: Preference-Qualified Option Inside User's Schedule
    # -----------------------------------------------------------------
    if qualifying_schedule:
        best = qualifying_schedule[0]
        best["outcome_type"] = OUTCOME_PREFERENCE_QUALIFIED
        best["outcome_label"] = LABEL_PREFERENCE_QUALIFIED
        best["task_name"] = task_name
        best["is_schedule_match"] = True
        best["timing_status"] = "meets_timing_constraints"
        
        # Tag hours in decision timeline
        for item in decision_timeline:
            if best["start_time"] <= item["time"] < best["end_time"]:
                item["is_selected_block"] = True
            
        cpcb_tag = f" (CPCB {best.get('cpcb_category', 'Indicator')})" if best.get('cpcb_category') else ""
        heat_tag = f" ({best.get('heat_label', '')})" if best.get('heat_label') else ""
        why_bullets = [
            f"It fits your requested {duration_desc} duration.",
            f"Strictly inside your requested timing: {avail_start_str}–{avail_end_str}.",
            f"Forecast PM2.5 is {best['mean_pm25']} µg/m³{cpcb_tag}.",
            f"Apparent temperature is {best['mean_apparent_temperature']}°C{heat_tag}.",
            f"Rain probability ({best['max_precipitation_probability']}%) is within your stated preference."
        ]
        best["why_this_window"] = why_bullets
        
        best["chosen_rationale"] = (
            f"Chosen because it strictly fits your selected {avail_start_str}–{avail_end_str} window "
            f"and meets all your environmental preferences."
        )
        
        best["fact_string"] = (
            f"BEST WINDOW FOR YOUR {task_name.upper()}\n"
            f"{best['display_window']}\n\n"
            f"Meets your preferences\n\n"
            f"PM2.5 forecast      {best['mean_pm25']} µg/m³\n"
            f"Apparent temperature {best['mean_apparent_temperature']}°C\n"
            f"Rain probability     {best['max_precipitation_probability']}%\n\n"
            f"{best['chosen_rationale']}"
        )

        has_dual = bool(
            best_overall and 
            best_overall["start_time"] != best["start_time"] and 
            best_overall["experimental_product_score"] < best["experimental_product_score"]
        )

        if has_dual:
            best_overall["task_name"] = task_name
            best_overall["is_weather_optimal"] = True
            best_overall["timing_status"] = "optimal_weather_alternative"
            best_overall["outcome_label"] = "Optimal weather alternative"
            best_overall["why_this_alternative"] = [
                f"Lowest outdoor discomfort score ({best_overall['experimental_product_score']}) across the 24-hour forecast.",
                f"Apparent temperature: {best_overall['mean_apparent_temperature']}°C · PM2.5: {best_overall['mean_pm25']} µg/m³.",
                "Optional alternative if you have flexible timing outside your requested schedule."
            ]
            best_overall["chosen_rationale"] = (
                f"Alternative window with lower outdoor discomfort if you have schedule flexibility."
            )
        
        return {
            "status": "success",
            "outcome_type": OUTCOME_PREFERENCE_QUALIFIED,
            "outcome_label": LABEL_PREFERENCE_QUALIFIED,
            "recommendation": best,
            "schedule_window": best,
            "weather_alternative": best_overall if has_dual else None,
            "has_dual_recommendation": has_dual,
            "decision_timeline": decision_timeline,
            "total_qualifying_blocks": len(qualifying_schedule),
            "total_candidate_blocks": len(candidate_blocks),
            "model_caveat": MODEL_CAVEAT,
            "official_guidance": OFFICIAL_GUIDANCE,
            "current_conditions": current_conditions,
            "metadata": metadata
        }
    
    # -----------------------------------------------------------------
    # Outcome 2: No Qualifying Slots in Schedule -> Dual Recommendation
    # 1. Schedule Window (meets timing constraints, least worst in schedule)
    # 2. Weather Alternative (optimal weather conditions across entire day)
    # -----------------------------------------------------------------
    if best_schedule:
        best_schedule["task_name"] = task_name
        best_schedule["is_schedule_match"] = True
        best_schedule["timing_status"] = "meets_timing_constraints"
        best_schedule["outcome_type"] = "schedule_fit"
        best_schedule["outcome_label"] = "Fits your schedule"
        top_viol = best_schedule["preference_violations"][0] if best_schedule["preference_violations"] else None
        viol_txt = f"Exceeds {top_viol['label']} preference by {top_viol['excess']} {top_viol['unit']}." if top_viol else "Meets environmental preferences."
        best_schedule["why_this_window"] = [
            f"Strictly fits within your requested {avail_start_str}–{avail_end_str} timing.",
            f"Selected to respect your daily commute or office schedule.",
            viol_txt
        ]
        best_schedule["chosen_rationale"] = (
            f"Selected because it strictly respects your {avail_start_str}–{avail_end_str} timing constraint. "
            f"It is the least-disruptive slot within your schedule, even with minor environmental tradeoffs."
        )

    best_overall["task_name"] = task_name
    best_overall["is_weather_optimal"] = True
    best_overall["timing_status"] = "optimal_weather_alternative"
    best_overall["outcome_label"] = "Optimal weather alternative"
    top_alt_viol = best_overall["preference_violations"][0] if best_overall["preference_violations"] else None
    alt_viol_bullet = f"Exceeds {top_alt_viol['label']} preference by {top_alt_viol['excess']} {top_alt_viol['unit']}." if top_alt_viol else "Meets environmental preferences."
    best_overall["why_this_alternative"] = [
        f"Lowest outdoor discomfort score ({best_overall['experimental_product_score']}) across the 24-hour forecast.",
        f"Apparent temperature: {best_overall['mean_apparent_temperature']}°C · PM2.5: {best_overall['mean_pm25']} µg/m³.",
        "Best option if you have flexible timing outside your requested schedule."
    ]
    best_overall["chosen_rationale"] = (
        f"The cleanest and most comfortable atmospheric window across the entire day for users with flexible timing."
    )

    has_dual_rec = bool(best_schedule and best_overall and best_schedule["start_time"] != best_overall["start_time"])

    # Case 2A: Fallback is NOT opted-in by user (standard test assertions preserved)
    if not enable_fallback:
        return {
            "status": "no_suitable_slots",
            "message": MSG_NO_SLOTS_MEET_PREFERENCES,
            "description": f"No continuous {duration_desc} period within your selected time range met every preference.",
            "fallback_enabled": False,
            "alternatives_available": True,
            "total_candidate_blocks": len(candidate_blocks),
            "decision_timeline": decision_timeline,
            "schedule_window": best_schedule,
            "weather_alternative": best_overall,
            "has_dual_recommendation": has_dual_rec,
            "general_exposure_reduction_options": GENERAL_EXPOSURE_REDUCTION_OPTIONS,
            "official_guidance": OFFICIAL_GUIDANCE,
            "model_caveat": MODEL_CAVEAT,
            "current_conditions": current_conditions,
            "metadata": metadata
        }

    # Case 2B: Fallback IS explicitly opted-in ("OUTSIDE YOUR PREFERENCES")
    primary_alt = best_schedule if best_schedule else best_overall
    primary_alt["outcome_type"] = OUTCOME_BEST_ALTERNATIVE
    primary_alt["outcome_label"] = LABEL_BEST_ALTERNATIVE
    
    # Tag hours in decision timeline
    for item in decision_timeline:
        if primary_alt["start_time"] <= item["time"] < primary_alt["end_time"]:
            item["is_selected_block"] = True

    top_violation = primary_alt["preference_violations"][0] if primary_alt["preference_violations"] else None
    violation_bullet = (
        f"It exceeds your {top_violation['label']} preference by {top_violation['excess']} {top_violation['unit']}."
        if top_violation else "It falls outside your preferred environmental thresholds."
    )
    
    why_alt_bullets = [
        "No slot met every preference in this time window.",
        "This block has the lowest discomfort ranking among comparable forecast blocks.",
        violation_bullet
    ]
    primary_alt["why_this_alternative"] = why_alt_bullets
    
    violation_detail = (
        f"Exceeds {top_violation['label']} preference\n{top_violation['description']}"
        if top_violation else "Exceeds stated preferences"
    )

    primary_alt["fact_string"] = (
        f"OUTSIDE YOUR PREFERENCES\n\n"
        f"Lowest-ranked available window:\n"
        f"{primary_alt['display_window']}\n\n"
        f"{violation_detail}\n\n"
        f"{MODEL_CAVEAT}"
    )

    return {
        "status": "fallback_alternative",
        "outcome_type": OUTCOME_BEST_ALTERNATIVE,
        "outcome_label": LABEL_BEST_ALTERNATIVE,
        "message": MSG_NO_SLOTS_MEET_PREFERENCES,
        "fallback_enabled": True,
        "alternative": primary_alt,
        "schedule_window": best_schedule,
        "weather_alternative": best_overall,
        "has_dual_recommendation": has_dual_rec,
        "decision_timeline": decision_timeline,
        "total_candidate_blocks": len(candidate_blocks),
        "general_exposure_reduction_options": GENERAL_EXPOSURE_REDUCTION_OPTIONS,
        "official_guidance": OFFICIAL_GUIDANCE,
        "model_caveat": MODEL_CAVEAT,
        "current_conditions": current_conditions,
        "metadata": metadata
    }
