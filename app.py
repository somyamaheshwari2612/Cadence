from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

LAT = 27.49
LNG = 77.67
TIMEZONE = "Asia/Kolkata"

def fetch_environmental_data():
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LNG}&current=temperature_2m,apparent_temperature,relative_humidity_2m&hourly=temperature_2m,apparent_temperature,relative_humidity_2m&timezone={TIMEZONE}&forecast_hours=24"
    aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={LAT}&longitude={LNG}&current=pm10,pm2_5,us_aqi&hourly=pm10,pm2_5,us_aqi&timezone={TIMEZONE}&forecast_hours=24&domains=cams_global"
    
    try:
        w_res = requests.get(weather_url).json()
        aq_res = requests.get(aq_url).json()
        
        grid_lat = w_res.get("latitude")
        grid_lng = w_res.get("longitude")
        utc_offset = w_res.get("utc_offset_seconds")

        # 1. Separated Current Estimates
        current_estimate = {
            "source": "Open-Meteo Model Grid",
            "model_domain": "CAMS Global",
            "grid_coordinates": {"lat": grid_lat, "lng": grid_lng},
            "weather_timestamp": w_res.get("current", {}).get("time"),
            "aq_timestamp": aq_res.get("current", {}).get("time"),
            "timezone": TIMEZONE,
            "utc_offset_seconds": utc_offset,
            "weather": {
                "temperature_2m_c": w_res.get("current", {}).get("temperature_2m"),
                "apparent_temperature_c": w_res.get("current", {}).get("apparent_temperature"),
                "relative_humidity_pct": w_res.get("current", {}).get("relative_humidity_2m")
            },
            "air_quality": {
                "pm2_5_ug_m3": aq_res.get("current", {}).get("pm2_5"),
                "us_aqi": aq_res.get("current", {}).get("us_aqi"),
                "us_aqi_note": "U.S. AQI scale"
            },
            "status": "current_model_estimate"
        }

        # 2. Safely Merged Forecasts
        w_hourly = w_res.get("hourly", {})
        aq_hourly = aq_res.get("hourly", {})
        forecasts = []

        # Only merge if we have data and the arrays align
        if "time" in w_hourly and "time" in aq_hourly:
            for i in range(len(w_hourly["time"])):
                # Ensure timestamps align before merging
                if i < len(aq_hourly["time"]) and w_hourly["time"][i] == aq_hourly["time"][i]:
                    forecasts.append({
                        "time": w_hourly["time"][i],
                        "timezone": TIMEZONE,
                        "weather": {
                            "temperature_2m_c": w_hourly.get("temperature_2m", [])[i],
                            "apparent_temperature_c": w_hourly.get("apparent_temperature", [])[i],
                            "relative_humidity_pct": w_hourly.get("relative_humidity_2m", [])[i]
                        },
                        "air_quality": {
                            "pm2_5_ug_m3": aq_hourly.get("pm2_5", [])[i],
                            "us_aqi": aq_hourly.get("us_aqi", [])[i],
                            "domain": "cams_global",
                            "status": "hourly_interpolated_forecast"
                        }
                    })

        return {
            "location_request": {"lat": LAT, "lng": LNG, "timezone": TIMEZONE},
            "current_model_estimate": current_estimate,
            "forecasts": forecasts,
            "disclaimers": [
                "Weather and air-quality values are gridded model estimates from Open-Meteo / CAMS Global.",
                "Apparent temperature represents feels-like conditions, not a clinical heat index.",
                "U.S. AQI is used for standardized comparative scoring across timeslots."
            ]
        }

    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

# The Deterministic Routing Algorithm
@app.route('/api/schedule', methods=['POST'])
def schedule_tasks():
    data = request.json
    tasks = data.get("tasks", [])
    
    env_data = fetch_environmental_data()
    if not env_data or not env_data.get("forecasts"):
         return jsonify({"error": "Failed to fetch forecast data."}), 500
         
    forecasts = env_data["forecasts"]
    scheduled_itinerary = []

    for task in tasks:
        best_slot = None
        best_score = float('inf')
        
        task_name = task.get("name", "Unnamed Task")
        # Product Rules (Configurable preferences, NOT medical thresholds)
        max_aqi_pref = task.get("max_aqi_preference", 150) 
        max_temp_pref = task.get("max_temp_preference", 35)
        # Duration checking could be added here, currently scoring single start hour

        for slot in forecasts:
            aqi = slot["air_quality"].get("us_aqi")
            temp = slot["weather"].get("apparent_temperature_c")
            
            # Rule 1: Hard Reject if missing data
            if aqi is None or temp is None:
                continue
                
            # Rule 2: Hard Reject if it exceeds user safety preferences
            if aqi > max_aqi_pref or temp > max_temp_pref:
                continue
            
            # Rule 3: Score the remaining valid slots
            risk_score = aqi + temp
            
            if risk_score < best_score:
                best_score = risk_score
                best_slot = slot
        
        if best_slot:
            # Fact String for the LLM Explainer later
            fact_string = f"Forecast apparent temperature is {best_slot['weather']['apparent_temperature_c']}°C. Forecast U.S. AQI is {best_slot['air_quality']['us_aqi']}."
            
            scheduled_itinerary.append({
                "task": task_name,
                "scheduled_time": best_slot["time"],
                "expected_aqi": best_slot["air_quality"]["us_aqi"],
                "expected_temp": best_slot["weather"]["apparent_temperature_c"],
                "fact_string": fact_string,
                "status": "Scheduled successfully based on product rules."
            })
        else:
            scheduled_itinerary.append({
                "task": task_name,
                "status": "No suitable outdoor slot found within your preferred parameters."
            })

    return jsonify({
        "current_estimate": env_data["current_model_estimate"],
        "itinerary": scheduled_itinerary,
        "disclaimers": env_data["disclaimers"]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)