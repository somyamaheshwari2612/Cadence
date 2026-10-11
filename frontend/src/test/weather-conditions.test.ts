import { describe, it, expect } from 'vitest';
import {
  weatherArtwork,
  getWeatherArtworkForCondition,
  getWeatherPoem,
  getSolarStage,
  sunArtwork,
} from '@/lib/weather-artwork';

describe('Weather Artwork & Condition Engine', () => {
  it('selects snowy artwork for snow, flurries, freezing temperatures or sleet', () => {
    expect(getWeatherArtworkForCondition('Light Snow', 1)).toBe(weatherArtwork.snowy);
    expect(getWeatherArtworkForCondition('Snowfall', -2)).toBe(weatherArtwork.snowy);
    expect(getWeatherArtworkForCondition('Freezing Drizzle', 2)).toBe(weatherArtwork.snowy);
    expect(getWeatherArtworkForCondition('Clear Sky', -5)).toBe(weatherArtwork.snowy);
  });

  it('selects rainy artwork for rain, showers, and drizzle', () => {
    expect(getWeatherArtworkForCondition('Rain Showers', 18)).toBe(weatherArtwork.rainy);
    expect(getWeatherArtworkForCondition('Light Drizzle', 20)).toBe(weatherArtwork.rainy);
    expect(getWeatherArtworkForCondition('Heavy Rain', 22)).toBe(weatherArtwork.rainy);
  });

  it('selects windy artwork for windy and breezy conditions', () => {
    expect(getWeatherArtworkForCondition('Clear & Windy', 24)).toBe(weatherArtwork.windy);
    expect(getWeatherArtworkForCondition('Breezy & Cloudy', 22)).toBe(weatherArtwork.windy);
    expect(getWeatherArtworkForCondition('Breezy & Overcast', 22)).toBe(weatherArtwork.windy);
    expect(getWeatherArtworkForCondition('High Wind Gale', 20)).toBe(weatherArtwork.windy);
  });

  it('selects thunderstorm artwork for storms and lightning', () => {
    expect(getWeatherArtworkForCondition('Thunderstorm', 26)).toBe(weatherArtwork.thunderstorm);
  });

  it('selects foggy artwork for fog and mist', () => {
    expect(getWeatherArtworkForCondition('Fog', 15)).toBe(weatherArtwork.foggy);
    expect(getWeatherArtworkForCondition('Dense Mist', 14)).toBe(weatherArtwork.foggy);
  });

  it('selects cloudy artwork for cloudy skies', () => {
    expect(getWeatherArtworkForCondition('Cloudy', 19)).toBe(weatherArtwork.cloudy);
    expect(getWeatherArtworkForCondition('Overcast', 19)).toBe(weatherArtwork.cloudy);
  });

  it('selects sunny artwork for clear and sunny skies during daytime', () => {
    expect(getWeatherArtworkForCondition('Clear Sky', 25)).toBe(weatherArtwork.sunny);
    expect(getWeatherArtworkForCondition('Mainly Clear', 28)).toBe(weatherArtwork.sunny);
  });

  it('selects appropriate moon artwork for nighttime conditions instead of glowing sun', () => {
    // 1. Clear sky at night -> crescent/gibbous moon in clear dark sky
    expect(getWeatherArtworkForCondition('Clear Sky', 18, { isNight: true })).toBe(weatherArtwork.moonClear);
    expect(getWeatherArtworkForCondition('Mainly Clear', 16, { isNight: true })).toBe(weatherArtwork.moonClear);
    expect(getWeatherArtworkForCondition('Clear night', 18)).toBe(weatherArtwork.moonClear);

    // 2. Cloudy sky at night -> moon veiled behind clouds
    expect(getWeatherArtworkForCondition('Partly Cloudy', 18, { isNight: true })).toBe(weatherArtwork.moonCloudy);
    expect(getWeatherArtworkForCondition('Cloudy', 17, { isNight: true })).toBe(weatherArtwork.moonCloudy);
    expect(getWeatherArtworkForCondition('Overcast', 17, { isNight: true })).toBe(weatherArtwork.moonCloudy);
    expect(getWeatherArtworkForCondition('Cloudy night', 16)).toBe(weatherArtwork.moonCloudy);

    // 3. No moon night -> starry night sky without visible moon
    expect(getWeatherArtworkForCondition('Clear Sky', 18, { isNight: true, moonPhase: 'New Moon' })).toBe(weatherArtwork.moonNoNight);
    expect(getWeatherArtworkForCondition('No moon night', 18)).toBe(weatherArtwork.moonNoNight);
    expect(getWeatherArtworkForCondition('New moon', 18)).toBe(weatherArtwork.moonNoNight);

    // 4. Full moon night -> radiant luminous full moon
    expect(getWeatherArtworkForCondition('Clear Sky', 18, { isNight: true, moonPhase: 'Full Moon' })).toBe(weatherArtwork.moonFull);
    expect(getWeatherArtworkForCondition('Full moon night', 18)).toBe(weatherArtwork.moonFull);
  });

  it('generates evocative poetry appropriate to each weather state and nighttime', () => {
    const snowPoem = getWeatherPoem('Snowfall', -2);
    expect(snowPoem.line1).toContain('Crisp alpine air');

    const rainPoem = getWeatherPoem('Rain', 20);
    expect(rainPoem.line1).toContain('Fresh scent of rain');

    const windPoem = getWeatherPoem('Clear & Windy', 22);
    expect(windPoem.line1).toContain('Brisk mountain gales');

    const stormPoem = getWeatherPoem('Thunderstorm', 24);
    expect(stormPoem.line1).toContain('Distant rumbles');

    // Night poems
    const clearNightPoem = getWeatherPoem('Clear Sky', 18, { isNight: true });
    expect(clearNightPoem.line1).toContain('Crescent');

    const fullMoonPoem = getWeatherPoem('Full Moon', 18, { isNight: true });
    expect(fullMoonPoem.line1).toContain('Silver moonlight');

    const noMoonPoem = getWeatherPoem('No Moon', 18, { isNight: true });
    expect(noMoonPoem.line1).toContain('Velvet darkness');

    const cloudyNightPoem = getWeatherPoem('Partly Cloudy', 18, { isNight: true });
    expect(cloudyNightPoem.line1).toContain('Veiled moonlight');
  });

  it('selects day vs night quotes accurately based on sunrise and sunset times', () => {
    // Sunrise at 06:22 AM (382 mins), Sunset at 05:59 PM (1079 mins)
    const sunOpts = { sunrise: '06:22 AM', sunset: '05:59 PM' };

    // At 12:00 PM (720 mins) -> DAY (sunrise to sunset)
    const middayPoem = getWeatherPoem('Clear Sky', 25, { ...sunOpts, timeMinutes: 720 });
    expect(middayPoem.line1).toContain('Nothing between you and the blue');

    // At 08:30 PM (1230 mins) -> NIGHT (sunset to sunrise)
    const eveningPoem = getWeatherPoem('Clear Sky', 22, { ...sunOpts, timeMinutes: 1230 });
    expect(eveningPoem.line1).toContain('Gentle night breeze');

    // At 05:00 AM (300 mins, before sunrise) -> NIGHT (sunset to sunrise)
    const dawnNightPoem = getWeatherPoem('Clear Sky', 20, { ...sunOpts, timeMinutes: 300 });
    expect(dawnNightPoem.line1).toContain('Gentle night breeze');

    // At 07:00 AM (420 mins, after sunrise) -> DAY
    const morningDayPoem = getWeatherPoem('Clear Sky', 21, { ...sunOpts, timeMinutes: 420 });
    expect(morningDayPoem.line1).toContain('Nothing between you and the blue');
  });

  it('differentiates quotes by temperature ranges (freezing, cold, hot)', () => {
    // Hot day (>= 32°C / 35°C)
    const hotPoem = getWeatherPoem('Clear Sky', 36, { isNight: false });
    expect(hotPoem.line1).toContain('High blazing sun');

    // Cold day (<= 10°C)
    const coldPoem = getWeatherPoem('Clear Sky', 8, { isNight: false });
    expect(coldPoem.line1).toContain('Cool air. Rosy mornings');

    // Freezing day (<= 0°C)
    const freezingPoem = getWeatherPoem('Clear Sky', -4, { isNight: false });
    expect(freezingPoem.line1).toContain('Frost on the rooftops');

    // Hot night
    const hotNightPoem = getWeatherPoem('Clear Sky', 34, { isNight: true });
    expect(hotNightPoem.line1).toContain('The earth is still holding the heat');
  });

  it('evaluates sun vs moon based on target country local time, not user browser clock', () => {
    // Simulated UTC instant: 2026-10-10T15:00:00Z
    // In India (UTC+5:30), this is 20:30 (8:30 PM, NIGHT)
    // In London (UTC+1 BST), this is 16:00 (4:00 PM, DAY - sunrise 07:18 AM, sunset 06:18 PM)
    // In New York (UTC-4 EDT), this is 11:00 (11:00 AM, DAY - sunrise 07:02 AM, sunset 06:23 PM)
    // In Tokyo (UTC+9 JST), this is 00:00 (12:00 AM midnight, NIGHT - sunrise 05:43 AM, sunset 05:12 PM)
    const utcDate = new Date('2026-10-10T15:00:00Z');

    // 1. London: London's own time is 4:00 PM (sunrise 07:18 AM, sunset 06:18 PM) -> DAY -> SUN
    const londonArtwork = getWeatherArtworkForCondition('Clear Sky', 18, {
      timezone: 'Europe/London',
      date: utcDate,
      sunrise: '07:18 AM',
      sunset: '06:18 PM',
    });
    expect(londonArtwork).toBe(weatherArtwork.sunny);

    // 2. New York: New York's own time is 11:00 AM -> DAY -> SUN
    const nyArtwork = getWeatherArtworkForCondition('Clear Sky', 20, {
      timezone: 'America/New_York',
      date: utcDate,
      sunrise: '07:02 AM',
      sunset: '06:23 PM',
    });
    expect(nyArtwork).toBe(weatherArtwork.sunny);

    // 3. Tokyo: Tokyo's own time is midnight 12:00 AM -> NIGHT -> MOON
    const tokyoArtwork = getWeatherArtworkForCondition('Clear Sky', 16, {
      timezone: 'Asia/Tokyo',
      date: utcDate,
      sunrise: '05:43 AM',
      sunset: '05:12 PM',
    });
    expect(tokyoArtwork).toBe(weatherArtwork.moonClear);

    // 4. India: India's own time is 8:30 PM (after 05:59 PM sunset) -> NIGHT -> MOON
    const indiaArtwork = getWeatherArtworkForCondition('Clear Sky', 26, {
      timezone: 'Asia/Kolkata',
      date: utcDate,
      sunrise: '06:22 AM',
      sunset: '05:59 PM',
    });
    expect(indiaArtwork).toBe(weatherArtwork.moonClear);
  });

  it('determines solar stages accurately for dawn, morning, solar noon, afternoon, sunset, and night', () => {
    // Standard sunrise at 06:19 AM (379m), sunset at 05:49 PM (1069m), solar noon at 12:04 PM (724m)
    const opts = { sunrise: '06:19 AM', sunset: '05:49 PM' };

    // 1. Dawn / Sunrise: 06:00 AM (360m)
    const dawn = getSolarStage({ ...opts, timeMinutes: 360 });
    expect(dawn.key).toBe('dawn');
    expect(dawn.label).toBe('Dawn & Sunrise');
    expect(dawn.src).toBe(sunArtwork.dawn.src);

    // 2. Morning Sun: 09:30 AM (570m)
    const morning = getSolarStage({ ...opts, timeMinutes: 570 });
    expect(morning.key).toBe('morning');
    expect(morning.label).toBe('Morning Sun');
    expect(morning.src).toBe(sunArtwork.morning.src);

    // 3. Solar Noon: 12:15 PM (735m)
    const noon = getSolarStage({ ...opts, timeMinutes: 735 });
    expect(noon.key).toBe('noon');
    expect(noon.label).toBe('Solar Noon');
    expect(noon.src).toBe(sunArtwork.noon.src);

    // 4. Afternoon Sun: 03:30 PM (910m)
    const afternoon = getSolarStage({ ...opts, timeMinutes: 910 });
    expect(afternoon.key).toBe('afternoon');
    expect(afternoon.label).toBe('Afternoon Sun');
    expect(afternoon.src).toBe(sunArtwork.afternoon.src);

    // 5. Sunset & Dusk: 05:35 PM (1055m)
    const sunset = getSolarStage({ ...opts, timeMinutes: 1055 });
    expect(sunset.key).toBe('sunset');
    expect(sunset.label).toBe('Sunset & Dusk');
    expect(sunset.src).toBe(sunArtwork.sunset.src);

    // 6. Below Horizon (Night): 10:30 PM (1350m) & 02:00 AM (120m)
    const night = getSolarStage({ ...opts, timeMinutes: 1350 });
    expect(night.key).toBe('night');
    expect(night.label).toBe('Below Horizon');
    expect(night.src).toBe(sunArtwork.night.src);

    const deepNight = getSolarStage({ ...opts, timeMinutes: 120 });
    expect(deepNight.key).toBe('night');
    expect(deepNight.label).toBe('Below Horizon');
  });
});

