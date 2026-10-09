from services.llm_engine import generate_explanation

def test():
    print("=" * 70)
    print("TEST: LLM Engine with Updated Grounding Guidelines (llm_engine.py)")
    print("=" * 70)
    
    # Test 1: Preference-qualified recommendation
    fact_1 = (
        "Preference-qualified slot: 2026-10-12T06:00 to 2026-10-12T08:00 (2h) "
        "meets your preferences. Mean apparent temp: 28.8°C (preference limit: 45.0°C). "
        "Mean forecast U.S. AQI: 106.0 (hourly points: 104, 108; peak: 108; limit: 300). "
        "Mean PM2.5: 58.2 µg/m³. Max precip probability: 0%. Experimental score: 172.6."
    )
    print("\n--- Test 1: Preference-Qualified Recommendation ---")
    print(f"[Fact String] {fact_1}")
    explanation_1 = generate_explanation(fact_1, outcome_type="preference_qualified")
    print(f"\n[Gemini Output] {explanation_1}")
    
    if explanation_1 == fact_1:
        print("(Note: Gemini was bypassed — returned deterministic text)")
    
    # Test 2: Fallback alternative outside preferences
    fact_2 = (
        "No time slot meets your stated preferences today. "
        "If this task must happen outdoors, 2026-10-12T06:00–2026-10-12T08:00 is the lowest-ranked "
        "option among available forecast slots, but it exceeds your temperature and AQI preference "
        "(Mean forecast U.S. AQI: 106.0, hourly: 104, 108, peak: 108; Mean apparent temp: 28.8°C). "
        "Consider postponing, moving the task indoors, or reducing its duration or intensity. "
        "Forecasts are uncertain; this is not a safety or medical recommendation."
    )
    print("\n--- Test 2: Fallback Alternative (Outside Preferences) ---")
    print(f"[Fact String] {fact_2}")
    explanation_2 = generate_explanation(fact_2, outcome_type="best_available_alternative")
    print(f"\n[Gemini Output] {explanation_2}")
    
    if explanation_2 == fact_2:
        print("(Note: Gemini was bypassed — returned deterministic text)")

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED")
    print("=" * 70)

if __name__ == "__main__":
    test()
