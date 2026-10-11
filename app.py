"""
Root WSGI and server launcher for Cadence Flask API.
Enables running the backend from the root repository directory (e.g. on Render with rootDir left empty: gunicorn app:app, or python app.py).
"""
import os
import sys

root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")

for directory in [root_dir, backend_dir]:
    if directory not in sys.path:
        sys.path.insert(0, directory)

from backend.app import app, handler

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
