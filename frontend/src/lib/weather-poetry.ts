import poetryData from '@/data/poetry_lines.json';
import { parseTimeStringToMinutes, getLocationCurrentMinutes, type WeatherArtworkOptions } from './weather-artwork';

export type TemperatureTier = 'freezing' | 'cold' | 'mild' | 'hot';
export type TimeOfDay = 'day' | 'night';

export interface PoemLines {
  line1: string;
  line2: string;
}

interface ConditionEntry {
  day?: string[];
  night?: string[];
  temperature_ranges?: {
    freezing?: { day?: string[]; night?: string[] };
    cold?: { day?: string[]; night?: string[] };
    hot?: { day?: string[]; night?: string[] };
    mild?: { day?: string[]; night?: string[] };
  };
}

const poetryMap = poetryData as unknown as Record<string, ConditionEntry | undefined>;

/**
 * Determines whether it is daytime (sunrise to sunset) or nighttime (sunset to sunrise).
 *
 * Rules:
 * - Day: sunrise to sunset
 * - Night: sunset to sunrise
 */
export function determineTimeOfDay(options?: WeatherArtworkOptions, conditionStr: string = ''): TimeOfDay {
  // Explicit flag priority
  if (options?.isNight !== undefined) {
    return options.isNight ? 'night' : 'day';
  }

  // Check explicit night/moon in condition string
  const lowerCond = conditionStr.toLowerCase();
  const condExplicitNight = lowerCond.includes('night') || lowerCond.includes('moon');

  // Compute minute of day in the location's own local time
  let curMin: number | undefined;
  if (options?.timeMinutes !== undefined) {
    curMin = options.timeMinutes;
  } else if (options?.hour !== undefined) {
    curMin = options.hour * 60;
  } else if (options?.timezone || options?.utcOffsetSeconds !== undefined) {
    curMin = getLocationCurrentMinutes({
      timezone: options.timezone,
      utcOffsetSeconds: options.utcOffsetSeconds,
      date: options.date,
    });
  } else if (options?.date) {
    curMin = options.date.getHours() * 60 + options.date.getMinutes();
  }

  // If no time context was provided, default to day (unless condition explicitly states night/moon)
  if (curMin === undefined) {
    return condExplicitNight ? 'night' : 'day';
  }

  // Parse sunrise & sunset
  const sunriseMin = parseTimeStringToMinutes(options?.sunrise) ?? 360;  // 06:00 AM default
  const sunsetMin = parseTimeStringToMinutes(options?.sunset) ?? 1080;  // 06:00 PM default

  // Sunrise to Sunset is DAY; Sunset to Sunrise is NIGHT
  const isDay = curMin >= sunriseMin && curMin < sunsetMin;

  if (condExplicitNight) {
    return 'night';
  }

  return isDay ? 'day' : 'night';
}

/**
 * Categorizes ambient temperature into ergonomic tiers.
 * - Freezing: <= 0°C
 * - Cold: 1°C – 10°C
 * - Mild / Comfortable: 11°C – 31°C
 * - Hot: >= 32°C
 */
export function getTemperatureTier(temp: number): TemperatureTier {
  if (temp <= 0) return 'freezing';
  if (temp <= 10) return 'cold';
  if (temp >= 32) return 'hot';
  return 'mild';
}

/**
 * Normalizes condition text returned by our API into a canonical poetry key.
 */
export function mapConditionToPoetryKey(
  condition: string = '',
  timeOfDay: TimeOfDay,
  moonPhaseText: string = ''
): string {
  const cond = condition.toLowerCase();
  const phase = moonPhaseText.toLowerCase();

  // 1. Nocturnal celestial states
  if (timeOfDay === 'night') {
    if (cond.includes('full moon') || cond.includes('full-moon') || phase.includes('full')) {
      return 'full_moon';
    }
    if (
      cond.includes('no moon') ||
      cond.includes('no-moon') ||
      cond.includes('new moon') ||
      cond.includes('new-moon') ||
      cond.includes('dark moon') ||
      phase.includes('new') ||
      phase.includes('no moon')
    ) {
      return 'no_moon';
    }
  }

  // 2. Extreme weather (Thunderstorm / Lightning)
  if (cond.includes('thunder') || cond.includes('storm')) {
    return 'thunderstorm';
  }
  if (cond.includes('lightning')) {
    return 'lightning';
  }

  // 3. Snow and freezing precipitation
  if (
    cond.includes('snow') ||
    cond.includes('flurr') ||
    cond.includes('sleet') ||
    cond.includes('ice') ||
    cond.includes('blizzard')
  ) {
    return 'snow';
  }

  // 4. Rain variants
  if (cond.includes('heavy rain') || cond.includes('downpour')) {
    return 'heavy_rain';
  }
  if (cond.includes('shower')) {
    return 'rain_showers';
  }
  if (cond.includes('drizzle')) {
    return 'drizzle';
  }
  if (cond.includes('rain')) {
    return 'rain';
  }

  // 5. Atmospheric particulates & fog
  if (cond.includes('fog') || cond.includes('dense mist')) {
    return 'fog';
  }
  if (cond.includes('mist')) {
    return 'misty';
  }
  if (cond.includes('haze') || cond.includes('hazy')) {
    return 'hazy';
  }
  if (cond.includes('dust')) {
    return 'dusty';
  }
  if (cond.includes('smoke') || cond.includes('smoky')) {
    return 'smoky';
  }

  // 6. Wind & breeze
  if (cond.includes('wind') || cond.includes('gale')) {
    return 'windy';
  }
  if (cond.includes('breez')) {
    return 'breezy';
  }

  // 7. Cloudiness & Clear skies
  if (cond.includes('overcast')) {
    return timeOfDay === 'night' ? 'cloudy_night' : 'overcast';
  }
  if (cond.includes('partly')) {
    return timeOfDay === 'night' ? 'cloudy_night' : 'partly_cloudy';
  }
  if (cond.includes('mainly clear')) {
    return timeOfDay === 'night' ? 'clear_night' : 'mainly_clear';
  }
  if (cond.includes('clear')) {
    return timeOfDay === 'night' ? 'clear_night' : 'clear_sky';
  }
  if (cond.includes('sun')) {
    return timeOfDay === 'night' ? 'clear_night' : 'clear_sky';
  }
  if (cond.includes('cloud')) {
    return timeOfDay === 'night' ? 'cloudy_night' : 'cloudy';
  }

  // Default fallback
  return timeOfDay === 'night' ? 'clear_night' : 'clear_sky';
}

/**
 * Resolves a two-line poetry quote using the JSON dataset, mapped to:
 * - Live weather condition from API
 * - Local time of day (day: sunrise to sunset, night: sunset to sunrise)
 * - Temperature ranges (freezing, cold, mild, hot)
 */
export function getWeatherPoem(
  condition: string = '',
  temp: number = 20,
  options?: WeatherArtworkOptions
): PoemLines {
  const timeOfDay = determineTimeOfDay(options, condition);
  const tempTier = getTemperatureTier(temp);
  const key = mapConditionToPoetryKey(condition, timeOfDay, options?.moonPhase);

  const entry = poetryMap[key];
  const globalTempRanges = (poetryData as any).temperature_ranges?.[tempTier]?.[timeOfDay] as string[] | undefined;

  let candidates: string[] | undefined;

  // 1. Check condition-level temperature tier overrides (e.g., clear_sky in hot or cold weather)
  const conditionTempRanges =
    entry?.temperature_ranges ||
    (key === 'clear_night'
      ? poetryMap['clear_sky']?.temperature_ranges
      : key === 'cloudy_night'
      ? poetryMap['partly_cloudy']?.temperature_ranges
      : undefined);

  if (conditionTempRanges?.[tempTier]?.[timeOfDay]?.length) {
    candidates = conditionTempRanges[tempTier]![timeOfDay];
  }

  // 2. Condition's standard day/night lines take precedence over generic global temp ranges
  if (!candidates || candidates.length === 0) {
    candidates = entry?.[timeOfDay];
  }

  // 3. Fallback to global temperature tier
  if (!candidates || candidates.length === 0) {
    candidates = globalTempRanges;
  }

  // 4. Ultimate fallback to clear_sky or unknown
  if (!candidates || candidates.length === 0) {
    candidates = (poetryData as any).clear_sky?.[timeOfDay] || (poetryData as any).unknown?.[timeOfDay];
  }

  const selectedList = candidates && candidates.length > 0 ? candidates : [
    timeOfDay === 'night'
      ? 'Gentle night breeze. Crescent glow.\nPeaceful skies beneath the stars.'
      : 'Soft winds. Warm light.\nAnother beautiful day.'
  ];

  // Deterministically select index based on hour/minutes so it doesn't shift unexpectedly on re-render
  const seed = options?.timeMinutes ?? (options?.hour !== undefined ? options.hour : 0);
  const index = Math.abs(seed) % selectedList.length;
  const quote = selectedList[index] || selectedList[0] || '';

  const [line1 = '', line2 = ''] = quote.split('\n');
  return { line1, line2 };
}
