import sys, requests, json
sys.stdout.reconfigure(encoding='utf-8')
payload = {
    "latitude": 30.73944,
    "longitude": 79.49408,
    "duration_minutes": 45,
    "availability_start_hour": 6,
    "availability_end_hour": 21,
    "max_temp": 32,
    "max_pm25": 60,
    "rain_ok": True,
    "rain_threshold": 20,
    "enable_fallback": True,
    "task_name": "Walk"
}
res = requests.post("http://localhost:5000/api/schedule", json=payload).json()
print("Status:", res.get("status"))
if "decision_timeline" in res:
    print("Timeline count:", len(res["decision_timeline"]))
    for h in res["decision_timeline"][:5]:
        print("Hour:", h.get("time"), "Apparent:", h.get("apparent_temperature"), "PM25:", h.get("pm2_5"), "Rain:", h.get("precipitation_probability"))
if "recommendation" in res:
    print("Rec:", res["recommendation"])
