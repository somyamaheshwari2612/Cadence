import { useState } from 'react';
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
  moonrise: string;
  moonset: string;
  moonPhaseText: string;
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
  const [period, setPeriod] = useState('Today');
  const sunrise = data?.sunrise ?? '06:22 AM';
  const sunset = data?.sunset ?? '05:59 PM';
  const moonrise = data?.moonrise ?? '02:17 AM';
  const moonset = data?.moonset ?? '03:48 PM';

  const solarStage = getSolarStage({
    sunrise,
    sunset,
    timezone: data?.timezone,
    utcOffsetSeconds: data?.utcOffsetSeconds,
  });

  const activeMoonImage = (() => {
    const phaseText = (data?.moonPhaseText || '').toLowerCase();
    if (phaseText.includes('full')) return weatherArtwork.moonFull.src;
    if (phaseText.includes('new') || phaseText.includes('no moon')) return weatherArtwork.moonNoNight.src;
    if (phaseText.includes('cloud')) return weatherArtwork.moonCloudy.src;
    return weatherArtwork.moonClear.src;
  })();

  const rawMoonText = data?.moonPhaseText || 'Waning Gibbous\n(72%)';
  const moonLines = rawMoonText.split('\n');
  const moonPhaseName = moonLines[0] || 'Waning Gibbous';
  const moonPhaseDetail = moonLines[1] || '(72%)';

  return (
    <section className={`panel celestial ${className}`} aria-label="Sun and Moon">
      <div className="heading-row">
        <h2 className="section-heading">
          <Sun aria-hidden="true" /> Sun &amp; Moon
        </h2>
        <WeatherSelect
          label="Celestial period"
          variant="period"
          value={period}
          options={['Today', 'Tomorrow']}
          onValueChange={setPeriod}
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
              <strong>{sunrise}</strong>
            </div>
            <div className="event">
              <small>Sunset</small>
              <strong>{sunset}</strong>
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
              <strong>{moonrise}</strong>
            </div>
            <div className="event">
              <small>Moonset</small>
              <strong>{moonset}</strong>
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

  return (
    <section className={`panel environment ${className}`} aria-label="Environmental telemetry">
      <div className="heading-row">
        <h2 className="section-heading">
          <Wind aria-hidden="true" /> Environment <span className="heading-dash" />
        </h2>
        <span className="text-xs text-[var(--muted-foreground)]">Live telemetry context</span>
      </div>

      <div className="metrics-grid">
        {/* 1. AIR PARTICLES FORECAST (CPCB PM ESTIMATE) */}
        <div
          className="metric metric-aqi"
          title="Air particles forecast based on modeled PM2.5 concentrations; not an official CPCB station AQI."
        >
          <div className="metric-top flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="metric-icon">
                <Wind aria-hidden="true" />
              </div>
              <span>Air particles forecast</span>
            </div>
            <CadenceInfoTooltip type="air-particles" />
          </div>
          <div className="metric-value">
            {pm25}
            <small className="text-xs text-[var(--muted-foreground)] ml-1">µg/m³ PM2.5</small>
          </div>
          <div className="metric-status flex items-center gap-1">
            <span>CPCB: {cpcbCategory}</span>
            <span className="text-[10px] text-[var(--muted-foreground)] font-normal">(~{cpcbIndicator})</span>
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)] leading-tight mt-1 line-clamp-1">
            Modeled regional forecast
          </div>
          <div className="metric-bottom mt-1.5 flex items-center justify-between gap-1.5">
            <div className="meter flex-1" style={{ width: 'auto' }} />
            <span className="text-[9px] text-[var(--muted-foreground)] whitespace-nowrap shrink-0">CPCB estimate</span>
          </div>
          <p className="text-[10px] text-[var(--muted-subordinate)] mt-1.5 leading-tight flex items-center gap-1">
            <span>Forecast-based CPCB PM estimate — not station AQI</span>
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
          <div className="metric-bottom">
            <svg className="sparkline" viewBox="0 0 100 25" aria-hidden="true">
              <path
                d="M0,18 Q20,12 35,16 T70,8 T100,14"
                strokeWidth="1.5"
              />
              <circle cx="70" cy="8" r="2.5" />
            </svg>
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
          </div>
          <div className="metric-value">
            {pressure}
            <small>hPa</small>
          </div>
          <div className="metric-status">{pressureStatus}</div>
          <div className="metric-bottom">
            <svg className="sparkline" viewBox="0 0 100 25" aria-hidden="true">
              <path
                d="M0,14 Q25,10 50,15 T85,11 T100,12"
                strokeWidth="1.5"
              />
              <circle cx="85" cy="11" r="2.5" />
            </svg>
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
  const [forecastPeriod, setForecastPeriod] = useState('Next 24 hours');

  const hourlyPoints = data?.hourly ?? [
    { label: 'Now', temp: 28, icon: 'partly' },
    { label: '12 PM', temp: 29, icon: 'partly' },
    { label: '2 PM', temp: 31, icon: 'sunny' },
    { label: '4 PM', temp: 30, icon: 'sunny' },
    { label: '6 PM', temp: 27, icon: 'partly' },
    { label: '8 PM', temp: 24, icon: 'cloudy' },
    { label: '10 PM', temp: 22, icon: 'cloudy' },
    { label: '12 AM', temp: 21, icon: 'cloudy' },
    { label: '2 AM', temp: 20, icon: 'cloudy' },
    { label: '4 AM', temp: 19, icon: 'cloudy' },
    { label: '6 AM', temp: 20, icon: 'partly' },
  ];

  return (
    <section className={`panel forecast ${className}`} aria-label="Today's Forecast">
      <div className="heading-row">
        <h2 className="section-heading">
          <Calendar aria-hidden="true" /> Today&apos;s Forecast <span className="heading-dash" />
        </h2>
        <WeatherSelect
          label="Forecast coverage"
          variant="period"
          value={forecastPeriod}
          options={['Next 24 hours', 'Next 48 hours']}
          onValueChange={setForecastPeriod}
        />
      </div>

      <div className="forecast-body">
        {/* Connected SVG Spline Temperature Curve with Gradient */}
        <svg className="forecast-line" viewBox="0 0 740 25" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="forecast-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--sunlight)" />
              <stop offset="30%" stopColor="var(--sunlight)" />
              <stop offset="60%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--mist)" />
            </linearGradient>
          </defs>
          <path d="M 10 12 C 70 8, 140 2, 210 5 C 280 8, 350 14, 420 18 C 490 20, 560 22, 630 23 C 680 23, 710 21, 730 20" />
        </svg>

        {/* 11 Hourly Columns */}
        <div className="forecast-hours">
          {hourlyPoints.map((pt, i) => (
            <div key={i} className="forecast-hour">
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
              <div className="forecast-dot" aria-hidden="true" />
              <div className="hour-label">{pt.label}</div>
              <div className="hour-temp">{pt.temp}°</div>
            </div>
          ))}
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
