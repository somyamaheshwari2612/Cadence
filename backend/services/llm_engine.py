import os
import re
import time
from google import genai
from google.genai import types

# ---------------------------------------------------------
# Rate Limiting (Single-process only — see logic_documentation.md §4.2)
# ---------------------------------------------------------
MAX_RPM = 13
_request_timestamps = []

def _check_rate_limit():
    """
    Checks if we are within the 13 RPM budget.
    Returns True if ok to proceed, False if limit reached.
    Does NOT sleep — callers should fail fast and return a retryable error.
    """
    global _request_timestamps
    now = time.time()
    _request_timestamps = [t for t in _request_timestamps if now - t < 60]
    
    if len(_request_timestamps) >= MAX_RPM:
        return False
    
    _request_timestamps.append(now)
    return True

class RateLimitExceeded(Exception):
    """Raised when internal rate limit is hit. Caller should return 503."""
    pass

# ---------------------------------------------------------
# Client Setup
# ---------------------------------------------------------
def get_client():
    from dotenv import load_dotenv
    load_dotenv()
    
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        raise ValueError("Missing valid GOOGLE_API_KEY. Did you update the backend/.env file?")
    return genai.Client(api_key=api_key)

# ---------------------------------------------------------
# Explanation Generation
# ---------------------------------------------------------
def _validate_explanation(explanation, fact_string):
    """
    Validation: check that key numbers from the fact string
    appear in the Gemini output. If not, the explanation may contain
    hallucinated data.
    """
    fact_numbers = re.findall(r'\d+\.?\d*', fact_string)
    if not fact_numbers:
        return True
    
    critical_matches = 0
    for num in fact_numbers[:4]:
        if num in explanation:
            critical_matches += 1
            
    return critical_matches >= len(fact_numbers[:4]) / 2


def generate_explanation(fact_string, outcome_type="preference_qualified"):
    """
    Asks Gemini to rephrase the deterministic fact string in natural language.
    Strictly preserves labels, disclaimers, and exposure reduction guidance.
    Falls back to the raw fact string if rate-limited or validation fails.
    """
    if not _check_rate_limit():
        return fact_string
    
    try:
        client = get_client()
        
        if outcome_type == "best_available_alternative" or "outside your preferences" in fact_string:
            prompt = f"""You are Exposure Router, a transparent activity planning assistant.
The user requested a fallback alternative because NO time slot met their stated limits.
Here is the authoritative data:

{fact_string}

Task: Rephrase this into clear, helpful text (maximum 3 sentences).
STRICT RULES:
1. Label the slot as "outside your preferences—not assessed as safe" or the "lowest-ranked option among available forecast slots".
2. Refer to the AQI value explicitly as a "mean forecast U.S. AQI" (not Indian National AQI).
3. DO NOT use words like "safe", "healthy", or "least hazardous". Never make an authoritative clinical or health determination.
4. Clearly state which limits it exceeds and reference the underlying hourly values if provided.
5. Present exposure-reduction choices (postponing, moving indoors, shortening duration, reducing exertion) as general informational options, not personalized medical prescriptions.
6. End with the caveat: "Forecasts are uncertain; this is not a safety or medical recommendation."
7. Mention official local guidance: Central Pollution Control Board (CPCB) for India (and AirNow as a U.S. reference).
8. Do not add any fabricated data not present in the fact string."""
        else:
            prompt = f"""You are Exposure Router, a helpful scheduling assistant.
The scheduling system has found a slot that MEETS the user's preferences:

{fact_string}

Task: Rephrase this into a warm, concise explanation (maximum 3 sentences) that a user would find helpful.
STRICT RULES:
1. Label it as "meets your preferences".
2. Refer to the AQI as forecast U.S. AQI.
3. Only rephrase the information given — do not add outside weather data, medical advice, or safety guarantees.
4. Keep all numbers, times, and units accurate."""
        
        model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-lite")
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
        except Exception as model_err:
            if "not found" in str(model_err).lower() or "404" in str(model_err):
                # Fallback to standard flash if lite is not registered
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt
                )
            else:
                raise model_err
        
        explanation = response.text.strip()
        
        if _validate_explanation(explanation, fact_string):
            return explanation
        else:
            return fact_string
            
    except Exception as e:
        error_str = str(e)
        if "429" in error_str:
            return fact_string
        raise


def verify_image(image_bytes, expected_task):
    """
    Image-based scene/gesture check using Gemini Vision.
    
    This is NOT anti-spoofing or proof of action.
    Returns structured result with separate decision and model explanation.
    Never logs image bytes.
    """
    if not _check_rate_limit():
        raise RateLimitExceeded("Rate limit reached. Please try again shortly.")
    
    try:
        client = get_client()
        
        prompt = f"""You are an image verification assistant.
The user claims they completed this environmental task: '{expected_task}'.

Look at the provided image and assess whether it plausibly shows this task or gesture being done.

Respond strictly in JSON format:
{{
    "appears_completed": boolean,
    "confidence": "high" | "medium" | "low",
    "scene_description": "brief description of what you see in the image",
    "reason_category": "task_present" | "task_absent" | "ambiguous_or_unclear",
    "notes": "any relevant observations"
}}

Distinction Rules:
- If the image is clear and you can see the user did NOT complete the gesture/task, set appears_completed: false, confidence: "high" or "medium", and reason_category: "task_absent".
- If the image is blurry, corrupted, screen reflection is ambiguous, or you are unsure, set confidence: "low" and reason_category: "ambiguous_or_unclear"."""
        
        model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash-lite")
        gen_config = types.GenerateContentConfig(response_mime_type="application/json")
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'),
                    prompt
                ],
                config=gen_config
            )
        except Exception as model_err:
            if "not found" in str(model_err).lower() or "404" in str(model_err):
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[
                        types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'),
                        prompt
                    ],
                    config=gen_config
                )
            else:
                raise model_err
        return response.text
    except Exception as e:
        error_str = str(e)
        if "429" in error_str:
            raise RateLimitExceeded("Upstream model rate limit reached.")
        raise
