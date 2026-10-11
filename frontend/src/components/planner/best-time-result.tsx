import { Check, ArrowUpRight, ChevronDown, Wind, Thermometer, Droplet, CircleHelp, TriangleAlert, CloudOff, Clock, Sparkles, ClockAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type ActivityBlock, type Decision, type Preferences, formatTime } from '@/lib/activity-planner';
import { getWeatherArtworkForCondition, isNightTime } from '@/lib/weather-artwork';
import { CadenceInfoTooltip } from '@/components/cadence-info-tooltip';

interface SingleWindowCardProps {
  block: ActivityBlock;
  badgeType: 'schedule' | 'weather' | 'qualified' | 'alternative';
  badgeLabel?: string | undefined;
  title: string;
  statusText?: string | undefined;
  isAlternative?: boolean | undefined;
  preferences: Preferences;
  condition?: string | undefined;
  sunrise?: string | undefined;
  sunset?: string | undefined;
}

function SingleWindowCard({
  block,
  badgeType,
  badgeLabel,
  title,
  statusText,
  isAlternative,
  preferences,
  condition,
  sunrise,
  sunset,
}: SingleWindowCardProps) {
  const isBlockNight = isNightTime({
    timeMinutes: block.start,
    sunrise,
    sunset,
  });

  const artwork = getWeatherArtworkForCondition(condition || 'Partly Cloudy', block.apparent ?? 28, {
    isNight: isBlockNight,
    timeMinutes: block.start,
    sunrise,
    sunset,
  });

  const whyBullets = isAlternative ? block.whyThisAlternative : block.whyThisWindow;
  const dayLabel = block.dayLabel || (block.displayWindow?.includes('Tomorrow') ? 'Tomorrow' : 'Today');

  const cardVariantClass =
    badgeType === 'schedule'
      ? 'result-card-schedule'
      : badgeType === 'weather'
      ? 'result-card-weather result-alternative'
      : isAlternative
      ? 'result-alternative'
      : 'result-qualified';

  return (
    <div className={`best-time-result best-time-card ${cardVariantClass}`}>
      <img src={artwork.src} alt={artwork.alt} className="result-art" width={1024} height={768} />
      <div className="result-content">
        <div className="result-eyebrow">
          {badgeType === 'schedule' ? (
            <div className="badge-chip badge-schedule">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px]">
                {badgeLabel || 'Fits your schedule'}
              </span>
            </div>
          ) : badgeType === 'weather' ? (
            <div className="badge-chip badge-weather">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold text-sky-400 uppercase tracking-wider text-[10px]">
                {badgeLabel || 'Optimal weather alternative'}
              </span>
            </div>
          ) : isAlternative ? (
            <TriangleAlert className="text-[var(--caution)]" />
          ) : (
            <Check className="text-[var(--primary)]" />
          )}
          <h2 id="result-heading" className="result-heading-text">{title}</h2>
        </div>

        <div className="result-time">
          <span className="result-day-tag">{dayLabel}</span>
          <span className="result-time-value">{formatTime(block.start)}</span>
          <span className="result-time-separator">–</span>
          <span className="result-time-value">{formatTime(block.end)}</span>
        </div>

        <p className="result-status">
          {statusText ? (
            statusText
          ) : isAlternative ? (
            'Lowest discomfort score across 24h · Flexible timing'
          ) : block.exceeded && block.exceeded.length > 0 ? (
            <>
              <TriangleAlert className="text-[var(--caution)] shrink-0" /> Timing constraint met · Minor environmental tradeoffs
            </>
          ) : (
            <>
              <Check className="text-[var(--primary)] shrink-0" /> This window meets your selected preferences
            </>
          )}
        </p>

        <div className="result-readings">
          <div className="result-metric-card">
            <div className="flex items-center gap-1.5 justify-center mb-0.5">
              <Wind className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span className="font-medium text-xs">Air Quality</span>
              <CadenceInfoTooltip type="air-particles" />
            </div>
            <strong className="text-xl">
              {block.pm25}
              <small className="text-xs font-normal text-[var(--muted-foreground)]"> AQI</small>
            </strong>
            <span className="text-[11px] text-[var(--muted-foreground)] block mt-0.5">
              {block.exceeded?.includes('PM2.5')
                ? 'Above preference'
                : block.cpcbCategory
                ? `Air: ${block.cpcbCategory}`
                : 'Lower than later today'}
            </span>
          </div>

          <div className="result-metric-card">
            <div className="flex items-center gap-1.5 justify-center mb-0.5">
              <Thermometer className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span className="font-medium text-xs">Feels like</span>
              <CadenceInfoTooltip type="feels-like" />
            </div>
            <strong className="text-xl">
              {block.apparent}
              <small className="text-xs font-normal text-[var(--muted-foreground)]">°C</small>
            </strong>
            <span className="text-[11px] text-[var(--muted-foreground)] block mt-0.5">
              {block.heatLabel || 'Apparent temp'}
            </span>
          </div>

          <div className="result-metric-card">
            <div className="flex items-center gap-1.5 justify-center mb-0.5">
              <Droplet className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span className="font-medium text-xs">Chance of rain</span>
              <CadenceInfoTooltip type="chance-of-rain" />
            </div>
            <strong className="text-xl">
              {block.rain}
              <small className="text-xs font-normal text-[var(--muted-foreground)]">%</small>
            </strong>
            <span className="text-[11px] text-[var(--muted-foreground)] block mt-0.5">
              {block.rain <= preferences.maxRain ? 'Within limit' : 'Above preference'}
            </span>
          </div>
        </div>

        {block.heatAdvisory && block.heatTier && ['hot', 'very_hot', 'extreme_heat'].includes(block.heatTier) && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-[color-mix(in_oklch,var(--sunlight)_12%,transparent)] border border-[color-mix(in_oklch,var(--sunlight)_30%,transparent)] text-xs text-[var(--foreground)]">
            <Thermometer className="w-3.5 h-3.5 inline mr-1 text-[var(--sunlight)]" />
            <strong>Heat notice:</strong> {block.heatAdvisory}
          </div>
        )}

        {block.exceeded && block.exceeded.length > 0 && (
          <div className="exceeded-preferences mt-2">
            {block.exceededLimits && block.exceededLimits.length > 0 ? (
              block.exceededLimits.map((item, idx) => (
                <p key={idx} className="text-xs">
                  <TriangleAlert className="shrink-0 w-3.5 h-3.5 text-[var(--caution)]" />
                  <span>
                    {item.message || `Exceeds ${item.label || item.metric} preference`}{' '}
                    <span className="opacity-75">
                      (Forecast: {item.forecast_value} {item.unit} · Your preference: {item.user_preference} {item.unit})
                    </span>
                  </span>
                </p>
              ))
            ) : (
              block.exceeded.map(name => {
                const aliasLabel = name === 'PM2.5' ? 'Air Quality' : name === 'Apparent temperature' ? 'Feels like' : 'Chance of rain';
                const measured = name === 'PM2.5' ? `${block.pm25} AQI` : name === 'Apparent temperature' ? `${block.apparent}°C` : `${block.rain}%`;
                const limit = name === 'PM2.5' ? `${preferences.maxPm25} AQI` : name === 'Apparent temperature' ? `${preferences.maxTemperature}°C` : preferences.rainAcceptable ? `${preferences.maxRain}%` : '0%';
                return (
                  <p key={name} className="text-xs">
                    <TriangleAlert className="shrink-0 w-3.5 h-3.5 text-[var(--caution)]" /> Exceeds {aliasLabel} preference{' '}
                    <span className="opacity-75">(Forecast: {measured} · Limit: {limit})</span>
                  </p>
                );
              })
            )}
          </div>
        )}

        <div className="result-ranking-info flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs text-[var(--muted-foreground)] mt-2 pt-2 border-t border-[var(--fine-line)]">
          <span className="flex items-center gap-1 flex-wrap">
            Outdoor comfort score: <strong className="text-[var(--foreground)] font-normal">Lower is better</strong>
            <CadenceInfoTooltip type="comfort-score" />
          </span>
          <span className="text-[11px] opacity-80 shrink-0">Continuous {preferences.duration}-min window</span>
        </div>

        <p className="result-reason">
          {block.chosenRationale ||
            (isAlternative
              ? 'Lowest discomfort product-ranked window across the 24-hour cycle.'
              : `Chosen as the lowest-ranked available continuous ${preferences.duration}-minute block within your preferences.`)}
        </p>

        <details className="why-details">
          <summary>
            <CircleHelp />
            {isAlternative ? 'Why this alternative?' : 'Why this time?'}
            <ChevronDown />
          </summary>
          <ul>
            {whyBullets && whyBullets.length > 0 ? (
              whyBullets.map((bullet, i) => <li key={i}>{bullet}</li>)
            ) : (
              <>
                <li>Fits your requested {preferences.duration}-minute duration.</li>
                <li>Inside your selected availability: {formatTime(preferences.start)}–{formatTime(preferences.end)}.</li>
                <li>Has the lowest outdoor comfort score {isAlternative ? 'among comparable blocks' : 'among blocks that meet every preference'}.</li>
                {!isAlternative && <li>Air Quality (AQI), feels-like temperature, and chance of rain meet your stated preferences throughout the block.</li>}
                {isAlternative && block.exceeded?.map(name => {
                  const aliasLabel = name === 'PM2.5' ? 'Air Quality' : name === 'Apparent temperature' ? 'Feels like' : 'Chance of rain';
                  return <li key={name}>{aliasLabel} exceeds your stated preference.</li>;
                })}
              </>
            )}
          </ul>
        </details>

        <p className="result-disclaimer">
          Forecasts are uncertain; this is not a safety or medical recommendation.
        </p>
      </div>
    </div>
  );
}

export function BestTimeResult({
  decision,
  preferences,
  showAlternative,
  onAlternative,
  onEdit,
  condition,
  sunrise,
  sunset,
  onSetUpcoming,
  onPlanTomorrow,
  currentTimeFormatted,
}: {
  decision: Decision;
  preferences: Preferences;
  showAlternative: boolean;
  onAlternative: () => void;
  onEdit: () => void;
  condition?: string | undefined;
  sunrise?: string | undefined;
  sunset?: string | undefined;
  onSetUpcoming?: (() => void) | undefined;
  onPlanTomorrow?: (() => void) | undefined;
  currentTimeFormatted?: string | undefined;
}) {
  // Guardrail: Past window state
  if (decision.state === 'past-window') {
    const formattedNow = currentTimeFormatted || decision.currentTimeFormatted || 'earlier today';
    const futureAlt = decision.weatherAlternative;
    const isFutureAltValid =
      futureAlt && (futureAlt.dayLabel === 'Tomorrow' || futureAlt.start >= preferences.end);

    return (
      <section className="best-time-result result-past-window" aria-labelledby="result-heading" aria-live="polite">
        <div className="result-content">
          <div className="result-eyebrow">
            <ClockAlert className="text-[var(--caution)]" />
            <h2 id="result-heading" className="text-[var(--caution)]">Selected time has already passed today</h2>
          </div>

          <div className="result-time past-result-time">
            <span className="result-day-tag">Today</span>
            <span className="result-time-value opacity-60 line-through">{formatTime(preferences.start)}</span>
            <span className="result-time-separator opacity-40">–</span>
            <span className="result-time-value opacity-60 line-through">{formatTime(preferences.end)}</span>
          </div>

          <p className="result-status text-[var(--caution)]">
            <TriangleAlert className="shrink-0 w-3.5 h-3.5" /> Window ended earlier today (currently {formattedNow})
          </p>

          <p className="empty-result-copy">
            {decision.reason ||
              `The window ${formatTime(preferences.start)}–${formatTime(preferences.end)} has already elapsed. Cadence only suggests practical, forward-looking windows so you can actually do your activity.`}
          </p>

          <div className="empty-result-actions">
            {onSetUpcoming && (
              <Button variant="default" onClick={onSetUpcoming} className="gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Jump to upcoming window today
              </Button>
            )}
            {onPlanTomorrow && (
              <Button variant="outline" onClick={onPlanTomorrow}>
                Plan for tomorrow morning
              </Button>
            )}
            <Button variant="ghost" onClick={onEdit}>
              Edit preferences
            </Button>
          </div>

          {isFutureAltValid && (
            <div className="mt-4 pt-3 border-t border-[var(--fine-line)]">
              <span className="text-xs text-[var(--muted-foreground)]">
                Next upcoming weather alternative across 24h:{' '}
                <strong className="text-[var(--primary)] font-normal">
                  {futureAlt.dayLabel || 'Tomorrow'} {formatTime(futureAlt.start)}–{formatTime(futureAlt.end)}
                </strong>{' '}
                ({futureAlt.apparent}°C · {futureAlt.pm25} µg/m³ PM2.5)
              </span>
            </div>
          )}

          <p className="result-disclaimer">
            Cadence does not suggest past hours. Please choose an upcoming time.
          </p>
        </div>
      </section>
    );
  }

  const scheduleWindow = decision.state === 'qualified' ? decision.scheduleWindow || decision.block : decision.state === 'no-slot' ? decision.scheduleWindow : undefined;
  const weatherAlt = decision.state === 'incomplete' ? undefined : decision.weatherAlternative;

  // Determine if we should present the dual-window view:
  // Active when both a schedule-fitting window and a distinct weather alternative are available
  const isDual = Boolean(
    scheduleWindow &&
    weatherAlt &&
    scheduleWindow.start !== weatherAlt.start
  );

  if (isDual && scheduleWindow && weatherAlt) {
    const activityName = preferences.activity.toLowerCase();
    return (
      <section className="dual-results-wrapper" aria-labelledby="dual-results-heading" aria-live="polite">
        <div className="dual-results-header">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h2 id="dual-results-heading" className="text-xs font-medium text-[var(--foreground)]">
              Two windows tailored to your needs: One respecting your {activityName} schedule, and one with optimal weather across the day.
            </h2>
          </div>
        </div>

        <div className="dual-results-grid">
          {/* Window 1: Strictly fits user's timing constraint */}
          <SingleWindowCard
            block={scheduleWindow}
            badgeType="schedule"
            badgeLabel="Fits your schedule"
            title={`Best window for your ${activityName}`}
            statusText={
              scheduleWindow.exceeded && scheduleWindow.exceeded.length > 0
                ? 'Meets timing constraints · Minor environmental tradeoffs'
                : 'Fits your schedule & meets preferences'
            }
            preferences={preferences}
            condition={condition}
            sunrise={sunrise}
            sunset={sunset}
          />

          {/* Window 2: Optimal weather alternative across 24h */}
          <SingleWindowCard
            block={weatherAlt}
            badgeType="weather"
            badgeLabel="Optimal weather alternative"
            title="Cleanest air & lowest heat"
            statusText="Lowest outdoor discomfort score across 24h (Flexible timing)"
            isAlternative={true}
            preferences={preferences}
            condition={condition}
            sunrise={sunrise}
            sunset={sunset}
          />
        </div>
      </section>
    );
  }

  // Single window fallback or standard view
  const alternative = decision.state === 'no-slot' && showAlternative;
  const block = decision.state === 'qualified' ? decision.block : alternative && decision.state === 'no-slot' ? decision.alternative : undefined;
  const title = block
    ? alternative
      ? 'Outside your preferences'
      : `Best window for your ${preferences.activity.toLowerCase()}`
    : decision.state === 'incomplete'
    ? 'Unable to compare time slots'
    : 'No slot meets your preferences today';

  if (!block) {
    return (
      <section className="best-time-result result-neutral" aria-labelledby="result-heading" aria-live="polite">
        <div className="result-content">
          <div className="result-eyebrow">
            <CloudOff />
            <h2 id="result-heading">{title}</h2>
          </div>
          <p className="empty-result-copy">
            {decision.state === 'incomplete'
              ? `Forecast data are incomplete or unavailable for the requested ${preferences.duration}-minute duration. Try again later or choose a different time window.`
              : `No continuous ${preferences.duration}-minute period within your selected time range met every preference.`}
          </p>
          <div className="empty-result-actions">
            {decision.state === 'no-slot' && (
              <Button variant="outline" onClick={onAlternative}>
                View outside-preference alternatives <ArrowUpRight />
              </Button>
            )}
            <Button variant="ghost" onClick={onEdit}>
              Edit preferences
            </Button>
          </div>
          <p className="result-disclaimer">
            Forecasts are uncertain; this is not a safety or medical recommendation.
          </p>
        </div>
      </section>
    );
  }

  return (
    <SingleWindowCard
      block={block}
      badgeType={alternative ? 'alternative' : 'qualified'}
      title={title}
      isAlternative={alternative}
      preferences={preferences}
      condition={condition}
      sunrise={sunrise}
      sunset={sunset}
    />
  );
}
