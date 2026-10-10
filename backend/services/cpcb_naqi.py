"""
CPCB National Air Quality Index (NAQI) Engine for India.
Calculates official Central Pollution Control Board (CPCB) sub-indices and overall NAQI
from physical pollutant concentrations (PM2.5 and PM10 in µg/m³).

Reference: Central Pollution Control Board (CPCB), Ministry of Environment,
Forest and Climate Change, Government of India.
"""

def calculate_pm25_subindex(pm25):
    """
    Calculates Indian CPCB NAQI sub-index for PM2.5 (µg/m³).
    Breakpoints:
       0 - 30   ->   0 - 50  (Good)
      31 - 60   ->  51 - 100 (Satisfactory)
      61 - 90   -> 101 - 200 (Moderate)
      91 - 120  -> 201 - 300 (Poor)
     121 - 250  -> 301 - 400 (Very Poor)
       > 250    -> 401 - 500 (Severe)
    """
    if pm25 is None or pm25 < 0:
        return None
    
    if pm25 <= 30:
        return round((50.0 / 30.0) * pm25)
    elif pm25 <= 60:
        return round(50.0 + ((50.0 / 30.0) * (pm25 - 30.0)))
    elif pm25 <= 90:
        return round(100.0 + ((100.0 / 30.0) * (pm25 - 60.0)))
    elif pm25 <= 120:
        return round(200.0 + ((100.0 / 30.0) * (pm25 - 90.0)))
    elif pm25 <= 250:
        return round(300.0 + ((100.0 / 130.0) * (pm25 - 120.0)))
    else:
        # Severe: scaled up to 500
        val = 400.0 + ((100.0 / 150.0) * (pm25 - 250.0))
        return round(min(500.0, val))


def calculate_pm10_subindex(pm10):
    """
    Calculates Indian CPCB NAQI sub-index for PM10 (µg/m³).
    Breakpoints:
       0 - 50   ->   0 - 50  (Good)
      51 - 100  ->  51 - 100 (Satisfactory)
     101 - 250  -> 101 - 200 (Moderate)
     251 - 350  -> 201 - 300 (Poor)
     351 - 430  -> 301 - 400 (Very Poor)
       > 430    -> 401 - 500 (Severe)
    """
    if pm10 is None or pm10 < 0:
        return None
        
    if pm10 <= 50:
        return round(pm10)
    elif pm10 <= 100:
        return round(50.0 + (pm10 - 50.0))
    elif pm10 <= 250:
        return round(100.0 + ((100.0 / 150.0) * (pm10 - 100.0)))
    elif pm10 <= 350:
        return round(200.0 + ((100.0 / 100.0) * (pm10 - 250.0)))
    elif pm10 <= 430:
        return round(300.0 + ((100.0 / 80.0) * (pm10 - 350.0)))
    else:
        val = 400.0 + ((100.0 / 70.0) * (pm10 - 430.0))
        return round(min(500.0, val))


def get_cpcb_category(naqi_value):
    """
    Returns official CPCB category, color code, and health advisory.
    """
    if naqi_value is None:
        return {
            "category": "Unavailable",
            "color": "gray",
            "advisory": "Data unavailable",
            "rank": 0
        }
        
    val = round(naqi_value)
    if val <= 50:
        return {
            "category": "Good",
            "color": "emerald",
            "advisory": "Lowest category on the CPCB scale.",
            "plain_language": "Lowest category on the CPCB scale",
            "rank": 1
        }
    elif val <= 100:
        return {
            "category": "Satisfactory",
            "color": "lime",
            "advisory": "Generally acceptable; sensitive people may notice minor breathing discomfort.",
            "plain_language": "Generally acceptable; sensitive people may notice minor breathing discomfort",
            "rank": 2
        }
    elif val <= 200:
        return {
            "category": "Moderate",
            "color": "yellow",
            "advisory": "Sensitive groups may experience breathing discomfort; reduce prolonged outdoor exertion if that applies.",
            "plain_language": "Sensitive groups may experience breathing discomfort; reduce prolonged outdoor exertion if that applies",
            "rank": 3
        }
    elif val <= 300:
        return {
            "category": "Poor",
            "color": "orange",
            "advisory": "Prolonged outdoor exposure may be uncomfortable for many people; surface an indoor/shorter/lower-intensity option.",
            "plain_language": "Prolonged outdoor exposure may be uncomfortable for many people; surface an indoor/shorter/lower-intensity option",
            "rank": 4
        }
    elif val <= 400:
        return {
            "category": "Very Poor",
            "color": "red",
            "advisory": "Elevated concern for prolonged exposure; prominently show postponing/indoor alternatives.",
            "plain_language": "Elevated concern for prolonged exposure; prominently show postponing/indoor alternatives",
            "rank": 5
        }
    else:
        return {
            "category": "Severe",
            "color": "rose",
            "advisory": "Highest CPCB category; prominently surface official local guidance and indoor/postpone choices.",
            "plain_language": "Highest CPCB category; prominently surface official local guidance and indoor/postpone choices",
            "rank": 6
        }


def calculate_india_naqi(pm25=None, pm10=None):
    """
    Computes overall CPCB NAQI as max of available sub-indices.
    """
    sub_indices = []
    if pm25 is not None:
        sub_indices.append(calculate_pm25_subindex(pm25))
    if pm10 is not None:
        sub_indices.append(calculate_pm10_subindex(pm10))
        
    valid = [s for s in sub_indices if s is not None]
    if not valid:
        return None
        
    overall = max(valid)
    info = get_cpcb_category(overall)
    return {
        "naqi": overall,
        "category": info["category"],
        "color": info["color"],
        "advisory": info["advisory"],
        "dominant_pollutant": "PM2.5" if (pm25 is not None and calculate_pm25_subindex(pm25) == overall) else "PM10"
    }
