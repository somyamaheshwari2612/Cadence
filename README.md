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
├── backend/                       # Python Flask atmospheric API
│   ├── app.py                     # API endpoints (/api/schedule, /api/geocode, /api/national-context)
│   ├── services/                  # Business logic
│   │   ├── cpcb_naqi.py           # Official CPCB NAQI calculation & breakpoints
│   │   ├── scheduler.py           # India-Aware exposure scheduling engine
│   │   ├── env_data.py            # Open-Meteo & CAMS weather/AQ ingestion
│   │   ├── national_context.py    # 100 Indian cities batching & caching
│   │   └── llm_engine.py          # Gemini Vision task verification
│   ├── tests/                     # Automated test suite
│   ├── data/                      # Indian cities dataset
│   └── requirements.txt
│
├── frontend/                      # Living Emerald Dashboard (React + Vite + TanStack Router)
│   ├── src/
│   │   ├── assets/                # Atmospheric celestial artworks & moon photography
│   │   ├── components/            # UI panels (WeatherDashboard, LocationSearchPopover, Planner)
│   │   ├── data/                  # poetry_lines.json & local datasets
│   │   ├── lib/                   # weather-artwork.ts, weather-poetry.ts, activity-planner.ts
│   │   ├── routes/                # TanStack Router page definitions
│   │   ├── styles.css             # Obsidian/emerald design tokens, scrollbars, and animations
│   │   └── test/                  # Vitest condition & poetry test suites
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
├── PROJECT_STATUS.md              # Full audit, architecture, and completed milestones
├── app.py                         # Root launcher forwarding to backend
└── README.md                      # This file
```

---

## Running the Application

### 1. Backend Server
```bash
cd backend
python app.py
# Runs on http://localhost:5000
```
*(Or from the repository root: `python app.py`)*

### 2. Frontend Development Server
```bash
cd frontend
npm run dev -- --port 3001
# Runs on http://localhost:3001
```

### 3. Running Unit Tests
```bash
cd frontend
npm test
```

---

## API Attribution & Provenance
Weather and air-quality forecast data provided by [Open-Meteo](https://open-meteo.com/) and Copernicus Atmosphere Monitoring Service (CAMS).

## Disclaimer
Forecasts are modeled estimates and may differ from local ground conditions. This tool supports outdoor activity planning and is not medical advice. Consult official CPCB and IMD bulletins for regulatory notices.
