import { Footprints, Bike, PersonStanding, Briefcase, SlidersHorizontal, ArrowRight, Clock3, Thermometer, Wind, Droplet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { WeatherSelect } from '@/components/weather-select';
import { type Preferences, INDIA_ACTIVITY_PRESETS, getIndiaCpcbCategory, getIndiaHeatBand, formatTime } from '@/lib/activity-planner';
import { CadenceInfoTooltip } from '@/components/cadence-info-tooltip';
import { useState } from 'react';

const activities = [
  { name: 'Walk', icon: Footprints },
  { name: 'Run', icon: PersonStanding },
  { name: 'Cycling', icon: Bike },
  { name: 'Commute', icon: Briefcase },
  { name: 'Custom outdoor task', icon: SlidersHorizontal },
];

const TIME_STEPS = Array.from({ length: 48 }, (_, i) => i * 30);

function buildTimeOptions(selectedValue: number) {
  const steps = [...TIME_STEPS];
  if (!steps.includes(selectedValue)) {
    steps.push(selectedValue);
    steps.sort((a, b) => a - b);
  }
  const displayMap: Record<string, string> = {};
  steps.forEach(m => {
    displayMap[String(m)] = formatTime(m);
  });
  return {
    options: steps.map(String),
    displayMap,
  };
}

export function ActivityForm({
  preferences,
  onChange,
  onSubmit,
  changed,
  timezoneAbbr,
}: {
  preferences: Preferences;
  onChange: (value: Preferences) => void;
  onSubmit: () => void;
  changed: boolean;
  timezoneAbbr?: string;
}) {
  const [custom, setCustom] = useState(false);
  const update = (key: keyof Preferences, value: number | string | boolean) =>
    onChange({ ...preferences, [key]: value });

  const handleActivitySelect = (name: string) => {
    const preset = INDIA_ACTIVITY_PRESETS[name];
    if (preset) {
      onChange({
        ...preferences,
        activity: name,
        duration: preset.duration,
        maxTemperature: preset.maxTemperature,
        maxPm25: preset.maxPm25,
        rainAcceptable: preset.rainAcceptable,
        maxRain: preset.maxRain,
      });
      setCustom(false);
    } else {
      update('activity', name);
    }
  };

  const startData = buildTimeOptions(preferences.start);
  const endData = buildTimeOptions(preferences.end);

  const valid =
    preferences.duration > 0 && preferences.end - preferences.start >= preferences.duration;

  const currentPreset = INDIA_ACTIVITY_PRESETS[preferences.activity];

  return (
    <section className="activity-planner" aria-labelledby="activity-heading">
      <div className="heading-row">
        <h2 className="section-heading" id="activity-heading">
          <Footprints /> Make time for outside <span className="heading-dash" />
        </h2>
        <span className="small-caption">Your activity. Your preferences.</span>
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (valid) onSubmit();
        }}
      >
        <div className="activity-tabs" role="group" aria-label="Activity type">
          {activities.map(a => (
            <Button
              key={a.name}
              type="button"
              variant={preferences.activity === a.name ? 'activitySelected' : 'activity'}
              aria-pressed={preferences.activity === a.name}
              onClick={() => handleActivitySelect(a.name)}
            >
              <a.icon />
              {a.name}
            </Button>
          ))}
        </div>
        {currentPreset && (
          <p className="text-[11px] text-[var(--muted-foreground)] mt-2 mb-1 px-1">
            Default preset: <strong className="text-[var(--primary)] font-normal">{currentPreset.description}</strong> · Editable below
          </p>
        )}
        <div className="planner-inputs">
          <div className="planner-field duration-field">
            <label>
              <Clock3 /> Duration
            </label>
            <WeatherSelect
              label="Activity duration"
              variant="field"
              value={custom ? 'Custom' : String(preferences.duration)}
              options={['15', '30', '45', '60', '120', 'Custom']}
              onValueChange={v => {
                setCustom(v === 'Custom');
                if (v !== 'Custom') update('duration', Number(v));
              }}
              displayOptions={{
                '15': '15 min',
                '30': '30 min',
                '45': '45 min',
                '60': '1 hr',
                '120': '2 hr',
              }}
            />
            {custom && (
              <label className="custom-duration">
                <input
                  type="number"
                  aria-label="Custom duration in minutes"
                  min={1}
                  max={720}
                  value={preferences.duration}
                  onChange={e => update('duration', Number(e.target.value))}
                />{' '}
                min
              </label>
            )}
          </div>
          <div className="planner-field availability-field">
            <label>
              Available window <span>Today · {timezoneAbbr || 'Local'}</span>
            </label>
            <div className="time-inputs 12h-time-selects">
              <WeatherSelect
                label="Availability start time"
                variant="field"
                value={String(preferences.start)}
                options={startData.options}
                displayOptions={startData.displayMap}
                onValueChange={v => update('start', Number(v))}
              />
              <span className="text-[var(--muted-foreground)] font-mono">–</span>
              <WeatherSelect
                label="Availability end time"
                variant="field"
                value={String(preferences.end)}
                options={endData.options}
                displayOptions={endData.displayMap}
                onValueChange={v => update('end', Number(v))}
              />
            </div>
          </div>
          <div className="planner-field">
            <label htmlFor="temperature-preference" className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5" /> Feels like
              </span>
              <CadenceInfoTooltip type="feels-like" />
            </label>
            <div className="preference-value">
              <strong>{preferences.maxTemperature}°C</strong>
              <span>maximum</span>
            </div>
            <input
              id="temperature-preference"
              type="range"
              min="18"
              max="45"
              value={preferences.maxTemperature}
              onChange={e => update('maxTemperature', Number(e.target.value))}
            />
            <span className="text-[10px] text-[var(--muted-foreground)] block mt-1">
              UX band: {getIndiaHeatBand(preferences.maxTemperature).label} (apparent temp)
            </span>
          </div>
          <div className="planner-field">
            <label htmlFor="air-preference" className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5" /> Air particles
              </span>
              <CadenceInfoTooltip type="air-particles" />
            </label>
            <div className="preference-value">
              <strong>
                {preferences.maxPm25}
                <small> µg/m³ PM2.5</small>
              </strong>
              <span>maximum</span>
            </div>
            <input
              id="air-preference"
              type="range"
              min="5"
              max="150"
              step="1"
              value={preferences.maxPm25}
              onChange={e => update('maxPm25', Number(e.target.value))}
            />
            <span className="text-[10px] text-[var(--muted-foreground)] block mt-1">
              CPCB band: {getIndiaCpcbCategory(preferences.maxPm25).category} (~{getIndiaCpcbCategory(preferences.maxPm25).subindex}) · modeled forecast
            </span>
          </div>
          <div className="planner-field rain-field">
            <div className="rain-toggle flex items-center justify-between">
              <label htmlFor="rain-acceptable" className="flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5" /> Chance of rain
                <CadenceInfoTooltip type="chance-of-rain" />
              </label>
              <Switch
                id="rain-acceptable"
                checked={preferences.rainAcceptable}
                onCheckedChange={v => update('rainAcceptable', v)}
              />
            </div>
            <div className="preference-value">
              <strong>{preferences.rainAcceptable ? preferences.maxRain : 0}%</strong>
              <span>max. rain chance</span>
            </div>
            <input
              type="range"
              aria-label="Acceptable rain probability"
              min="0"
              max="100"
              step="5"
              value={preferences.maxRain}
              disabled={!preferences.rainAcceptable}
              onChange={e => update('maxRain', Number(e.target.value))}
            />
          </div>
        </div>
        <div className="planner-actions">
          <p>
            {!valid
              ? 'Choose a time range long enough for your activity.'
              : changed
              ? 'Preferences changed · find a window to update your result.'
              : 'A continuous window, compared against your preferences.'}
          </p>
          <Button variant="planner" type="submit" disabled={!valid}>
            Find a better window <ArrowRight />
          </Button>
        </div>
      </form>
    </section>
  );
}
