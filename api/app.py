"""
Vercel Serverless Function entry point for Cadence Flask API.
Vercel's Python runtime automatically discovers the WSGI 'app' in api/app.py.
"""
import os
import sys

# Ensure project root and backend directory are in sys.path
api_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(api_dir)
backend_dir = os.path.join(root_dir, "backend")

for directory in [root_dir, backend_dir, api_dir]:
    if directory not in sys.path:
        sys.path.insert(0, directory)

from backend.app import app, handler

# Local debugging entrypoint
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
