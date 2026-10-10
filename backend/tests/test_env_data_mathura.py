import requests
import json

# Target Location: Bharthia / Mathura Region
LAT = 27.49
LNG = 77.67
TIMEZONE = "Asia/Kolkata"

def inspect_and_build_payload():
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LNG}&current=temperature_2m,apparent_temperature,relative_humidity_2m&hourly=temperature_2m,apparent_temperature,relative_humidity_2m&timezone={TIMEZONE}&forecast_hours=24"
    aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={LAT}&longitude={LNG}&current=pm10,pm2_5,us_aqi&hourly=pm10,pm2_5,us_aqi&timezone={TIMEZONE}&forecast_hours=24&domains=cams_global"

    try:
        w_res = requests.get(weather_url).json()
        aq_res = requests.get(aq_url).json()

        # 1. Metadata Verification (Inspection Check)
        grid_lat = w_res.get("latitude")
        grid_lng = w_res.get("longitude")
        utc_offset = w_res.get("utc_offset_seconds")
        
        print("=== DATA PROVENANCE & METADATA CHECK ===")
        print(f"Requested Point  : Lat {LAT}, Lng {LNG}")
        print(f"Model Grid Cell  : Lat {grid_lat}, Lng {grid_lng}")
        print(f"Timezone Name    : {w_res.get('timezone')} (Offset: {utc_offset}s)")
        print(f"Current Estimate : Weather @ {w_res.get('current', {}).get('time')} | AQ @ {aq_res.get('current', {}).get('time')}")
        print(f"First Hourly Slot: {w_res.get('hourly', {}).get('time', [None])[0]}")
        print("=======================================\n")

        # 2. Current Model Estimate
        current_estimate = {
            "source": "Open-Meteo Model Grid",
            "model_domain": "CAMS Global (~45km resolution)",
            "grid_coordinates": {"lat": grid_lat, "lng": grid_lng},
            "timestamp": aq_res["current"]["time"],
            "timezone": TIMEZONE,
            "utc_offset_seconds": utc_offset,
            "weather": {
                "temperature_2m_c": w_res["current"]["temperature_2m"],
                "apparent_temperature_c": w_res["current"]["apparent_temperature"],
                "relative_humidity_pct": w_res["current"]["relative_humidity_2m"]
            },
            "air_quality": {
                "pm2_5_ug_m3": aq_res["current"]["pm2_5"],
                "us_aqi": aq_res["current"]["us_aqi"],
                "us_aqi_note": "U.S. EPA AQI index scale (24-hr rolling PM2.5 sub-index); distinct from India CPCB NAQI"
            },
            "status": "current_model_estimate"
        }

        # 3. Forecast Array Construction
        w_hourly = w_res.get("hourly", {})
        aq_hourly = aq_res.get("hourly", {})
        forecasts = []

        for i in range(len(w_hourly.get("time", []))):
            forecasts.append({
                "time": w_hourly["time"][i],
                "timezone": TIMEZONE,
                "weather": {
                    "temperature_2m_c": w_hourly["temperature_2m"][i],
                    "apparent_temperature_c": w_hourly["apparent_temperature"][i],
                    "relative_humidity_pct": w_hourly["relative_humidity_2m"][i]
                },
                "air_quality": {
                    "pm2_5_ug_m3": aq_hourly["pm2_5"][i],
                    "us_aqi": aq_hourly["us_aqi"][i],
                    "domain": "cams_global",
                    "status": "hourly_interpolated_forecast"
                }
            })

        return {
            "location_request": {
                "lat": LAT,
                "lng": LNG,
                "timezone": TIMEZONE
            },
            "current_model_estimate": current_estimate,
            "forecasts": forecasts,
            "disclaimers": [
                "Weather and air-quality values are gridded model estimates from Open-Meteo / CAMS Global.",
                "Apparent temperature represents feels-like conditions, not a clinical heat index.",
                "U.S. AQI is used for standardized comparative scoring across time slots."
            ]
        }

    except Exception as e:
        print(f"Error fetching data: {e}")
        return {}

if __name__ == "__main__":
    payload = inspect_and_build_payload()
    print(json.dumps(payload, indent=2))