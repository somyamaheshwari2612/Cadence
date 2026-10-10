import os
import json
import time
import requests
import statistics
from datetime import datetime, timezone
from services.cpcb_naqi import calculate_pm25_subindex, get_cpcb_category

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
        
        # Compute Indian CPCB NAQI directly from PM2.5
        india_naqi = calculate_pm25_subindex(pm2_5) if pm2_5 is not None else None
        cpcb_cat = get_cpcb_category(india_naqi)["category"] if india_naqi is not None else "Unknown"
        
        results.append({
            "city": city["city"],
            "category": city.get("category", ""),
            "lat": city["lat"],
            "lng": city["lng"],
            "us_aqi": us_aqi,
            "pm2_5": pm2_5,
            "india_naqi": india_naqi,
            "cpcb_category": cpcb_cat,
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
        except Exception:
            # If a chunk fails, try graceful fallback for those cities
            for c in chunk:
                all_city_results.append({
                    "city": c["city"],
                    "category": c.get("category", ""),
                    "lat": c["lat"],
                    "lng": c["lng"],
                    "us_aqi": None,
                    "pm2_5": None,
                    "india_naqi": None,
                    "cpcb_category": "Unknown",
                    "status": "error"
                })
    
    # Filter valid AQI values for statistical analysis
    valid_cities = [c for c in all_city_results if c["india_naqi"] is not None or c["us_aqi"] is not None]
    
    if not valid_cities:
        if _national_cache["data"] is not None:
            return _national_cache["data"], False
        raise ConnectionError("Could not retrieve national air quality data from Open-Meteo.")
        
    # Calculate Indian CPCB NAQI stats
    valid_naqi_cities = [c for c in valid_cities if c["india_naqi"] is not None]
    if valid_naqi_cities:
        naqi_values = [c["india_naqi"] for c in valid_naqi_cities]
        median_naqi = round(statistics.median(naqi_values))
        mean_naqi = round(statistics.mean(naqi_values), 1)
        sorted_by_naqi = sorted(valid_naqi_cities, key=lambda x: x["india_naqi"])
        min_naqi_city = sorted_by_naqi[0]
        max_naqi_city = sorted_by_naqi[-1]
        range_naqi_str = f"NAQI {min_naqi_city['india_naqi']} ({min_naqi_city['city']}) – NAQI {max_naqi_city['india_naqi']} ({max_naqi_city['city']})"
    else:
        median_naqi = 100
        mean_naqi = 100.0
        range_naqi_str = "Unavailable"
        sorted_by_naqi = valid_cities

    # Legacy US AQI stats for reference
    us_aqi_values = [c["us_aqi"] for c in valid_cities if c["us_aqi"] is not None]
    median_us_aqi = round(statistics.median(us_aqi_values)) if us_aqi_values else median_naqi
    mean_us_aqi = round(statistics.mean(us_aqi_values), 1) if us_aqi_values else mean_naqi
    
    computed_data = {
        "card_summary": {
            "title": "National Context (100 Indian Cities)",
            "median_india_naqi": median_naqi,
            "mean_india_naqi": mean_naqi,
            "median_us_aqi": median_us_aqi,
            "mean_us_aqi": mean_us_aqi,
            "range": range_naqi_str,
            "min_city": {"city": sorted_by_naqi[0]["city"], "naqi": sorted_by_naqi[0].get("india_naqi", 50), "us_aqi": sorted_by_naqi[0]["us_aqi"]},
            "max_city": {"city": sorted_by_naqi[-1]["city"], "naqi": sorted_by_naqi[-1].get("india_naqi", 300), "us_aqi": sorted_by_naqi[-1]["us_aqi"]},
            "model": "CAMS Global PM2.5 with CPCB NAQI Linear Interpolation"
        },
        "cleanest_cities": [
            {
                "city": c["city"],
                "naqi": c.get("india_naqi", c["us_aqi"]),
                "us_aqi": c["us_aqi"],
                "category": c.get("cpcb_category", c["category"]),
                "pm2_5": c.get("pm2_5")
            }
            for c in sorted_by_naqi[:5]
        ],
        "most_polluted_cities": [
            {
                "city": c["city"],
                "naqi": c.get("india_naqi", c["us_aqi"]),
                "us_aqi": c["us_aqi"],
                "category": c.get("cpcb_category", c["category"]),
                "pm2_5": c.get("pm2_5")
            }
            for c in sorted_by_naqi[-5:][::-1]
        ],
        "total_cities_evaluated": len(all_city_results),
        "valid_cities_count": len(valid_cities),
        "disclaimer": (
            "National statistics are computed using official Central Pollution Control Board (CPCB) "
            "sub-index interpolation from Open-Meteo CAMS Global PM2.5 forecasts."
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
