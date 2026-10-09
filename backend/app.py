from flask import Flask, request, jsonify
from flask_cors import CORS
from services.env_data import get_coordinates, get_location_candidates, fetch_environmental_data
from services.scheduler import find_optimal_schedule
from services.llm_engine import generate_explanation, verify_image, RateLimitExceeded
from services.national_context import get_national_context
import base64
import json
import io

app = Flask(__name__)
CORS(app)

# Maximum request body size: 10 MB
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

# Allowed image magic bytes for format validation
ALLOWED_IMAGE_SIGNATURES = {
    b'\xff\xd8\xff': 'image/jpeg',     # JPEG
    b'\x89PNG\r\n\x1a\n': 'image/png', # PNG
}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB decoded image limit
MAX_IMAGE_DIMENSION = 4096          # Max width or height in pixels


def _validate_image_bytes(image_bytes):
    """
    Validates decoded image bytes against magic byte signatures and dimensions.
    Returns mime_type if valid, raises ValueError if not.
    """
    # Check magic bytes
    matched_mime = None
    for signature, mime_type in ALLOWED_IMAGE_SIGNATURES.items():
        if image_bytes[:len(signature)] == signature:
            matched_mime = mime_type
            break
    
    if not matched_mime:
        raise ValueError("Unsupported image format. Only JPEG and PNG are accepted.")
    
    # Check image dimensions to reject decompression bombs
    try:
        if matched_mime == 'image/jpeg':
            width, height = _get_jpeg_dimensions(image_bytes)
        elif matched_mime == 'image/png':
            width, height = _get_png_dimensions(image_bytes)
        else:
            width, height = 0, 0
            
        if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
            raise ValueError(f"Image dimensions {width}x{height} exceed maximum {MAX_IMAGE_DIMENSION}x{MAX_IMAGE_DIMENSION}")
        if width * height > MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION:
            raise ValueError(f"Image pixel count too large")
    except ValueError:
        raise
    except Exception:
        # If we can't parse dimensions, allow it through (Gemini will handle it)
        pass
    
    return matched_mime


def _get_jpeg_dimensions(data):
    """Extract dimensions from JPEG data without PIL."""
    i = 2
    while i < len(data) - 1:
        if data[i] != 0xFF:
            break
        marker = data[i + 1]
        if marker == 0xC0 or marker == 0xC2:  # SOF0 or SOF2
            height = (data[i + 5] << 8) + data[i + 6]
            width = (data[i + 7] << 8) + data[i + 8]
            return width, height
        length = (data[i + 2] << 8) + data[i + 3]
        i += 2 + length
    return 0, 0


def _get_png_dimensions(data):
    """Extract dimensions from PNG IHDR chunk."""
    if len(data) < 24:
        return 0, 0
    width = int.from_bytes(data[16:20], 'big')
    height = int.from_bytes(data[20:24], 'big')
    return width, height


@app.route('/api/geocode', methods=['POST'])
def geocode():
    """
    Returns candidate places for a location string.
    User confirms the correct one before scheduling.
    """
    try:
        data = request.json
        location = data.get('location', '').strip()
        
        if not location:
            return jsonify({"error": "Location string is required"}), 400
        if len(location) > 200:
            return jsonify({"error": "Location string too long"}), 400
            
        candidates = get_location_candidates(location)
        
        if not candidates:
            return jsonify({"error": f"No places found matching '{location}'"}), 404
            
        return jsonify({"candidates": candidates})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/national-context', methods=['GET'])
def national_context():
    """
    Returns the cached National Context summary across 100 Indian cities
    (Median U.S. AQI, Range, Cleanest/Most Polluted, Model Info).
    Cached for 1 hour to prevent Open-Meteo rate limiting and eliminate latency.
    """
    try:
        force = request.args.get('refresh', '').lower() == 'true'
        context_data = get_national_context(force_refresh=force)
        return jsonify(context_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/schedule', methods=['POST'])
def schedule_task():
    """
    Accepts confirmed coordinates (or location string) and user preferences.
    Returns scheduling result with raw data and optional LLM explanation.
    """
    try:
        data = request.json
        
        # Accept either confirmed coordinates or a location string (convenience)
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        location = data.get('location')
        
        if latitude is not None and longitude is not None:
            coords = {"latitude": latitude, "longitude": longitude, "name": "Custom", "country": ""}
        elif location:
            coords = get_coordinates(location)
        else:
            return jsonify({"error": "Either (latitude, longitude) or location is required"}), 400
        
        duration = data.get('duration_hours', 1)
        max_temp = data.get('max_temp', 45.0)
        max_aqi = data.get('max_aqi', 200)
        rain_ok = data.get('rain_ok', False)
        rain_threshold = data.get('rain_threshold', 20)
        enable_fallback = data.get('enable_fallback', False)
        task_type = data.get('task_type', 'moderate')
        
        # Basic input validation
        if not isinstance(duration, (int, float)) or duration < 1 or duration > 12:
            return jsonify({"error": "duration_hours must be between 1 and 12"}), 400
        
        # 1. Fetch forecast data
        env_data_result = fetch_environmental_data(coords['latitude'], coords['longitude'])
        if not env_data_result or not env_data_result.get("data"):
            return jsonify({"error": "Could not fetch environmental forecast data"}), 500
            
        # 2. Find Schedule with distinct outcome evaluation
        result = find_optimal_schedule(
            env_data_result, int(duration), max_temp, max_aqi,
            rain_ok=rain_ok, rain_threshold=rain_threshold,
            enable_fallback=enable_fallback, task_type=task_type
        )
        
        # 3. Generate LLM Explanation (optional enhancement, not authoritative)
        if result.get("status") == "success" and "recommendation" in result:
            fact_string = result["recommendation"]["fact_string"]
            result["recommendation"]["human_explanation"] = generate_explanation(
                fact_string, outcome_type="preference_qualified"
            )
        elif result.get("status") == "fallback_alternative" and "alternative" in result:
            fact_string = result["alternative"]["fact_string"]
            result["alternative"]["human_explanation"] = generate_explanation(
                fact_string, outcome_type="best_available_alternative"
            )
        
        result["location"] = coords
        return jsonify(result)
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except ConnectionError as e:
        return jsonify({"error": f"External API unavailable: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/verify-task', methods=['POST'])
def verify_task():
    """
    Image-based scene/gesture check for eco-streak tasks.
    Returns verified / not_verified / inconclusive — never "fraudulent".
    """
    try:
        data = request.json
        image_base64 = data.get('image')
        task_name = data.get('task_name', '').strip()
        
        if not image_base64 or not task_name:
            return jsonify({"error": "Both 'image' (base64) and 'task_name' are required"}), 400
        if len(task_name) > 500:
            return jsonify({"error": "task_name too long"}), 400
            
        # Decode base64 (handle data URI format)
        try:
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            image_bytes = base64.b64decode(image_base64)
        except Exception:
            return jsonify({"error": "Invalid base64 image data"}), 400
        
        # Validate image size
        if len(image_bytes) > MAX_IMAGE_BYTES:
            return jsonify({"error": f"Image too large. Maximum {MAX_IMAGE_BYTES // (1024*1024)} MB"}), 400
        
        # Validate image format via magic bytes and dimensions
        try:
            detected_mime = _validate_image_bytes(image_bytes)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        
        # Run vision check (Image bytes are never logged)
        raw_result = verify_image(image_bytes, task_name)
        model_output = json.loads(raw_result)
        
        # Server-side decision vocabulary: verified / not_verified / inconclusive
        # Distinct triggers and user messages
        appears = model_output.get("appears_completed")
        confidence = model_output.get("confidence", "low")
        reason_cat = model_output.get("reason_category", "ambiguous_or_unclear")
        
        if appears is True and confidence in ["high", "medium"]:
            decision = "verified"
            user_message = "Visual check confirmed plausible task completion."
        elif appears is False and confidence in ["high", "medium"] and reason_cat == "task_absent":
            decision = "not_verified"
            user_message = "The required task or gesture was not observed in the image."
        else:
            # Low confidence, ambiguous scene, or unclear reasoning defaults safely to inconclusive
            decision = "inconclusive"
            user_message = "The image is unclear or ambiguous; unable to confirm task completion. Please retake the photo."
            
        response = {
            "task_name": task_name,
            "status": decision,
            "user_message": user_message,
            "model_assessment": model_output
        }
        
        return jsonify(response)
        
    except RateLimitExceeded:
        return jsonify({"error": "Service busy. Please try again shortly."}), 503
    except json.JSONDecodeError:
        return jsonify({
            "task_name": task_name,
            "status": "inconclusive",
            "user_message": "Verification input could not be reliably evaluated. Please try again.",
            "model_assessment": {"notes": "Model returned unparseable output"}
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
