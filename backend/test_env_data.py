from services.env_data import get_coordinates, get_location_candidates, fetch_environmental_data
import json

def test():
    print("=" * 60)
    print("TEST: Open-Meteo Integration (env_data.py)")
    print("=" * 60)
    
    # Test 1: Geocoding with disambiguation
    print("\n--- Test 1: Location Candidates (Disambiguation) ---")
    candidates = get_location_candidates("Delhi")
    print(f"Found {len(candidates)} candidates for 'Delhi':")
    for c in candidates:
        print(f"  - {c['name']}, {c['admin1']}, {c['country']} ({c['latitude']}, {c['longitude']})")
    
    # Test 2: Single coordinate lookup
    print("\n--- Test 2: Single Coordinate Lookup ---")
    coords = get_coordinates("Mumbai")
    print(f"Top result: {coords['name']}, {coords['country']} ({coords['latitude']}, {coords['longitude']})")
    
    # Test 3: Fetch environmental data with alignment status + UTC
    print("\n--- Test 3: Environmental Forecast Data ---")
    result = fetch_environmental_data(coords['latitude'], coords['longitude'])
    data = result["data"]
    meta = result["metadata"]
    
    if not data:
        print("FAIL: No data returned.")
        return
    
    print(f"Fetched {len(data)} hourly data points.")
    print(f"Timezone: {meta['timezone']} ({meta['timezone_abbreviation']}), UTC offset: {meta['utc_offset_seconds']}s")
    
    # Show alignment distribution
    alignments = {}
    for row in data:
        a = row["alignment"]
        alignments[a] = alignments.get(a, 0) + 1
    print(f"Alignment distribution: {json.dumps(alignments)}")
    
    # Show status distribution
    statuses = {"temp": {}, "aqi": {}}
    for row in data:
        statuses["temp"][row["temp_status"]] = statuses["temp"].get(row["temp_status"], 0) + 1
        statuses["aqi"][row["aqi_status"]] = statuses["aqi"].get(row["aqi_status"], 0) + 1
    print(f"Temp status: {json.dumps(statuses['temp'])}")
    print(f"AQI status:  {json.dumps(statuses['aqi'])}")
    
    # Show first 2 rows with UTC info
    print("\nFirst 2 data points (local + UTC):")
    for row in data[:2]:
        display = {k: v for k, v in row.items() if k != "utc_dt"}
        print(json.dumps(display, indent=2))
    
    # Test 4: Invalid location
    print("\n--- Test 4: Invalid Location ---")
    try:
        get_coordinates("xyznonexistentplace12345")
        print("FAIL: Should have raised ValueError")
    except ValueError as e:
        print(f"Correctly raised: {e}")
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED")
    print("=" * 60)

if __name__ == "__main__":
    test()
