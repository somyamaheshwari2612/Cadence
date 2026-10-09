const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export interface GeocodeCandidate {
  name: string;
  country: string;
  admin1?: string;
  admin2?: string;
  latitude: number;
  longitude: number;
}

export interface HourlySlot {
  time: string;
  time_utc?: string;
  apparent_temperature: number;
  forecast_us_aqi: number;
  pm2_5_ug_m3: number;
  precipitation_probability: number;
}

export interface ScheduledBlock {
  start_time: string;
  end_time: string;
  start_time_utc: string;
  end_time_utc: string;
  duration_hours: number;
  mean_apparent_temperature: number;
  mean_forecast_us_aqi: number;
  max_forecast_us_aqi: number;
  mean_pm25: number;
  max_precipitation_probability: number;
  experimental_product_score: number;
  meets_preferences: boolean;
  outcome_type?: "preference_qualified" | "best_available_alternative";
  outcome_label?: string;
  fact_string?: string;
  human_explanation?: string;
  preference_violations?: Array<{
    filter: string;
    label: string;
    limit: number;
    forecast_value: number;
    unit: string;
    excess: number;
    description: string;
  }>;
  hourly_forecast_breakdown?: HourlySlot[];
}

export interface ExposureReductionOption {
  action: string;
  title: string;
  description: string;
}

export interface ScheduleResponse {
  status: "success" | "no_suitable_slots" | "fallback_alternative" | "unable_to_compare";
  outcome_type?: string;
  outcome_label?: string;
  message?: string;
  recommendation?: ScheduledBlock;
  alternative?: ScheduledBlock;
  fallback_enabled?: boolean;
  alternatives_available?: boolean;
  total_qualifying_blocks?: number;
  general_exposure_reduction_options?: ExposureReductionOption[];
  model_caveat?: string;
  official_guidance?: Record<string, any>;
  location?: Record<string, any>;
  reason?: string;
}

export interface NationalContextData {
  card_summary: {
    title: string;
    median_us_aqi: number;
    mean_us_aqi: number;
    range: string;
    min_city: { city: string; us_aqi: number };
    max_city: { city: string; us_aqi: number };
    model: string;
  };
  cleanest_cities: Array<{ city: string; us_aqi: number; category: string }>;
  most_polluted_cities: Array<{ city: string; us_aqi: number; category: string }>;
  total_cities_evaluated: number;
  cache_info: {
    cached: boolean;
    cache_age_seconds: number;
    ttl_seconds: number;
  };
  disclaimer: string;
}

export interface VerifyTaskResponse {
  status: "verified" | "not_verified" | "inconclusive";
  user_message: string;
  task_name: string;
  model_assessment: {
    appears_completed?: boolean;
    confidence?: string;
    scene_description?: string;
    notes?: string;
  };
}

export async function geocodeLocation(location: string): Promise<GeocodeCandidate[]> {
  const res = await fetch(`${BACKEND_URL}/api/geocode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Geocoding failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.candidates || [];
}

export async function requestSchedule(payload: {
  latitude: number;
  longitude: number;
  duration_hours: number;
  max_temp: number;
  max_aqi: number;
  rain_ok: boolean;
  rain_threshold?: number;
  enable_fallback?: boolean;
}): Promise<ScheduleResponse> {
  const res = await fetch(`${BACKEND_URL}/api/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Scheduling request failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchNationalContext(forceRefresh = false): Promise<NationalContextData> {
  const url = `${BACKEND_URL}/api/national-context${forceRefresh ? "?refresh=true" : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load national context with status ${res.status}`);
  }
  return res.json();
}

export async function verifyTaskImage(imageBase64: string, taskName: string): Promise<VerifyTaskResponse> {
  const res = await fetch(`${BACKEND_URL}/api/verify-task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageBase64, task_name: taskName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Verification failed with status ${res.status}`);
  }
  return res.json();
}
