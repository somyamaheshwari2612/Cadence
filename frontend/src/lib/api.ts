/**
 * Cadence Backend Integration Client
 * Dynamically resolves backend across localhost, LAN IPs (e.g. mobile testing), and Vite dev proxy.
 */

export function getBackendCandidates(): string[] {
  if (typeof import.meta !== "undefined" && import.meta.env?.["VITE_BACKEND_URL"]) {
    return [import.meta.env["VITE_BACKEND_URL"]];
  }

  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname || "localhost";
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.endsWith(".local");

    // In local development, try direct port 5000 and loopback fallbacks if proxy fails
    if (isLocalhost) {
      const protocol = window.location.protocol || "http:";
      const directHost = `${protocol}//${hostname}:5000`;
      return [
        "", // Relative same-origin /api/ proxy
        directHost,
        "http://127.0.0.1:5000",
        "http://localhost:5000",
      ];
    }

    // In production deployment (e.g. cadence-sm.vercel.app):
    // First try same-origin relative proxy, then fall back to Render directly
    return ["", "https://cadence-backend-fuc9.onrender.com"];
  }

  return ["http://127.0.0.1:5000", "http://localhost:5000", "https://cadence-backend-fuc9.onrender.com"];
}

export async function fetchWithBackendFallback(endpoint: string, init?: RequestInit): Promise<Response> {
  const candidates = getBackendCandidates();
  let lastError: any = null;

  for (const base of candidates) {
    const url = `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    try {
      const res = await fetch(url, init);
      const contentType = res.headers?.get ? res.headers.get("content-type") || "" : "";
      // If we got an HTML response (e.g. TanStack Start SPA catch-all fallback), this is NOT our API endpoint
      if (contentType.includes("text/html")) {
        lastError = new Error(`Endpoint ${url} returned HTML instead of API JSON`);
        continue;
      }
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 404)) {
        return res;
      }
      lastError = new Error(`HTTP ${res.status} on ${url}`);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error(`Failed to connect to backend on any candidate endpoint`);
}

export interface GeocodePlace {
  name: string;
  country: string;
  admin1?: string;
  admin2?: string;
  latitude: number;
  longitude: number;
}

export interface BackendTimelineHour {
  hour_index: number;
  time: string;
  hour_label: string;
  full_time_label: string;
  temperature?: number | null;
  apparent_temperature: number | null;
  pm2_5: number | null;
  precipitation_probability: number;
  precipitation?: number;
  weather_code?: number;
  condition?: string;
  data_status: "available" | "missing" | "suspect";
  inside_availability: boolean;
  is_preference_qualified: boolean;
  is_selected_block: boolean;
  score: number;
}

export interface BackendScheduledBlock {
  start_time: string;
  end_time: string;
  display_window?: string;
  start_time_formatted?: string;
  end_time_formatted?: string;
  duration_minutes: number;
  duration_hours: number;
  duration_desc?: string;
  mean_apparent_temperature: number;
  mean_forecast_us_aqi: number;
  mean_pm25: number;
  max_precipitation_probability: number;
  experimental_product_score: number;
  meets_preferences: boolean;
  outcome_type?: string;
  outcome_label?: string;
  chosen_rationale?: string;
  why_this_window?: string[];
  why_this_alternative?: string[];
  cpcb_pm_indicator?: number;
  cpcb_category?: string;
  cpcb_plain_language?: string;
  heat_tier?: string;
  heat_label?: string;
  heat_advisory?: string;
  exceeded_limits?: Array<{
    metric: string;
    label?: string;
    forecast_value: number;
    user_preference: number;
    difference: number;
    unit?: string;
    message: string;
  }>;
  preference_violations?: Array<{
    filter: string;
    label: string;
    limit: number;
    forecast_value: number;
    unit: string;
    excess: number;
    description: string;
  }>;
}

export interface BackendCurrentConditions {
  temperature: number;
  apparent_temperature: number;
  weather_code: number;
  condition: string;
  humidity: number;
  wind_speed: number;
  wind_direction: string;
  precipitation: number;
  pm2_5: number;
}

export interface BackendScheduleResponse {
  status: "success" | "no_suitable_slots" | "fallback_alternative" | "unable_to_compare";
  outcome_type?: string;
  outcome_label?: string;
  message?: string;
  description?: string;
  recommendation?: BackendScheduledBlock;
  alternative?: BackendScheduledBlock;
  schedule_window?: BackendScheduledBlock;
  weather_alternative?: BackendScheduledBlock;
  has_dual_recommendation?: boolean;
  decision_timeline?: BackendTimelineHour[];
  total_candidate_blocks?: number;
  current_conditions?: BackendCurrentConditions;
  metadata?: {
    retrieval_timestamp_utc?: string;
    timezone?: string;
    timezone_abbreviation?: string;
    utc_offset_seconds?: number;
    is_stale?: boolean;
    cache_age_seconds?: number;
    valid_time_start_utc?: string;
    valid_time_end_utc?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name: string;
    country?: string;
  };
  task_name?: string;
}

const clientGeocodeCache = new Map<string, GeocodePlace[]>();

export function clearGeocodeCache(): void {
  clientGeocodeCache.clear();
}

/**
 * Searches places for confirmed location selection with in-memory caching and abort support.
 */
export async function searchLocations(
  query: string,
  signal?: AbortSignal
): Promise<GeocodePlace[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  // Instant in-memory cache check
  if (clientGeocodeCache.has(normalized)) {
    return clientGeocodeCache.get(normalized)!;
  }

  let backendFailed = false;

  try {
    const res = await fetchWithBackendFallback("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: query.trim() }),
      ...(signal ? { signal } : {}),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.candidates)) {
        clientGeocodeCache.set(normalized, data.candidates);
        return data.candidates;
      }
    } else {
      backendFailed = true;
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    backendFailed = true;
  }

  // Direct Open-Meteo geocode fallback ONLY if backend is completely down
  if (backendFailed) {
    try {
      const direct = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          query.trim()
        )}&count=5&format=json`,
        signal ? { signal } : undefined
      );
      if (!direct.ok) return [];
      const directData = await direct.json();
      const results = (directData.results || []).map((r: any) => ({
        name: r.name,
        country: r.country || "",
        admin1: r.admin1 || "",
        admin2: r.admin2 || "",
        latitude: r.latitude,
        longitude: r.longitude,
      }));
      clientGeocodeCache.set(normalized, results);
      return results;
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      return [];
    }
  }

  return [];
}

/**
 * Calls backend scheduler to find the optimal exposure window
 */
export async function fetchScheduleFromBackend(payload: {
  latitude: number;
  longitude: number;
  duration_minutes: number;
  availability_start_hour: number;
  availability_end_hour: number;
  availability_start_minutes?: number;
  availability_end_minutes?: number;
  max_temp: number;
  max_pm25: number;
  rain_ok: boolean;
  rain_threshold: number;
  enable_fallback: boolean;
  task_name: string;
}): Promise<BackendScheduleResponse> {
  const res = await fetchWithBackendFallback("/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Scheduler returned status ${res.status}`);
  }

  return res.json();
}

/**
 * Reverse geocodes latitude/longitude coordinates to a friendly city name
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision;
      const state = data.principalSubdivision;
      const country = data.countryName;
      if (city && state && city !== state) {
        return `${city}, ${state}`;
      } else if (city && country) {
        return `${city}, ${country}`;
      } else if (city) {
        return city;
      }
    }
  } catch {
    // fallback to second provider
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      { headers: { 'User-Agent': 'CadenceApp/1.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address;
      const city = addr?.city || addr?.town || addr?.village || addr?.suburb;
      const state = addr?.state || addr?.country;
      if (city && state && city !== state) return `${city}, ${state}`;
      if (city) return city;
    }
  } catch {
    // fallback
  }

  return `${latitude.toFixed(2)}° N, ${longitude.toFixed(2)}° E`;
}
