"""
Root entry point forwarding directly to backend/app.py.
Ensures running `python app.py` from workspace root launches the complete Cadence backend.
"""
import os
import sys

# Ensure workspace root and backend directory are in sys.path
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from backend.app import app

if __name__ == '__main__':
    app.run(debug=True, port=5000)