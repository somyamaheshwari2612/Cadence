import partlyCloudy from '@/assets/sun-clouds.jpg';
import sunny from '@/assets/weather-sunny.jpg';
import thunderstorm from '@/assets/weather-thunderstorm.jpg';
import rainy from '@/assets/weather-rainy.jpg';
import cloudy from '@/assets/weather-cloudy.jpg';
import snowy from '@/assets/weather-snowy.jpg';
import windy from '@/assets/weather-windy.jpg';
import foggy from '@/assets/weather-foggy.jpg';

// Nighttime Moon Artwork
import moonClearNight from '@/assets/moon-clear-night.jpg';
import moonCloudyNight from '@/assets/moon-cloudy-night.jpg';
import moonNoNight from '@/assets/moon-no-night.jpg';
import moonFullNight from '@/assets/moon-full-night.jpg';

// Dynamic Solar Stage Artwork for Dawn, Morning, Noon, Afternoon, Sunset, Night
import sunDawn from '@/assets/sun-dawn.jpg';
import sunMorning from '@/assets/sun-morning.jpg';
import sunNoon from '@/assets/sun-noon.jpg';
import sunAfternoon from '@/assets/sun-afternoon.jpg';
import sunSunset from '@/assets/sun-sunset.jpg';
import sunNight from '@/assets/sun-night.jpg';

/** Reusable artwork collection for all atmospheric conditions. */
export const weatherArtwork = {
  // Daytime atmospheric conditions
  partlyCloudy: { src: partlyCloudy, alt: 'Golden sunlight emerging from emerald clouds' },
  sunny: { src: sunny, alt: 'A radiant golden sun in a clear emerald sky' },
  thunderstorm: { src: thunderstorm, alt: 'Silver lightning illuminating towering emerald storm clouds' },
  rainy: { src: rainy, alt: 'Rain falling from silver sage and emerald clouds' },
  cloudy: { src: cloudy, alt: 'Softly lit layers of silver sage and emerald clouds' },
  snowy: { src: snowy, alt: 'Crystalline snowflakes drifting across emerald peaks beneath a winter celestial sky' },
  windy: { src: windy, alt: 'Dynamic celestial winds and swirling breeze wisps across emerald clouds' },
  foggy: { src: foggy, alt: 'Atmospheric mist and rolling fog blankets over emerald mountain ridges' },

  // Nighttime moon conditions
  moonClear: { src: moonClearNight, alt: 'Luminous crescent moon with emerald celestial aura in a clear starry night sky' },
  moonCloudy: { src: moonCloudyNight, alt: 'Atmospheric moon glowing behind nocturnal clouds in a dark emerald night sky' },
  moonNoNight: { src: moonNoNight, alt: 'Moonless night sky filled with a rich emerald starfield and cosmic dust' },
  moonFull: { src: moonFullNight, alt: 'Luminous radiant full moon glowing with an emerald celestial halo in the night sky' },
} as const;

export type WeatherCondition = keyof typeof weatherArtwork;

export interface WeatherArtworkOptions {
  isNight?: boolean | undefined;
  timeMinutes?: number | undefined;
  hour?: number | undefined;
  sunset?: string | undefined;
  sunrise?: string | undefined;
  moonPhase?: string | undefined;
  timezone?: string | undefined;
  utcOffsetSeconds?: number | undefined;
  date?: Date | undefined;
}

/**
 * Calculates current minute of the day (0-1439) in the target location's own local time.
 * Accepts timezone string (e.g. 'Europe/London', 'America/New_York', 'Asia/Kolkata')
 * and/or utcOffsetSeconds (e.g. 3600, -14400, 19800).
 */
export function getLocationCurrentMinutes(options?: {
  timezone?: string | undefined;
  utcOffsetSeconds?: number | undefined;
  date?: Date | undefined;
}): number {
  const now = options?.date || new Date();

  if (options?.timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: options.timezone,
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23',
      }).formatToParts(now);
      const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
      const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
      return h * 60 + m;
    } catch {
      // Fallback to offset if timezone formatting encounters unexpected error
    }
  }

  if (options?.utcOffsetSeconds !== undefined) {
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const offsetMinutes = Math.round(options.utcOffsetSeconds / 60);
    return ((utcMinutes + offsetMinutes) % 1440 + 1440) % 1440;
  }

  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Parses "05:59 PM" into minutes from midnight (1079).
 */
export function parseTimeStringToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return null;
  const hour = match[1];
  const minute = match[2];
  if (hour === undefined || minute === undefined) return null;
  let h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Determines whether a given time represents nighttime.
 * Rules:
 * - Day: sunrise to sunset
 * - Night: sunset to sunrise
 */
export function isNightTime(options?: WeatherArtworkOptions): boolean {
  if (options?.isNight !== undefined) return options.isNight;

  const sunsetMin = parseTimeStringToMinutes(options?.sunset) ?? 1080; // 6:00 PM default
  const sunriseMin = parseTimeStringToMinutes(options?.sunrise) ?? 360; // 6:00 AM default

  if (options?.timeMinutes !== undefined) {
    const startMin = options.timeMinutes;
    return startMin >= sunsetMin || startMin < sunriseMin;
  }

  if (options?.timezone || options?.utcOffsetSeconds !== undefined) {
    const locMin = getLocationCurrentMinutes({
      timezone: options.timezone,
      utcOffsetSeconds: options.utcOffsetSeconds,
      date: options.date,
    });
    return locMin >= sunsetMin || locMin < sunriseMin;
  }

  if (options?.hour !== undefined) {
    const min = options.hour * 60;
    return min >= sunsetMin || min < sunriseMin;
  }

  return false;
}

/**
 * Curated artwork and descriptors for dynamic solar stages throughout the day.
 */
export const sunArtwork = {
  dawn: { src: sunDawn, label: 'Dawn & Sunrise', detail: 'Golden Horizon' },
  morning: { src: sunMorning, label: 'Morning Sun', detail: 'Ascending' },
  noon: { src: sunNoon, label: 'Solar Noon', detail: 'Zenith Peak' },
  afternoon: { src: sunAfternoon, label: 'Afternoon Sun', detail: 'Descending' },
  sunset: { src: sunSunset, label: 'Sunset & Dusk', detail: 'Twilight Glow' },
  night: { src: sunNight, label: 'Below Horizon', detail: 'Night Sky' },
} as const;

export type SolarStageKey = keyof typeof sunArtwork;

export interface SolarStageInfo {
  key: SolarStageKey;
  src: string;
  label: string;
  detail: string;
}

/**
 * Calculates current solar stage (Dawn, Morning, Solar Noon, Afternoon, Sunset/Dusk, Below Horizon)
 * based on target location's local time and sunrise / sunset times.
 */
export function getSolarStage(options?: WeatherArtworkOptions): SolarStageInfo {
  const sunriseMin = parseTimeStringToMinutes(options?.sunrise) ?? 379; // ~06:19 AM default
  const sunsetMin = parseTimeStringToMinutes(options?.sunset) ?? 1069;  // ~05:49 PM default
  const solarNoonMin = Math.round((sunriseMin + sunsetMin) / 2); // ~724 (12:04 PM)

  let curMin: number;
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
  } else if (typeof window !== 'undefined') {
    const now = new Date();
    curMin = now.getHours() * 60 + now.getMinutes();
  } else {
    curMin = 720; // Midday fallback
  }

  // 1. Night: Sun is below the horizon (after sunset + 30m or before sunrise - 30m)
  if (curMin >= sunsetMin + 30 || curMin < sunriseMin - 30) {
    return { key: 'night', ...sunArtwork.night };
  }

  // 2. Dawn & Sunrise: from 30m before sunrise to 60m after sunrise
  if (curMin >= sunriseMin - 30 && curMin < sunriseMin + 60) {
    return { key: 'dawn', ...sunArtwork.dawn };
  }

  // 3. Sunset & Dusk: from 60m before sunset to 30m after sunset
  if (curMin >= sunsetMin - 60 && curMin < sunsetMin + 30) {
    return { key: 'sunset', ...sunArtwork.sunset };
  }

  // 4. Solar Noon: Zenith window around midday (within 90 min of solar noon)
  if (curMin >= solarNoonMin - 90 && curMin <= solarNoonMin + 90) {
    return { key: 'noon', ...sunArtwork.noon };
  }

  // 5. Morning Sun: between dawn and noon
  if (curMin < solarNoonMin) {
    return { key: 'morning', ...sunArtwork.morning };
  }

  // 6. Afternoon Sun: between noon and sunset
  return { key: 'afternoon', ...sunArtwork.afternoon };
}

/**
 * Selects curated weather artwork matching live atmospheric conditions, temperature, and day/night.
 */
export function getWeatherArtworkForCondition(
  condition: string = '',
  temp: number = 20,
  options?: WeatherArtworkOptions
) {
  const cond = condition.toLowerCase();
  const phase = (options?.moonPhase || '').toLowerCase();

  // Explicit check for night keyword in condition string or options
  const condHasNight = cond.includes('night') || cond.includes('moon');
  const night = options?.isNight === true || condHasNight || (options && isNightTime(options));

  // --- NIGHTTIME LOGIC ---
  if (night) {
    // 1. Extreme weather at night (Thunderstorm / Heavy Snow)
    if (cond.includes('thunder') || cond.includes('storm')) {
      return weatherArtwork.thunderstorm;
    }
    if (
      cond.includes('snow') ||
      cond.includes('flurr') ||
      cond.includes('sleet') ||
      cond.includes('ice') ||
      cond.includes('freez') ||
      cond.includes('blizzard') ||
      temp <= 0
    ) {
      return weatherArtwork.snowy;
    }

    // 2. Full Moon night
    if (cond.includes('full moon') || cond.includes('full-moon') || phase.includes('full')) {
      return weatherArtwork.moonFull;
    }

    // 3. No Moon night (New Moon / Amavasya / Dark Moon)
    if (
      cond.includes('no moon') ||
      cond.includes('no-moon') ||
      cond.includes('new moon') ||
      cond.includes('new-moon') ||
      cond.includes('dark moon') ||
      phase.includes('new') ||
      phase.includes('no moon')
    ) {
      return weatherArtwork.moonNoNight;
    }

    // 4. Cloudy sky at night (cloudy, partly cloudy, overcast, fog, mist, rain)
    if (
      cond.includes('cloud') ||
      cond.includes('overcast') ||
      cond.includes('partly') ||
      cond.includes('fog') ||
      cond.includes('mist') ||
      cond.includes('haze') ||
      cond.includes('rain') ||
      cond.includes('drizzle') ||
      cond.includes('shower')
    ) {
      return weatherArtwork.moonCloudy;
    }

    // 5. Clear sky at night (Clear sky, mainly clear, clear night, fine night, etc.)
    return weatherArtwork.moonClear;
  }

  // --- DAYTIME LOGIC ---
  if (cond.includes('thunder') || cond.includes('storm')) {
    return weatherArtwork.thunderstorm;
  }
  if (
    cond.includes('snow') ||
    cond.includes('flurr') ||
    cond.includes('sleet') ||
    cond.includes('ice') ||
    cond.includes('freez') ||
    cond.includes('blizzard') ||
    temp <= 0
  ) {
    return weatherArtwork.snowy;
  }
  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower')) {
    return weatherArtwork.rainy;
  }
  if (cond.includes('wind') || cond.includes('gale') || cond.includes('breez') || cond.includes('squall')) {
    return weatherArtwork.windy;
  }
  if (cond.includes('fog') || cond.includes('mist') || cond.includes('haze')) {
    return weatherArtwork.foggy;
  }
  if (cond.includes('overcast') || (cond.includes('cloud') && !cond.includes('partly'))) {
    return weatherArtwork.cloudy;
  }
  if (cond.includes('partly')) {
    return weatherArtwork.partlyCloudy;
  }
  if (cond.includes('clear') || cond.includes('sun')) {
    return weatherArtwork.sunny;
  }
  return weatherArtwork.partlyCloudy;
}

// Re-export JSON-driven weather poetry engine
export { getWeatherPoem } from './weather-poetry';