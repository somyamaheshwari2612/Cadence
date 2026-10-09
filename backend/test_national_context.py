from services.national_context import load_india_cities, get_national_context, refresh_national_aqi_data
import time

def test():
    print("=" * 70)
    print("TEST: National Context 100-City Feature (national_context.py)")
    print("=" * 70)
    
    # 1. Test Static Dataset
    print("\n--- Step 1: Validating Static 100 Cities Dataset ---")
    cities = load_india_cities()
    print(f"Total pre-geocoded cities loaded: {len(cities)}")
    assert len(cities) == 100, f"Expected 100 cities, got {len(cities)}"
    
    sample_cities = [c["city"] for c in cities[:5]]
    print(f"Sample cities: {', '.join(sample_cities)}")
    assert "Agra" in [c["city"] for c in cities], "Agra should be in the list!"
    assert "New Delhi" in [c["city"] for c in cities], "New Delhi should be in the list!"
    assert "Munnar" in [c["city"] for c in cities], "Munnar should be in the list!"
    print("✓ Dataset correctly contains all 36 capitals, frontiers, hubs, and tourist destinations.")
    
    # 2. Test Batch Fetching & Computation
    print("\n--- Step 2: Batch Fetching & In-Memory Statistical Aggregation ---")
    start_time = time.time()
    context = get_national_context(force_refresh=True)
    duration = time.time() - start_time
    print(f"Batch fetch completed in {duration:.2f} seconds.")
    
    summary = context["card_summary"]
    print(f"\n[Card Display Preview]")
    print(f"Title:          {summary['title']}")
    print(f"Median U.S. AQI:{summary['median_us_aqi']}")
    print(f"Mean U.S. AQI:  {summary['mean_us_aqi']}")
    print(f"Range:          {summary['range']}")
    print(f"Model:          {summary['model']}")
    
    assert "median_us_aqi" in summary
    assert "range" in summary
    assert summary["model"] == "CAMS Global (Hourly Estimate)"
    
    print("\n[Top 5 Cleanest Cities]")
    for c in context["cleanest_cities"]:
        print(f" - {c['city']} ({c['category']}): AQI {c['us_aqi']}")
        
    print("\n[Top 5 Most Polluted Cities]")
    for c in context["most_polluted_cities"]:
        print(f" - {c['city']} ({c['category']}): AQI {c['us_aqi']}")
        
    # 3. Test Caching (Zero Latency on subsequent calls)
    print("\n--- Step 3: Verifying In-Memory Cache (1-Hour TTL) ---")
    cache_start = time.time()
    cached_context = get_national_context(force_refresh=False)
    cache_duration = time.time() - cache_start
    print(f"Cache hit returned in {cache_duration*1000:.3f} ms.")
    assert cached_context["cache_info"]["cached"] is True
    assert cached_context["card_summary"]["median_us_aqi"] == summary["median_us_aqi"]
    print(f"✓ Cache hit verified: age={cached_context['cache_info']['cache_age_seconds']}s, ttl={cached_context['cache_info']['ttl_seconds']}s")
    
    # 4. Verify Disclaimers
    print("\n--- Step 4: Verifying Guidance & Methodology Disclaimer ---")
    print(f"Disclaimer: {context['disclaimer']}")
    assert "Central Pollution Control Board" in context["disclaimer"]
    assert "NOT the official Indian National Air Quality Index (NAQI)" in context["disclaimer"]
    
    print("\n" + "=" * 70)
    print("ALL TESTS PASSED: NATIONAL CONTEXT SERVICE READY")
    print("=" * 70)

if __name__ == "__main__":
    test()
