import os
import sys

# Ensure backend directory is in sys.path so services is always found
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from flask import Flask, request, jsonify
from flask_cors import CORS
from services.env_data import get_coordinates, get_location_candidates, fetch_environmental_data
from services.scheduler import find_optimal_schedule
from services.llm_engine import verify_image, RateLimitExceeded
import base64
import json
import io
import requests

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

def build_cors_preflight_response():
    response = jsonify({})
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response, 200

def corsify_response(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response



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


@app.route('/healthz', methods=['GET'])
@app.route('/api/health', methods=['GET'])
@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint for Render service monitoring."""
    return jsonify({
        "status": "healthy",
        "service": "cadence-backend",
        "version": "1.0.0"
    }), 200


@app.route('/api/debug-weather', methods=['GET'])
def debug_weather():
    """Diagnostic endpoint to inspect Open-Meteo calls directly on Render."""
    lat = request.args.get('lat', 34.1526)
    lon = request.args.get('lon', 77.5771)
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,apparent_temperature&timezone=auto"
    headers = {"User-Agent": "CadenceApp/1.0 (https://cadence-sm.vercel.app; somya@cadence.app)"}
    try:
        r = requests.get(weather_url, headers=headers, timeout=10)
        return jsonify({
            "status_code": r.status_code,
            "response_snippet": r.text[:300],
            "headers": dict(r.headers)
        })
    except Exception as e:
        import traceback
        return jsonify({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500



@app.route('/api/geocode', methods=['POST', 'OPTIONS'])
def geocode():
    """
    Returns candidate places for a location string.
    User confirms the correct one before scheduling.
    """
    if request.method == 'OPTIONS':
        return build_cors_preflight_response()
        
    try:
        data = request.json
        location = data.get('location', '').strip()
        
        if not location:
            return jsonify({"error": "Location string is required"}), 400
        if len(location) > 200:
            return jsonify({"error": "Location string too long"}), 400
            
        candidates = get_location_candidates(location)
        return corsify_response(jsonify({"candidates": candidates or []}))
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return corsify_response(jsonify({"error": str(e)})), 500





@app.route('/api/schedule', methods=['POST', 'OPTIONS'])
def schedule_task():
    """
    Accepts confirmed coordinates (or location string) and user preferences.
    Returns scheduling result with raw data and optional LLM explanation.
    """
    if request.method == 'OPTIONS':
        return build_cors_preflight_response()
        
    try:
        data = request.get_json(silent=True) or {}
        
        # Accept either confirmed coordinates or a location string (convenience)
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        location = data.get('location')
        
        if latitude is not None and longitude is not None:
            try:
                lat = float(latitude)
                lon = float(longitude)
            except (ValueError, TypeError):
                return jsonify({"error": "latitude and longitude must be valid numbers"}), 400
            loc_name = data.get('name') or data.get('location_name') or "Selected Location"
            country = data.get('country', '')
            coords = {"latitude": lat, "longitude": lon, "name": loc_name, "country": country}
        elif location:
            coords = get_coordinates(location)
        else:
            return jsonify({"error": "Either (latitude, longitude) or location is required"}), 400
        
        # Flexible duration parsing (minutes or hours)
        duration_minutes = data.get('duration_minutes')
        if duration_minutes is not None:
            try:
                duration_minutes = int(float(duration_minutes))
            except (ValueError, TypeError):
                duration_minutes = 45
        else:
            try:
                duration_minutes = int(float(data.get('duration_hours', 1)) * 60)
            except (ValueError, TypeError):
                duration_minutes = 60
                
        avail_start_m = data.get('availability_start_minutes')
        if avail_start_m is not None:
            try:
                avail_start_m = int(float(avail_start_m))
            except (ValueError, TypeError):
                avail_start_m = None

        avail_end_m = data.get('availability_end_minutes')
        if avail_end_m is not None:
            try:
                avail_end_m = int(float(avail_end_m))
            except (ValueError, TypeError):
                avail_end_m = None

        try:
            avail_start = float(data.get('availability_start_hour', 6))
        except (ValueError, TypeError):
            avail_start = 6.0
            
        try:
            avail_end = float(data.get('availability_end_hour', 21))
        except (ValueError, TypeError):
            avail_end = 21.0
            
        task_name = data.get('task_name') or data.get('task') or "Walk"
        
        # Flexible max_temp parsing
        try:
            max_temp = float(data.get('max_temp', 45.0))
        except (ValueError, TypeError):
            max_temp = 45.0
            
        # Support both max_pm25 and max_aqi seamlessly
        raw_pm25 = data.get('max_pm25')
        raw_aqi = data.get('max_aqi')
        max_pm25 = float(raw_pm25) if raw_pm25 is not None else None
        max_aqi = float(raw_aqi) if raw_aqi is not None else None
        
        if max_pm25 is None and max_aqi is None:
            max_pm25 = 60.0 # Default PM2.5 in ug/m3
            
        rain_ok = bool(data.get('rain_ok', False))
        rain_threshold = float(data.get('rain_threshold', 20))
        enable_fallback = bool(data.get('enable_fallback', False))
        
        # 1. Fetch forecast data
        env_data_result = fetch_environmental_data(coords['latitude'], coords['longitude'])
        if not env_data_result or not env_data_result.get("data"):
            return jsonify({"error": "Could not fetch environmental forecast data"}), 500
            
        # 2. Find Schedule with distinct outcome evaluation
        result = find_optimal_schedule(
            env_data_result,
            max_temp=max_temp,
            max_pm25=max_pm25,
            max_aqi=max_aqi,
            rain_ok=rain_ok,
            rain_threshold=rain_threshold,
            enable_fallback=enable_fallback,
            duration_minutes=duration_minutes,
            availability_start_hour=avail_start,
            availability_end_hour=avail_end,
            availability_start_minutes=avail_start_m,
            availability_end_minutes=avail_end_m,
            task_name=task_name
        )
        
        result["task_name"] = task_name
        result["location"] = coords
        return corsify_response(jsonify(result))
        
    except ValueError as e:
        return corsify_response(jsonify({"error": str(e)})), 400
    except ConnectionError as e:
        return corsify_response(jsonify({"error": f"External API unavailable: {str(e)}"})), 502
    except Exception as e:
        import traceback
        traceback.print_exc()
        return corsify_response(jsonify({"error": str(e)})), 500


@app.route('/api/verify-task', methods=['POST', 'OPTIONS'])
def verify_task():
    """
    Image-based scene/gesture check for eco-streak tasks.
    Returns verified / not_verified / inconclusive — never "fraudulent".
    """
    if request.method == 'OPTIONS':
        return build_cors_preflight_response()
        
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
        
        return corsify_response(jsonify(response))
        
    except RateLimitExceeded:
        return corsify_response(jsonify({"error": "Service busy. Please try again shortly."})), 503
    except json.JSONDecodeError:
        return corsify_response(jsonify({
            "task_name": task_name,
            "status": "inconclusive",
            "user_message": "Verification input could not be reliably evaluated. Please try again.",
            "model_assessment": {"notes": "Model returned unparseable output"}
        })), 200
    except Exception as e:
        return corsify_response(jsonify({"error": str(e)})), 500


def handler(event, context=None):
    """
    AWS Lambda / SAM WSGI adapter handler.
    Seamlessly adapts API Gateway REST (v1) and HTTP API (v2) proxy events
    to the Flask WSGI application with full CORS support.
    """
    # 1. Check for installed AWS serverless WSGI adapters
    try:
        import serverless_wsgi
        return serverless_wsgi.handle_request(app, event, context)
    except ImportError:
        pass

    try:
        # pyrefly: ignore [missing-import]
        import apig_wsgi
        return apig_wsgi.make_lambda_handler(app)(event, context)
    except ImportError:
        pass

    # 2. Built-in zero-dependency PEP 3333 WSGI bridge for AWS Lambda / SAM
    from urllib.parse import urlencode

    # Detect HTTP method (v1 vs v2)
    method = event.get('httpMethod')
    if not method and 'requestContext' in event and 'http' in event['requestContext']:
        method = event['requestContext']['http'].get('method', 'GET')
    method = (method or 'GET').upper()

    # Detect Path (v1 vs v2)
    path = event.get('path') or event.get('rawPath') or '/'

    # Detect Query String
    qs = event.get('rawQueryString')
    if qs is None:
        params = event.get('queryStringParameters') or {}
        qs = urlencode(params)

    # Process Body (decode base64 if needed)
    body_bytes = b''
    raw_body = event.get('body')
    if raw_body:
        if event.get('isBase64Encoded', False):
            body_bytes = base64.b64decode(raw_body)
        elif isinstance(raw_body, str):
            body_bytes = raw_body.encode('utf-8')
        elif isinstance(raw_body, bytes):
            body_bytes = raw_body

    headers = event.get('headers') or {}
    environ = {
        'REQUEST_METHOD': method,
        'SCRIPT_NAME': '',
        'PATH_INFO': path,
        'QUERY_STRING': qs,
        'SERVER_NAME': 'localhost',
        'SERVER_PORT': '443',
        'SERVER_PROTOCOL': 'HTTP/1.1',
        'wsgi.version': (1, 0),
        'wsgi.url_scheme': headers.get('x-forwarded-proto', headers.get('X-Forwarded-Proto', 'https')),
        'wsgi.input': io.BytesIO(body_bytes),
        'wsgi.errors': sys.stderr,
        'wsgi.multithread': False,
        'wsgi.multiprocess': False,
        'wsgi.run_once': False,
        'CONTENT_LENGTH': str(len(body_bytes)),
    }

    content_type = headers.get('content-type') or headers.get('Content-Type')
    if content_type:
        environ['CONTENT_TYPE'] = content_type

    for key, value in headers.items():
        key_upper = key.upper().replace('-', '_')
        if key_upper not in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
            environ[f'HTTP_{key_upper}'] = str(value)

    response_status = [200]
    response_headers = []

    def start_response(status, resp_headers, exc_info=None):
        try:
            status_code = int(status.split(' ', 1)[0])
        except Exception:
            status_code = 200
        response_status[0] = status_code
        response_headers.extend(resp_headers)

    response_iter = app(environ, start_response)
    response_body = b''.join(response_iter)
    if hasattr(response_iter, 'close'):
        response_iter.close()

    resp_headers_dict = {}
    for h_name, h_val in response_headers:
        resp_headers_dict[h_name] = h_val

    # Ensure CORS origin is always set
    if 'Access-Control-Allow-Origin' not in resp_headers_dict:
        resp_headers_dict['Access-Control-Allow-Origin'] = '*'
    if 'Access-Control-Allow-Headers' not in resp_headers_dict:
        resp_headers_dict['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    if 'Access-Control-Allow-Methods' not in resp_headers_dict:
        resp_headers_dict['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'

    try:
        body_str = response_body.decode('utf-8')
        is_b64 = False
    except UnicodeDecodeError:
        body_str = base64.b64encode(response_body).decode('ascii')
        is_b64 = True

    return {
        'statusCode': response_status[0],
        'headers': resp_headers_dict,
        'body': body_str,
        'isBase64Encoded': is_b64,
    }


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)


