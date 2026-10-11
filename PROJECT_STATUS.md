# Cadence - Project Status, Feature Audit & Roadmap

**Updated:** October 10, 2026  
**Application:** Cadence (Atmospheric Activity Planner & Astronomical Exposure Engine)  
**Region of Focus:** India (Delhi NCR, Mathura, Agra, and 100 National Cities)  

---

## Executive Summary

Cadence is an exposure-routing and environmental intelligence application designed to help users in India schedule outdoor physical activities (exercise, running, commuting) around hyper-local air particle forecasts, meteorological conditions, and astronomical rhythms.

The application features:
1. **Living Emerald & Deep Obsidian Interface**: High-contrast, accessible dark glassmorphism with responsive typography and custom theme-styled scrollbars/dropdowns.
2. **Astronomical Solar & Lunar Engine**: Parabolic daytime solar trajectory and a 4-state nocturnal lunar celestial system (Clear Night, Cloudy Night, Full Moon, and No Moon / New Moon).
3. **Living Weather Poetry Engine**: Driven by `frontend/src/data/poetry_lines.json`, selecting curated atmospheric couplets matching API weather conditions, local sunrise/sunset daylight cycles, and temperature tiers.
4. **India-Aware CPCB Air Particles Engine**: Calculates official Indian Central Pollution Control Board (CPCB) NAQI breakpoint estimates directly from modeled PM2.5 concentrations.
5. **Smart Location Search & Persistence**: New Delhi default, persistent memory, fuzzy search with alternate spelling advice, and device GPS with radius accuracy feedback.
6. **Deterministic Scheduling Engine**: Multi-hour sliding window optimization filtering out data-quality issues and prioritizing optimal outdoor windows.

---

## 1. Features Implemented & Verified

### 1.1 Astronomy & Celestial Engine (`frontend/src/lib/weather-artwork.ts` & `astronomy.ts`)
- **Parabolic Solar Trajectory Arc**:
  - Parabolic curve rendering tracking daytime progress ($0.0 \to 1.0$) between Sunrise and Sunset.
  - Sunrise and Sunset string parsing, active daylight detection, and night transition states.
- **Dedicated Nighttime Moon Celestial Artworks**:
  - Replaces daytime glowing sun with authentic moon artworks at night:
    - `moon-clear-night.jpg`: Luminous crescent moon with emerald celestial aura in a clear starry night sky.
    - `moon-cloudy-night.jpg`: Atmospheric moon glowing softly behind dark nocturnal cloud layers.
    - `moon-no-night.jpg`: Moonless deep-space starfield with emerald cosmic dust (for New Moon / dark sky nights).
    - `moon-full-night.jpg`: Radiant, detailed full moon encircled by an emerald halo.
- **Dynamic Day/Night Condition Dispatcher**:
  - Automatically compares local time or window minute against `sunrise` and `sunset` times.
  - Automatically dispatches appropriate artwork across `HeroWeatherCard`, `SunMoonCard`, `BestTimeResult`, and `ForecastContext`.

### 1.2 Living Weather Poetry Engine (`frontend/src/lib/weather-poetry.ts` & `frontend/src/data/poetry_lines.json`)
- **Dataset Integration**:
  - `poetry_lines.json` located in `frontend/src/data/poetry_lines.json`.
  - Comprehensive condition mapping covering Clear Sky, Mainly Clear, Partly Cloudy, Cloudy (standardized from Overcast), Rain, Rain Showers, Drizzle, Heavy Rain, Thunderstorm, Snow, Fog, Windy, Breezy, Hazy, Dusty, Smoky, and Night Moon states.
- **Overcast $\to$ Cloudy Standardization**:
  - Open-Meteo WMO code 3 and weather descriptors now consistently output **Cloudy** (as well as **Breezy & Cloudy** and **Freezing & Cloudy**), eliminating ambiguous "Overcast" terminology across backend, frontend sanitizers, and poetry.
- **Atomic Dashboard Location Synchronization**:
  - Changing city or detecting GPS triggers an asynchronous telemetry fetch with a subtle updating indicator while preserving current dashboard telemetry.
  - The location name updates in the dashboard *only* when the new location's forecast telemetry and decision models are resolved and ready to render simultaneously, preventing confusion from mismatched state.
- **Country-Specific Local Time Day vs. Night Transitions**:
  - Automatically evaluates sun vs. moon artwork, poetry, and icons based on the **target country/location's own local time** (using IANA timezone and UTC offset), rather than the client browser's clock.
  - **Day**: Evaluated from **sunrise to sunset** (`curMin >= sunriseMin && curMin < sunsetMin`) $\to$ **Sun** artwork, daytime poetry, golden sun icons.
  - **Night**: Evaluated from **sunset to sunrise** (`curMin >= sunsetMin || curMin < sunriseMin`) $\to$ **Moon** artwork (clear/cloudy/full/no-moon), night poetry, luminous moon icons.
- **Unified 12-Hour System**:
  - Completely transitioned from confusing 24-hour clocks to clear 12-hour AM/PM formatting across the entire app:
  - Availability window inputs use 12-hour selectors (`6:00 AM`, `9:00 PM`).
  - Hourly forecast cards, decision timeline, and trust metadata display 12-hour timestamps (`11:42 AM IST`, `4:00 PM BST`, `3:00–4:00 PM`).
- **Temperature Tier Differentiation**:
  - **Freezing** ($\le 0^\circ\text{C}$): Frost and biting cold morning couplets.
  - **Cold** ($1\text{–}10^\circ\text{C}$): Crisp air and bundle-up couplets.
  - **Mild / Comfortable** ($11\text{–}31^\circ\text{C}$): Standard atmospheric condition lines.
  - **Hot** ($\ge 32^\circ\text{C}$ / $\ge 35^\circ\text{C}$): High heat, hydration, and shade-seeking lines.
- **Two-Line Atmospheric Couplets**:
  - Formatted cleanly as `{ line1, line2 }` and rendered across dashboard cards.

### 1.3 India-Aware CPCB Air Particles Engine (`backend/services/cpcb_naqi.py`)
- **Direct Indian Standard Calculation**:
  - Implements official CPCB linear interpolation formulas:
    $$I = I_{low} + \frac{I_{high} - I_{low}}{B_{high} - B_{low}} \times (C - B_{low})$$
  - Categorizes modeled PM2.5 into official Indian tiers:
    - $0 \le C \le 30 \implies 0 \le I \le 50$ (**Good**)
    - $31 \le C \le 60 \implies 51 \le I \le 100$ (**Satisfactory**)
    - $61 \le C \le 90 \implies 101 \le I \le 200$ (**Moderate**)
    - $91 \le C \le 120 \implies 201 \le I \le 300$ (**Poor**)
    - $121 \le C \le 250 \implies 301 \le I \le 400$ (**Very Poor**)
    - $C > 250 \implies 401 \le I \le 500$ (**Severe**)
- **Clear Provenance & Transparency**:
  - Labeled explicitly as *"Air particles forecast (CPCB PM estimate)"* to distinguish regional numerical models from regulatory station sensor monitors.

### 1.4 Smart Location Search & User Experience (`location-search-popover.tsx`)
- **New Delhi Default**: New users automatically open on `New Delhi, Delhi`.
- **Persistent Location Memory**: Saves and restores user selections via `localStorage` (`cadence_saved_location_v1`).
- **Debounced Search & Suggestion Engine**:
  - Fast search with request cancellation on rapid typing.
  - Helpful suggestions for typos (e.g. searching *Mursna* recommends *Mursan*, and suggests nearby districts like *Hathras*, *Mathura*, *Aligarh*).
- **Subtle, Non-Intrusive Onboarding Indicator**:
  - On the very first visit, displays an adjacent `Change city` pill that never crowds or truncates the city name.
  - Removed disruptive pulsing animations in favor of a soft emerald resting accent.
  - Automatically dismisses upon opening or clicking `×`.
- **City Label Layout Safety**:
  - Fixed overflow truncation (`New D...`) so city names are displayed in full without being clipped.

### 1.5 Premium UI & Theming Enhancements
- **Live Updating Forecast Indicator**:
  - Glowing, pulsating pill (`is-updating` and `.hero-updating-pill`) animates while live forecast updates are in progress.
- **Theme-Specific Controls**:
  - Custom obsidian/emerald scrollbars with styled track and thumb across all major browsers (`::-webkit-scrollbar` and `scrollbar-color`).
  - Custom styled dropdown select menus for forecast period, astronomical coverage, and activity presets.
- **Readability & Contrast Refinements**:
  - Preserved atmospheric obsidian backdrop while boosting foreground text brightness (`#ECFDF3` / `#F0FDF4` primary, `#B7CDBD` secondary).
  - Clean grouped-block layouts preventing text cutoff across mobile and desktop.
- **Custom Favicon**:
  - Integrated `favicon.jpeg` in `frontend/public/` and linked via `index.html`.

### 1.6 Deterministic Exposure Scheduler (`backend/services/scheduler.py`)
- Continuous sliding-window candidate generation matching activity duration (15m to 24h).
- Strict separation of data-quality gaps vs. user preference violations.
- Transparent ranking formula combining PM2.5 exposure, temperature comfort offset, rain probability, and midday heat penalties.

---

## 2. Test Verification Matrix

| Test Suite | Scope | Result | Key Observations |
| :--- | :--- | :--- | :--- |
| **`weather-conditions.test.ts`** | Artwork & Poetry Engine | **PASSED** | Validates artwork for snow, rain, wind, storms, fog, clouds, sun, all 4 moon types, day/night transitions (sunrise/sunset), and temperature tiers. |
| **`test_env_data.py`** | Upstream Ingestion & Models | **PASSED** | Verifies Open-Meteo ingestion, timezone offset parsing, CAMS model grid interpolation, and cache age validation. |
| **`test_scheduler.py`** | Deterministic Scheduler | **PASSED** | Verifies preference filtering, fallback options, rain filters, and missing data exclusions. |
| **`test_national_context.py`** | 100-City Aggregation | **PASSED** | Verifies chunked batch retrieval, in-memory cache hits, and median calculation across 100 Indian cities. |
| **Browser Live Tests** | UI & User Flows | **VERIFIED** | Live verification of day/night moon rendering, non-intrusive location badge, city search debouncing, and custom theme scrollbars. |

---

## 3. Roadmap & Upcoming Enhancements

### Priority 1: Interactive Micro-Visualizations
- [ ] **Interactive Spline Curve Tooltips**: Hover and tap tooltips displaying exact hourly values along the temperature curve.
- [ ] **Dynamic Wind Compass Flutter**: Subtle physics-based rotation on the wind compass needle based on live wind speed.
- [ ] **Multi-Day Extended View**: Expandable 7-day weather outlook tab with day/night weather glyphs.

### Priority 2: Offline & Progressive Web App (PWA) Capabilities
- [ ] **Service Worker Caching**: Offline cache for last-retrieved forecast and location data.
- [ ] **Manifest & PWA Icons**: Full mobile home-screen installation support.
