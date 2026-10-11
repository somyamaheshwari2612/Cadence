# Exposure Router - Comprehensive Logic & Architecture Documentation

This document outlines the detailed logic, mathematical models, operational data handling, and architectural choices behind the Exposure Router backend. All design decisions are explained honestly, including limitations, operational failure modes, and clear disclaimers.

> **Provider Licensing & Attribution:** Weather and air quality forecast data are retrieved from [Open-Meteo](https://open-meteo.com/). Note that attribution alone does **not** grant commercial rights; commercial deployment requires an appropriate commercial license or paid subscription under Open-Meteo's [terms and pricing](https://open-meteo.com/en/pricing). Attribution to Open-Meteo must be displayed on any user-facing interface.

---

## 1. System Architecture

**Monorepo with Explicit Service Boundaries:**
The backend is decoupled into modules with clearly separated responsibilities:

| Module | Responsibility | Does NOT do |
|--------|---------------|-------------|
| `env_data.py` | Provider API clients, timeout/retry policy, timezone offset normalization to UTC, operational freshness tracking, provenance metadata | Scheduling decisions |
| `scheduler.py` | Deterministic feasibility checks, duration-aware candidate generation, strict separation of data-quality exclusions vs. preference filters, experimental product ranking, EPA-grounded exposure reduction options | Health/safety claims, clinical determinations, LLM calls |
| `llm_engine.py` | Optional natural-language rephrasing of deterministic fact strings with strict template boundaries | Slot selection, feasibility decisions, medical advice |
| `app.py` | Request validation, upload security (magic bytes, dimension checks, no Base64 logging), response codes, service orchestration | Core scheduling mathematics |

---

## 2. Environmental Data Retrieval (`services/env_data.py`)

### 2.1 Location Input (Geocoding)

**What it does:** Converts a user-typed city or place name into geographic coordinates using the Open-Meteo Geocoding API.

**What it is NOT:** This is not a privacy substitute for GPS. The user's typed location string is transmitted to Open-Meteo's servers. Its purpose is:
- It eliminates the need for browser GPS permission prompts (which users frequently deny).
- It provides city-level location selection. A city name resolves to a representative coordinate or model grid cell that may not reflect localized microclimates across distinct neighborhoods.
- We request only city-level precision appropriate for the forecast model resolution.

**Disambiguation:** Searches (e.g., "Delhi") frequently match multiple global locations. The API returns candidate places (name, country, admin1 state/province, coordinates) so the client can prompt the user to confirm their intended location before initiating forecast queries.

### 2.2 Dual API Ingestion & AQI Methodology

We make two distinct HTTP calls to Open-Meteo:
1. **Weather API:** Apparent Temperature (°C), Precipitation Probability (%).
2. **Air Quality API:** PM2.5 concentration (µg/m³) as its own raw field, and the U.S. AQI index value.

**Indian CPCB NAQI Calculation (`services/cpcb_naqi.py`):**
To provide accurate, locally relevant air quality estimates for Indian users, Cadence computes the official **Central Pollution Control Board (CPCB) National Air Quality Index (NAQI)** sub-index directly from modeled PM2.5 concentrations using linear breakpoint interpolation:

$$I = I_{low} + \frac{I_{high} - I_{low}}{B_{high} - B_{low}} \times (C - B_{low})$$

- **CPCB PM2.5 Breakpoints:**
  - $0 \le C \le 30 \implies 0 \le I \le 50$ (**Good**)
  - $31 \le C \le 60 \implies 51 \le I \le 100$ (**Satisfactory**)
  - $61 \le C \le 90 \implies 101 \le I \le 200$ (**Moderate**)
  - $91 \le C \le 120 \implies 201 \le I \le 300$ (**Poor**)
  - $121 \le C \le 250 \implies 301 \le I \le 400$ (**Very Poor**)
  - $C > 250 \implies 401 \le I \le 500$ (**Severe**)

**Transparency & Sensor Disclaimers:**
- Values are explicitly labeled in the UI as **"Air particles forecast (CPCB PM estimate)"**.
- Disclaimers clarify that values are derived from numerical forecast models (Open-Meteo & CAMS) and do not constitute an official ground-station CPCB / SAFAR monitor bulletin.


### 2.3 Operational Data Freshness

Freshness is treated as an **operational validation rule**, not just descriptive text:
- **`retrieval_timestamp_utc`:** ISO 8601 timestamp recorded at the exact moment the backend queries Open-Meteo.
- **`max_acceptable_age_seconds`:** Configurable freshness threshold (default: 10,800 seconds / 3 hours).
- **`cache_age_seconds`:** Elapsed time since retrieval.
- **`is_stale`:** Boolean flag. If `cache_age_seconds > max_acceptable_age_seconds`, the data is marked stale.
- **`valid_time_start_utc` & `valid_time_end_utc`:** Bounding instants of the available forecast series.
- **Policy:** Stale forecast data triggers a data-quality exclusion (`status: "unable_to_compare"`) rather than attempting scheduling on outdated forecasts.

### 2.4 Timezone Offsets & UTC Instant Normalization

- Open-Meteo returns local ISO timestamp strings in `hourly.time` without an embedded offset string (e.g., `"2026-10-09T00:00"`).
- The root response contains `utc_offset_seconds` (e.g., `19800` for India Standard Time GMT+5:30).
- **Policy:**
  1. We validate that `utc_offset_seconds` is present and numeric.
  2. We parse the local ISO string and explicitly convert:
     $$\text{utc\_dt} = (\text{local\_dt} - \text{timedelta}(\text{seconds}=\text{utc\_offset\_seconds})).\text{replace}(\text{tzinfo}=\text{timezone.utc})$$
  3. All interval duration, continuity, and sliding-window checks use **UTC instants**.
  4. This eliminates errors across Daylight Saving Time (DST) transitions where local wall-clock times skip or repeat.
  5. Local times are retained solely for client UI display.

---

## 3. The Deterministic Scheduler (`services/scheduler.py`)

### 3.1 Strict Separation: Data-Quality Exclusions vs. Preference Filters

To provide complete transparency, the scheduler separates exclusions into two distinct categories:

1. **Data-Quality Exclusions (Physical & Data Feasibility):**
   - Temporal discontinuities (gaps between consecutive hourly slots $\neq 3600$ seconds).
   - Missing or corrupted values (`temp_status == "missing"` or `aqi_status == "missing"`).
   - Stale forecast data (`is_stale == True`).
   - If no valid candidate blocks can be formed due to data-quality exclusions, the scheduler returns:
     > **`"Unable to compare slots with available forecast data"`** (`status: "unable_to_compare"`).
     > It does **not** attempt to rank incomplete intervals.

2. **Preference Filters (User-Configured Tolerances):**
   - User maximum apparent temperature (`max_temp`).
   - User maximum forecast AQI (`max_aqi`).
   - Precipitation tolerance (`rain_ok`, `rain_threshold`).
   - Candidate blocks that pass data-quality checks but exceed user limits are cataloged with structured `preference_violations`.

### 3.2 AQI Summary Definition: Arithmetic Mean & Peak

For multi-hour candidate blocks (e.g., 2 hours or longer):
- **Summary Metric:** The summary AQI is explicitly defined as the **arithmetic mean of the hourly forecast points** (`mean_forecast_us_aqi`).
- **Peak Value:** The peak hourly value (`max_forecast_us_aqi`) is separately recorded.
- **Hourly Breakdown:** The full series of underlying hourly values (`hourly_forecast_breakdown`) is returned alongside the summary so the user can inspect hour-by-hour trends.
- **Labeling:** All AQI summaries are explicitly documented and labeled as **forecast U.S. AQI**, never confused with Indian NAQI.

### 3.3 Experimental Product Ranking Score

> **Important:** This is an experimental product ranking score for ordering candidate time slots. It is NOT a clinical health-risk model, biological exposure assessment, or safety metric.

**Published Formula:**
$$\text{experimental\_product\_score} = \text{round}(|\text{temp} - 22.0| \times 2.0 + \text{us\_aqi} \times 1.5, 2)$$

**Design Rationale & Boundaries:**
- `22°C` is an arbitrary comfort baseline, not a physiological limit.
- The temperature penalty increases symmetrically away from 22°C.
- U.S. AQI scales linearly with weight 1.5.
- **No Unvalidated Activity Multipliers:** We do **NOT** apply arbitrary activity multipliers (such as 2.0 for strenuous activity). While EPA guidance confirms that higher exertion increases ventilation rate and particulate intake, that biological principle does not validate arbitrary linear score coefficients.
- **Transparency:** The score is published and labeled as an `experimental_product_score`. The client UI displays individual underlying metrics (`mean_apparent_temperature`, `mean_forecast_us_aqi`, `mean_pm25`, `max_precipitation_probability`) alongside the ranking score.
- **No Vague Health Labels:** We do **NOT** label any slot as "least hazardous" or "safest". We describe alternatives strictly as the *"lowest-ranked option among available forecast slots"*.

### 3.4 Fallback Policy & Distinct Outcomes

The scheduler maintains an unambiguous distinction between two outcomes:

```
                         Forecast Data Ingested
                                   │
                    [Data-Quality Exclusions Check]
                                   │
              ┌────────────────────┴────────────────────┐
       No usable blocks                          Usable blocks
    (Missing/stale data)                                │
              │                           [Preference Filters Check]
    "Unable to compare slots                            │
  with available forecast data"            ┌────────────┴────────────┐
                                   Slots meet limits          No slots meet limits
                                           │                           │
                                      [OUTCOME 1]                 [OUTCOME 2]
                                  Preference-Qualified       Best Available Alternative
                               "meets your preferences"     "outside your preferences—
                                                              not assessed as safe"
                                                                       │
                                                           Is enable_fallback == True?
                                                            ┌──────────┴──────────┐
                                                           No                    Yes
                                                            │                     │
                                                    "No time slot meets     Return least adverse
                                                    your stated preferences   candidate block with
                                                           today"           preference violations
                                                    (General informational  & EPA reduction options
                                                           options)
```

#### Outcome 1: Preference-Qualified Option
- **Definition:** The slot meets all user-configured limits (`max_temp`, `max_aqi`, precipitation).
- **Label:** **“meets your preferences”**
- **Outcome Type:** `preference_qualified`
- **Status:** `success`
- Returns the lowest-scoring qualifying block with confirmation that all preferences were satisfied.

#### Outcome 2: Best Available Alternative
- **Definition:** No candidate slot meets the user's limits for the forecast period.
- **Label:** **“outside your preferences—not assessed as safe”**
- **Outcome Type:** `best_available_alternative`
- **Rule:** The system **never quietly overrides** user constraints or automatically recommends an alternative as safe.

**Opt-In Mechanism (`enable_fallback`):**
1. **Fallback Disabled (`enable_fallback: False`, Default):**
   - Returns `status: "no_suitable_slots"`.
   - Message: *"No time slot meets your stated preferences today."*
   - Returns `alternatives_available: True`, informing the user they can opt in if the task must occur outdoors.
   - Does **not** return an alternative block.
2. **Fallback Enabled (`enable_fallback: True`):**
   - Returns `status: "fallback_alternative"`.
   - Labeled: **“outside your preferences—not assessed as safe”**.
   - Discloses **exactly which limits are exceeded** (`preference_violations`) with forecast values, user limits, and excess amounts.
   - Includes the mandatory model caveat: *"Forecasts are uncertain; this is not a safety or medical recommendation."*

### 3.5 General Exposure-Reduction Options (EPA-Grounded)

For tasks that are flexible or when no slot qualifies, the application provides **general informational options** to reduce outdoor exposure, grounded in the [U.S. EPA PM Course on Patient Exposure and Air Quality Index](https://www.epa.gov/pmcourse/patient-exposure-and-air-quality-index):

| Option | Rationale | Informational Description |
|--------|-----------|---------------------------|
| **Move indoors** | Environmental substitution | Moving the activity indoors into an enclosed, filtered space significantly reduces ambient particulate exposure. |
| **Postpone** | Temporal avoidance | Rescheduling the activity allows waiting for improved meteorological dispersion or lower background pollution. |
| **Shorten duration** | Cumulative dose reduction | Spending less time outdoors proportionally lowers total particulate inhalation and thermal load. |
| **Reduce exertion** | Ventilation rate reduction | Lowering physical intensity reduces minute ventilation (volume of air breathed per minute), reducing total inhaled particulate dose. |

> **Crucial Distinction:** These are presented as **general informational choices**, NOT as personalized medical instructions or proof that any selected outdoor interval is safe.

### 3.6 Official Guidance: India-Primary (CPCB) vs. U.S. Reference (AirNow)

- **Primary Resource for Indian Users:**
  - **Central Pollution Control Board (CPCB):** [https://www.cpcb.nic.in/aqi_bulletin.php](https://www.cpcb.nic.in/aqi_bulletin.php)
  - Users are directed to official CPCB daily AQI bulletins and state pollution control boards (SPCBs) for local ambient air monitoring and public health advisories under the Indian National AQI framework.
- **U.S. Reference:**
  - **U.S. EPA AirNow:** [https://www.airnow.gov/](https://www.airnow.gov/)
  - Maintained as an informational reference for the U.S. AQI calculation methodology returned by Open-Meteo.
- **Sensitive Groups Disclaimer:**
  - Individuals with pre-existing respiratory conditions (e.g., asthma, COPD), cardiovascular disease, children, older adults, and pregnant individuals should not rely on opt-in fallbacks. The application avoids personalized clinical determinations and urges consultation with healthcare providers and official local authorities.

---

## 4. LLM Engine (`services/llm_engine.py`)

### 4.1 Rephrasing Guardrails
- Gemini Flash-Lite is utilized solely to rephrase deterministic Python fact strings into concise, natural-language text.
- When generating fallback explanations:
  - Must label slots as *"outside your preferences—not assessed as safe"* or *"lowest-ranked option among available forecast slots"*.
  - Must explicitly state the metric as **mean forecast U.S. AQI** (not Indian AQI).
  - Forbids words like *"safe"*, *"healthy"*, or *"least hazardous"*.
  - Mentions exposure-reduction choices as general informational options.
  - Retains the exact model caveat: *"Forecasts are uncertain; this is not a safety or medical recommendation."*
  - Directs users to official local guidance (CPCB in India).

### 4.2 Single-Worker Rate Limiting & Validation
- In-memory sliding window enforcing 13 RPM.
- Non-blocking fail-fast: if rate limits or 429 errors occur, returns the deterministic fact string immediately without hanging HTTP threads.
- Numeric validation verifies that numbers in the LLM response match the underlying fact string; if discrepancy is detected, the raw deterministic string is returned to prevent hallucination.

---

## 5. Image Verification & Upload Security (`services/verification.py` & `app.py`)

### 5.1 Scope: Visual Check (Not Anti-Spoofing)
- Evaluates user submissions for gamified eco-streaks via Gemini Flash Vision.
- Assesses plausible visual evidence of a requested task/gesture.
- **Not** biometric anti-spoofing or proof of action. Never labels submissions as "fraudulent".

### 5.2 Distinct Decision Triggers & User Messages
The server maps model outputs into three distinct states with clear messaging:

| Decision | Trigger | User Message |
|----------|---------|--------------|
| `verified` | Model observes task/gesture with high or medium confidence | *"Visual check confirmed plausible task completion."* |
| `not_verified` | Model clearly inspects the image with high or medium confidence and determines the gesture/object is absent (`task_absent`) | *"The required task or gesture was not observed in the image."* |
| `inconclusive` | Low model confidence, blurry image, ambiguous reflection, or unparseable output (`ambiguous_or_unclear`) | *"The image is unclear or ambiguous; unable to confirm task completion. Please retake the photo."* |

### 5.3 Upload Security & Privacy
- **Size Limits:** Request body capped at 10 MB; decoded image payload capped at 5 MB.
- **Dimension Validation:** Pixel dimensions checked against a $4096 \times 4096$ maximum to reject decompression bombs.
- **Magic Byte Validation:** Image content verified by file signatures (JPEG `\xff\xd8\xff`, PNG `\x89PNG\r\n\x1a\n`), ignoring user-supplied MIME headers or file extensions.
- **Zero Logging Policy:** **Raw Base64 payloads and decoded image bytes are never logged to disk or console.**
- **Rate Limiting:** IP-level throttling limits image verification requests to protect server resources.

---

## 6. API Gateway Endpoints (`backend/app.py`)

### 6.1 `POST /api/geocode`
- **Request:** `{"location": "Mumbai"}`
- **Response:** `{"candidates": [{"name": "Mumbai", "country": "India", "admin1": "Maharashtra", "latitude": 19.07, "longitude": 72.88}]}`

### 6.2 `POST /api/schedule`
- **Request:**
  ```json
  {
    "latitude": 19.07,
    "longitude": 72.88,
    "duration_hours": 2,
    "max_temp": 38.0,
    "max_aqi": 100,
    "rain_ok": false,
    "rain_threshold": 20,
    "enable_fallback": false
  }
  ```
- **Responses:**
  - *Preference Qualified (`status: "success"`):*
    Returns `outcome_type: "preference_qualified"`, `outcome_label: "meets your preferences"`, selected block with `mean_apparent_temperature`, `mean_forecast_us_aqi`, `max_forecast_us_aqi`, `hourly_forecast_breakdown`, and LLM explanation.
  - *Fallback Disabled (`status: "no_suitable_slots"`):*
    Returns `message: "No time slot meets your stated preferences today."`, `fallback_enabled: false`, `alternatives_available: true`, `general_exposure_reduction_options`, `official_guidance` (CPCB link).
  - *Fallback Enabled (`status: "fallback_alternative"`):*
    Returns `outcome_type: "best_available_alternative"`, `outcome_label: "outside your preferences—not assessed as safe"`, `preference_violations`, `hourly_forecast_breakdown`, `general_exposure_reduction_options`, model caveat, and LLM explanation.
  - *Data-Quality Issue (`status: "unable_to_compare"`):*
    Returns `message: "Unable to compare slots with available forecast data"`, `data_quality_exclusions`.

### 6.3 `POST /api/verify-task`
- **Request:** `{"image": "<base64_string>", "task_name": "Plant a tree"}`
- **Response:**
  ```json
  {
    "status": "verified" | "not_verified" | "inconclusive",
    "user_message": "...",
    "task_name": "Plant a tree",
    "model_assessment": {
      "appears_completed": true,
      "confidence": "high",
      "scene_description": "User holding a watering can beside a freshly planted sapling"
    }
  }
  ```

### 6.4 `GET /api/national-context`
- **Query Params:** `?refresh=true` (optional; bypasses cache)
- **Response:**
  ```json
  {
    "card_summary": {
      "title": "National Context (100 Cities)",
      "median_us_aqi": 142,
      "mean_us_aqi": 149.2,
      "range": "45 (Munnar) – 310 (New Delhi)",
      "min_city": {"city": "Munnar", "us_aqi": 45},
      "max_city": {"city": "New Delhi", "us_aqi": 310},
      "model": "CAMS Global (Hourly Estimate)"
    },
    "cleanest_cities": [...],
    "most_polluted_cities": [...],
    "total_cities_evaluated": 100,
    "valid_cities_count": 100,
    "cache_info": {
      "cached": true,
      "last_updated_utc": "2026-10-09T16:15:00+00:00",
      "cache_age_seconds": 120,
      "ttl_seconds": 3600
    },
    "disclaimer": "Values represent forecast U.S. AQI returned by Open-Meteo CAMS Global. This is NOT official CPCB NAQI."
  }
  ```

---

## 7. National Context (100 Cities) Architecture

### 7.1 Objective & Geographic Scope
To provide users with an instant macro-perspective on India's current air quality distribution, the system tracks **100 representative Indian cities** covering:
- **All 36 State and Union Territory Capitals** (e.g., New Delhi, Mumbai, Bengaluru, Amaravati, Panaji, Port Blair, Leh, Kavaratti).
- **Extreme Geographic Frontiers:** North (Kupwara, Kargil), South (Kanyakumari, Rameswaram), East (Tezu, Tawang), West (Bhuj, Jaisalmer).
- **Major Industrial & Economic Hubs:** Ahmedabad, Pune, Surat, Kanpur, Indore, Visakhapatnam, Ludhiana, Dhanbad, Coimbatore.
- **Key Cultural & Tourist Destinations:** Agra, Varanasi, Prayagraj, Jaipur, Udaipur, Rishikesh, Haridwar, Darjeeling, Ooty, Munnar, Kodaikanal, Khajuraho.

### 7.2 Rate-Limit & Latency Protection Strategy
Querying 100 individual geocoding and forecast requests per user visit would instantly exhaust API quotas and cause multi-second user delays. The system implements a three-part optimization:

1. **Static Pre-Geocoding (`backend/data/india_100_cities.json`):**
   - Coordinates for all 100 cities are pre-computed and stored statically on disk.
   - Eliminates 100 geocoding API calls entirely.
2. **Multi-Coordinate Batch Ingestion:**
   - Open-Meteo supports comma-separated coordinates in a single HTTP request (`latitude=lat1,lat2...&longitude=lng1,lng2...`).
   - The 100 cities are fetched in two batches of 50, ensuring URL lengths remain safely within HTTP specification limits while requiring only **2 HTTP requests total** for the entire country.
3. **In-Memory Cache (1-Hour TTL):**
   - The backend aggregates median, mean, range, and rankings once per hour in memory (`backend/services/national_context.py`).
   - Subsequent user dashboard requests hit the in-memory cache with sub-millisecond response latency ($< 1$ ms) and zero additional upstream requests.

### 7.3 Frontend UI Card Specification
On the Next.js client dashboard, the data renders as a clean frosted-glass card:
```
┌──────────────────────────────────────────────┐
│  National Context (100 Cities)               │
├──────────────────────────────────────────────┤
│  Median U.S. AQI: 142                        │
│  Range: 45 (Munnar) – 310 (New Delhi)        │
│  Model: CAMS Global (Hourly Estimate)        │
└──────────────────────────────────────────────┘
```

## 8. Celestial Artwork, Night Moon & Living Weather Poetry Engine

Cadence integrates visual and poetic atmospheric intelligence to create an emotionally resonant, authentic connection to outdoor conditions.

### 8.1 Nocturnal Celestial Moon Engine (`frontend/src/lib/weather-artwork.ts`)
To eliminate daytime solar imagery during nighttime hours, the visual engine tracks sunset and sunrise bounds:
- **Night Window Definition:** An interval is evaluated as **Night** when local time is between sunset and sunrise ($t \ge \text{sunset} \lor t < \text{sunrise}$).
- **Country-Specific Local Time:** Evaluated against the **selected location's own local time** using its IANA timezone (e.g. `Europe/London`, `America/New_York`, `Asia/Tokyo`, `Asia/Kolkata`) and UTC offset, ensuring international locations correctly display sun vs. moon irrespective of the user's browser clock.
- **Dedicated Moon Artworks:**
  1. **Clear Sky Night (`moon-clear-night.jpg`):** Luminous crescent moon in a starry dark sky.
  2. **Cloudy Sky Night (`moon-cloudy-night.jpg`):** Atmospheric moon diffused behind nocturnal cloud layers.
  3. **No Moon Night (`moon-no-night.jpg`):** Starfield and cosmic dust for New Moon / dark sky conditions.
  4. **Full Moon Night (`moon-full-night.jpg`):** Radiant, detailed full moon encircled by a celestial halo.
- **Dark Surface Blending:** Images are prepared on pure black backgrounds, enabling seamless `mix-blend-mode: screen` rendering across obsidian/emerald cards.
- **12-Hour System Standard:** All clock times across the user interface are presented in 12-hour AM/PM format (e.g., `6:00 AM`, `9:00 PM`, `11:42 AM IST`) to eliminate military/24-hour clock ambiguity.

### 8.2 Living Weather Poetry Engine (`frontend/src/lib/weather-poetry.ts` & `poetry_lines.json`)
The application pairs each forecast state with a curated two-line poem loaded from `frontend/src/data/poetry_lines.json`:
- **API Condition Mapping:** Maps Open-Meteo WMO weather codes and descriptors (`Clear Sky`, `Partly Cloudy`, `Cloudy` (standardized from `Overcast`), `Rain`, `Rain Showers`, `Thunderstorm`, `Snow`, `Fog`, `Windy`, `Haze`, `Dust`, `Smoke`, etc.).
- **Day/Night Cycle:**
  - **Day:** Sunrise to sunset (`curMin >= sunriseMin && curMin < sunsetMin`).
  - **Night:** Sunset to sunrise (`curMin >= sunsetMin || curMin < sunriseMin`).
- **Temperature Tiering:**
  - **Freezing:** $\le 0^\circ\text{C}$
  - **Cold:** $1^\circ\text{C} \text{ to } 10^\circ\text{C}$
  - **Mild:** $11^\circ\text{C} \text{ to } 31^\circ\text{C}$
  - **Hot:** $\ge 32^\circ\text{C}$ / $\ge 35^\circ\text{C}$
- **Couplet Splitting:** Quotes are formatted with newline delimiters (`\n`) and separated into `{ line1, line2 }` for dashboard typography.

### 8.3 Atomic Location Synchronization & Race-Free Loading
To prevent confusion where a newly selected city name might momentarily be displayed with stale weather telemetry from a previous location:
- **Deferred Title Commitment:** When a user selects a new city or invokes device GPS, the dashboard preserves the existing city label and displays an asynchronous updating pill (`hero-updating-pill`).
- **Atomic State Dispatch:** The new location string and coordinates are committed to dashboard state in the same render tick as the fetched hourly forecasts, current conditions, and schedule decisions.
- **Request Cancellation & Active Request Tracking:** Rapid consecutive location selections use monotonic request IDs (`activeRequestIdRef`) to ignore out-of-order asynchronous completions.

---

## 9. Ethical Summary & Compliance Checklist

1. **Explicit Terminology:** Labeled clearly as modeled estimates and CPCB PM estimates; never confused with station bulletins.
2. **Defensible Mathematics:** Use the published `experimental_product_score` without unvalidated activity multipliers; present underlying raw hourly metrics side-by-side.
3. **No Safety Declarations:** Refuse to call any outdoor interval "safe", "healthy", or "least hazardous".
4. **General Advice Separation:** Exposure reduction choices are provided as general informational choices, not personalized medical prescriptions.
5. **India-Centric Guidance:** Point Indian users to official CPCB bulletins as primary guidance; designate AirNow as a U.S. reference.
6. **Operational Freshness:** Track retrieval timestamp, cache age, and validity boundaries; discard stale forecasts with `"Unable to compare slots with available forecast data"`.
7. **Upload Hygiene:** Validate magic bytes and dimensions; never log Base64 image data.
8. **Commercial Compliance:** Attribution to Open-Meteo is strictly maintained; commercial licensing terms must be fulfilled before commercial launch.

