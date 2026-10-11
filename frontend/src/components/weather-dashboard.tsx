import { useState, useMemo } from 'react';
import {
  MapPin,
  Sun,
  Moon,
  CloudMoon,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  Gauge,
  Calendar,
  CloudSun,
  Cloud,
  Navigation,
  RotateCw,
  Loader2,
  Info,
  Clock3,
  CloudRain,
  Snowflake,
  CloudLightning,
  AlertTriangle,
} from 'lucide-react';
import { WeatherSelect } from '@/components/weather-select';
import { LocationSearchPopover } from '@/components/location-search-popover';
import {
  weatherArtwork,
  sunArtwork,
  getWeatherArtworkForCondition,
  getWeatherPoem,
  parseTimeStringToMinutes,
  isNightTime,
  getSolarStage,
} from '@/lib/weather-artwork';
export { getWeatherArtworkForCondition, getWeatherPoem };
import { CadenceInfoTooltip } from '@/components/cadence-info-tooltip';
import { LocationAccuracyPopover } from '@/components/location-accuracy-popover';
import {
  type LocationCoords,
  formatAccuracy,
  isCoarseAccuracy,
} from '@/lib/location-utils';
import moonImage from '@/assets/gibbous-moon.jpg';

export interface WeatherDashboardData {
  temperature: number;
  apparentTemperature: number;
  condition: string;
  locationName: string;
  updatedTime: string;
  sunrise: string;
  sunset: string;
  tomorrowSunrise?: string;
  tomorrowSunset?: string;
  moonrise: string;
  moonset: string;
  tomorrowMoonrise?: string;
  tomorrowMoonset?: string;
  moonPhaseText: string;
  tomorrowMoonPhaseText?: string;
  isNight?: boolean;
  isDay?: boolean;
  timezone?: string;
  timezoneAbbr?: string;
  utcOffsetSeconds?: number;
  localTime?: string;
  aqi: number;
  aqiStatus: string;
  pm25?: number;
  cpcbIndicator?: number;
  cpcbCategory?: string;
  cpcbAdvisory?: string;
  uvIndex: number;
  uvStatus: string;
  precipitation?: number;
  precipitationStatus?: string;
  rainProbability?: number;
  humidity: number;
  humidityStatus: string;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  pressureStatus: string;
  visibility: number;
  visibilityStatus: string;
  hourly: Array<{
    label: string;
    temp: number;
    icon: 'sunny' | 'moon' | 'partly' | 'partly-moon' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'thunderstorm';
    dayLabel?: string;
    isDayBoundary?: boolean;
  }>;
}

export interface WeatherDashboardProps {
  location: string;
  onLocationChange: (loc: string, coords?: LocationCoords) => void;
  data?: Partial<WeatherDashboardData>;
  isLoading?: boolean;
  onRefresh?: () => void;
  coords?: LocationCoords;
  hasDataIssue?: boolean;
}



/**
 * 1. HERO CURRENT WEATHER CARD
 * Displays current temperature, location dropdown, condition, feels like, poem, and live updating status.
 */
export function HeroWeatherCard({
  location,
  onLocationChange,
  data,
  className = '',
  isLoading = false,
  onRefresh,
  coords,
  hasDataIssue = false,
}: WeatherDashboardProps & { className?: string }) {
  const temp = data?.temperature ?? 28;
  const feelsLike = data?.apparentTemperature ?? 31;
  const condition = data?.condition ?? 'Partly Cloudy';
  const updatedTime = data?.updatedTime ?? 'Last updated · 10 Oct 2026, 11:42 AM';

  // Determine if it is nighttime from sunset/sunrise using the target location's OWN local time
  const currentIsNight = (() => {
    if (data?.isNight !== undefined) return data.isNight;
    if (data?.isDay !== undefined) return !data.isDay;

    return isNightTime({
      sunset: data?.sunset,
      sunrise: data?.sunrise,
      timezone: data?.timezone,
      utcOffsetSeconds: data?.utcOffsetSeconds,
    });
  })();

  const artwork = getWeatherArtworkForCondition(condition, temp, {
    isNight: currentIsNight,
    sunset: data?.sunset,
    sunrise: data?.sunrise,
    moonPhase: data?.moonPhaseText,
    timezone: data?.timezone,
    utcOffsetSeconds: data?.utcOffsetSeconds,
  });
  const poem = getWeatherPoem(condition, temp, {
    isNight: currentIsNight,
    sunset: data?.sunset,
    sunrise: data?.sunrise,
    moonPhase: data?.moonPhaseText,
    timezone: data?.timezone,
    utcOffsetSeconds: data?.utcOffsetSeconds,
  });
  const coarse = coords?.accuracy !== undefined && coords.accuracy > 5000;

  return (
    <section className={`panel current-weather ${className} ${isLoading ? 'is-updating' : ''}`} aria-label="Current Weather">
      <img
        className="weather-art"
        src={artwork.src}
        alt={artwork.alt}
      />
      <div className="orbit" aria-hidden="true" />
      <div className="weather-copy">
        <div className="location-line flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin aria-hidden="true" className="w-4 h-4 text-[var(--primary)] shrink-0" />
            <LocationSearchPopover
              location={location}
              onLocationSelect={onLocationChange}
              coords={coords}
              triggerVariant="hero"
            />
            {coords?.accuracy !== undefined && (
              <LocationAccuracyPopover
                accuracy={coords.accuracy}
              />
            )}
          </div>

          {/* Live Status & Updating Indicator Pill */}
          <div className="hero-status-controls flex items-center gap-2">
            {isLoading ? (
              <span
                className="hero-updating-pill"
                role="status"
                aria-live="polite"
              >
                <span className="updating-beacon" aria-hidden="true">
                  <span className="updating-beacon-ping" />
                  <span className="updating-beacon-dot" />
                </span>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--primary)] shrink-0" aria-hidden="true" />
                <span>Updating forecast...</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={onRefresh}
                className="hero-refresh-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[color-mix(in_oklch,var(--card)_60%,transparent)] hover:bg-[color-mix(in_oklch,var(--card)_90%,transparent)] border border-[var(--fine-line)] hover:border-[var(--primary)] transition-all cursor-pointer"
                title="Click to refresh live forecast"
                aria-label="Refresh forecast"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_6px_var(--primary)] animate-pulse" />
                <span>Live forecast</span>
                <RotateCw className="w-3 h-3 ml-0.5 opacity-70 hover:opacity-100" />
              </button>
            )}

            {coords && (
              <details className="hero-data-details relative inline-block group">
                <summary
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)] border border-[var(--fine-line)] hover:border-[var(--primary)] bg-[color-mix(in_oklch,var(--card)_50%,transparent)] transition-all cursor-pointer list-none select-none"
                  aria-label="Model grid data details"
                  title="View model-grid details"
                >
                  <Info className="w-3 h-3" />
                </summary>
                <div className="absolute right-0 top-8 z-50 w-80 p-3.5 rounded-xl bg-[var(--menu-surface)] border border-[var(--border)] shadow-[var(--menu-shadow)] text-xs text-[var(--foreground)] backdrop-blur-xl leading-relaxed space-y-2">
                  <p className="font-semibold text-[var(--primary)]">Forecast grid cell</p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Confirmed coordinates: {coords.latitude.toFixed(4)}° N, {coords.longitude.toFixed(4)}° E.
                    {coords.accuracy !== undefined && (
                      <span className="block mt-1 font-mono text-[var(--primary)] font-medium">
                        Reported device accuracy: {formatAccuracy(coords.accuracy)}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)] border-t border-[var(--fine-line)] pt-1.5">
                    Interpolated to nearest numerical model-grid cell via Open-Meteo &amp; CAMS.
                    Forecast model-grid resolution can be much coarser than device-location accuracy (~11–25 km weather grid, ~40 km air chemistry grid).
                  </p>
                  {coarse && (
                    <p className="text-[10.5px] text-[var(--caution)] font-medium bg-[color-mix(in_oklch,var(--caution)_15%,transparent)] p-1.5 rounded">
                      Reported accuracy is above 5 km; city search is the preferred alternative.
                    </p>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>

        {/* Coarse Accuracy (> 5 km) Preferred Alternative Banner */}
        {coarse && (
          <div className="coarse-accuracy-banner flex items-center justify-between gap-3 p-2.5 px-3 mt-2.5 rounded-lg bg-[color-mix(in_oklch,var(--caution)_15%,transparent)] border border-[color-mix(in_oklch,var(--caution)_35%,transparent)] text-xs text-[var(--foreground)] animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--caution)] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[var(--caution)]">
                  Coarse device location ({formatAccuracy(coords?.accuracy)})
                </span>
                <p className="text-[11px] text-[var(--muted-foreground)] leading-snug mt-0.5">
                  Device location reported accuracy above 5 km. Searching for your city by name is recommended as the preferred alternative for more reliable forecasts.
                </p>
              </div>
            </div>
            <LocationSearchPopover
              location="Search city"
              onLocationSelect={onLocationChange}
              coords={coords}
              triggerVariant="banner"
            />
          </div>
        )}

        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
          <p className="updated text-xs text-[var(--muted-foreground)] m-0">{updatedTime}</p>
          {hasDataIssue && (
            <span className="text-[10px] text-[var(--caution)] bg-[var(--caution-surface)] px-2 py-0.5 rounded-full border border-[var(--caution-border)]">
              Partial forecast data
            </span>
          )}
        </div>
        <div className="temperature">
          {temp}
          <span>°C</span>
        </div>
        <p className="condition">{condition}</p>
        <p className="feels flex items-center gap-1.5">
          <Thermometer aria-hidden="true" /> Feels like {feelsLike}°
          <CadenceInfoTooltip type="feels-like" />
        </p>
        <p className="weather-poem">
          {poem.line1}
          <br />
          {poem.line2}
        </p>
      </div>
    </section>
  );
}

/**
 * 2. SUN & MOON (ASTRONOMY) CARD
 * Displays celestial arc tracking sunrise/sunset, moonrise/moonset, and 72% gibbous moon disc.
 */
export function SunMoonCard({
  data,
  className = '',
}: {
  data?: Partial<WeatherDashboardData>;
  className?: string;
}) {
  const [period, setPeriod] = useState<'Today' | 'Tomorrow'>('Today');

  const shiftTimeStr = (timeStr?: string, minutesShift: number = 0, fallback: string = '06:00 AM'): string => {
    if (!timeStr) return fallback;
    const mins = parseTimeStringToMinutes(timeStr);
    if (mins === null) return timeStr;
    const shifted = (mins + minutesShift + 1440) % 1440;
    const h = Math.floor(shifted / 60) % 24;
    const m = shifted % 60;
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const isTomorrow = period === 'Tomorrow';

  const todaySunrise = data?.sunrise ?? '06:22 AM';
  const todaySunset = data?.sunset ?? '05:59 PM';
  const todayMoonrise = data?.moonrise ?? '02:17 AM';
  const todayMoonset = data?.moonset ?? '03:48 PM';
  const todayMoonPhase = data?.moonPhaseText ?? 'Waning Gibbous\n(72%)';

  const tomorrowSunrise = data?.tomorrowSunrise || shiftTimeStr(todaySunrise, 1, '06:23 AM');
  const tomorrowSunset = data?.tomorrowSunset || shiftTimeStr(todaySunset, -1, '05:58 PM');
  const tomorrowMoonrise = data?.tomorrowMoonrise || shiftTimeStr(todayMoonrise, 51, '03:08 AM');
  const tomorrowMoonset = data?.tomorrowMoonset || shiftTimeStr(todayMoonset, 50, '04:38 PM');
  const tomorrowMoonPhase = data?.tomorrowMoonPhaseText || 'Waning Gibbous\n(63%)';

  const displaySunrise = isTomorrow ? tomorrowSunrise : todaySunrise;
  const displaySunset = isTomorrow ? tomorrowSunset : todaySunset;
  const displayMoonrise = isTomorrow ? tomorrowMoonrise : todayMoonrise;
  const displayMoonset = isTomorrow ? tomorrowMoonset : todayMoonset;
  const displayMoonPhase = isTomorrow ? tomorrowMoonPhase : todayMoonPhase;

  const solarStage = isTomorrow
    ? { key: 'dawn' as const, src: sunArtwork.dawn.src, label: "Tomorrow's Sunrise", detail: 'Golden Horizon' }
    : getSolarStage({
        sunrise: todaySunrise,
        sunset: todaySunset,
        timezone: data?.timezone,
        utcOffsetSeconds: data?.utcOffsetSeconds,
      });

  const activeMoonImage = (() => {
    const phaseText = displayMoonPhase.toLowerCase();
    if (phaseText.includes('full')) return weatherArtwork.moonFull.src;
    if (phaseText.includes('new') || phaseText.includes('no moon')) return weatherArtwork.moonNoNight.src;
    if (phaseText.includes('cloud')) return weatherArtwork.moonCloudy.src;
    return weatherArtwork.moonClear.src;
  })();

  const moonLines = displayMoonPhase.split('\n');
  const moonPhaseName = moonLines[0] || 'Waning Gibbous';
  const moonPhaseDetail = moonLines[1] || (isTomorrow ? '(63%)' : '(72%)');

  return (
    <section className={`panel celestial ${className}`} aria-label="Sun and Moon">
      <div className="heading-row">
        <h2 className="section-heading">
          <Sun aria-hidden="true" /> Sun &amp; Moon
          <span className="text-xs text-[var(--muted-foreground)] font-normal ml-2">
            · {period}
          </span>
        </h2>
        <WeatherSelect
          label="Celestial period"
          variant="period"
          value={period}
          options={['Today', 'Tomorrow']}
          onValueChange={v => setPeriod(v as 'Today' | 'Tomorrow')}
        />
      </div>

      <div className="celestial-body">
        {/* Sun Section (Equal 50% space) */}
        <div className="sun-section">
          <div className="celestial-events-col">
            <div className="celestial-title">
              <Sun aria-hidden="true" /> Sun
            </div>
            <div className="event">
              <small>Sunrise</small>
              <strong>{displaySunrise}</strong>
            </div>
            <div className="event">
              <small>Sunset</small>
              <strong>{displaySunset}</strong>
            </div>
          </div>
          <div className="celestial-display sun-display">
            <img className="celestial-image sun-image" src={solarStage.src} alt={solarStage.label} />
            <p>
              {solarStage.label}
              <br />
              <strong>{solarStage.detail}</strong>
            </p>
          </div>
        </div>

        {/* Moon Section (Equal 50% space) */}
        <div className="moon-section">
          <div className="celestial-events-col">
            <div className="celestial-title">
              <Moon aria-hidden="true" /> Moon
            </div>
            <div className="event">
              <small>Moonrise</small>
              <strong>{displayMoonrise}</strong>
            </div>
            <div className="event">
              <small>Moonset</small>
              <strong>{displayMoonset}</strong>
            </div>
          </div>
          <div className="celestial-display moon-display">
            <img className="celestial-image moon-image" src={activeMoonImage} alt="Moon Phase" />
            <p>
              {moonPhaseName}
              <br />
              <strong>{moonPhaseDetail}</strong>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * 3. ENVIRONMENT BENTO GRID
 * 6 visual telemetry modules: AQI, UV Index, Humidity, Wind, Pressure, Visibility.
 */
export function EnvironmentBentoGrid({
  data,
  className = '',
}: {
  data?: Partial<WeatherDashboardData>;
  className?: string;
}) {
  const pm25 = data?.pm25 ?? 50;
  const cpcbIndicator = data?.cpcbIndicator ?? data?.aqi ?? 83;
  const cpcbCategory = data?.cpcbCategory ?? data?.aqiStatus ?? 'Satisfactory';
  const cpcbAdvisory = data?.cpcbAdvisory ?? 'Generally acceptable; sensitive people may notice minor breathing discomfort';
  const uvIndex = data?.uvIndex ?? 5;
  const uvStatus = data?.uvStatus ?? 'Moderate';
  const precipitation = data?.precipitation ?? data?.rainProbability ?? 10;
  const precipitationStatus =
    data?.precipitationStatus ??
    (precipitation <= 15 ? 'Dry conditions' : precipitation <= 40 ? 'Low chance' : 'Rain likely');
  const humidity = data?.humidity ?? 68;
  const humidityStatus = data?.humidityStatus ?? 'Comfortable';
  const windSpeed = data?.windSpeed ?? 12;
  const windDir = data?.windDirection ?? 'ESE';
  const pressure = data?.pressure ?? 1012;
  const pressureStatus = data?.pressureStatus ?? 'Steady';
  const visibility = data?.visibility ?? 8;
  const visibilityStatus = data?.visibilityStatus ?? 'Good';

  // Dynamic telemetry curve calculations for Humidity
  const clampedHum = Math.min(100, Math.max(0, humidity));
  const humNodeY = Math.round(34 - (clampedHum / 100) * 24);
  const humStart = Math.round(Math.min(34, Math.max(8, humNodeY + 4)));
  const humC1 = Math.round(Math.min(34, Math.max(8, humNodeY + 6)));
  const humC2 = Math.round(Math.min(34, Math.max(8, humNodeY - 2)));
  const humC3 = Math.round(Math.min(34, Math.max(8, humNodeY - 1)));
  const humEnd = Math.round(Math.min(34, Math.max(8, humNodeY + 3)));

  // Dynamic telemetry curve calculations for Barometric Pressure
  const clampedPressure = Math.min(1040, Math.max(980, pressure));
  const presFraction = (clampedPressure - 980) / 60;
  const presNodeY = Math.round(33 - presFraction * 24);
  const presTrendOffset = pressureStatus === 'Rising' ? 3 : pressureStatus === 'Falling' ? -3 : 1;
  const presStart = Math.round(Math.min(34, Math.max(8, presNodeY + presTrendOffset)));
  const presC1 = Math.round(Math.min(34, Math.max(8, presStart - 2)));
  const presC2 = Math.round(Math.min(34, Math.max(8, presNodeY + 2)));
  const presC3 = Math.round(Math.min(34, Math.max(8, presNodeY - 1)));
  const presEnd = Math.round(Math.min(34, Math.max(8, presNodeY + 2)));

  return (
    <section className={`panel environment ${className}`} aria-label="Environmental telemetry">
      <div className="heading-row">
        <h2 className="section-heading">
          <Wind aria-hidden="true" /> Environment
        </h2>
        <span className="text-xs text-[var(--muted-foreground)]">Live telemetry context</span>
      </div>

      <div className="metrics-grid">
        {/* 1. AIR QUALITY FORECAST */}
        <div
          className="metric metric-aqi"
          title="Air quality forecast based on modeled PM2.5 concentrations; not an official CPCB station AQI."
        >
          <div className="metric-top flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="metric-icon">
                <Wind aria-hidden="true" />
              </div>
              <span>Air Quality</span>
            </div>
            <CadenceInfoTooltip type="air-particles" />
          </div>
          <div className="metric-value">
            {pm25}
            <small className="text-xs text-[var(--muted-foreground)] ml-1">AQI</small>
          </div>
          <div className="metric-status flex items-center gap-1">
            <span>Air: {cpcbCategory}</span>
            <span className="text-[10px] text-[var(--muted-foreground)] font-normal">(~{cpcbIndicator} AQI)</span>
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)] leading-tight mt-1 line-clamp-1">
            Modeled regional forecast
          </div>
          <div className="metric-bottom mt-1.5 flex items-center justify-between gap-1.5">
            <div className="meter flex-1" style={{ width: 'auto' }} />
            <span className="text-[9px] text-[var(--muted-foreground)] whitespace-nowrap shrink-0">Air quality estimate</span>
          </div>
          <p className="text-[10px] text-[var(--muted-subordinate)] mt-1.5 leading-tight flex items-center gap-1">
            <span>Forecast-based air quality estimate</span>
            <CadenceInfoTooltip type="cpcb-estimate" />
          </p>
        </div>

        {/* 2. UV Index */}
        <div className="metric metric-uv">
          <div className="metric-top flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="metric-icon">
                <Sun aria-hidden="true" />
              </div>
              <span>UV Index</span>
            </div>
          </div>
          <div className="metric-value">{uvIndex}</div>
          <div className="metric-status">{uvStatus}</div>
          <div className="metric-bottom mt-1.5 flex items-center justify-between gap-1.5">
            <div className="meter flex-1" style={{ width: 'auto' }} />
            <span className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap shrink-0">/ 11</span>
          </div>
        </div>

        {/* 3. Precipitation Percentage */}
        <div className="metric metric-rain">
          <div className="metric-top flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="metric-icon">
                <CloudRain aria-hidden="true" />
              </div>
              <span>Precipitation</span>
            </div>
            <CadenceInfoTooltip type="chance-of-rain" />
          </div>
          <div className="metric-value">
            {precipitation}
            <small>%</small>
          </div>
          <div className="metric-status">{precipitationStatus}</div>
          <div className="metric-bottom mt-1.5 flex items-center justify-between gap-1.5">
            <div
              className="meter flex-1"
              style={{
                width: 'auto',
                '--rain-percent': `${Math.min(100, Math.max(precipitation > 0 ? 8 : 0, precipitation))}%`,
              } as React.CSSProperties}
            />
            <span className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap shrink-0">/ 100%</span>
          </div>
        </div>

        {/* 4. Humidity */}
        <div className="metric metric-humidity">
          <div className="metric-top flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="metric-icon">
                <Droplets aria-hidden="true" />
              </div>
              <span>Humidity</span>
            </div>
            <CadenceInfoTooltip type="humidity" />
          </div>
          <div className="metric-value">
            {humidity}
            <small>%</small>
          </div>
          <div className="metric-status">{humidityStatus}</div>
          <div className="metric-bottom telemetry-container">
            <div className="telemetry-graph">
              <svg className="telemetry-chart" viewBox="0 0 140 44" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="humidity-glow-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.32" />
                    <stop offset="65%" stopColor="var(--primary)" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal Baseline & Comfort Band */}
                <line x1="0" y1="36" x2="140" y2="36" className="telemetry-baseline" />
                <line x1="42" y1="36" x2="84" y2="36" className="telemetry-comfort-band" />

                {/* Grounded Area Fill */}
                <path
                  d={`M 0,36 L 0,${humStart} C 35,${humC1} 65,${humC2} 95,${humNodeY} C 115,${humC3} 130,${humEnd} 140,${humEnd} L 140,36 Z`}
                  fill="url(#humidity-glow-gradient)"
                  className="telemetry-area"
                />

                {/* Luminous Moisture Wave */}
                <path
                  d={`M 0,${humStart} C 35,${humC1} 65,${humC2} 95,${humNodeY} C 115,${humC3} 130,${humEnd} 140,${humEnd}`}
                  className="telemetry-line telemetry-line-humidity"
                />

                {/* Active Reading Node */}
                <circle cx="95" cy={humNodeY} r="5.5" className="telemetry-halo telemetry-halo-humidity" />
                <circle cx="95" cy={humNodeY} r="2.5" className="telemetry-node telemetry-node-humidity" />
              </svg>
            </div>
            <div className="telemetry-footer">
              <span className="telemetry-tick">0%</span>
              <span className="telemetry-range">Comfort 30–60%</span>
              <span className="telemetry-tick">100%</span>
            </div>
          </div>
        </div>

        {/* 5. Wind */}
        <div className="metric metric-wind">
          <div className="metric-top flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="metric-icon">
                <Wind aria-hidden="true" />
              </div>
              <span>Wind</span>
            </div>
            <CadenceInfoTooltip type="wind" />
          </div>
          <div className="metric-value">
            {windSpeed}
            <small>km/h</small>
          </div>
          <div className="metric-status">{windDir}</div>
          <div className="compass" aria-label={`Wind direction ${windDir}`}>
            <Navigation aria-hidden="true" />
          </div>
        </div>

        {/* 6. Pressure */}
        <div className="metric metric-pressure">
          <div className="metric-top flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="metric-icon">
                <Gauge aria-hidden="true" />
              </div>
              <span>Pressure</span>
            </div>
            <CadenceInfoTooltip type="pressure" />
          </div>
          <div className="metric-value">
            {pressure}
            <small>hPa</small>
          </div>
          <div className="metric-status">{pressureStatus}</div>
          <div className="metric-bottom telemetry-container">
            <div className="telemetry-graph">
              <svg className="telemetry-chart" viewBox="0 0 140 44" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="pressure-glow-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--sunlight)" stopOpacity="0.28" />
                    <stop offset="65%" stopColor="var(--sunlight)" stopOpacity="0.07" />
                    <stop offset="100%" stopColor="var(--sunlight)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Standard Sea-Level Isobar Reference (1013 hPa) & Baseline */}
                <line x1="0" y1="20" x2="140" y2="20" className="telemetry-isobar" />
                <line x1="0" y1="36" x2="140" y2="36" className="telemetry-baseline" />

                {/* Grounded Area Fill */}
                <path
                  d={`M 0,36 L 0,${presStart} C 35,${presC1} 65,${presC2} 95,${presNodeY} C 115,${presC3} 130,${presEnd} 140,${presEnd} L 140,36 Z`}
                  fill="url(#pressure-glow-gradient)"
                  className="telemetry-area"
                />

                {/* Luminous Barometric Isobar Wave */}
                <path
                  d={`M 0,${presStart} C 35,${presC1} 65,${presC2} 95,${presNodeY} C 115,${presC3} 130,${presEnd} 140,${presEnd}`}
                  className="telemetry-line telemetry-line-pressure"
                />

                {/* Active Reading Node */}
                <circle cx="95" cy={presNodeY} r="5.5" className="telemetry-halo telemetry-halo-pressure" />
                <circle cx="95" cy={presNodeY} r="2.5" className="telemetry-node telemetry-node-pressure" />
              </svg>
            </div>
            <div className="telemetry-footer">
              <span className="telemetry-tick">980 Low</span>
              <span className="telemetry-range">1013 std isobar</span>
              <span className="telemetry-tick">1040 High</span>
            </div>
          </div>
        </div>

        {/* 7. Visibility */}
        <div className="metric metric-visibility">
          <div className="metric-top flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="metric-icon">
                <Eye aria-hidden="true" />
              </div>
              <span>Visibility</span>
            </div>
            <CadenceInfoTooltip type="visibility" />
          </div>
          <div className="metric-value">
            {visibility}
            <small>km</small>
          </div>
          <div className="metric-status">{visibilityStatus}</div>
          <div className="metric-bottom">
            <div className="visibility-graph" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * 4. TODAY'S FORECAST WITH CONNECTED SPLINE LINE
 */
export function TodaysForecastCard({
  data,
  className = '',
}: {
  data?: Partial<WeatherDashboardData>;
  className?: string;
}) {
  const [forecastPeriod, setForecastPeriod] = useState<'Next 24 hours' | 'Next 48 hours'>('Next 24 hours');
  const is48h = forecastPeriod === 'Next 48 hours';

  // Realistic diurnal curve fallback for up to 48 hours
  const defaultHourlyPoints = useMemo(() => {
    const baseTemps = [28, 29, 31, 33, 32, 30, 27, 25, 23, 22, 21, 20, 21, 23, 26, 29, 32, 33, 31, 29, 27, 25, 24, 23];
    const points: WeatherDashboardData['hourly'] = [];
    const nowHour = 12; // 12 PM
    for (let i = 0; i < 48; i++) {
      const h = (nowHour + i) % 24;
      const h12 = h % 12 || 12;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const label = i === 0 ? 'Now' : `${h12} ${ampm}`;
      const temp = baseTemps[i % 24] + (i >= 24 ? 1 : 0);
      const isNight = h < 6 || h >= 18;
      const icon = isNight ? (i % 3 === 0 ? 'partly-moon' : 'moon') : (temp > 30 ? 'sunny' : 'partly');
      const isDayBoundary = h === 0 && i > 0;
      const dayLabel = isDayBoundary ? (i < 28 ? 'Tomorrow' : 'Day 3') : undefined;
      points.push({ label, temp, icon: icon as any, dayLabel, isDayBoundary });
    }
    return points;
  }, []);

  const allPoints = data?.hourly && data.hourly.length > 0 ? data.hourly : defaultHourlyPoints;
  const activePoints = useMemo(() => {
    return is48h ? allPoints.slice(0, 48) : allPoints.slice(0, 24);
  }, [allPoints, is48h]);

  const colWidth = 68;
  const totalWidth = Math.max(activePoints.length * colWidth, 740);

  const { splinePath, pointCoords } = useMemo(() => {
    if (activePoints.length === 0) return { splinePath: '', pointCoords: [] };
    const temps = activePoints.map(p => p.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const tempRange = Math.max(1, maxTemp - minTemp);

    const coords = activePoints.map((pt, i) => {
      const cx = i * colWidth + colWidth / 2;
      const tNorm = (pt.temp - minTemp) / tempRange;
      // High temp -> cy = 6 (near top of 25px svg), Low temp -> cy = 18
      const cy = Math.round(18 - tNorm * 12);
      return { cx, cy, yOffset: cy - 12 };
    });

    // Catmull-Rom to Cubic Bezier conversion for smooth spline
    let d = `M ${coords[0].cx} ${coords[0].cy}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[Math.max(0, i - 1)];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[Math.min(coords.length - 1, i + 2)];

      const cp1x = p1.cx + (p2.cx - p0.cx) / 6;
      const cp1y = p1.cy + (p2.cy - p0.cy) / 6;
      const cp2x = p2.cx - (p3.cx - p1.cx) / 6;
      const cp2y = p2.cy - (p3.cy - p1.cy) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.cx.toFixed(1)} ${p2.cy.toFixed(1)}`;
    }

    return { splinePath: d, pointCoords: coords };
  }, [activePoints, colWidth]);

  return (
    <section className={`panel forecast ${className}`} aria-label="Today's Forecast">
      <div className="heading-row">
        <h2 className="section-heading">
          <Calendar aria-hidden="true" /> {is48h ? '48-Hour Extended Forecast' : "Today's Forecast"}
        </h2>
        <WeatherSelect
          label="Forecast coverage"
          variant="period"
          value={forecastPeriod}
          options={['Next 24 hours', 'Next 48 hours']}
          onValueChange={v => setForecastPeriod(v as 'Next 24 hours' | 'Next 48 hours')}
        />
      </div>

      <div className="forecast-body">
        {/* Connected SVG Spline Temperature Curve with Gradient */}
        <svg
          className="forecast-line"
          viewBox={`0 0 ${totalWidth} 25`}
          style={{ width: `${totalWidth}px` }}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="forecast-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--sunlight)" />
              <stop offset="25%" stopColor="var(--sunlight)" />
              <stop offset="60%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--mist)" />
            </linearGradient>
          </defs>
          <path d={splinePath} />
        </svg>

        {/* Dynamic Hourly Columns */}
        <div className="forecast-hours" style={{ width: `${totalWidth}px` }}>
          {activePoints.map((pt, i) => {
            const yOffset = pointCoords[i]?.yOffset ?? 0;
            const isWarm = pt.temp >= 30;
            return (
              <div
                key={i}
                className={`forecast-hour ${pt.isDayBoundary ? 'day-boundary' : ''}`}
                style={{ width: `${colWidth}px`, flex: `0 0 ${colWidth}px` }}
              >
                {pt.dayLabel && (
                  <span className="hour-day-tag">{pt.dayLabel}</span>
                )}
                <div className={`forecast-icon ${pt.icon}`}>
                  {pt.icon === 'sunny' ? (
                    <Sun aria-hidden="true" />
                  ) : pt.icon === 'moon' ? (
                    <Moon aria-hidden="true" />
                  ) : pt.icon === 'partly-moon' ? (
                    <CloudMoon aria-hidden="true" />
                  ) : pt.icon === 'partly' ? (
                    <CloudSun aria-hidden="true" />
                  ) : pt.icon === 'rainy' ? (
                    <CloudRain aria-hidden="true" />
                  ) : pt.icon === 'snowy' ? (
                    <Snowflake aria-hidden="true" />
                  ) : pt.icon === 'windy' ? (
                    <Wind aria-hidden="true" />
                  ) : pt.icon === 'thunderstorm' ? (
                    <CloudLightning aria-hidden="true" />
                  ) : (
                    <Cloud aria-hidden="true" />
                  )}
                </div>
                <div
                  className="forecast-dot"
                  style={{
                    transform: `translateY(${yOffset}px)`,
                    ...(isWarm
                      ? {
                          background: 'var(--sunlight)',
                          boxShadow: '0 0 6px color-mix(in oklch, var(--sunlight) 50%, transparent)',
                        }
                      : {}),
                  }}
                  aria-hidden="true"
                />
                <div className="hour-label">{pt.label}</div>
                <div className="hour-temp">{pt.temp}°</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/**
 * Combined Top Weather Dashboard (backward compatible)
 */
export function WeatherDashboard({
  location,
  onLocationChange,
  data,
}: WeatherDashboardProps) {
  return (
    <div className="weather-dashboard-top space-y-3 mb-6">
      <div className="top-grid">
        <HeroWeatherCard location={location} onLocationChange={onLocationChange} data={data} />
        <SunMoonCard data={data} />
      </div>
      <EnvironmentBentoGrid data={data} />
      <TodaysForecastCard data={data} />
    </div>
  );
}
