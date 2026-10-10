import * as React from 'react';
import { HelpCircle, Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export type AliasTooltipType =
  | 'air-particles'
  | 'coarse-dust'
  | 'feels-like'
  | 'chance-of-rain'
  | 'comfort-score'
  | 'forecast-quality'
  | 'wind'
  | 'humidity'
  | 'visibility'
  | 'cpcb-estimate';

interface TooltipDefinition {
  title: string;
  explanation: string;
  technicalMeasure?: string;
  note?: string;
}

const TOOLTIP_DEFINITIONS: Record<AliasTooltipType, TooltipDefinition> = {
  'air-particles': {
    title: 'What are air particles?',
    explanation: 'Tiny particles in the air that can come from traffic, dust, burning, and industry.',
    technicalMeasure: 'PM2.5, shown in micrograms per cubic metre (µg/m³).',
    note: 'This is a modeled forecast for your selected location, not a local monitor reading.',
  },
  'coarse-dust': {
    title: 'What is coarse dust?',
    explanation: 'Larger airborne dust and particulate matter, often from unpaved roads, construction, and soil.',
    technicalMeasure: 'PM10, shown in micrograms per cubic metre (µg/m³).',
  },
  'feels-like': {
    title: 'Why does it feel hotter?',
    explanation:
      'A weather estimate that combines temperature with humidity, wind, and sunlight. It can feel warmer or cooler than the measured air temperature.',
    technicalMeasure: 'apparent temperature in °C.',
  },
  'chance-of-rain': {
    title: 'What does the rain chance mean?',
    explanation: 'The forecasted probability of precipitation during this continuous time window.',
    technicalMeasure: 'precipitation probability (0–100%).',
  },
  'comfort-score': {
    title: 'How is this ordered?',
    explanation:
      'A Cadence ranking used to compare available time windows using your selected preferences for air particles, feels-like temperature, and rain. Lower score is better.',
    note: 'It is not a health score, medical assessment, or guarantee of safety.',
  },
  'forecast-quality': {
    title: 'Forecast quality',
    explanation:
      'Air-quality values are model estimates for a regional grid, so actual neighborhood conditions may differ. Check local official guidance if conditions are concerning.',
  },
  'cpcb-estimate': {
    title: 'Forecast-based CPCB PM estimate',
    explanation:
      'Central Pollution Control Board category calculated from modeled PM2.5 breakpoints. Not an official station AQI.',
    note: 'CPCB uses six color-coded bands (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) for public communication.',
  },
  wind: {
    title: 'How is wind measured?',
    explanation: 'Wind speed and compass direction modeled at 10 metres above surface level.',
    technicalMeasure: 'wind speed in km/h and heading (e.g. ESE).',
  },
  humidity: {
    title: 'Why does humidity matter?',
    explanation:
      'Relative humidity influences how effectively your body cools through sweating. High humidity amplifies heat discomfort.',
    technicalMeasure: 'relative humidity percentage (%).',
  },
  visibility: {
    title: 'What affects visibility?',
    explanation: 'Horizontal visibility is affected by fine particles, moisture, fog, and regional haze.',
    technicalMeasure: 'modeled horizontal visibility in kilometres (km).',
  },
};

export function CadenceInfoTooltip({
  type,
  className = '',
  customTitle,
  customExplanation,
}: {
  type: AliasTooltipType;
  className?: string;
  customTitle?: string;
  customExplanation?: string;
}) {
  const def = TOOLTIP_DEFINITIONS[type];
  const title = customTitle || def?.title || 'Information';
  const explanation = customExplanation || def?.explanation || '';
  const technical = def?.technicalMeasure;
  const note = def?.note;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[color-mix(in_oklch,var(--card)_70%,transparent)] border border-transparent hover:border-[var(--fine-line)] transition-all cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)] ${className}`}
          aria-label={title}
          title={title}
        >
          <Info className="w-3 h-3 pointer-events-none" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={6}
        className="w-72 p-3.5 rounded-xl bg-[var(--menu-surface)] border border-[var(--border)] shadow-[var(--menu-shadow)] text-xs text-[var(--foreground)] backdrop-blur-xl z-50 text-left leading-relaxed"
      >
        <h4 className="font-semibold text-[var(--primary)] text-xs mb-1 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
          {title}
        </h4>
        <p className="text-[11.5px] text-[var(--foreground)] mb-1.5 font-normal">
          {explanation}
        </p>
        {technical && (
          <p className="text-[11px] text-[var(--muted-foreground)] border-t border-[var(--fine-line)] pt-1.5 mt-1">
            <strong className="text-[var(--foreground)] font-medium">Technical measure:</strong>{' '}
            {technical}
          </p>
        )}
        {note && (
          <p className="text-[10px] text-[var(--muted-subordinate)] italic mt-1 leading-snug">
            {note}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
