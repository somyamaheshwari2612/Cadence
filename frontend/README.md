# Cadence — Frontend

The modern Living Emerald interface for Cadence: an India-aware outdoor activity planner, weather dashboard, and atmospheric exposure router.

---

## Key Modules & Components

- **Hero Weather Card (`weather-dashboard.tsx`)**:
  - Live ambient temperature, apparent feels-like, condition title, and CPCB status.
  - Dynamic day/night artwork engine (swapping to dedicated moon imagery after sunset).
  - Living weather poetry couplet powered by `poetry_lines.json`.
  - Updating pulse pill that glows during background forecast refreshes.

- **Smart Location Selector (`location-search-popover.tsx`)**:
  - Debounced Indian city search with parent district suggestions.
  - GPS device location detection with accuracy radius (e.g. $\pm 30\text{m}$).
  - Persistent selection in `localStorage` with `New Delhi, Delhi` default.
  - Subtle, non-intrusive first-visit indicator.

- **Activity Planner & Best Window (`planner/`)**:
  - Continuous sliding-window activity comparisons for walking, running, cycling, and commuting.
  - Day/night aware result hero artwork and weather poetry.
  - Clear explanations of why each window is optimal or outside preferences.

- **Sun & Moon Astronomical Panel (`weather-dashboard.tsx`)**:
  - Connected solar arc tracking sunrise to sunset.
  - 24-hour shifting lunar phase tracking with high-contrast lunar illumination.

- **Environment Bento Grid (`weather-dashboard.tsx`)**:
  - Air particles forecast with official CPCB breakpoint estimate.
  - UV Index, precipitation percentage, humidity, wind with compass, atmospheric pressure, and visibility.

- **Weather Art & Poetry Engine (`lib/`)**:
  - `weather-artwork.ts`: Dispatches 12 curated atmospheric artworks, including 4 dedicated nocturnal moon images (`moon-clear-night.jpg`, `moon-cloudy-night.jpg`, `moon-no-night.jpg`, `moon-full-night.jpg`).
  - `weather-poetry.ts`: Resolves couplets from `src/data/poetry_lines.json` by condition, sunrise/sunset cycle, and temperature tier.

---

## Local Development

```sh
# Install dependencies
npm install

# Start local development server
npm run dev -- --port 3001

# Run automated tests
npm test
```

The application runs on `http://localhost:3001` and connects to the Flask API backend at `http://localhost:5000`.
