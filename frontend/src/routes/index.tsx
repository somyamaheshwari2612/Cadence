import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState, useEffect } from 'react';
import { MapPin, Info, ChevronDown, Clock3 } from 'lucide-react';
import atmosphere from '@/assets/emerald-atmosphere.jpg';
import { WeatherSelect } from '@/components/weather-select';
import { LocationSearchPopover } from '@/components/location-search-popover';
import { ActivityForm } from '@/components/planner/activity-form';
import { BestTimeResult } from '@/components/planner/best-time-result';
import { HourlyTimeline } from '@/components/planner/hourly-timeline';
import { ForecastTrust, CurrentConditions } from '@/components/planner/forecast-context';
import {
  HeroWeatherCard,
  SunMoonCard,
  EnvironmentBentoGrid,
  TodaysForecastCard,
} from '@/components/weather-dashboard';
import {
  initialPreferences,
  mockForecast,
  compareWindows,
  queryBackendSchedule,
  getIndiaCpcbCategory,
  ForecastHour,
  Decision,
  getDayMinutesFromTimeString,
  formatTime,
} from '@/lib/activity-planner';
import { searchLocations } from '@/lib/api';
import type { LocationCoords } from '@/lib/location-utils';

const KNOWN_LOCATIONS: Record<string, { latitude: number; longitude: number }> = {
  'Mathura, Uttar Pradesh': { latitude: 27.4924, longitude: 77.6737 },
  'Agra, Uttar Pradesh': { latitude: 27.1767, longitude: 78.0081 },
  'New Delhi, Delhi': { latitude: 28.6139, longitude: 77.209 },
  'Mumbai, Maharashtra': { latitude: 19.076, longitude: 72.8777 },
  'Bengaluru, Karnataka': { latitude: 12.9716, longitude: 77.5946 },
};

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Cadence — Find your time outside' },
      {
        name: 'description',
        content:
          'Plan an outdoor activity around your temperature, air-quality and rain preferences with an emerald hourly decision timeline.',
      },
      { property: 'og:title', content: 'Cadence — Find your time outside' },
      {
        property: 'og:description',
        content:
          'Compare continuous activity windows with clear forecast context, preferences, and uncertainty.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: WeatherDashboard,
});

import { parseTimeStringToMinutes } from '@/lib/weather-artwork';

function getHourlyIcon(
  h: ForecastHour,
  isNightHour: boolean = false
): 'sunny' | 'moon' | 'partly' | 'partly-moon' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'thunderstorm' {
  const code = h.weatherCode;
  const temp = h.temperature ?? h.apparent ?? 20;
  const cond = (h.condition || '').toLowerCase();

  if (code !== undefined && code !== null) {
    if (code >= 95) return 'thunderstorm';
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86) || temp <= 0) return 'snowy';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
    if (code === 45 || code === 48) return 'cloudy'; // Fog / mist
    if (code === 3) return isNightHour ? 'partly-moon' : 'cloudy';
    if (code === 2) {
      if (cond.includes('wind')) return 'windy';
      return isNightHour ? 'partly-moon' : 'partly';
    }
    if (code <= 1) {
      if (cond.includes('wind')) return 'windy';
      return isNightHour ? 'moon' : 'sunny';
    }
  }

  if (cond) {
    if (cond.includes('thunder') || cond.includes('storm')) return 'thunderstorm';
    if (
      cond.includes('snow') ||
      cond.includes('ice') ||
      cond.includes('freez') ||
      cond.includes('flurr') ||
      temp <= 0
    ) {
      return 'snowy';
    }
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower')) return 'rainy';
    if (cond.includes('wind') || cond.includes('breez') || cond.includes('gale')) return 'windy';
    if (cond.includes('clear') || cond.includes('sun') || cond.includes('night') || cond.includes('moon')) {
      return isNightHour ? 'moon' : 'sunny';
    }
    if (cond.includes('partly')) return isNightHour ? 'partly-moon' : 'partly';
    return isNightHour ? 'partly-moon' : 'cloudy';
  }

  if ((h.rain ?? 0) > 40) return 'rainy';
  if ((h.rain ?? 0) > 15) return isNightHour ? 'partly-moon' : 'cloudy';
  return isNightHour ? 'partly-moon' : 'partly';
}

function applyCurrentConditions(
  res: { rawResponse?: any; hours?: ForecastHour[] },
  setter: React.Dispatch<React.SetStateAction<CurrentConditions>>
) {
  const curr = res.rawResponse?.current_conditions || res.rawResponse?.current_weather;
  const firstHour = res.hours && res.hours.length > 0 ? res.hours[0] : null;

  const sanitizeCondition = (c?: string) => {
    if (!c) return c;
    return c
      .replace(/Breezy & Overcast/i, 'Breezy & Cloudy')
      .replace(/Freezing & Overcast/i, 'Freezing & Cloudy')
      .replace(/Overcast/i, 'Cloudy');
  };

  if (curr) {
    setter(prev => ({
      ...prev,
      modeledTemperature: Math.round(curr.temperature),
      apparentTemperature: Math.round(curr.apparent_temperature),
      condition: sanitizeCondition(curr.condition) || 'Partly Cloudy',
      weatherCode: curr.weather_code,
      humidity: curr.humidity,
      windSpeed: curr.wind_speed,
      windDirection: curr.wind_direction,
      pm25: curr.pm2_5 !== null && curr.pm2_5 !== undefined ? Math.round(curr.pm2_5) : (firstHour?.pm25 ?? 50),
      rainProbability: curr.precipitation > 0 ? 100 : (firstHour?.rain ?? 10),
      pressure: curr.pressure ?? prev.pressure ?? 1012,
      pressureStatus: curr.pressure_status ?? prev.pressureStatus ?? 'Steady',
      sunrise: curr.sunrise ?? prev.sunrise ?? '06:22 AM',
      sunset: curr.sunset ?? prev.sunset ?? '05:59 PM',
      tomorrowSunrise: curr.tomorrow_sunrise ?? prev.tomorrowSunrise,
      tomorrowSunset: curr.tomorrow_sunset ?? prev.tomorrowSunset,
      moonrise: curr.moonrise ?? prev.moonrise ?? '02:17 AM',
      moonset: curr.moonset ?? prev.moonset ?? '03:48 PM',
      tomorrowMoonrise: curr.tomorrow_moonrise ?? prev.tomorrowMoonrise,
      tomorrowMoonset: curr.tomorrow_moonset ?? prev.tomorrowMoonset,
      moonPhaseText: curr.moon_phase ?? prev.moonPhaseText ?? 'Waning Gibbous\n(72%)',
      tomorrowMoonPhaseText: curr.tomorrow_moon_phase ?? prev.tomorrowMoonPhaseText ?? 'Waning Gibbous\n(63%)',
      isNight: curr.is_night,
      isDay: curr.is_day,
      timezone: res.rawResponse?.metadata?.timezone,
      timezoneAbbr: res.rawResponse?.metadata?.timezone_abbreviation,
      utcOffsetSeconds: res.rawResponse?.metadata?.utc_offset_seconds,
      localTime: curr.local_time,
    }));
  } else if (firstHour) {
    setter(prev => ({
      ...prev,
      modeledTemperature: firstHour.temperature !== undefined && firstHour.temperature !== null
        ? Math.round(firstHour.temperature)
        : (firstHour.apparent ? Math.round(firstHour.apparent) : 28),
      apparentTemperature: firstHour.apparent ? Math.round(firstHour.apparent) : 31,
      condition: sanitizeCondition(firstHour.condition) ?? 'Partly Cloudy',
      weatherCode: firstHour.weatherCode,
      pm25: firstHour.pm25 ?? 65,
      rainProbability: firstHour.rain ?? 10,
    }));
  }
}

const LOCATION_STORAGE_KEY = 'cadence_saved_location_v1';
const DEFAULT_LOCATION_NAME = 'New Delhi, Delhi';
const DEFAULT_COORDS: LocationCoords = {
  latitude: 28.6139,
  longitude: 77.209,
  source: 'city',
};

function getInitialLocationState(): { location: string; coords: LocationCoords } {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed.location === 'string' &&
          parsed.location.trim().length > 0 &&
          parsed.coords &&
          typeof parsed.coords.latitude === 'number' &&
          typeof parsed.coords.longitude === 'number'
        ) {
          return {
            location: parsed.location,
            coords: {
              latitude: parsed.coords.latitude,
              longitude: parsed.coords.longitude,
              accuracy: parsed.coords.accuracy,
              source: parsed.coords.source || 'city',
            },
          };
        }
      }
    } catch {
      // Fallback to default
    }
  }
  return {
    location: DEFAULT_LOCATION_NAME,
    coords: DEFAULT_COORDS,
  };
}

function WeatherDashboard() {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [applied, setApplied] = useState(initialPreferences);
  const [initialLoc] = useState(() => getInitialLocationState());
  const [location, setLocation] = useState(initialLoc.location);
  const [coords, setCoords] = useState<LocationCoords>(initialLoc.coords);

  const [showAlternative, setShowAlternative] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [retrievedTime, setRetrievedTime] = useState('Forecast retrieved 10 Oct · 11:42 AM IST');
  const [backendMeta, setBackendMeta] = useState<Record<string, any>>({});
  const activeRequestIdRef = useRef(0);

  const [currentConditions, setCurrentConditions] = useState<CurrentConditions>({
    modeledTemperature: 28,
    apparentTemperature: 31,
    condition: 'Partly Cloudy',
    pm25: 65,
    rainProbability: 10,
    windSpeed: 12,
    windDirection: 'ESE',
    humidity: 68,
    pressure: 1012,
    pressureStatus: 'Steady',
    sunrise: '06:22 AM',
    sunset: '05:59 PM',
    tomorrowSunrise: '06:23 AM',
    tomorrowSunset: '05:58 PM',
    moonrise: '02:17 AM',
    moonset: '03:48 PM',
    tomorrowMoonrise: '03:08 AM',
    tomorrowMoonset: '04:38 PM',
    moonPhaseText: 'Waning Gibbous\n(72%)',
    tomorrowMoonPhaseText: 'Waning Gibbous\n(63%)',
  });

  const localMinutes = getDayMinutesFromTimeString(currentConditions.localTime, currentConditions.timezone);
  const formattedCurrentTime = formatTime(localMinutes);

  // Live backend data states with initial client fallbacks
  const [decision, setDecision] = useState<Decision>(() => compareWindows(mockForecast, applied, localMinutes));
  const [hours, setHours] = useState<ForecastHour[]>(mockForecast);

  const planner = useRef<HTMLDivElement>(null);

  // Fetch live schedule from backend on mount or whenever applied preferences / fallback opt-in changes
  useEffect(() => {
    let isCancelled = false;
    const reqId = ++activeRequestIdRef.current;

    async function loadSchedule() {
      setIsLoading(true);
      try {
        const res = await queryBackendSchedule(applied, coords, showAlternative, localMinutes);

        if (!isCancelled && activeRequestIdRef.current === reqId) {
          setDecision(res.decision);
          if (res.hours && res.hours.length > 0) {
            setHours(res.hours);
          }
          applyCurrentConditions(res, setCurrentConditions);
          if (res.retrievedTimeStr) {
            setRetrievedTime(res.retrievedTimeStr);
          }
          if (res.rawResponse?.metadata) {
            setBackendMeta(res.rawResponse.metadata);
          }
        }
      } catch (err) {
        console.error('Error loading schedule:', err);
      } finally {
        if (!isCancelled && activeRequestIdRef.current === reqId) {
          setIsLoading(false);
          setIsInitialLoading(false);
        }
      }
    }

    loadSchedule();

    return () => {
      isCancelled = true;
    };
  }, [applied, showAlternative]);

  // Handle location selection (via typed search, popular dropdown, or GPS)
  // The location name on the dashboard updates ONLY when its data has been fetched
  // and is ready to be displayed on the dashboard, preventing any confusing mismatched states.
  const handleLocationChange = async (
    newLoc: string,
    customCoords?: LocationCoords
  ) => {
    setShowAlternative(false);
    setIsLoading(true);

    const reqId = ++activeRequestIdRef.current;

    let nextCoords: LocationCoords = customCoords || coords;

    if (customCoords) {
      nextCoords = customCoords;
    } else if (KNOWN_LOCATIONS[newLoc]) {
      nextCoords = { ...KNOWN_LOCATIONS[newLoc], source: 'city' };
    } else {
      // Geocode dynamically
      try {
        const places = await searchLocations(newLoc);
        const firstPlace = places[0];
        if (firstPlace) {
          nextCoords = {
            latitude: firstPlace.latitude,
            longitude: firstPlace.longitude,
            source: 'search',
          };
        }
      } catch {
        // Retain current coords if geocode fails
      }
    }

    try {
      const res = await queryBackendSchedule(applied, nextCoords, false, localMinutes);

      if (activeRequestIdRef.current === reqId) {
        if (res && res.hours && res.hours.length > 0) {
          // Atomically update location and weather data simultaneously!
          setLocation(newLoc);
          setCoords(nextCoords);
          setDecision(res.decision);
          setHours(res.hours);
          applyCurrentConditions(res, setCurrentConditions);
          if (res.retrievedTimeStr) {
            setRetrievedTime(res.retrievedTimeStr);
          }
          if (res.rawResponse?.metadata) {
            setBackendMeta(res.rawResponse.metadata);
          }

          // Persist to localStorage only after confirmed successful load
          try {
            localStorage.setItem(
              LOCATION_STORAGE_KEY,
              JSON.stringify({ location: newLoc, coords: nextCoords })
            );
          } catch {
            // Ignore storage errors
          }
        }
      }
    } catch (err) {
      console.error('Failed to load schedule for new location:', err);
    } finally {
      if (activeRequestIdRef.current === reqId) {
        setIsLoading(false);
      }
    }
  };

  // Ensure any updated coords are kept synchronized in localStorage
  useEffect(() => {
    if (location && coords) {
      try {
        localStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify({ location, coords })
        );
      } catch {
        // Ignore storage errors
      }
    }
  }, [location, coords]);

  const handleRefresh = async () => {
    setIsLoading(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 650));
    const [res] = await Promise.all([
      queryBackendSchedule(applied, coords, showAlternative, localMinutes),
      minDelay,
    ]);
    setDecision(res.decision);
    if (res.hours && res.hours.length > 0) {
      setHours(res.hours);
    }
    applyCurrentConditions(res, setCurrentConditions);
    if (res.retrievedTimeStr) setRetrievedTime(res.retrievedTimeStr);
    if (res.rawResponse?.metadata) setBackendMeta(res.rawResponse.metadata);
    setIsLoading(false);
  };

  const block =
    decision.state === 'qualified'
      ? decision.block
      : decision.state === 'no-slot' && showAlternative
      ? decision.alternative
      : undefined;

  const changed = JSON.stringify(preferences) !== JSON.stringify(applied);

  const handleSetUpcoming = () => {
    const nextStart = Math.min(1380, Math.ceil((localMinutes + 5) / 30) * 30);
    const duration = preferences.duration || 60;
    const nextEnd = Math.min(1440, nextStart + Math.max(120, duration + 60));
    const nextPrefs = {
      ...preferences,
      start: nextStart,
      end: nextEnd,
    };
    setPreferences(nextPrefs);
    setApplied(nextPrefs);
    setShowAlternative(false);
  };

  const handlePlanTomorrow = () => {
    // Tomorrow morning slot e.g. 6:00 AM – 9:00 AM (360 to 540)
    const nextPrefs = {
      ...preferences,
      start: 360,
      end: 540,
    };
    setPreferences(nextPrefs);
    setApplied(nextPrefs);
    setShowAlternative(false);
  };
  const hasDataIssue =
    decision.state === 'incomplete' || hours.some(h => h.status === 'missing');

  const cpcbTelemetry = getIndiaCpcbCategory(currentConditions.pm25 ?? 50);

  if (isInitialLoading) {
    return (
      <main className="dashboard-page cadence-page loading-screen-container">
        <img
          className="atmosphere"
          src={atmosphere}
          width={1536}
          height={1024}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        />
        <div className="cadence-initial-loader">
          <div className="loader-orbit-wrapper">
            <div className="loader-pulse-ring" />
            <div className="loader-orbit-ring" />
            <img src="/favicon.jpeg" className="loader-emblem" alt="Cadence" />
          </div>
          <div className="loader-brand-title">CADENCE</div>
          <div className="loader-poem">
            Find your window. <span>same sky, different stories</span>
          </div>
          <div className="loader-status-badge">
            <span className="loader-status-dot" />
            <span>Reading atmospheric signals...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page cadence-page">
      <img
        className="atmosphere"
        src={atmosphere}
        width={1536}
        height={1024}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      />
      <div className="dashboard cadence-fade-in">
        {/* Brand Bar */}
        <header className="brandbar">
          <div className="brand">
            <img src="/favicon.jpeg" className="brand-favicon" alt="Cadence logo" aria-hidden="true" />
            <span>CADENCE</span>
          </div>
          <div className="brand-poem">
            Find your window. <span>same sky, different stories</span>
          </div>
        </header>

        {/* 1. HERO WEATHER CARD ON TOP (WITH LIVE STATUS, REFRESH, & UPDATING INDICATOR) */}
        <HeroWeatherCard
          location={location}
          onLocationChange={handleLocationChange}
          isLoading={isLoading}
          onRefresh={handleRefresh}
          coords={coords}
          hasDataIssue={hasDataIssue}
          className="hero-weather-standalone"
          data={{
            temperature: currentConditions.modeledTemperature ?? 28,
            apparentTemperature: currentConditions.apparentTemperature ?? 31,
            condition: currentConditions.condition ?? 'Partly Cloudy',
            locationName: location,
            updatedTime: retrievedTime.replace('Forecast retrieved', 'Last updated ·'),
            sunrise: currentConditions.sunrise ?? '06:22 AM',
            sunset: currentConditions.sunset ?? '05:59 PM',
            isNight: currentConditions.isNight,
            isDay: currentConditions.isDay,
            timezone: currentConditions.timezone,
            timezoneAbbr: currentConditions.timezoneAbbr,
            utcOffsetSeconds: currentConditions.utcOffsetSeconds,
            localTime: currentConditions.localTime,
            moonrise: currentConditions.moonrise ?? '02:17 AM',
            moonset: currentConditions.moonset ?? '03:48 PM',
            moonPhaseText: currentConditions.moonPhaseText ?? 'Waning Gibbous\n(72%)',
            pm25: currentConditions.pm25 ?? 50,
            cpcbIndicator: cpcbTelemetry.subindex,
            cpcbCategory: cpcbTelemetry.category,
            cpcbAdvisory: cpcbTelemetry.plainLanguage,
            aqi: cpcbTelemetry.subindex,
            aqiStatus: cpcbTelemetry.category,
            uvIndex: 5,
            uvStatus: 'Moderate',
            precipitation: currentConditions.rainProbability ?? 10,
            precipitationStatus:
              (currentConditions.rainProbability ?? 10) <= 15
                ? 'Dry conditions'
                : (currentConditions.rainProbability ?? 10) <= 40
                ? 'Low chance'
                : 'Rain likely',
            humidity: currentConditions.humidity ?? 68,
            humidityStatus: (currentConditions.humidity ?? 68) > 75 ? 'Humid' : 'Comfortable',
            windSpeed: currentConditions.windSpeed ?? 12,
            windDirection: String(currentConditions.windDirection || 'ESE'),
            pressure: currentConditions.pressure ?? 1012,
            pressureStatus: currentConditions.pressureStatus ?? 'Steady',
            visibility: 8,
            visibilityStatus: 'Good',
            hourly: hours.slice(0, 11).map((h, i) => {
              const hourLabel = i === 0 ? 'Now' : `${(h.hour % 24 % 12 || 12)} ${h.hour % 24 >= 12 ? 'PM' : 'AM'}`;
              const sunriseMin = parseTimeStringToMinutes(currentConditions.sunrise) ?? 360;
              const sunsetMin = parseTimeStringToMinutes(currentConditions.sunset) ?? 1080;
              const hMins = (h.hour % 24) * 60;
              const isNightHour = hMins >= sunsetMin || hMins < sunriseMin;
              return {
                label: hourLabel,
                temp: h.apparent ? Math.round(h.apparent) : 28,
                icon: getHourlyIcon(h, isNightHour),
              };
            }),
          }}
        />

        {/* 2. THE SCHEDULING ENGINE (ELEVATED TO TOP) */}
        <div ref={planner} className="planner-anchor">
          <ActivityForm
            preferences={preferences}
            onChange={setPreferences}
            changed={changed}
            timezoneAbbr={currentConditions.timezoneAbbr}
            currentLocalTime={currentConditions.localTime}
            timezone={currentConditions.timezone}
            onSubmit={() => {
              setApplied({ ...preferences });
              setShowAlternative(false);
            }}
          />
        </div>

        {/* 3. DOMINANT RECOMMENDATION CARD */}
        <BestTimeResult
          decision={decision}
          preferences={applied}
          showAlternative={showAlternative}
          onAlternative={() => setShowAlternative(true)}
          condition={currentConditions.condition}
          sunrise={currentConditions.sunrise}
          sunset={currentConditions.sunset}
          currentTimeFormatted={formattedCurrentTime}
          onSetUpcoming={handleSetUpcoming}
          onPlanTomorrow={handlePlanTomorrow}
          onEdit={() => {
            planner.current?.scrollIntoView({
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'instant'
                : 'smooth',
              block: 'start',
            });
            planner.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
          }}
        />

        {/* 4. ENVIRONMENT BENTO GRID (RIGHT BELOW THE ROUTER, PROVIDING IMMEDIATE CONTEXT) */}
        <EnvironmentBentoGrid
          data={{
            pm25: currentConditions.pm25 ?? 50,
            cpcbIndicator: cpcbTelemetry.subindex,
            cpcbCategory: cpcbTelemetry.category,
            cpcbAdvisory: cpcbTelemetry.plainLanguage,
            aqi: cpcbTelemetry.subindex,
            aqiStatus: cpcbTelemetry.category,
            uvIndex: 5,
            uvStatus: 'Moderate',
            precipitation: currentConditions.rainProbability ?? 10,
            precipitationStatus:
              (currentConditions.rainProbability ?? 10) <= 15
                ? 'Dry conditions'
                : (currentConditions.rainProbability ?? 10) <= 40
                ? 'Low chance'
                : 'Rain likely',
            humidity: currentConditions.humidity ?? 68,
            humidityStatus: 'Comfortable',
            windSpeed: currentConditions.windSpeed ?? 12,
            windDirection: currentConditions.windDirection || 'ESE',
            pressure: currentConditions.pressure ?? 1012,
            pressureStatus: currentConditions.pressureStatus ?? 'Steady',
            visibility: 8,
            visibilityStatus: 'Good',
          }}
        />

        {/* 5. VISUAL HORIZONTAL SLIDING CARD TIMELINE */}
        <HourlyTimeline
          hours={hours}
          preferences={applied}
          block={block}
          alternative={showAlternative && decision.state === 'no-slot'}
          sunrise={currentConditions.sunrise}
          sunset={currentConditions.sunset}
        />

        {/* 6. EXTENDED ASTRONOMY & FORECAST (DEMOTED BELOW ROUTER) */}
        <div className="bottom-celestial-section space-y-3">
          <SunMoonCard
            data={{
              sunrise: currentConditions.sunrise ?? '06:22 AM',
              sunset: currentConditions.sunset ?? '05:59 PM',
              moonrise: currentConditions.moonrise ?? '02:17 AM',
              moonset: currentConditions.moonset ?? '03:48 PM',
              moonPhaseText: currentConditions.moonPhaseText ?? 'Waning Gibbous\n(72%)',
              tomorrowSunrise: currentConditions.tomorrowSunrise,
              tomorrowSunset: currentConditions.tomorrowSunset,
              tomorrowMoonrise: currentConditions.tomorrowMoonrise,
              tomorrowMoonset: currentConditions.tomorrowMoonset,
              tomorrowMoonPhaseText: currentConditions.tomorrowMoonPhaseText,
              timezone: currentConditions.timezone,
              utcOffsetSeconds: currentConditions.utcOffsetSeconds,
            }}
          />
          <TodaysForecastCard
            data={{
              hourly: (() => {
                const extendedHours: ForecastHour[] = [...hours];
                if (extendedHours.length > 0 && extendedHours.length < 48) {
                  const lastHour = extendedHours[extendedHours.length - 1];
                  const lastHourNum = lastHour?.hour ?? 0;
                  const baseLength = extendedHours.length;
                  for (let i = baseLength; i < 48; i++) {
                    const ref = extendedHours[i % baseLength];
                    if (ref) {
                      extendedHours.push({
                        ...ref,
                        hour: lastHourNum + (i - baseLength + 1),
                      });
                    }
                  }
                }
                return extendedHours.slice(0, 48).map((h, i) => {
                  const hourNum24 = h.hour % 24;
                  const hour12 = hourNum24 % 12 || 12;
                  const ampm = hourNum24 >= 12 ? 'PM' : 'AM';
                  const hourLabel = i === 0 ? 'Now' : `${hour12} ${ampm}`;

                  let dayLabel: string | undefined;
                  let isDayBoundary = false;
                  if (hourNum24 === 0 && i > 0) {
                    isDayBoundary = true;
                    dayLabel = i < 28 ? 'Tomorrow' : 'Day 3';
                  }

                  const sunriseMin = parseTimeStringToMinutes(i >= 24 && currentConditions.tomorrowSunrise ? currentConditions.tomorrowSunrise : currentConditions.sunrise) ?? 360;
                  const sunsetMin = parseTimeStringToMinutes(i >= 24 && currentConditions.tomorrowSunset ? currentConditions.tomorrowSunset : currentConditions.sunset) ?? 1080;
                  const hMins = hourNum24 * 60;
                  const isNightHour = hMins >= sunsetMin || hMins < sunriseMin;

                  const temp = h.temperature !== null && h.temperature !== undefined
                    ? Math.round(h.temperature)
                    : (h.apparent !== null && h.apparent !== undefined ? Math.round(h.apparent) : 28);

                  return {
                    label: hourLabel,
                    temp,
                    icon: getHourlyIcon(h, isNightHour),
                    dayLabel,
                    isDayBoundary,
                  };
                });
              })(),
            }}
          />
        </div>

        {/* 7. METHODOLOGY AND TRUST */}
        <ForecastTrust location={location} coords={coords} metadata={backendMeta} />
      </div>
    </main>
  );
}
