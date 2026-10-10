import { describe, it, expect } from 'vitest';
import {
  weatherArtwork,
  getWeatherArtworkForCondition,
  getWeatherPoem,
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
});

