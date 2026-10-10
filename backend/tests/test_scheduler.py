import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.env_data import get_coordinates, fetch_environmental_data
from services.scheduler import (
    find_optimal_schedule,
    OUTCOME_PREFERENCE_QUALIFIED,
    OUTCOME_BEST_ALTERNATIVE,
    LABEL_PREFERENCE_QUALIFIED,
    LABEL_BEST_ALTERNATIVE,
    MSG_UNABLE_TO_COMPARE,
    MSG_NO_SLOTS_MEET_PREFERENCES,
    OFFICIAL_GUIDANCE
)
import json

def test():
    print("=" * 70)
    print("TEST: Deterministic Scheduler with Corrected Metrics (scheduler.py)")
    print("=" * 70)
    
    coords = get_coordinates("Mumbai")
    env_result = fetch_environmental_data(coords['latitude'], coords['longitude'])
    duration = 2
    
    # -------------------------------------------------------------
    # Test 1: Preference-Qualified Option (Meets preferences)
    # -------------------------------------------------------------
    print("\n--- Test 1: Preference-Qualified Option ---")
    result_1 = find_optimal_schedule(env_result, duration, max_temp=45.0, max_aqi=300)
    print(f"Status: {result_1['status']}")
    print(f"Outcome Type: {result_1.get('outcome_type')}")
    print(f"Outcome Label: {result_1.get('outcome_label')}")
    assert result_1["status"] == "success"
    assert result_1["outcome_type"] == OUTCOME_PREFERENCE_QUALIFIED
    assert result_1["outcome_label"] == LABEL_PREFERENCE_QUALIFIED
    
    rec = result_1["recommendation"]
    print(f"Recommended Block: {rec['start_time']} -> {rec['end_time']} (Local)")
    print(f"UTC Block:         {rec['start_time_utc']} -> {rec['end_time_utc']}")
    print(f"Mean Temp:         {rec['mean_apparent_temperature']}°C")
    print(f"Mean Forecast AQI: {rec['mean_forecast_us_aqi']} (Peak: {rec['max_forecast_us_aqi']})")
    print(f"Mean PM2.5:        {rec['mean_pm25']} µg/m³")
    print(f"Hourly breakdown count: {len(rec['hourly_forecast_breakdown'])}")
    print(f"Experimental Score:{rec['experimental_product_score']}")
    print(f"Fact String:       {rec['fact_string']}")
    
    # -------------------------------------------------------------
    # Test 2: Tight Constraints without Fallback (enable_fallback=False)
    # -------------------------------------------------------------
    print("\n--- Test 2: Tight Constraints without Opt-in Fallback (enable_fallback=False) ---")
    result_2 = find_optimal_schedule(
        env_result, duration, max_temp=15.0, max_aqi=20, enable_fallback=False
    )
    print(f"Status: {result_2['status']}")
    print(f"Message: {result_2.get('message')}")
    print(f"Fallback Enabled: {result_2.get('fallback_enabled')}")
    assert result_2["status"] == "no_suitable_slots"
    assert result_2["message"] == MSG_NO_SLOTS_MEET_PREFERENCES
    assert result_2["fallback_enabled"] is False
    assert result_2["alternatives_available"] is True
    assert "alternative" not in result_2
    
    print("\nGeneral Exposure Reduction Options (Informational):")
    for opt in result_2.get("general_exposure_reduction_options", []):
        print(f" - [{opt['title']}]: {opt['description']}")
    
    # Verify CPCB official guidance
    assert "india_primary" in result_2.get("official_guidance", {})
    print(f"Official Guidance: {result_2['official_guidance']['india_primary']['agency']} ({result_2['official_guidance']['india_primary']['url']})")
    
    # -------------------------------------------------------------
    # Test 3: Tight Constraints with Explicit Opt-in Fallback (enable_fallback=True)
    # -------------------------------------------------------------
    print("\n--- Test 3: Tight Constraints with Opt-in Fallback (enable_fallback=True) ---")
    result_3 = find_optimal_schedule(
        env_result, duration, max_temp=15.0, max_aqi=20, enable_fallback=True
    )
    print(f"Status: {result_3['status']}")
    print(f"Outcome Type: {result_3.get('outcome_type')}")
    print(f"Outcome Label: {result_3.get('outcome_label')}")
    assert result_3["status"] == "fallback_alternative"
    assert result_3["outcome_type"] == OUTCOME_BEST_ALTERNATIVE
    assert result_3["outcome_label"] == LABEL_BEST_ALTERNATIVE
    
    alt = result_3["alternative"]
    print(f"Alternative Slot: {alt['start_time']} -> {alt['end_time']}")
    print(f"Mean Forecast U.S. AQI: {alt['mean_forecast_us_aqi']} (Peak: {alt['max_forecast_us_aqi']})")
    print(f"Preference Violations:")
    for v in alt["preference_violations"]:
        print(f"   * {v['label']}: forecast={v['forecast_value']}{v['unit']}, limit={v['limit']}{v['unit']} (excess: +{v['excess']})")
    print(f"Model Caveat:     {result_3.get('model_caveat')}")
    print(f"Fact String:      {alt['fact_string']}")
    
    # -------------------------------------------------------------
    # Test 4: Data-Quality Exclusions & Operational Freshness
    # -------------------------------------------------------------
    print("\n--- Test 4: Data-Quality Exclusions & Stale Data ---")
    empty_env = {"data": [], "metadata": {}}
    result_4a = find_optimal_schedule(empty_env, duration, max_temp=45.0, max_aqi=300)
    assert result_4a["status"] == "unable_to_compare"
    assert result_4a["message"] == MSG_UNABLE_TO_COMPARE
    assert "data_quality_exclusions" in result_4a
    
    # Stale cache flag test
    stale_env = {"data": env_result["data"], "metadata": {"is_stale": True, "age_seconds": 15000}}
    result_4b = find_optimal_schedule(stale_env, duration, max_temp=45.0, max_aqi=300)
    print(f"Stale data status:  {result_4b['status']}")
    print(f"Stale data reason:  {result_4b['reason']}")
    assert result_4b["status"] == "unable_to_compare"
    assert "stale_forecast_data" in result_4b["data_quality_exclusions"]
    
    # -------------------------------------------------------------
    # Test 5: Rain Preference Sensitivity
    # -------------------------------------------------------------
    print("\n--- Test 5: Rain Preference Check ---")
    rain_no = find_optimal_schedule(env_result, duration, max_temp=45.0, max_aqi=300, rain_ok=False, rain_threshold=5)
    rain_yes = find_optimal_schedule(env_result, duration, max_temp=45.0, max_aqi=300, rain_ok=True)
    print(f"Qualifying blocks (rain_ok=False, thresh=5%): {rain_no.get('total_qualifying_blocks', 0)}")
    print(f"Qualifying blocks (rain_ok=True):              {rain_yes.get('total_qualifying_blocks', 0)}")
    
    print("\n" + "=" * 70)
    print("ALL TESTS PASSED: DATA QUALITY VS PREFERENCES VERIFIED")
    print("=" * 70)

if __name__ == "__main__":
    test()
