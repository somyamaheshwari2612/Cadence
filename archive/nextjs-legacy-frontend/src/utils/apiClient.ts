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

export interface DecisionTimelineHour {
  hour_index: number;
  time: string;
  hour_label: string;
  full_time_label: string;
  apparent_temperature: number | null;
  pm2_5: number | null;
  precipitation_probability: number;
  data_status: "available" | "missing" | "suspect";
  inside_availability: boolean;
  is_preference_qualified: boolean;
  is_selected_block: boolean;
  score: number;
}

export interface ScheduledBlock {
  start_time: string;
  end_time: string;
  display_window?: string;
  chosen_rationale?: string;
  why_this_window?: string[];
  why_this_alternative?: string[];
  start_time_formatted?: string;
  end_time_formatted?: string;
  start_time_utc: string;
  end_time_utc: string;
  duration_minutes?: number;
  duration_hours: number;
  duration_desc?: string;
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
  task_name?: string;
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
  description?: string;
  recommendation?: ScheduledBlock;
  alternative?: ScheduledBlock;
  decision_timeline?: DecisionTimelineHour[];
  fallback_enabled?: boolean;
  alternatives_available?: boolean;
  total_qualifying_blocks?: number;
  general_exposure_reduction_options?: ExposureReductionOption[];
  model_caveat?: string;
  official_guidance?: Record<string, any>;
  location?: Record<string, any>;
  reason?: string;
  task_name?: string;
}



export interface VerifyTaskResponse {
  status: "verified" | "not_verified" | "inconclusive";
  user_message: string;
  task_name: string;
  model_assessment: {
    appears_completed?: boolean;
    confidence?: string;
    reason_category?: string;
    scene_description?: string;
    notes?: string;
  };
}

export interface HourlyForecastPoint {
  timeStr: string;
  hourLabel: string;
  temperature: number;
  apparentTemp: number;
  precipProb: number;
  weatherCode: number;
  usAqi?: number;
  pm25?: number;
  isDay: boolean;
}

export interface DailyForecastDay {
  dateStr: string;
  dayLabel: string;
  tempMax: number;
  tempMin: number;
  precipProbMax: number;
  weatherCode: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
}

export interface LiveWeatherDetails {
  current: {
    time: string;
    temperature: number;
    apparentTemperature: number;
    relativeHumidity: number;
    dewPoint: number;
    surfacePressure: number;
    visibilityKm: number;
    windSpeedKmh: number;
    windDirectionDeg: number;
    weatherCode: number;
    uvIndex: number;
    isDay: boolean;
    usAqi: number;
    pm25: number;
  };
  hourly: HourlyForecastPoint[];
  daily: DailyForecastDay[];
  todaySunrise: string;
  todaySunset: string;
  timezone: string;
}

export async function geocodeLocation(location: string): Promise<GeocodeCandidate[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/geocode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.candidates && data.candidates.length > 0) return data.candidates;
    }
  } catch {
    // Fall back to direct Open-Meteo Geocoding
  }

  const directRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=5&format=json`
  );
  if (!directRes.ok) throw new Error("Could not find locations");
  const data = await directRes.json();
  return (data.results || []).map((r: any) => ({
    name: r.name,
    country: r.country || "",
    admin1: r.admin1 || "",
    admin2: r.admin2 || "",
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export async function requestSchedule(payload: {
  latitude: number;
  longitude: number;
  duration_hours?: number;
  duration_minutes?: number;
  availability_start_hour?: number;
  availability_end_hour?: number;
  max_temp: number;
  max_pm25?: number;
  max_aqi?: number;
  rain_ok: boolean;
  rain_threshold?: number;
  enable_fallback?: boolean;
  task_name?: string;
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

/**
 * Fetches high-fidelity weather telemetry and air quality directly or via backend
 */
export async function fetchLiveWeatherData(
  latitude: number,
  longitude: number
): Promise<LiveWeatherDetails> {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m` +
    `&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,weather_code,surface_pressure,visibility,wind_speed_10m,uv_index,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max` +
    `&timezone=auto&forecast_days=7`;

  const aqiUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
    `&current=pm2_5,us_aqi&hourly=pm2_5,us_aqi&timezone=auto&forecast_days=3`;

  const [weatherRes, aqiRes] = await Promise.all([
    fetch(weatherUrl).then((r) => r.json()),
    fetch(aqiUrl).then((r) => r.json()).catch(() => ({})),
  ]);

  const current = weatherRes.current || {};
  const aqiCurrent = aqiRes.current || {};
  const hourly = weatherRes.hourly || {};
  const aqiHourly = aqiRes.hourly || {};
  const daily = weatherRes.daily || {};

  // Find current hour index to derive dew point & uv index
  const hourlyTimes: string[] = hourly.time || [];
  const nowHourIso = new Date().toISOString().slice(0, 13);
  let currentHourIdx = hourlyTimes.findIndex((t) => t.startsWith(nowHourIso));
  if (currentHourIdx === -1) currentHourIdx = 0;

  const dewPoint = hourly.dew_point_2m?.[currentHourIdx] ?? (current.temperature_2m - (100 - (current.relative_humidity_2m || 50)) / 5);
  const uvIndex = hourly.uv_index?.[currentHourIdx] ?? 2;
  const visibilityM = hourly.visibility?.[currentHourIdx] ?? 8000;

  // Build hourly array (next 24 hours starting from current hour)
  const hourlyPoints: HourlyForecastPoint[] = [];
  const startIdx = Math.max(0, currentHourIdx);
  const endIdx = Math.min(hourlyTimes.length, startIdx + 24);

  for (let i = startIdx; i < endIdx; i++) {
    const rawTime = hourlyTimes[i];
    const dateObj = new Date(rawTime);
    const hourLabel = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

    hourlyPoints.push({
      timeStr: rawTime,
      hourLabel,
      temperature: Math.round(hourly.temperature_2m?.[i] ?? 0),
      apparentTemp: Math.round(hourly.apparent_temperature?.[i] ?? 0),
      precipProb: Math.round(hourly.precipitation_probability?.[i] ?? 0),
      weatherCode: hourly.weather_code?.[i] ?? 0,
      usAqi: aqiHourly.us_aqi?.[i],
      pm25: aqiHourly.pm2_5?.[i],
      isDay: Boolean(hourly.is_day?.[i]),
    });
  }

  // Build daily array (7 days)
  const dailyDays: DailyForecastDay[] = [];
  const dailyTimes: string[] = daily.time || [];
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < dailyTimes.length; i++) {
    const dateObj = new Date(dailyTimes[i]);
    const isToday = i === 0;
    const isYesterday = i === -1;
    const dayLabel = isToday ? "Today" : isYesterday ? "Yesterday" : weekdays[dateObj.getDay()];

    dailyDays.push({
      dateStr: dailyTimes[i],
      dayLabel,
      tempMax: Math.round(daily.temperature_2m_max?.[i] ?? 0),
      tempMin: Math.round(daily.temperature_2m_min?.[i] ?? 0),
      precipProbMax: Math.round(daily.precipitation_probability_max?.[i] ?? 0),
      weatherCode: daily.weather_code?.[i] ?? 0,
      sunrise: daily.sunrise?.[i] || "",
      sunset: daily.sunset?.[i] || "",
      uvIndexMax: Math.round(daily.uv_index_max?.[i] ?? 0),
    });
  }

  return {
    current: {
      time: current.time || new Date().toISOString(),
      temperature: Math.round(current.temperature_2m ?? 28),
      apparentTemperature: Math.round(current.apparent_temperature ?? 29),
      relativeHumidity: Math.round(current.relative_humidity_2m ?? 50),
      dewPoint: Math.round(dewPoint),
      surfacePressure: Math.round(current.surface_pressure ?? 1010),
      visibilityKm: Math.round((visibilityM / 1000) * 10) / 10,
      windSpeedKmh: Math.round(current.wind_speed_10m ?? 8),
      windDirectionDeg: Math.round(current.wind_direction_10m ?? 180),
      weatherCode: current.weather_code ?? 0,
      uvIndex: Math.round(uvIndex),
      isDay: current.is_day === 1,
      usAqi: Math.round(aqiCurrent.us_aqi ?? 95),
      pm25: Math.round((aqiCurrent.pm2_5 ?? 32) * 10) / 10,
    },
    hourly: hourlyPoints,
    daily: dailyDays,
    todaySunrise: daily.sunrise?.[0] || "",
    todaySunset: daily.sunset?.[0] || "",
    timezone: weatherRes.timezone || "Asia/Kolkata",
  };
}

/**
 * Maps WMO weather code to human description
 */
export function getWeatherConditionInfo(code: number, isDay: boolean = true) {
  switch (code) {
    case 0:
      return { label: isDay ? "Sunny" : "Clear", description: "Generally clear skies", icon: isDay ? "sun" : "moon" };
    case 1:
      return { label: "Mainly Clear", description: "Mostly clear with scattered drift", icon: isDay ? "sun" : "moon" };
    case 2:
      return { label: "Partly Cloudy", description: "Passing clouds with clear intervals", icon: "cloud-sun" };
    case 3:
      return { label: "Overcast", description: "Full cloud blanket", icon: "cloud" };
    case 45:
    case 48:
      return { label: "Foggy", description: "Reduced horizontal visibility", icon: "fog" };
    case 51:
    case 53:
    case 55:
      return { label: "Drizzle", description: "Light gentle precipitation", icon: "cloud-drizzle" };
    case 61:
    case 63:
    case 65:
      return { label: "Rain", description: "Active rainfall", icon: "cloud-rain" };
    case 80:
    case 81:
    case 82:
      return { label: "Showers", description: "Intermittent rain bursts", icon: "cloud-rain" };
    case 95:
    case 96:
    case 99:
      return { label: "Thunderstorm", description: "Atmospheric electrical convective activity", icon: "cloud-lightning" };
    default:
      return { label: isDay ? "Clear" : "Clear", description: "Generally clear", icon: isDay ? "sun" : "moon" };
  }
}
