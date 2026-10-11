import { fetchScheduleFromBackend, BackendScheduleResponse } from './api';

export type ForecastHour = {
  hour: number;
  time?: string | undefined;
  hourLabel?: string | undefined;
  temperature?: number | null | undefined;
  apparent: number | null;
  pm25: number | null;
  rain: number | null;
  precipitation?: number | null | undefined;
  weatherCode?: number | undefined;
  condition?: string | undefined;
  status: 'available' | 'missing' | 'suspect';
};

export type Preferences = {
  activity: string;
  duration: number;
  start: number;
  end: number;
  maxTemperature: number;
  maxPm25: number;
  rainAcceptable: boolean;
  maxRain: number;
};

export type ActivityBlock = {
  start: number;
  end: number;
  dayLabel?: string | undefined;
  apparent: number;
  pm25: number;
  rain: number;
  score: number;
  exceeded: string[];
  whyThisWindow?: string[] | undefined;
  whyThisAlternative?: string[] | undefined;
  displayWindow?: string | undefined;
  chosenRationale?: string | undefined;
  cpcbIndicator?: number | undefined;
  cpcbCategory?: string | undefined;
  cpcbPlainLanguage?: string | undefined;
  heatTier?: string | undefined;
  heatLabel?: string | undefined;
  heatAdvisory?: string | undefined;
  exceededLimits?: Array<{
    metric: string;
    label?: string;
    forecast_value: number;
    user_preference: number;
    difference: number;
    unit?: string;
    message: string;
  }> | undefined;
  isScheduleMatch?: boolean | undefined;
  isWeatherOptimal?: boolean | undefined;
  timingStatus?: string | undefined;
  outcomeLabel?: string | undefined;
};

export type Decision =
  | {
      state: 'qualified';
      block: ActivityBlock;
      scheduleWindow?: ActivityBlock | undefined;
      weatherAlternative?: ActivityBlock | undefined;
      hasDualRecommendation?: boolean | undefined;
    }
  | {
      state: 'no-slot';
      alternative?: ActivityBlock | undefined;
      scheduleWindow?: ActivityBlock | undefined;
      weatherAlternative?: ActivityBlock | undefined;
      hasDualRecommendation?: boolean | undefined;
    }
  | {
      state: 'past-window';
      reason?: string | undefined;
      currentTimeFormatted?: string | undefined;
      weatherAlternative?: ActivityBlock | undefined;
    }
  | { state: 'incomplete'; reason?: string | undefined };

export const INDIA_ACTIVITY_PRESETS: Record<string, {
  duration: number;
  maxTemperature: number;
  maxPm25: number;
  rainAcceptable: boolean;
  maxRain: number;
  cpcbBandExpected: string;
  description: string;
}> = {
  'Walk': {
    duration: 45,
    maxTemperature: 35,
    maxPm25: 60,
    rainAcceptable: true,
    maxRain: 30,
    cpcbBandExpected: 'Satisfactory (≤ 100)',
    description: 'Easy walk / errand (Air Quality ≤ 60 AQI)',
  },
  'Run': {
    duration: 45,
    maxTemperature: 32,
    maxPm25: 45,
    rainAcceptable: true,
    maxRain: 20,
    cpcbBandExpected: 'Good to Satisfactory (≤ 100)',
    description: 'Outdoor workout (Air Quality ≤ 45 AQI)',
  },
  'Cycling': {
    duration: 60,
    maxTemperature: 30,
    maxPm25: 40,
    rainAcceptable: true,
    maxRain: 20,
    cpcbBandExpected: 'Good to Satisfactory (≤ 100)',
    description: 'Long run / cycling (Air Quality ≤ 40 AQI)',
  },
  'Commute': {
    duration: 45,
    maxTemperature: 39,
    maxPm25: 90,
    rainAcceptable: true,
    maxRain: 50,
    cpcbBandExpected: 'Moderate (≤ 200)',
    description: 'Transit / Commute (Air Quality ≤ 90 AQI)',
  },
  'Custom outdoor task': {
    duration: 45,
    maxTemperature: 37,
    maxPm25: 90,
    rainAcceptable: true,
    maxRain: 40,
    cpcbBandExpected: 'Moderate (≤ 200)',
    description: 'Flexible outdoor chore (Air Quality ≤ 90 AQI)',
  },
};

/**
 * Calculates CPCB PM indicator sub-index and official 6-category band (IndiaAware.md)
 */
export function getIndiaCpcbCategory(pm25: number | null | undefined): {
  subindex: number;
  category: string;
  plainLanguage: string;
  color: string;
} {
  if (pm25 === null || pm25 === undefined || isNaN(pm25)) {
    return { subindex: 0, category: 'Unavailable', plainLanguage: 'Data unavailable', color: 'gray' };
  }
  let subindex = 0;
  if (pm25 <= 30) subindex = Math.round((50 / 30) * pm25);
  else if (pm25 <= 60) subindex = Math.round(50 + (50 / 30) * (pm25 - 30));
  else if (pm25 <= 90) subindex = Math.round(100 + (100 / 30) * (pm25 - 60));
  else if (pm25 <= 120) subindex = Math.round(200 + (100 / 30) * (pm25 - 90));
  else if (pm25 <= 250) subindex = Math.round(300 + (100 / 130) * (pm25 - 120));
  else subindex = Math.round(Math.min(500, 400 + (100 / 150) * (pm25 - 250)));

  if (subindex <= 50) return { subindex, category: 'Good', plainLanguage: 'Lowest category on CPCB scale', color: 'emerald' };
  if (subindex <= 100) return { subindex, category: 'Satisfactory', plainLanguage: 'Generally acceptable; sensitive people may notice minor discomfort', color: 'lime' };
  if (subindex <= 200) return { subindex, category: 'Moderate', plainLanguage: 'Sensitive groups may experience discomfort; reduce prolonged exertion', color: 'yellow' };
  if (subindex <= 300) return { subindex, category: 'Poor', plainLanguage: 'Prolonged outdoor exposure may be uncomfortable for many', color: 'orange' };
  if (subindex <= 400) return { subindex, category: 'Very Poor', plainLanguage: 'Elevated concern for prolonged exposure', color: 'red' };
  return { subindex, category: 'Severe', plainLanguage: 'Highest CPCB category; follow local guidance', color: 'rose' };
}

/**
 * Returns India apparent temperature UX tier (IndiaAware.md)
 */
export function getIndiaHeatBand(apparentTemp: number | null | undefined): {
  tier: string;
  label: string;
  advisory: string;
} {
  if (apparentTemp === null || apparentTemp === undefined || isNaN(apparentTemp)) {
    return { tier: 'unknown', label: 'Normal', advisory: 'Temperature data unavailable' };
  }
  if (apparentTemp < 28) return { tier: 'cooler', label: 'Cooler conditions', advisory: 'Comfortable temperature profile' };
  if (apparentTemp <= 32) return { tier: 'warm', label: 'Warm', advisory: 'Suitable for many tasks; consider hydration reminder' };
  if (apparentTemp <= 36) return { tier: 'hot', label: 'Hot', advisory: 'Ranked lower for outdoor exercise' };
  if (apparentTemp <= 40) return { tier: 'very_hot', label: 'Very hot', advisory: 'Deprioritizing strenuous outdoor activity' };
  return { tier: 'extreme_heat', label: 'Extreme heat conditions', advisory: 'High heat advisory in effect' };
}

export const initialPreferences: Preferences = {
  activity: 'Walk',
  duration: 45,
  start: 360,
  end: 1260,
  maxTemperature: 35,
  maxPm25: 60,
  rainAcceptable: true,
  maxRain: 30,
};

const temperatures = [24,25,26,28,30,31,33,34,35,34,33,31,29,28,27,26,25,24,24,23,23,23,24,25];
const particles = [62,60,57,55,58,65,72,76,80,78,66,54,42,45,49,52,56,60,61,58,55,53,54,56];
const rainChances = [5,5,5,10,10,10,15,20,25,30,25,15,10,10,10,15,15,10,10,5,5,5,5,5];

export const mockForecast: ForecastHour[] = temperatures.map((apparent, i) => ({
  hour: i + 6,
  apparent: i === 9 ? null : apparent,
  pm25: i === 9 ? null : (particles[i] ?? 50),
  rain: i === 9 ? null : (rainChances[i] ?? 10),
  status: i === 9 ? 'missing' : 'available',
}));

export function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60) % 24;
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2,'0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

/**
 * Returns the current minute-of-day (0 to 1439) in the specified or local timezone.
 */
export function getDayMinutesFromTimeString(timeStr?: string, timezone?: string): number {
  if (timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hour = match[1];
      const minute = match[2];
      if (hour !== undefined && minute !== undefined) {
        return parseInt(hour, 10) * 60 + parseInt(minute, 10);
      }
    }
  }
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      ...(timezone ? { timeZone: timezone } : {}),
    });
    const parts = formatter.formatToParts(now);
    const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    return h * 60 + m;
  } catch {
    return now.getHours() * 60 + now.getMinutes();
  }
}

export function compareWindows(
  hours: ForecastHour[],
  preferences: Preferences,
  currentMinutes?: number
): Decision {
  const { duration, start, end } = preferences;
  if (!Number.isFinite(duration) || duration <= 0 || start >= end || duration > end - start) {
    return { state: 'incomplete' };
  }

  // Guardrail 1: If current time is provided and the entire requested window has already passed today
  if (currentMinutes !== undefined && currentMinutes > 0) {
    if (end <= currentMinutes) {
      return {
        state: 'past-window',
        reason: `Your selected availability window (${formatTime(start)}–${formatTime(end)}) has already passed today. It is currently ${formatTime(currentMinutes)}.`,
        currentTimeFormatted: formatTime(currentMinutes),
      };
    }
    const remaining = end - Math.max(start, currentMinutes);
    if (remaining < duration) {
      return {
        state: 'past-window',
        reason: `Window closes too soon to fit your ${duration}-minute activity. Only ${remaining} minutes remain before ${formatTime(end)}.`,
        currentTimeFormatted: formatTime(currentMinutes),
      };
    }
  }

  // Guardrail 2: Do not evaluate candidate slots that start in the past today
  const effectiveStart = currentMinutes !== undefined && currentMinutes > start
    ? Math.max(start, Math.ceil(currentMinutes / 15) * 15)
    : start;

  const isStrenuous = ['run', 'cycling', 'workout', 'outdoor workout'].includes(preferences.activity.toLowerCase());
  const candidates: ActivityBlock[] = [];
  for (let from = effectiveStart; from + duration <= end; from += 15) {
    const until = from + duration;
    const overlapping = hours.filter(h => h.hour * 60 < until && (h.hour + 1) * 60 > from);
    const expected = Math.ceil(until / 60) - Math.floor(from / 60);
    if (
      overlapping.length !== expected ||
      overlapping.some(h => h.status !== 'available' || h.apparent === null || h.pm25 === null || h.rain === null)
    ) {
      continue;
    }
    const apparent = Math.round((overlapping.reduce((acc, h) => acc + (h.apparent ?? 0), 0) / overlapping.length) * 10) / 10;
    const pm25 = Math.round((overlapping.reduce((acc, h) => acc + (h.pm25 ?? 0), 0) / overlapping.length) * 10) / 10;
    const rain = Math.max(...overlapping.map(h => h.rain ?? 0));
    const exceeded: string[] = [];
    const exceededLimits: any[] = [];

    if (apparent > preferences.maxTemperature) {
      const diff = Math.round((apparent - preferences.maxTemperature) * 10) / 10;
      exceeded.push('Apparent temperature');
      exceededLimits.push({
        metric: 'apparent_temperature_c',
        label: 'Apparent temperature',
        forecast_value: apparent,
        user_preference: preferences.maxTemperature,
        difference: diff,
        unit: '°C',
        message: 'Feels-like temperature is above your selected preference.',
      });
    }

    if (pm25 > preferences.maxPm25) {
      const diff = Math.round((pm25 - preferences.maxPm25) * 10) / 10;
      exceeded.push('PM2.5');
      exceededLimits.push({
        metric: 'pm2_5_ug_m3',
        label: 'PM2.5',
        forecast_value: pm25,
        user_preference: preferences.maxPm25,
        difference: diff,
        unit: 'µg/m³',
        message: 'Forecast PM2.5 is above your selected preference.',
      });
    }

    const rainLimit = preferences.rainAcceptable ? preferences.maxRain : 0;
    if (rain > rainLimit) {
      const diff = Math.round((rain - rainLimit) * 10) / 10;
      exceeded.push('Rain probability');
      exceededLimits.push({
        metric: 'rain_probability_pct',
        label: 'Rain probability',
        forecast_value: rain,
        user_preference: rainLimit,
        difference: diff,
        unit: '%',
        message: 'Rain probability is above your selected preference.',
      });
    }

    // IndiaAware experimental product score:
    const startHour = Math.floor(from / 60);
    const middayPenalty = (startHour >= 12 && startHour < 15 && apparent > 28 && isStrenuous) ? 8.0 : 0.0;
    const score = Math.round((Math.abs(apparent - 24.0) * 1.5 + pm25 * 1.2 + rain * 0.3 + middayPenalty) * 100) / 100;

    const cpcb = getIndiaCpcbCategory(pm25);
    const heat = getIndiaHeatBand(apparent);

    candidates.push({
      start: from,
      end: until,
      apparent,
      pm25,
      rain,
      score,
      exceeded,
      exceededLimits,
      cpcbIndicator: cpcb.subindex,
      cpcbCategory: cpcb.category,
      cpcbPlainLanguage: cpcb.plainLanguage,
      heatTier: heat.tier,
      heatLabel: heat.label,
      heatAdvisory: heat.advisory,
      displayWindow: `Today · ${formatTime(from)}–${formatTime(until)}`,
    });
  }
  candidates.sort((a, b) => a.score - b.score || a.start - b.start);
  const inScheduleCandidates = candidates.filter(c => c.start >= effectiveStart && c.end <= preferences.end);
  const qualified = inScheduleCandidates.find(c => c.exceeded.length === 0);
  const bestOverall = candidates[0];

  if (qualified) {
    const hasDual = !!(bestOverall && bestOverall.start !== qualified.start && bestOverall.score < qualified.score);
    return {
      state: 'qualified',
      block: qualified,
      scheduleWindow: qualified,
      weatherAlternative: hasDual ? bestOverall : undefined,
      hasDualRecommendation: hasDual,
    };
  }

  const bestSchedule = inScheduleCandidates[0];
  const alternative = bestSchedule || bestOverall;
  const hasDual = !!(bestSchedule && bestOverall && bestSchedule.start !== bestOverall.start);

  return alternative ? {
    state: 'no-slot',
    alternative,
    scheduleWindow: bestSchedule,
    weatherAlternative: bestOverall,
    hasDualRecommendation: hasDual,
  } : (currentMinutes !== undefined && end <= currentMinutes) ? {
    state: 'past-window',
    reason: `Your selected availability window (${formatTime(start)}–${formatTime(end)}) has already passed today.`,
    currentTimeFormatted: formatTime(currentMinutes),
  } : { state: 'incomplete' };
}

/**
 * Queries the Cadence Flask backend on http://localhost:5000/api/schedule
 * Converts live atmospheric calculation into frontend Decision & ForecastHour contracts.
 */
export async function queryBackendSchedule(
  preferences: Preferences,
  coords: { latitude: number; longitude: number },
  enableFallback: boolean = false,
  currentMinutes?: number
): Promise<{
  decision: Decision;
  hours: ForecastHour[];
  rawResponse?: BackendScheduleResponse;
  retrievedTimeStr?: string;
}> {
  try {
    const backendRes = await fetchScheduleFromBackend({
      latitude: coords.latitude,
      longitude: coords.longitude,
      duration_minutes: preferences.duration,
      availability_start_minutes: preferences.start,
      availability_end_minutes: preferences.end,
      availability_start_hour: Math.floor(preferences.start / 60),
      availability_end_hour: Math.ceil(preferences.end / 60),
      max_temp: preferences.maxTemperature,
      max_pm25: preferences.maxPm25,
      rain_ok: preferences.rainAcceptable,
      rain_threshold: preferences.maxRain,
      enable_fallback: enableFallback,
      task_name: preferences.activity,
    });

    // 1. Transform decision_timeline into ForecastHour[]
    const firstHourTime = backendRes.decision_timeline?.[0]?.time;
    const baseDateStr = firstHourTime && firstHourTime.length >= 10 ? firstHourTime.slice(0, 10) : "";

    const hours: ForecastHour[] = (backendRes.decision_timeline || []).map((h) => {
      let hourNum = 0;
      if (h.time && h.time.length >= 13) {
        hourNum = parseInt(h.time.slice(11, 13), 10);
      } else {
        hourNum = new Date(h.time).getHours();
      }

      const itemDateStr = h.time && h.time.length >= 10 ? h.time.slice(0, 10) : "";
      const displayHour = itemDateStr && baseDateStr && itemDateStr > baseDateStr ? hourNum + 24 : hourNum;

      return {
        hour: displayHour,
        time: h.time,
        hourLabel: h.hour_label,
        temperature: h.temperature ?? (h.apparent_temperature !== null ? Math.round(h.apparent_temperature) : null),
        apparent: h.apparent_temperature,
        pm25: h.pm2_5,
        rain: h.precipitation_probability,
        precipitation: h.precipitation ?? 0,
        weatherCode: h.weather_code,
        condition: h.condition,
        status: h.data_status as any,
      };
    });

    // Format retrieved time string in 12-hour system using location's local timezone
    const tz = backendRes.metadata?.timezone;
    const tzAbbr = backendRes.metadata?.timezone_abbreviation || (tz ? "" : "IST");
    let retrievedTimeStr = "Forecast retrieved 10 Oct · 11:42 AM IST";
    if (backendRes.metadata?.retrieval_timestamp_utc) {
      const d = new Date(backendRes.metadata.retrieval_timestamp_utc);
      const timeOpts: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        ...(tz ? { timeZone: tz } : {}),
      };
      const dateOpts: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
        ...(tz ? { timeZone: tz } : {}),
      };
      const formattedDate = d.toLocaleDateString("en-US", dateOpts);
      const formattedTime = d.toLocaleTimeString("en-US", timeOpts);
      retrievedTimeStr = `Forecast retrieved ${formattedDate} · ${formattedTime}${tzAbbr ? ` ${tzAbbr}` : ''}`;
    }

    const mapBlock = (b: any): ActivityBlock => {
      const startDt = new Date(b.start_time);
      const startMins = startDt.getHours() * 60 + startDt.getMinutes();
      const endMins = startMins + b.duration_minutes;
      const dayLabel = b.display_window?.includes("Tomorrow") ? "Tomorrow" : (b.day_label || "Today");

      return {
        start: startMins,
        end: endMins,
        dayLabel,
        apparent: b.mean_apparent_temperature,
        pm25: b.mean_pm25,
        rain: b.max_precipitation_probability,
        score: b.experimental_product_score,
        exceeded: (b.preference_violations || []).map((v: any) => v.label),
        whyThisWindow: b.why_this_window,
        whyThisAlternative: b.why_this_alternative,
        displayWindow: b.display_window,
        chosenRationale: b.chosen_rationale,
        cpcbIndicator: b.cpcb_pm_indicator,
        cpcbCategory: b.cpcb_category,
        cpcbPlainLanguage: b.cpcb_plain_language,
        heatTier: b.heat_tier,
        heatLabel: b.heat_label,
        heatAdvisory: b.heat_advisory,
        exceededLimits: b.exceeded_limits,
        isScheduleMatch: b.is_inside_availability ?? b.is_schedule_match,
        isWeatherOptimal: b.is_weather_optimal,
        timingStatus: b.timing_status,
        outcomeLabel: b.outcome_label,
      };
    };

    // 2. Transform outcomes
    if ((backendRes.status as string) === "window_already_passed") {
      const weatherAlternative = backendRes.weather_alternative ? mapBlock(backendRes.weather_alternative) : undefined;
      return {
        decision: {
          state: "past-window",
          reason: backendRes.message || `Your selected availability window (${formatTime(preferences.start)}–${formatTime(preferences.end)}) has already passed today.`,
          currentTimeFormatted: (backendRes as any).current_time_formatted || (currentMinutes !== undefined ? formatTime(currentMinutes) : undefined),
          weatherAlternative,
        },
        hours: hours.length > 0 ? hours : mockForecast,
        rawResponse: backendRes,
        retrievedTimeStr,
      };
    }

    // Client-side guardrail: If selected window for today has already elapsed
    if (currentMinutes !== undefined && preferences.end <= currentMinutes) {
      const weatherAlternative = backendRes.weather_alternative ? mapBlock(backendRes.weather_alternative) : undefined;
      const rec = backendRes.recommendation ? mapBlock(backendRes.recommendation) : undefined;
      // If the recommendation is not explicitly for tomorrow, block past recommendation
      if (!rec || rec.dayLabel !== 'Tomorrow') {
        return {
          decision: {
            state: "past-window",
            reason: `Your selected availability window (${formatTime(preferences.start)}–${formatTime(preferences.end)}) has already passed today.`,
            currentTimeFormatted: formatTime(currentMinutes),
            weatherAlternative,
          },
          hours: hours.length > 0 ? hours : mockForecast,
          rawResponse: backendRes,
          retrievedTimeStr,
        };
      }
    }

    if (backendRes.status === "success" && backendRes.recommendation) {
      const block = mapBlock(backendRes.recommendation);
      const scheduleWindow = backendRes.schedule_window ? mapBlock(backendRes.schedule_window) : block;
      const weatherAlternative = backendRes.weather_alternative ? mapBlock(backendRes.weather_alternative) : undefined;

      return {
        decision: {
          state: "qualified",
          block,
          scheduleWindow,
          weatherAlternative,
          hasDualRecommendation: backendRes.has_dual_recommendation ?? !!(weatherAlternative && weatherAlternative.start !== block.start),
        },
        hours: hours.length > 0 ? hours : mockForecast,
        rawResponse: backendRes,
        retrievedTimeStr,
      };
    }

    if (backendRes.status === "fallback_alternative") {
      const scheduleWindow = backendRes.schedule_window ? mapBlock(backendRes.schedule_window) : undefined;
      const weatherAlternative = backendRes.weather_alternative ? mapBlock(backendRes.weather_alternative) : undefined;
      const primaryAlt = backendRes.alternative ? mapBlock(backendRes.alternative) : (scheduleWindow || weatherAlternative);

      return {
        decision: {
          state: "no-slot",
          alternative: primaryAlt,
          scheduleWindow,
          weatherAlternative,
          hasDualRecommendation: backendRes.has_dual_recommendation ?? !!(scheduleWindow && weatherAlternative && scheduleWindow.start !== weatherAlternative.start),
        },
        hours: hours.length > 0 ? hours : mockForecast,
        rawResponse: backendRes,
        retrievedTimeStr,
      };
    }

    if (backendRes.status === "no_suitable_slots") {
      const scheduleWindow = backendRes.schedule_window ? mapBlock(backendRes.schedule_window) : undefined;
      const weatherAlternative = backendRes.weather_alternative ? mapBlock(backendRes.weather_alternative) : undefined;

      return {
        decision: {
          state: "no-slot",
          alternative: scheduleWindow || weatherAlternative,
          scheduleWindow,
          weatherAlternative,
          hasDualRecommendation: backendRes.has_dual_recommendation ?? !!(scheduleWindow && weatherAlternative && scheduleWindow.start !== weatherAlternative.start),
        },
        hours: hours.length > 0 ? hours : mockForecast,
        rawResponse: backendRes,
        retrievedTimeStr,
      };
    }

    if (backendRes.status === "unable_to_compare") {
      return {
        decision: { state: "incomplete", reason: backendRes.message ?? backendRes.description },
        hours: hours.length > 0 ? hours : mockForecast,
        rawResponse: backendRes,
        retrievedTimeStr,
      };
    }
  } catch (err) {
    console.warn("Backend scheduler query failed, using deterministic local router fallback:", err);
  }

  // Graceful fallback to client-side deterministic evaluation
  const fallbackDecision = compareWindows(mockForecast, preferences, currentMinutes);
  return {
    decision: fallbackDecision,
    hours: mockForecast,
  };
}
