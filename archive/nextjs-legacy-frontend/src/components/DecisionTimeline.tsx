"use client";

import { DecisionTimelineHour } from "@/utils/apiClient";
import { CloudRain, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DecisionTimelineProps {
  timeline: DecisionTimelineHour[] | undefined;
  outcomeType?: string;
  taskName?: string;
  durationDesc?: string;
}

export default function DecisionTimeline({
  timeline = [],
  outcomeType,
  taskName = "Task",
  durationDesc = "selected duration",
}: DecisionTimelineProps) {
  if (!timeline || timeline.length === 0) {
    return null;
  }

  const isQualified = outcomeType === "preference_qualified";

  // Calculate scales for temperature & PM2.5
  const validTemps = timeline.map((h) => h.apparent_temperature).filter((t): t is number => t !== null);
  const minTemp = validTemps.length ? Math.min(...validTemps) : 20;
  const maxTemp = validTemps.length ? Math.max(...validTemps) : 40;
  const tempRange = Math.max(1, maxTemp - minTemp);

  const validPm25 = timeline.map((h) => h.pm2_5).filter((p): p is number => p !== null);
  const maxPm25 = validPm25.length ? Math.max(...validPm25, 80) : 100;

  // Find continuous selected block range to draw the solid block banner
  const selectedIndices = timeline
    .map((h, i) => (h.is_selected_block ? i : -1))
    .filter((i) => i !== -1);
  const hasSelectedBlock = selectedIndices.length > 0;
  const blockStart = selectedIndices[0];
  const blockEnd = selectedIndices[selectedIndices.length - 1];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-emerald-500/25 bg-obsidian-950/80 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-emerald-500/15">
        <div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
            Router Evidence Display
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
            Hourly Decision Timeline
          </h3>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-emerald-200">Meets preferences</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-amber-300">Exceeds preference</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-obsidian-900 border border-emerald-500/30 opacity-50" />
            <span className="text-emerald-500/60">Outside window</span>
          </div>
        </div>
      </div>

      {/* Selected Block Banner Indicator */}
      {hasSelectedBlock && (
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
            isQualified
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
              : "bg-amber-500/15 border-amber-500/40 text-amber-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {isQualified ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            )}
            <span>
              Solid outlined block spans {selectedIndices.length} consecutive hour(s) for your {taskName} ({durationDesc}).
            </span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider">
            {isQualified ? "Optimal candidate" : "Opt-in alternative"}
          </span>
        </div>
      )}

      {/* 24-Hour Horizontal Scrollable Track */}
      <div className="relative overflow-x-auto pb-4 pt-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-emerald-500/20">
        <div className="flex gap-2 min-w-[900px] items-stretch">
          {timeline.map((hour, idx) => {
            const isMissing = hour.data_status === "missing" || hour.apparent_temperature === null;
            const isSuspect = hour.data_status === "suspect";
            const isSelected = hour.is_selected_block;
            const isInsideAvail = hour.inside_availability;

            // Height for PM2.5 bar (0 to 48px)
            const pm25Val = hour.pm2_5 ?? 0;
            const pm25Height = isMissing ? 0 : Math.min(48, Math.max(6, Math.round((pm25Val / maxPm25) * 48)));

            return (
              <div
                key={hour.time}
                className={`flex-1 min-w-[70px] rounded-2xl p-2.5 flex flex-col justify-between transition-all relative ${
                  isSelected
                    ? isQualified
                      ? "bg-emerald-950/70 border-2 border-emerald-400 shadow-[0_0_20px_-3px_rgba(16,185,129,0.5)] z-10 scale-[1.02]"
                      : "bg-amber-950/70 border-2 border-amber-400 shadow-[0_0_20px_-3px_rgba(245,158,11,0.5)] z-10 scale-[1.02]"
                    : !isInsideAvail
                    ? "bg-obsidian-950/40 border border-emerald-500/10 opacity-40 hover:opacity-80"
                    : "bg-obsidian-900/60 border border-emerald-500/15 hover:border-emerald-500/35"
                } ${
                  isMissing ? "border-dashed border-slate-700/60 bg-slate-950/30" : ""
                }`}
              >
                {/* 1. Time Header */}
                <div className="text-center pb-2 border-b border-emerald-500/10">
                  <span
                    className={`text-xs font-mono font-bold block ${
                      isSelected ? "text-white" : isInsideAvail ? "text-emerald-200" : "text-emerald-500/60"
                    }`}
                  >
                    {hour.hour_label}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400/60 block">
                    {isInsideAvail ? "avail" : "muted"}
                  </span>
                </div>

                {/* 2. Temperature Layer (Top curve point / label) */}
                <div className="py-2.5 text-center">
                  <span className="text-[9px] font-mono text-emerald-400/60 block">TEMP</span>
                  {isMissing ? (
                    <span className="text-xs font-mono text-slate-500">N/A</span>
                  ) : (
                    <span
                      className={`text-sm font-bold font-mono block ${
                        isSelected ? "text-white" : "text-emerald-100"
                      }`}
                    >
                      {hour.apparent_temperature}°
                    </span>
                  )}
                </div>

                {/* 3. PM2.5 Bar Track (Separate lower track, NOT mixed with temperature) */}
                <div className="py-2 flex flex-col items-center justify-end h-16 border-t border-b border-emerald-500/10">
                  <span className="text-[9px] font-mono text-emerald-400/60 mb-1">PM2.5</span>
                  {isMissing ? (
                    <span className="text-[10px] text-slate-500 font-mono">--</span>
                  ) : (
                    <>
                      <div
                        style={{ height: `${pm25Height}px` }}
                        className={`w-3.5 rounded-t-sm transition-all ${
                          isSelected
                            ? isQualified
                              ? "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                              : "bg-amber-400"
                            : hour.pm2_5 && hour.pm2_5 > 60
                            ? "bg-amber-400/70"
                            : "bg-emerald-500/60"
                        }`}
                      />
                      <span className="text-[10px] font-mono text-white mt-1">
                        {hour.pm2_5}
                      </span>
                    </>
                  )}
                </div>

                {/* 4. Rain Layer (Droplets & Probability) */}
                <div className="pt-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CloudRain
                      className={`h-3 w-3 ${
                        hour.precipitation_probability > 20
                          ? "text-cyan-400"
                          : "text-emerald-500/40"
                      }`}
                    />
                    <span className="text-[10px] font-mono text-emerald-300">
                      {hour.precipitation_probability}%
                    </span>
                  </div>

                  {/* Status Indicator */}
                  {isSelected && (
                    <span
                      className={`mt-1.5 block py-0.5 px-1 rounded text-[8px] font-bold uppercase tracking-wider ${
                        isQualified
                          ? "bg-emerald-400 text-obsidian-950"
                          : "bg-amber-400 text-obsidian-950"
                      }`}
                    >
                      Selected
                    </span>
                  )}

                  {isSuspect && (
                    <span className="mt-1 block text-[8px] font-mono text-amber-400 uppercase">
                      Suspect
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-emerald-400/70 font-mono pt-1">
        <span>Temperature: thin smooth metric · PM2.5: separate lower track · Rain: probability bar</span>
        <span>Scroll horizontally to view complete 24-hour cycle →</span>
      </div>
    </div>
  );
}
