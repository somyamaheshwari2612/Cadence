from datetime import datetime, timedelta

# Standard outcome types and labels
OUTCOME_PREFERENCE_QUALIFIED = "preference_qualified"
OUTCOME_BEST_ALTERNATIVE = "best_available_alternative"

LABEL_PREFERENCE_QUALIFIED = "meets your preferences"
LABEL_BEST_ALTERNATIVE = "outside your preferences—not assessed as safe"

MSG_UNABLE_TO_COMPARE = "Unable to compare slots with available forecast data"
MSG_NO_SLOTS_MEET_PREFERENCES = "No time slot meets your stated preferences today."
MODEL_CAVEAT = "Forecasts are uncertain; this is not a safety or medical recommendation."

# Official Guidance Resources: CPCB as primary for India; AirNow as U.S. reference
OFFICIAL_GUIDANCE = {
    "india_primary": {
        "agency": "Central Pollution Control Board (CPCB)",
        "url": "https://www.cpcb.nic.in/aqi_bulletin.php",
        "note": "Official Indian National AQI (NAQI) bulletins and station monitoring data."
    },
    "us_reference": {
        "agency": "U.S. EPA AirNow",
        "url": "https://www.airnow.gov/",
        "note": "U.S. EPA AQI forecasts and action guides (for U.S. AQI methodology)."
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


def experimental_product_score(temp, us_aqi):
    """
    Experimental product ranking score for ordering candidate time slots.
    
    NOT a health-risk model, biological exposure assessment, or safety metric.
    Published Formula: abs(temp - 22.0) * 2.0 + us_aqi * 1.5
    
    - 22°C is an arbitrary "comfortable temperature" baseline.
    - U.S. AQI is scaled linearly with weight 1.5 for product sorting.
    - We do NOT apply arbitrary activity-specific multipliers (such as 2.0 for strenuous work),
      as such coefficients are unvalidated and imply a clinical exposure model.
    - Lower score = more favorable slot ordering according to this formula.
    - Candidate slots must always display underlying raw values alongside this score.
    """
    temp_component = abs(temp - 22.0) * 2.0
    aqi_component = us_aqi * 1.5
    return round(temp_component + aqi_component, 2)


def find_optimal_schedule(
    env_data_result,
    duration_hours,
    max_temp,
    max_aqi,
    rain_ok=False,
    rain_threshold=20,
    enable_fallback=False
):
    """
    Evaluates forecast slots with a clear separation of:
    1. Data-quality exclusions (missing values, temporal discontinuities, stale data).
    2. Preference filters (user max_temp, max_aqi, rain_ok).
    3. Distinct outcomes: 'preference_qualified' vs. 'best_available_alternative'.
    
    AQI Summary Definition:
    - Open-Meteo returns forecast U.S. AQI, NOT Indian National AQI (NAQI).
    - Summary for multi-hour blocks is calculated as the arithmetic mean ('mean_forecast_us_aqi')
      and peak ('max_forecast_us_aqi') of hourly points.
    - Full hourly breakdown is preserved alongside the summary for transparency.
    """
    env_data = env_data_result.get("data", [])
    metadata = env_data_result.get("metadata", {})
    
    # -----------------------------------------------------------------
    # Step 1: Data-Quality Exclusions (Physical & Data Feasibility)
    # -----------------------------------------------------------------
    if not env_data or len(env_data) < duration_hours:
        return {
            "status": "unable_to_compare",
            "message": MSG_UNABLE_TO_COMPARE,
            "reason": f"Insufficient forecast records ({len(env_data)} available, {duration_hours} required).",
            "data_quality_exclusions": ["insufficient_records_for_duration"],
            "metadata": metadata
        }
    
    # Operational freshness check: if metadata indicates stale data, do not rank
    if metadata.get("is_stale", False):
        return {
            "status": "unable_to_compare",
            "message": MSG_UNABLE_TO_COMPARE,
            "reason": f"Forecast data exceeded maximum acceptable cache age ({metadata.get('age_seconds', 0)}s old).",
            "data_quality_exclusions": ["stale_forecast_data"],
            "metadata": metadata
        }

    candidate_blocks = []
    data_quality_rejected_count = 0
    
    for i in range(len(env_data) - duration_hours + 1):
        block_slots = env_data[i:i + duration_hours]
        
        # Check temporal continuity via UTC instants
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
            
        # Data-quality check: presence of non-null, non-missing values
        has_missing_data = False
        for s in block_slots:
            if s.get("temp_status") == "missing" or s.get("apparent_temperature") is None:
                has_missing_data = True
                break
            if s.get("aqi_status") == "missing" or s.get("us_aqi") is None:
                has_missing_data = True
                break
        
        if has_missing_data:
            data_quality_rejected_count += 1
            continue
            
        # Extract underlying hourly values
        hourly_temps = [s["apparent_temperature"] for s in block_slots]
        hourly_aqis = [s["us_aqi"] for s in block_slots]
        hourly_precips = [(s.get("precipitation_probability") or 0) for s in block_slots]
        hourly_pm25s = [(s.get("pm2_5") or 0) for s in block_slots]
        
        # Summary metrics: explicitly arithmetic mean and peak
        mean_temp = round(sum(hourly_temps) / duration_hours, 1)
        mean_us_aqi = round(sum(hourly_aqis) / duration_hours, 1)
        max_us_aqi = max(hourly_aqis)
        mean_pm25 = round(sum(hourly_pm25s) / duration_hours, 1)
        max_block_precip = max(hourly_precips)
        
        # Experimental combined score
        score = round(sum(experimental_product_score(t, a) for t, a in zip(hourly_temps, hourly_aqis)) / duration_hours, 2)
        
        task_end_utc = block_slots[-1]["utc_dt"] + timedelta(hours=1)
        
        # -------------------------------------------------------------
        # Step 2: Preference Filters (Separated from Data-Quality)
        # -------------------------------------------------------------
        preference_violations = []
        if mean_temp > max_temp:
            preference_violations.append({
                "filter": "max_temp",
                "label": "apparent temperature",
                "limit": max_temp,
                "summary_type": "mean",
                "forecast_value": mean_temp,
                "unit": "°C",
                "excess": round(mean_temp - max_temp, 1),
                "description": f"Mean apparent temp {mean_temp}°C exceeds your preference limit of {max_temp}°C"
            })
        if mean_us_aqi > max_aqi:
            preference_violations.append({
                "filter": "max_aqi",
                "label": "forecast U.S. AQI",
                "limit": max_aqi,
                "summary_type": "mean",
                "forecast_value": mean_us_aqi,
                "unit": "",
                "excess": round(mean_us_aqi - max_aqi, 1),
                "description": f"Mean forecast U.S. AQI {mean_us_aqi} exceeds your preference limit of {max_aqi} (peak: {max_us_aqi})"
            })
        if not rain_ok and max_block_precip > rain_threshold:
            preference_violations.append({
                "filter": "rain_threshold",
                "label": "precipitation probability",
                "limit": rain_threshold,
                "summary_type": "max",
                "forecast_value": max_block_precip,
                "unit": "%",
                "excess": round(max_block_precip - rain_threshold, 1),
                "description": f"Max precipitation probability {max_block_precip}% exceeds threshold of {rain_threshold}%"
            })
        
        meets_preferences = (len(preference_violations) == 0)
        
        # Clean hourly breakdown for JSON response
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
            "start_time_utc": block_slots[0]["time_utc"],
            "end_time_utc": task_end_utc.isoformat(),
            "duration_hours": duration_hours,
            # Explicit summary names
            "mean_apparent_temperature": mean_temp,
            "mean_forecast_us_aqi": mean_us_aqi,
            "max_forecast_us_aqi": max_us_aqi,
            "mean_pm25": mean_pm25,
            "max_precipitation_probability": max_block_precip,
            "experimental_product_score": score,
            "meets_preferences": meets_preferences,
            "preference_violations": preference_violations,
            "exclusion_reasons": [v["description"] for v in preference_violations],
            "hourly_forecast_breakdown": clean_hourly_slots
        }
        candidate_blocks.append(block_info)
    
    # If no valid blocks could be formed due to data-quality issues:
    if not candidate_blocks:
        return {
            "status": "unable_to_compare",
            "message": MSG_UNABLE_TO_COMPARE,
            "reason": "Missing, stale, or discontinuous forecast data prevented valid candidate block formation.",
            "data_quality_rejected_count": data_quality_rejected_count,
            "metadata": metadata
        }
    
    # Separate qualifying candidate blocks
    qualifying = [b for b in candidate_blocks if b["meets_preferences"]]
    qualifying.sort(key=lambda x: x["experimental_product_score"])
    
    # -----------------------------------------------------------------
    # Outcome 1: Preference-Qualified Option ("meets your preferences")
    # -----------------------------------------------------------------
    if qualifying:
        best = qualifying[0]
        best["outcome_type"] = OUTCOME_PREFERENCE_QUALIFIED
        best["outcome_label"] = LABEL_PREFERENCE_QUALIFIED
        
        # Build hourly summary string
        hourly_aqi_list = [str(h["forecast_us_aqi"]) for h in best["hourly_forecast_breakdown"]]
        best["fact_string"] = (
            f"Preference-qualified slot: {best['start_time']} to {best['end_time']} ({duration_hours}h) "
            f"meets your preferences. Mean apparent temp: {best['mean_apparent_temperature']}°C "
            f"(preference limit: {max_temp}°C). Mean forecast U.S. AQI: {best['mean_forecast_us_aqi']} "
            f"(hourly points: {', '.join(hourly_aqi_list)}; peak: {best['max_forecast_us_aqi']}; limit: {max_aqi}). "
            f"Mean PM2.5: {best['mean_pm25']} µg/m³. Max precip: {best['max_precipitation_probability']}%. "
            f"Experimental score: {best['experimental_product_score']}."
        )
        return {
            "status": "success",
            "outcome_type": OUTCOME_PREFERENCE_QUALIFIED,
            "outcome_label": LABEL_PREFERENCE_QUALIFIED,
            "recommendation": best,
            "total_qualifying_blocks": len(qualifying),
            "total_candidate_blocks": len(candidate_blocks),
            "model_caveat": MODEL_CAVEAT,
            "official_guidance": OFFICIAL_GUIDANCE,
            "metadata": metadata
        }
    
    # -----------------------------------------------------------------
    # Outcome 2: Best Available Alternative ("outside your preferences—not assessed as safe")
    # -----------------------------------------------------------------
    non_qualifying = sorted(candidate_blocks, key=lambda x: x["experimental_product_score"])
    least_adverse = non_qualifying[0]
    
    exceeded_summary = " and ".join(v["label"] for v in least_adverse["preference_violations"])
    hourly_aqi_list = [str(h["forecast_us_aqi"]) for h in least_adverse["hourly_forecast_breakdown"]]
    
    # Case 2A: Fallback is NOT opted-in by user
    if not enable_fallback:
        return {
            "status": "no_suitable_slots",
            "message": MSG_NO_SLOTS_MEET_PREFERENCES,
            "fallback_enabled": False,
            "alternatives_available": True,
            "total_candidate_blocks": len(non_qualifying),
            "general_exposure_reduction_options": GENERAL_EXPOSURE_REDUCTION_OPTIONS,
            "official_guidance": OFFICIAL_GUIDANCE,
            "model_caveat": MODEL_CAVEAT,
            "prompt_for_fallback": (
                "If this task must happen outdoors, you can opt-in to view the lowest-ranked "
                "available alternative. Note: alternatives are outside your preferences and not assessed as safe."
            ),
            "metadata": metadata
        }
    
    # Case 2B: Fallback IS explicitly opted-in
    least_adverse["outcome_type"] = OUTCOME_BEST_ALTERNATIVE
    least_adverse["outcome_label"] = LABEL_BEST_ALTERNATIVE
    least_adverse["ranking_description"] = "lowest-ranked option among available forecast slots"
    least_adverse["model_caveat"] = MODEL_CAVEAT
    
    least_adverse["fact_string"] = (
        f"No time slot meets your stated preferences today. "
        f"If this task must happen outdoors, {least_adverse['start_time']}–{least_adverse['end_time']} "
        f"is the lowest-ranked option among available forecast slots, but it exceeds your {exceeded_summary} preference "
        f"(Mean forecast U.S. AQI: {least_adverse['mean_forecast_us_aqi']}, hourly: {', '.join(hourly_aqi_list)}, peak: {least_adverse['max_forecast_us_aqi']}; "
        f"Mean apparent temp: {least_adverse['mean_apparent_temperature']}°C). "
        f"Consider postponing, moving the task indoors, or reducing its duration or intensity. "
        f"{MODEL_CAVEAT}"
    )
    
    return {
        "status": "fallback_alternative",
        "outcome_type": OUTCOME_BEST_ALTERNATIVE,
        "outcome_label": LABEL_BEST_ALTERNATIVE,
        "message": MSG_NO_SLOTS_MEET_PREFERENCES,
        "fallback_enabled": True,
        "alternative": least_adverse,
        "total_candidate_blocks": len(non_qualifying),
        "general_exposure_reduction_options": GENERAL_EXPOSURE_REDUCTION_OPTIONS,
        "official_guidance": OFFICIAL_GUIDANCE,
        "model_caveat": MODEL_CAVEAT,
        "metadata": metadata
    }
