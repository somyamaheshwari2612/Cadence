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

function getHourlyIcon(
  h: ForecastHour
): 'sunny' | 'partly' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'thunderstorm' {
  const code = h.weatherCode;
  const temp = h.temperature ?? h.apparent ?? 20;
  const cond = (h.condition || '').toLowerCase();

  if (code !== undefined && code !== null) {
    if (code >= 95) return 'thunderstorm';
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86) || temp <= 0) return 'snowy';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
    if (code === 45 || code === 48) return 'cloudy'; // Fog / mist
    if (code === 3) return 'cloudy';
    if (code === 2) {
      if (cond.includes('wind')) return 'windy';
      return 'partly';
    }
    if (code <= 1) {
      if (cond.includes('wind')) return 'windy';
      return 'sunny';
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
    if (cond.includes('clear') || cond.includes('sun')) return 'sunny';
    if (cond.includes('partly')) return 'partly';
    return 'cloudy';
  }

  if ((h.rain ?? 0) > 40) return 'rainy';
  if ((h.rain ?? 0) > 15) return 'cloudy';
  return 'partly';
}

function applyCurrentConditions(
  res: { rawResponse?: any; hours?: ForecastHour[] },
  setter: React.Dispatch<React.SetStateAction<CurrentConditions>>
) {
  const curr = res.rawResponse?.current_conditions;
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
  const activeRequestIdRef = useRef(0);

  // Live backend data states with initial client fallbacks
  const [decision, setDecision] = useState<Decision>(() => compareWindows(mockForecast, applied));
  const [hours, setHours] = useState<ForecastHour[]>(mockForecast);
  const [retrievedTime, setRetrievedTime] = useState('Forecast retrieved 10 Oct · 11:42 AM IST');
  const [backendMeta, setBackendMeta] = useState<Record<string, any>>({});
  const [currentConditions, setCurrentConditions] = useState<CurrentConditions>({
    modeledTemperature: 28,
    apparentTemperature: 31,
    condition: 'Partly Cloudy',
    pm25: 65,
    rainProbability: 10,
    windSpeed: 12,
    windDirection: 'ESE',
    humidity: 68,
    sunrise: '06:22 AM',
    sunset: '05:59 PM',
  });

  const planner = useRef<HTMLDivElement>(null);

  // Fetch live schedule from backend on mount or whenever applied preferences / fallback opt-in changes
  useEffect(() => {
    let isCancelled = false;
    const reqId = ++activeRequestIdRef.current;

    async function loadSchedule() {
      setIsLoading(true);
      try {
        const res = await queryBackendSchedule(applied, coords, showAlternative);

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
        if (places.length > 0) {
          nextCoords = {
            latitude: places[0].latitude,
            longitude: places[0].longitude,
            source: 'search',
          };
        }
      } catch {
        // Retain current coords if geocode fails
      }
    }

    try {
      const res = await queryBackendSchedule(applied, nextCoords, false);

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
      queryBackendSchedule(applied, coords, showAlternative),
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
  const hasDataIssue =
    decision.state === 'incomplete' || hours.some(h => h.status === 'missing');

  const cpcbTelemetry = getIndiaCpcbCategory(currentConditions.pm25 ?? 50);

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
      <div className="dashboard">
        {/* Brand Bar */}
        <header className="brandbar">
          <div className="brand">
            <span className="emerald" aria-hidden="true" />
            <span>
              CADENCE <b>+</b> OUTSIDE
            </span>
          </div>
          <div className="brand-poem">
            Find your window. <span>+</span> same sky, different stories
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
            moonrise: '02:17 AM',
            moonset: '03:48 PM',
            moonPhaseText: 'Waning Gibbous\n(72%)',
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
            pressure: 1012,
            pressureStatus: 'Steady',
            visibility: 8,
            visibilityStatus: 'Good',
            hourly: hours.slice(0, 11).map((h, i) => {
              const hourLabel = i === 0 ? 'Now' : `${(h.hour % 24 % 12 || 12)} ${h.hour % 24 >= 12 ? 'PM' : 'AM'}`;
              return {
                label: hourLabel,
                temp: h.apparent ? Math.round(h.apparent) : 28,
                icon: getHourlyIcon(h),
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
            pressure: 1012,
            pressureStatus: 'Steady',
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
        />

        {/* 6. EXTENDED ASTRONOMY & FORECAST (DEMOTED BELOW ROUTER) */}
        <div className="bottom-celestial-section space-y-3">
          <SunMoonCard
            data={{
              sunrise: currentConditions.sunrise ?? '06:22 AM',
              sunset: currentConditions.sunset ?? '05:59 PM',
              moonrise: '02:17 AM',
              moonset: '03:48 PM',
              moonPhaseText: 'Waning Gibbous\n(72%)',
            }}
          />
          <TodaysForecastCard
            data={{
              hourly: hours.slice(0, 11).map((h, i) => {
                const hourLabel = i === 0 ? 'Now' : `${(h.hour % 24 % 12 || 12)} ${h.hour % 24 >= 12 ? 'PM' : 'AM'}`;
                return {
                  label: hourLabel,
                  temp: h.apparent ? Math.round(h.apparent) : 28,
                  icon: getHourlyIcon(h),
                };
              }),
            }}
          />
        </div>

        {/* 7. METHODOLOGY AND TRUST */}
        <ForecastTrust location={location} coords={coords} metadata={backendMeta} />
      </div>
    </main>
  );
}
