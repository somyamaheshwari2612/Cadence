import os
import json
import time
import requests
import statistics
from datetime import datetime, timezone

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "india_100_cities.json")
CACHE_TTL_SECONDS = 3600  # 1 hour cache to strictly preserve Open-Meteo rate limits
REQUEST_TIMEOUT = 12      # seconds

# In-memory singleton cache
_national_cache = {
    "data": None,
    "last_fetched_epoch": 0,
    "last_updated_utc": None
}


def load_india_cities():
    """Loads the pre-geocoded 100 Indian cities from static disk storage."""
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _fetch_chunk_aqi(city_chunk):
    """
    Fetches current forecast AQI for a batch of cities in a single HTTP request.
    Open-Meteo supports comma-separated latitude and longitude lists.
    """
    lats = ",".join(f"{c['lat']:.4f}" for c in city_chunk)
    lngs = ",".join(f"{c['lng']:.4f}" for c in city_chunk)
    
    url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality?"
        f"latitude={lats}&longitude={lngs}&"
        f"current=us_aqi,pm2_5&domains=cams_global&timezone=auto"
    )
    
    response = requests.get(url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    payload = response.json()
    
    # If single city, Open-Meteo returns dict; if multiple, returns list of dicts
    if isinstance(payload, dict):
        payload = [payload]
        
    results = []
    for i, city in enumerate(city_chunk):
        item = payload[i] if i < len(payload) else {}
        current = item.get("current", {})
        us_aqi = current.get("us_aqi")
        pm2_5 = current.get("pm2_5")
        
        results.append({
            "city": city["city"],
            "category": city.get("category", ""),
            "lat": city["lat"],
            "lng": city["lng"],
            "us_aqi": us_aqi,
            "pm2_5": pm2_5,
            "status": "available" if us_aqi is not None else "missing"
        })
    return results


def refresh_national_aqi_data(force=False):
    """
    Fetches the 100 cities in 2 batch chunks (50 each), computes national statistics,
    and updates the in-memory cache.
    """
    global _national_cache
    now = time.time()
    
    # Return cache if valid and not forced
    if not force and _national_cache["data"] is not None:
        elapsed = now - _national_cache["last_fetched_epoch"]
        if elapsed < CACHE_TTL_SECONDS:
            return _national_cache["data"], False  # (data, was_refreshed=False)
            
    cities = load_india_cities()
    
    # Chunk into 2 batches of 50 to maintain URL length well within HTTP limits
    chunk_size = 50
    chunks = [cities[i:i + chunk_size] for i in range(0, len(cities), chunk_size)]
    
    all_city_results = []
    for chunk in chunks:
        try:
            chunk_results = _fetch_chunk_aqi(chunk)
            all_city_results.extend(chunk_results)
        except Exception as e:
            # If a chunk fails, try graceful fallback for those cities
            for c in chunk:
                all_city_results.append({
                    "city": c["city"],
                    "category": c.get("category", ""),
                    "lat": c["lat"],
                    "lng": c["lng"],
                    "us_aqi": None,
                    "pm2_5": None,
                    "status": "error"
                })
    
    # Filter valid AQI values for statistical analysis
    valid_cities = [c for c in all_city_results if c["us_aqi"] is not None]
    
    if not valid_cities:
        # If upstream completely failed but we have stale cache, preserve stale cache
        if _national_cache["data"] is not None:
            return _national_cache["data"], False
        raise ConnectionError("Could not retrieve national air quality data from Open-Meteo.")
        
    aqi_values = [c["us_aqi"] for c in valid_cities]
    median_aqi = round(statistics.median(aqi_values))
    mean_aqi = round(statistics.mean(aqi_values), 1)
    
    sorted_by_aqi = sorted(valid_cities, key=lambda x: x["us_aqi"])
    min_city = sorted_by_aqi[0]
    max_city = sorted_by_aqi[-1]
    
    range_str = f"{min_city['us_aqi']} ({min_city['city']}) – {max_city['us_aqi']} ({max_city['city']})"
    
    computed_data = {
        "card_summary": {
            "title": "National Context (100 Cities)",
            "median_us_aqi": median_aqi,
            "mean_us_aqi": mean_aqi,
            "range": range_str,
            "min_city": {"city": min_city["city"], "us_aqi": min_city["us_aqi"]},
            "max_city": {"city": max_city["city"], "us_aqi": max_city["us_aqi"]},
            "model": "CAMS Global (Hourly Estimate)"
        },
        "cleanest_cities": [
            {"city": c["city"], "us_aqi": c["us_aqi"], "category": c["category"]}
            for c in sorted_by_aqi[:5]
        ],
        "most_polluted_cities": [
            {"city": c["city"], "us_aqi": c["us_aqi"], "category": c["category"]}
            for c in sorted_by_aqi[-5:][::-1]
        ],
        "total_cities_evaluated": len(all_city_results),
        "valid_cities_count": len(valid_cities),
        "disclaimer": (
            "Values represent forecast U.S. AQI returned by Open-Meteo CAMS Global. "
            "This is NOT the official Indian National Air Quality Index (NAQI). "
            "For official Indian station monitoring and bulletins, consult the Central "
            "Pollution Control Board (https://www.cpcb.nic.in/aqi_bulletin.php)."
        )
    }
    
    _national_cache["data"] = computed_data
    _national_cache["last_fetched_epoch"] = now
    _national_cache["last_updated_utc"] = datetime.now(timezone.utc).isoformat()
    
    return computed_data, True


def get_national_context(force_refresh=False):
    """
    Returns the cached National Context summary with cache metadata.
    """
    data, was_refreshed = refresh_national_aqi_data(force=force_refresh)
    cache_age = round(time.time() - _national_cache["last_fetched_epoch"])
    
    result = dict(data)
    result["cache_info"] = {
        "cached": not was_refreshed,
        "last_updated_utc": _national_cache["last_updated_utc"],
        "cache_age_seconds": cache_age,
        "ttl_seconds": CACHE_TTL_SECONDS
    }
    return result
