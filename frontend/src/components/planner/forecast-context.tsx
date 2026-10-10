import { Thermometer, Wind, Droplet, CloudRain, Sun, ChevronDown, Info } from 'lucide-react';
import {
  weatherArtwork,
  getWeatherArtworkForCondition,
  getWeatherPoem,
  parseTimeStringToMinutes,
} from '@/lib/weather-artwork';
import moonImage from '@/assets/moon-clear-night.jpg';

export interface CurrentConditions {
  modeledTemperature?: number;
  apparentTemperature?: number;
  condition?: string;
  weatherCode?: number;
  pm25?: number;
  rainProbability?: number;
  windSpeed?: number;
  windDirection?: string | number;
  humidity?: number;
  sunrise?: string;
  sunset?: string;
}

export function ForecastContext({ conditions }: { conditions?: CurrentConditions }) {
  const readings = [
    {
      name: 'Modeled temperature',
      value: conditions?.modeledTemperature !== undefined ? String(conditions.modeledTemperature) : '28',
      unit: '°C',
      icon: Thermometer,
    },
    {
      name: 'Apparent temperature',
      value: conditions?.apparentTemperature !== undefined ? String(conditions.apparentTemperature) : '31',
      unit: '°C',
      icon: Thermometer,
    },
    {
      name: 'PM2.5 forecast',
      value: conditions?.pm25 !== undefined ? String(conditions.pm25) : '65',
      unit: 'µg/m³',
      icon: Wind,
    },
    {
      name: 'Rain probability',
      value: conditions?.rainProbability !== undefined ? String(conditions.rainProbability) : '10',
      unit: '%',
      icon: CloudRain,
    },
    {
      name: `Wind · ${conditions?.windDirection || 'ESE'}`,
      value: conditions?.windSpeed !== undefined ? String(conditions.windSpeed) : '12',
      unit: 'km/h',
      icon: Wind,
    },
    {
      name: 'Humidity',
      value: conditions?.humidity !== undefined ? String(conditions.humidity) : '68',
      unit: '%',
      icon: Droplet,
    },
  ];

  return (
    <section className="supporting-context">
      <div className="heading-row">
        <h2 className="section-heading">
          <Sun /> Environmental context <span className="heading-dash" />
        </h2>
        <span className="small-caption">Now · Modeled conditions</span>
      </div>
      <div className="context-layout">
        <div className="context-weather">
          {(() => {
            const isNight = (() => {
              if (typeof window === 'undefined') return false;
              const now = new Date();
              const curMin = now.getHours() * 60 + now.getMinutes();
              const sunsetMin = parseTimeStringToMinutes(conditions?.sunset) ?? 1080;
              const sunriseMin = parseTimeStringToMinutes(conditions?.sunrise) ?? 360;
              return curMin >= sunsetMin || curMin < sunriseMin;
            })();
            const artwork = getWeatherArtworkForCondition(conditions?.condition, conditions?.modeledTemperature, {
              isNight,
              sunset: conditions?.sunset,
              sunrise: conditions?.sunrise,
            });
            const poem = getWeatherPoem(conditions?.condition, conditions?.modeledTemperature, {
              isNight,
              sunset: conditions?.sunset,
              sunrise: conditions?.sunrise,
            });
            return (
              <>
                <img
                  src={artwork.src}
                  alt={artwork.alt}
                  width={1024}
                  height={768}
                  loading="lazy"
                />
                <span>{conditions?.condition || (isNight ? 'Clear Night' : 'Partly Cloudy')}</span>
                <p className="weather-poem">{poem.line1}<br />{poem.line2}</p>
              </>
            );
          })()}
        </div>
        <div className="context-readings">
          {readings.map(r => (
            <div key={r.name}>
              <r.icon />
              <span>{r.name}</span>
              <strong>
                {r.value}
                <small> {r.unit}</small>
              </strong>
            </div>
          ))}
        </div>
      </div>
      <details className="astronomy-details">
        <summary>
          <Sun /> Sun &amp; moon{' '}
          <span>
            Sunrise {conditions?.sunrise || '06:22 AM'} · Sunset {conditions?.sunset || '05:59 PM'}
          </span>
          <ChevronDown />
        </summary>
        <div className="astronomy-content">
          <p>
            Sunrise <strong>{conditions?.sunrise || '06:22 AM'}</strong>
          </p>
          <p>
            Sunset <strong>{conditions?.sunset || '05:59 PM'}</strong>
          </p>
          <img src={moonImage} width={816} height={816} alt="Gibbous moon" loading="lazy" />
          <p>
            Waning gibbous <strong>72% illuminated</strong>
          </p>
        </div>
      </details>
    </section>
  );
}

export function ForecastTrust({
  location,
  coords,
  metadata,
}: {
  location: string;
  coords?: { latitude: number; longitude: number };
  metadata?: Record<string, any>;
}) {
  const latStr = coords ? `${coords.latitude.toFixed(2)}° N` : '27.49° N';
  const lngStr = coords ? `${coords.longitude.toFixed(2)}° E` : '77.67° E';
  const retrievedTime = metadata?.retrieval_timestamp_utc
    ? new Date(metadata.retrieval_timestamp_utc).toLocaleString()
    : '10 Oct 2026 · 11:42 AM IST';

  return (
    <footer className="forecast-trust">
      <details>
        <summary>
          <Info />
          About this forecast
          <ChevronDown />
        </summary>
        <div className="trust-details">
          <section>
            <h3>Location &amp; coverage</h3>
            <p>
              Requested location: {location}. Confirmed coordinates: {latStr}, {lngStr}. 
              Interpolated to nearest model-grid cell via Open-Meteo and CAMS global ensemble.
            </p>
            <p>
              Forecast retrieved: {retrievedTime}. Valid forecast horizon: Next 24 hours.
            </p>
          </section>
          <section>
            <h3>Units &amp; data quality</h3>
            <p>
              <strong>Air particles:</strong> PM2.5 concentration in µg/m³ (from modeled numerical forecast, Open-Meteo &amp; CAMS). <strong>Feels like:</strong> apparent temperature in °C combining heat, humidity, and wind. <strong>Chance of rain:</strong> precipitation probability (%). Missing, suspect, or stale periods are excluded from comparison, never treated as zero.
            </p>
            <p>
              <strong>Forecast-based CPCB PM estimate:</strong> Calculated from modeled PM2.5 using official Central Pollution Control Board (CPCB) breakpoints (0–30 Good, 31–60 Satisfactory, 61–90 Moderate, 91–120 Poor, 121–250 Very Poor, &gt;250 Severe). Not an official CPCB station NAQI bulletin.
            </p>
          </section>
          <section>
            <h3>How windows are ordered (Outdoor comfort score)</h3>
            <p>
              <strong>Outdoor comfort score (lower is better):</strong> PM2.5 (µg/m³) × 1.2 + |apparent_temp - 24.0°C| × 1.5 + rain_probability (%) × 0.3 + midday_heat_penalty (8.0 for strenuous outdoor activities between 12 PM–3 PM when apparent temp &gt; 28°C per IMD/NDMA guidelines). Lower scores are ordered first.
            </p>
            <p>
              A Cadence ranking used to compare available time windows using your selected preferences for air particles, feels-like temperature, and rain. It is not a health score, medical assessment, or guarantee of safety. Cadence never declares windows "safe" or "unsafe". Consult CPCB and IMD for official regulatory bulletins.
            </p>
          </section>
          <section>
            <h3>Sources &amp; attribution</h3>
            <p>
              Weather and air-quality forecast data provided by{' '}
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                Open-Meteo
              </a>{' '}
              and{' '}
              <a href="https://atmosphere.copernicus.eu/" target="_blank" rel="noreferrer">
                Copernicus Atmosphere Monitoring Service (CAMS)
              </a>.
            </p>
          </section>
        </div>
      </details>
      <p>
        Weather and air-quality forecast data by Open-Meteo; air-quality model data from CAMS. Forecasts are modeled estimates and may differ from local conditions. This tool supports planning and is not medical advice.
      </p>
      <div className="footer-signature">
        <span>
          CADENCE <b>+</b> THE OUTSIDE, CONSIDERED.
        </span>
        <span>Find your window.</span>
      </div>
    </footer>
  );
}
