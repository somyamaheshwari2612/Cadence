import * as React from 'react';
import { Info, Navigation, AlertTriangle, Search, Radio } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  formatAccuracy,
  isCoarseAccuracy,
  GEOLOCATION_EXPLANATION,
} from '@/lib/location-utils';

interface LocationAccuracyPopoverProps {
  accuracy?: number | null;
  onOpenSearch?: () => void;
  className?: string;
  showBadge?: boolean;
}

export function LocationAccuracyPopover({
  accuracy,
  onOpenSearch,
  className = '',
  showBadge = true,
}: LocationAccuracyPopoverProps) {
  const formatted = formatAccuracy(accuracy);
  const coarse = isCoarseAccuracy(accuracy);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {showBadge && formatted ? (
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer select-none border ${
              coarse
                ? 'bg-[color-mix(in_oklch,var(--caution)_15%,transparent)] border-[color-mix(in_oklch,var(--caution)_40%,transparent)] text-[var(--caution)] hover:border-[var(--caution)]'
                : 'bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] border-[color-mix(in_oklch,var(--primary)_35%,transparent)] text-[var(--primary)] hover:border-[var(--primary)]'
            } ${className}`}
            title="Click to view device location and model-grid resolution details"
            aria-label={`Location accuracy: ${formatted}. Click for explanation.`}
          >
            <Radio className="w-3 h-3 animate-pulse shrink-0" aria-hidden="true" />
            <span className="font-mono">{formatted}</span>
            <Info className="w-2.5 h-2.5 ml-0.5 shrink-0" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[var(--muted-foreground)] hover:text-[var(--primary)] border border-transparent hover:border-[var(--fine-line)] hover:bg-[color-mix(in_oklch,var(--card)_70%,transparent)] transition-all cursor-pointer ${className}`}
            title="Location accuracy & model-grid resolution info"
            aria-label="Location accuracy & model-grid resolution info"
          >
            <Info className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-[330px] sm:w-[360px] p-4 rounded-xl bg-[var(--menu-surface)] border border-[var(--border)] shadow-[var(--menu-shadow)] text-xs text-[var(--foreground)] backdrop-blur-xl z-50 text-left leading-relaxed space-y-3"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[var(--fine-line)]">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--primary)] text-xs">
            <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Device Location &amp; Model Grid</span>
          </div>
          {formatted && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                coarse
                  ? 'bg-[color-mix(in_oklch,var(--caution)_20%,transparent)] text-[var(--caution)] border-[color-mix(in_oklch,var(--caution)_40%,transparent)]'
                  : 'bg-[color-mix(in_oklch,var(--primary)_20%,transparent)] text-[var(--primary)] border-[color-mix(in_oklch,var(--primary)_40%,transparent)]'
              }`}
            >
              {formatted}
            </span>
          )}
        </div>

        {/* 1. Coarse Accuracy Preferred Alternative Banner */}
        {coarse && (
          <div className="p-2.5 rounded-lg bg-[color-mix(in_oklch,var(--caution)_15%,transparent)] border border-[color-mix(in_oklch,var(--caution)_35%,transparent)] space-y-2">
            <div className="flex items-start gap-2 text-[11.5px] text-[var(--foreground)]">
              <AlertTriangle className="w-4 h-4 text-[var(--caution)] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[var(--caution)] block mb-0.5">
                  Coarse Accuracy (&gt; 5 km)
                </strong>
                <p className="leading-snug text-[11px] text-[var(--muted-foreground)]">
                  {GEOLOCATION_EXPLANATION.coarseAlternative}
                </p>
              </div>
            </div>
            {onOpenSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium text-[var(--primary)] bg-[var(--card)] hover:bg-[color-mix(in_oklch,var(--card)_80%,var(--primary)_20%)] border border-[var(--primary)] transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search for your city instead</span>
              </button>
            )}
          </div>
        )}

        {/* 2. Device Location Explanation */}
        <div className="space-y-1">
          <p className="font-semibold text-[11px] text-[var(--foreground)] flex items-center gap-1">
            <span>How device location is measured</span>
          </p>
          <p className="text-[11.5px] text-[var(--muted-foreground)] leading-relaxed">
            {GEOLOCATION_EXPLANATION.sources}
          </p>
        </div>

        {/* 3. Model-Grid Resolution Explanation */}
        <div className="space-y-1 pt-2 border-t border-[var(--fine-line)]">
          <p className="font-semibold text-[11px] text-[var(--foreground)]">
            Model-grid resolution vs. device accuracy
          </p>
          <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
            {GEOLOCATION_EXPLANATION.modelGrid}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
