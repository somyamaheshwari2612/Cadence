import requests
url = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=30.73944&longitude=79.49408&current=pm2_5,us_aqi&timezone=auto"
res = requests.get(url).json()
print("Air Quality Current:", res.get("current"))
