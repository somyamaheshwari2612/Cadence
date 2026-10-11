import { Check, ArrowUpRight, ChevronDown, Wind, Thermometer, Droplet, CircleHelp, TriangleAlert, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Decision, type Preferences, formatTime } from '@/lib/activity-planner';
import { weatherArtwork, getWeatherArtworkForCondition, isNightTime } from '@/lib/weather-artwork';
import { CadenceInfoTooltip } from '@/components/cadence-info-tooltip';

export function BestTimeResult({
  decision,
  preferences,
  showAlternative,
  onAlternative,
  onEdit,
  condition,
  sunrise,
  sunset,
}: {
  decision: Decision;
  preferences: Preferences;
  showAlternative: boolean;
  onAlternative: () => void;
  onEdit: () => void;
  condition?: string;
  sunrise?: string;
  sunset?: string;
}) {
  const alternative = decision.state === 'no-slot' && showAlternative;
  const block = decision.state === 'qualified' ? decision.block : alternative && decision.state === 'no-slot' ? decision.alternative : undefined;
  const title = block
    ? alternative
      ? 'Outside your preferences'
      : `Best window for your ${preferences.activity.toLowerCase()}`
    : decision.state === 'incomplete'
    ? 'Unable to compare time slots'
    : 'No slot meets your preferences today';

  const whyBullets = alternative ? block?.whyThisAlternative : block?.whyThisWindow;
  const isBlockNight = block !== undefined
    ? isNightTime({
        timeMinutes: block.start,
        sunrise,
        sunset,
      })
    : undefined;
  const artwork = getWeatherArtworkForCondition(condition || 'Partly Cloudy', block?.apparent ?? 28, {
    isNight: isBlockNight,
    timeMinutes: block?.start,
    sunrise,
    sunset,
  });

  return (
    <section
      className={`best-time-result ${
        alternative ? 'result-alternative' : !block ? 'result-neutral' : 'result-qualified'
      }`}
      aria-labelledby="result-heading"
      aria-live="polite"
    >
      <img src={artwork.src} alt={artwork.alt} className="result-art" width={1024} height={768} />
      <div className="result-content">
        <div className="result-eyebrow">
          {block ? alternative ? <TriangleAlert /> : <Check /> : <CloudOff />}
          <h2 id="result-heading">{title}</h2>
        </div>

        {block ? (
          <>
            <div className="result-time">
              <span>Today</span>
              <span className="result-time-value">{formatTime(block.start)}</span>
              <span className="result-time-separator">–</span>
              <span className="result-time-value">{formatTime(block.end)}</span>
            </div>

            <p className="result-status">
              {alternative ? (
                'Lowest-ranked available window'
              ) : (
                <>
                  <Check /> This window meets your selected preferences
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
                  {alternative
                    ? 'Above your preference'
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

            {alternative && (
              <div className="exceeded-preferences">
                {block.exceededLimits && block.exceededLimits.length > 0 ? (
                  block.exceededLimits.map((item, idx) => (
                    <p key={idx}>
                      <TriangleAlert /> {item.message || `Exceeds ${item.label || item.metric} preference`}
                      <span>Forecast: {item.forecast_value} {item.unit} · Your preference: {item.user_preference} {item.unit}</span>
                    </p>
                  ))
                ) : block.exceeded ? (
                  block.exceeded.map(name => {
                    const aliasLabel = name === 'PM2.5' ? 'Air Quality' : name === 'Apparent temperature' ? 'Feels like' : 'Chance of rain';
                    const measured = name === 'PM2.5' ? `${block.pm25} AQI` : name === 'Apparent temperature' ? `${block.apparent}°C` : `${block.rain}%`;
                    const limit = name === 'PM2.5' ? `${preferences.maxPm25} AQI` : name === 'Apparent temperature' ? `${preferences.maxTemperature}°C` : preferences.rainAcceptable ? `${preferences.maxRain}%` : '0%';
                    return (
                      <p key={name}>
                        <TriangleAlert /> Exceeds {aliasLabel} preference <span>Forecast: {measured} · Your preference: {limit}</span>
                      </p>
                    );
                  })
                ) : null}
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
                (alternative
                  ? 'No slot met every preference. This is the lowest product-ranked comparable block.'
                  : `Chosen as the lowest-ranked available continuous ${preferences.duration}-minute block within your preferences.`)}
            </p>

            <details className="why-details">
              <summary>
                <CircleHelp />
                {alternative ? 'Why this alternative?' : 'Why this time?'}
                <ChevronDown />
              </summary>
              <ul>
                {whyBullets && whyBullets.length > 0 ? (
                  whyBullets.map((bullet, i) => <li key={i}>{bullet}</li>)
                ) : (
                  <>
                    <li>Fits your requested {preferences.duration}-minute duration.</li>
                    <li>Inside your selected availability: {formatTime(preferences.start)}–{formatTime(preferences.end)}.</li>
                    <li>Has the lowest outdoor comfort score {alternative ? 'among comparable blocks' : 'among blocks that meet every preference'}.</li>
                    {!alternative && <li>Air Quality (AQI), feels-like temperature, and chance of rain meet your stated preferences throughout the block.</li>}
                    {alternative && block.exceeded.map(name => {
                      const aliasLabel = name === 'PM2.5' ? 'Air Quality' : name === 'Apparent temperature' ? 'Feels like' : 'Chance of rain';
                      return <li key={name}>{aliasLabel} exceeds your stated preference.</li>;
                    })}
                  </>
                )}
              </ul>
            </details>
          </>
        ) : (
          <>
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
          </>
        )}

        <p className="result-disclaimer">
          Forecasts are uncertain; this is not a safety or medical recommendation.
        </p>
      </div>
    </section>
  );
}
