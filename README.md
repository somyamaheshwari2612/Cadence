# Cadence

Cadence is a modern exposure-routing and environmental intelligence application designed to help users in India safely plan their daily activities (exercise, commutes, and outdoor tasks) around hyper-local weather, astronomical conditions, and air particle forecasts.

---

## Key Features

- **Hyper-Local Atmospheric Forecasting**:
  Ingests Open-Meteo's hourly weather and CAMS atmospheric models (temperature, apparent feels-like, humidity, rain probability, wind speed/direction, pressure, and visibility).

- **India-Aware CPCB Air Particles Forecast**:
  Calculates official Central Pollution Control Board (CPCB) NAQI breakpoint estimates directly from modeled PM2.5 concentrations (Good, Satisfactory, Moderate, Poor, Very Poor, Severe), providing clear distinctions between regional numerical forecasts and official station sensor bulletins.

- **Dynamic Day & Night Celestial Artworks**:
  - **Daytime**: Radiant sun, partial cloud cover, rolling fog, alpine snow, and thunderstorms.
  - **Nighttime**: Dedicated atmospheric moon artwork tailored to celestial states:
    - *Clear Sky Night* (luminous crescent moon with emerald celestial aura)
    - *Cloudy Sky Night* (moon glowing softly behind nocturnal cloud layers)
    - *No Moon Night* (deep-space starfield and cosmic dust for New Moon / dark sky nights)
    - *Full Moon Night* (radiant, detailed full moon encircled by an emerald halo)

- **Living Weather Poetry Engine**:
  Driven by `poetry_lines.json` (located in `frontend/src/data/poetry_lines.json`):
  - Maps weather conditions directly to API outputs.
  - Dynamically evaluates local time: **Day** (sunrise to sunset) vs. **Night** (sunset to sunrise).
  - Adapts to temperature ranges (*Freezing* $\le 0^\circ\text{C}$, *Cold* $1\text{–}10^\circ\text{C}$, *Mild* $11\text{–}31^\circ\text{C}$, and *Hot* $\ge 32^\circ\text{C}$).

- **Smart Location Search & Persistence**:
  - **New Delhi Default**: Automatically loads New Delhi, Delhi for new users.
  - **Persistent Selection**: Remembers the user's chosen location across visits via `localStorage`.
  - **Non-Intrusive Onboarding**: Highlights the city switcher on the very first visit with a subtle, non-intrusive indicator that never overflows the city name.
  - **Fuzzy Search & Did-You-Mean**: Offers helpful spelling recommendations (e.g. *Mursna* $\to$ *Mursan*) and nearby district suggestions.
  - **Device GPS with Accuracy Indicator**: Live GPS detection displaying radius confidence (e.g. $\pm 25\text{m}$ or $\pm 1.2\text{km}$).

- **Live Updating Pulse Animation**:
  A luminous, pulsing indicator pill draws attention when forecast data is fetching or refreshing in the background.

- **Modern Obsidian & Emerald UI**:
  High-contrast, accessible dark glassmorphism built with React, Vite, and TanStack Router, featuring custom theme-styled scrollbars, select dropdowns, and responsive layouts across all device form factors.

---

## Project Structure

```
Cadence/
├── api/                           # Vercel serverless entry point
│   ├── app.py                     # Serverless WSGI adapter forwarding to backend.app
│   └── requirements.txt           # Python dependencies for Vercel functions
│
├── backend/                       # Python Flask atmospheric API
│   ├── app.py                     # Core Flask API & AWS Lambda WSGI handler
│   ├── services/                  # Business logic
│   │   ├── cpcb_naqi.py           # Official CPCB NAQI calculation & breakpoints
│   │   ├── scheduler.py           # India-Aware exposure scheduling engine
│   │   ├── env_data.py            # Open-Meteo & CAMS weather/AQ ingestion
│   │   ├── national_context.py    # 100 Indian cities batching & caching
│   │   └── llm_engine.py          # Gemini Vision task verification
│   ├── tests/                     # Automated backend test suite
│   ├── data/                      # Indian cities dataset
│   └── requirements.txt
│
├── frontend/                      # Living Emerald Dashboard (React + Vite + TanStack Router)
│   ├── src/
│   │   ├── assets/                # Atmospheric celestial artworks & moon photography
│   │   ├── components/            # UI panels (WeatherDashboard, LocationSearchPopover, Planner)
│   │   ├── data/                  # poetry_lines.json & local datasets
│   │   ├── lib/                   # weather-artwork.ts, weather-poetry.ts, activity-planner.ts, api.ts
│   │   ├── routes/                # TanStack Router page definitions
│   │   ├── styles.css             # Obsidian/emerald design tokens, scrollbars, and animations
│   │   └── test/                  # Vitest condition, location & routing test suites
│   ├── public/                    # Static assets (favicon.jpeg)
│   ├── vite.config.ts
│   └── package.json
│
├── docs/                          # Architecture & logic specifications
│   ├── logic_documentation.md     # System architecture, CPCB models & mathematical rules
│   ├── project_steps.md           # Implementation milestones
│   ├── instructions.txt           # Data provenance & API rules
│   └── alias.txt                  # Terminal aliases
│
├── render.yaml                    # Render Blueprint specification for Backend Web Service
├── template.yaml                  # Open-source AWS SAM template (Serverless Application Model)
├── vercel.json                    # Vercel deployment configuration
├── requirements.txt               # Root Python dependencies for cloud runtimes
└── README.md                      # This file
```

---

## Running the Application Locally

### 1. Backend Server
```bash
cd backend
python app.py
# Runs on http://localhost:5000
```

### 2. Frontend Development Server
```bash
cd frontend
npm run dev -- --port 3001
# Runs on http://localhost:3001
```

---

## Production Deployment (Vercel Frontend + Render Backend)

Cadence is structured for seamless multi-cloud deployment: **Frontend on Vercel** and **Flask Backend on Render**.

### 1. Backend Deployment on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com/) and click **New +** $\to$ **Web Service** (or use **Blueprint** pointing to `render.yaml`).
2. Connect your GitHub repository `Cadence`.
3. Configure the service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app`
   - **Health Check Path**: `/healthz`
4. Under **Environment Variables**, add:
   - `GOOGLE_API_KEY`: *(Your Google AI Studio Gemini API key)*
   - `FLASK_ENV`: `production`
   - `PYTHON_VERSION`: `3.11.9`
5. Click **Create Web Service**. Once deployed, Render will provide a service URL (e.g. `https://cadence-backend.onrender.com`).

---

### 2. Frontend Deployment on Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New...** $\to$ **Project**.
2. Import your `Cadence` repository.
3. In the project configuration:
   - **Root Directory**: Set to `frontend` *(click Edit and select `frontend`)*
   - **Framework Preset**: `Vite` (automatically detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_BACKEND_URL`: Set to your Render URL (e.g. `https://cadence-backend.onrender.com` without trailing slash)
5. Click **Deploy**.
   *Vercel will build the frontend assets, and all atmospheric/scheduling API requests will automatically route to your Render backend.*

---

### 3. Alternative: AWS Serverless Deployment (AWS SAM CLI)
Cadence also includes an AWS Serverless Application Model specification in [`template.yaml`](template.yaml):
1. **Local API Testing**:
   ```bash
   sam build
   sam local start-api --port 5000
   ```
2. **Deploy to AWS**:
   ```bash
   sam deploy --guided
   ```

---

## Running Tests

### Frontend Test Suite (Vitest)
```bash
cd frontend
npm test
```
*Runs all 42 unit and integration tests covering weather condition mapping, location search, debouncing, and exposure scheduler logic.*

### Backend Test Suite (Python)
```bash
cd backend
python tests/test_scheduler.py
python tests/test_env_data.py
python tests/test_national_context.py
```
*Validates Open-Meteo telemetry ingestion, India CPCB breakpoint mathematics, and exposure router optimization.*

---

## API Attribution & Provenance
Weather and air-quality forecast data provided by [Open-Meteo](https://open-meteo.com/) and Copernicus Atmosphere Monitoring Service (CAMS).

## Disclaimer
Forecasts are modeled estimates and may differ from local ground conditions. This tool supports outdoor activity planning and is not medical advice. Consult official CPCB and IMD bulletins for regulatory notices.
