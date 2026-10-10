import requests
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
print("Current conditions:", res.get("current_conditions"))
print("First timeline hour:", res.get("decision_timeline", [])[0] if res.get("decision_timeline") else None)
