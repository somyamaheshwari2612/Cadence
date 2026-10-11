import { useRef, useState } from 'react';
import {
  Sun,
  Moon,
  CloudMoon,
  CloudSun,
  Cloud,
  Droplet,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Wind,
  CheckCircle2,
  CloudRain,
  Snowflake,
  CloudLightning,
} from 'lucide-react';
import {
  type ForecastHour,
  type Preferences,
  type ActivityBlock,
  formatTime,
} from '@/lib/activity-planner';
import { parseTimeStringToMinutes } from '@/lib/weather-artwork';
import { WeatherSelect } from '@/components/weather-select';

interface HourlyTimelineProps {
  hours: ForecastHour[];
  preferences: Preferences;
  block: ActivityBlock | undefined;
  alternative: boolean;
  sunrise?: string | undefined;
  sunset?: string | undefined;
}

export function HourlyTimeline({
  hours,
  preferences,
  block,
  alternative,
  sunrise,
  sunset,
}: HourlyTimelineProps) {
  const [coverage, setCoverage] = useState('Today');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter visible hours based on coverage
  const visible = coverage === 'Today' ? hours.filter(h => h.hour <= 22) : hours;

  // Smooth scroll helpers
  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  return (
    <section className="panel timeline-card-section" aria-labelledby="timeline-heading">
      {/* Header Row with Controls */}
      <div className="heading-row pb-3 border-b border-[var(--fine-line)]">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
          <h2 className="section-heading" id="timeline-heading">
            Hourly decision timeline
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <WeatherSelect
            label="Timeline coverage"
            variant="period"
            value={coverage}
            options={['Today', 'Next 24 hours']}
            onValueChange={setCoverage}
          />

          <div className="hidden sm:flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={handleScrollLeft}
              className="timeline-nav-btn"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleScrollRight}
              className="timeline-nav-btn"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Legend */}
      <div className="timeline-legend-pills flex flex-wrap items-center gap-2 py-3 text-xs">
        <span className="legend-pill-item selected">
          <span className="dot" /> Selected window (8:00 AM – 8:45 AM)
        </span>
        <span className="legend-pill-item qualified">
          <span className="dot" /> Within preferences
        </span>
        <span className="legend-pill-item unsafe">
          <span className="dot" /> Outside preferences (dimmed)
        </span>
        <span className="legend-pill-item outside">
          <span className="dot" /> Outside availability
        </span>
      </div>

      {/* Horizontal Sliding Cards Track */}
      <div
        ref={scrollRef}
        className="timeline-cards-track"
        tabIndex={0}
        role="region"
        aria-label="Horizontal scrollable hourly forecast timeline"
      >
        {visible.map(h => {
          const inRange = h.hour * 60 < preferences.end && (h.hour + 1) * 60 > preferences.start;
          const selected = !!block && h.hour * 60 < block.end && (h.hour + 1) * 60 > block.start;
          const missing = h.status !== 'available' || h.apparent === null;

          const tempMeets = !missing && (h.apparent ?? 0) <= preferences.maxTemperature;
          const pm25Meets = !missing && (h.pm25 ?? 0) <= preferences.maxPm25;
          const rainMeets =
            !missing && (preferences.rainAcceptable ? (h.rain ?? 0) <= preferences.maxRain : (h.rain ?? 0) === 0);

          const meets = !missing && tempMeets && pm25Meets && rainMeets;
          const unsafe = inRange && !missing && !meets;

          const startMin = block ? Math.max(h.hour * 60, block.start) : 0;
          const endMin = block ? Math.min((h.hour + 1) * 60, block.end) : 0;

          // Determine specific violation reason for tooltip/badge
          let reason = '';
          let reasonDetail = '';
          if (unsafe) {
            if (!pm25Meets) {
              reason = 'Air Quality';
              reasonDetail = `Air Quality: ${h.pm25} AQI`;
            } else if (!tempMeets) {
              reason = 'Feels like';
              reasonDetail = `Feels like: ${h.apparent}°C`;
            } else if (!rainMeets) {
              reason = 'Rain';
              reasonDetail = `Rain chance: ${h.rain}%`;
            }
          }

          // Card class assignment
          let cardStatusClass = 'card-normal';
          if (selected) {
            cardStatusClass = alternative ? 'card-selected-alternative' : 'card-selected-emerald';
          } else if (unsafe) {
            cardStatusClass = 'card-unsafe-dimmed';
          } else if (meets && inRange) {
            cardStatusClass = 'card-qualified';
          } else if (!inRange) {
            cardStatusClass = 'card-outside-window';
          } else if (missing) {
            cardStatusClass = 'card-missing';
          }

          // Weather icon picker
          const renderIcon = () => {
            if (missing) return <Cloud className="w-5 h-5 text-[var(--muted-foreground)]" />;
            const code = h.weatherCode;
            const temp = h.temperature ?? h.apparent ?? 20;
            const cond = (h.condition || '').toLowerCase();

            // Thunderstorm
            if ((code !== undefined && code >= 95) || cond.includes('thunder') || cond.includes('storm')) {
              return <CloudLightning className="w-5 h-5 text-[oklch(.82_.18_85)]" />;
            }
            // Snow / Freezing
            if (
              (code !== undefined && ((code >= 71 && code <= 77) || (code >= 85 && code <= 86))) ||
              cond.includes('snow') ||
              cond.includes('flurr') ||
              cond.includes('ice') ||
              cond.includes('freez') ||
              temp <= 0
            ) {
              return <Snowflake className="w-5 h-5 text-[oklch(.88_.06_220)]" />;
            }
            // Rain
            if (
              (code !== undefined && ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))) ||
              cond.includes('rain') ||
              cond.includes('shower') ||
              cond.includes('drizzle') ||
              (h.rain ?? 0) > 40
            ) {
              return <CloudRain className="w-5 h-5 text-[oklch(.75_.12_215)]" />;
            }
            // Windy
            if (cond.includes('wind') || cond.includes('breez') || cond.includes('gale')) {
              return <Wind className="w-5 h-5 text-[var(--primary)]" />;
            }
            // Moderate Rain Chance
            if ((h.rain ?? 0) > 20) {
              return <Droplet className="w-5 h-5 text-[var(--mist)]" />;
            }
            // Day vs Night (using location's sunrise and sunset)
            const sunriseMin = parseTimeStringToMinutes(sunrise) ?? 360;
            const sunsetMin = parseTimeStringToMinutes(sunset) ?? 1080;
            const hMin = (h.hour % 24) * 60;
            const isDayHour = hMin >= sunriseMin && hMin < sunsetMin;

            if (isDayHour) {
              if (code !== undefined && code <= 1) {
                return <Sun className="w-5 h-5 text-[var(--sunlight)]" />;
              }
              if (cond.includes('clear') || cond.includes('sun')) {
                return <Sun className="w-5 h-5 text-[var(--sunlight)]" />;
              }
              return <CloudSun className="w-5 h-5 text-[var(--sunlight)]" />;
            } else {
              if (code !== undefined && code <= 1) {
                return <Moon className="w-5 h-5 text-[var(--foreground)]" />;
              }
              if (cond.includes('clear') || cond.includes('moon') || cond.includes('night')) {
                return <Moon className="w-5 h-5 text-[var(--foreground)]" />;
              }
              return <CloudMoon className="w-5 h-5 text-[var(--mist)]" />;
            }
          };

          return (
            <div
              key={h.hour}
              className={`timeline-slide-card ${cardStatusClass}`}
              aria-label={`${formatTime(h.hour * 60)}: ${
                missing
                  ? 'Data unavailable'
                  : `${h.apparent}°C feels-like, Air Quality ${h.pm25} AQI, rain chance ${h.rain}%`
              }${selected ? ', Selected activity window' : ''}${
                unsafe ? `, Outside preferences: ${reason}` : ''
              }${!inRange ? ', Outside availability window' : ''}`}
            >
              {/* Top Card Badge / Time */}
              <div className="card-top-row">
                <span className="card-hour-label">
                  {formatTime(h.hour * 60).replace(':00 ', ' ')}
                </span>
                {selected ? (
                  <span className="card-badge-glow">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    BEST WINDOW
                  </span>
                ) : unsafe ? (
                  <span className="card-badge-unsafe" title={reasonDetail}>
                    <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                    {reason}
                  </span>
                ) : meets && inRange ? (
                  <span className="card-badge-good">
                    <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" />
                    Meets
                  </span>
                ) : !inRange ? (
                  <span className="card-badge-muted">Outside</span>
                ) : (
                  <span className="card-badge-missing">—</span>
                )}
              </div>

              {/* Weather Icon & Feels Like Temperature */}
              <div className="card-weather-row">
                <div className="weather-icon-bubble">{renderIcon()}</div>
                <div className="card-temp-value">
                  {missing ? '—' : `${h.apparent}°`}
                  <small className="text-xs font-normal text-[var(--muted-foreground)]">C</small>
                </div>
              </div>

              {/* Air Quality (AQI) Metric Bar */}
              <div className="card-metric-block">
                <div className="metric-header">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Wind className="w-3 h-3 text-[var(--primary)]" /> Air Quality
                  </span>
                  <strong className="text-xs">{missing ? '—' : `${h.pm25}`}</strong>
                </div>
                <div className="pm25-mini-track">
                  <div
                    className={`pm25-mini-fill ${
                      pm25Meets ? 'bg-[var(--primary)]' : 'bg-[var(--caution)]'
                    }`}
                    style={{
                      width: `${Math.min(100, ((h.pm25 ?? 0) / 100) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Rain Chance */}
              <div className="card-rain-row">
                <span className="text-[var(--muted-foreground)] flex items-center gap-1 text-[11px]">
                  <Droplet className="w-3 h-3 text-[var(--mist)]" /> Rain chance
                </span>
                <strong>{missing ? '—' : `${h.rain}%`}</strong>
              </div>

              {/* Bottom Activity Block Status Pill */}
              <div className="card-footer-slot">
                {selected ? (
                  <div className="selected-slot-pill">
                    {formatTime(startMin).replace(/ (AM|PM)/, '')}–
                    {formatTime(endMin).replace(/ (AM|PM)/, '')}
                  </div>
                ) : missing ? (
                  <span className="text-[var(--muted-subordinate)] text-xs">Missing</span>
                ) : meets && inRange ? (
                  <span className="text-[var(--primary)] text-xs font-medium">Available</span>
                ) : unsafe ? (
                  <span className="text-[var(--caution)] text-xs font-medium">Exceeds</span>
                ) : (
                  <span className="text-[var(--muted-subordinate)] text-xs">Closed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Block Summary Strip */}
      <div className="timeline-summary-strip">
        <div className="flex items-center gap-2">
          <span className="selected-indicator-dot" />
          <p className="text-xs sm:text-sm text-[var(--foreground)] font-medium m-0">
            {block
              ? `Selected window: ${formatTime(block.start)} – ${formatTime(
                  block.end
                )} (${preferences.duration} continuous minutes) · Air Quality: ${
                  block.pm25
                } AQI · Apparent Temp: ${block.apparent}°C · Rain: ${block.rain}%`
              : 'No continuous window meets all preferences in this range.'}
          </p>
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">
          3:00–4:00 PM · forecast data unavailable
        </span>
      </div>
    </section>
  );
}
