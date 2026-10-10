import requests
url = "https://api.open-meteo.com/v1/forecast?latitude=30.73944&longitude=79.49408&current=temperature_2m,apparent_temperature,precipitation,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=auto"
res = requests.get(url).json()
print("Current:", res.get("current"))
