"use client";

import { useState } from "react";
import { ScheduleResponse, ScheduledBlock } from "@/utils/apiClient";
import { CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight, HelpCircle, ChevronDown, ChevronUp, SlidersHorizontal, Sparkles } from "lucide-react";

interface RecommendationCardProps {
  scheduleData: ScheduleResponse | null;
  locationName: string;
  onEnableFallback: () => void;
  onEditPreferences: () => void;
}

export default function RecommendationCard({
  scheduleData,
  locationName,
  onEnableFallback,
  onEditPreferences,
}: RecommendationCardProps) {
  const [isWhyDrawerOpen, setIsWhyDrawerOpen] = useState(false);

  // Initial Empty State (Before search)
  if (!scheduleData) {
    return (
      <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center border-2 border-dashed border-emerald-500/20 bg-obsidian-950/60 flex flex-col items-center justify-center min-h-[340px] space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]">
          <Sparkles className="h-8 w-8" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h3 className="text-xl font-bold text-white tracking-tight">
            Find Your Window
          </h3>
          <p className="text-xs text-emerald-300/80 leading-relaxed font-light">
            Set your duration and preferences above, then tap <strong className="text-emerald-300">Find a better window</strong> to discover the most favorable atmospheric slot for your outdoor task.
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 4: Cannot-compare state ("UNABLE TO COMPARE TIME SLOTS")
  // -------------------------------------------------------------
  if (scheduleData.status === "unable_to_compare") {
    return (
      <div className="rounded-3xl p-8 sm:p-10 border border-slate-700/60 bg-obsidian-950/90 shadow-2xl space-y-5">
        <div className="flex items-center gap-3 text-slate-300">
          <ShieldAlert className="h-6 w-6 text-slate-400" />
          <h2 className="text-lg sm:text-xl font-bold tracking-wide font-mono uppercase">
            UNABLE TO COMPARE TIME SLOTS
          </h2>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed max-w-2xl font-light">
          {scheduleData.reason ||
            "Forecast data are incomplete or unavailable for the requested duration. Try again later or choose a different time window."}
        </p>

        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/40 text-xs text-slate-400">
          Missing or suspect data does not imply an unfavorable environment. We require complete, contiguous telemetry to rank windows fairly.
        </div>

        <div className="pt-2">
          <button
            onClick={onEditPreferences}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-600 transition-colors"
          >
            Choose a different time window
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 2: No qualifying slot state ("NO SLOT MEETS YOUR PREFERENCES TODAY")
  // -------------------------------------------------------------
  if (scheduleData.status === "no_suitable_slots") {
    const taskTitle = scheduleData.task_name ? scheduleData.task_name.toUpperCase() : "TASK";

    return (
      <div className="rounded-3xl p-8 sm:p-10 border-2 border-amber-500/30 bg-obsidian-950/90 shadow-2xl space-y-6">
        <div className="flex items-center gap-2.5 text-amber-400">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider">
            Threshold Evaluation
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            NO SLOT MEETS YOUR PREFERENCES TODAY
          </h2>
          <p className="text-sm text-amber-200/90 leading-relaxed max-w-xl font-light">
            {scheduleData.description ||
              "No continuous period within your selected time range met every preference."}
          </p>
        </div>

        {/* Action buttons: [View outside-preference alternatives] and [Edit preferences] */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={onEnableFallback}
            className="px-6 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <span>View outside-preference alternatives</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onEditPreferences}
            className="px-5 py-3 rounded-2xl bg-obsidian-900 hover:bg-obsidian-850 text-emerald-300 border border-emerald-500/25 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Edit preferences</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 1 & STATE 3: Qualifying Option vs Opt-in Alternative
  // -------------------------------------------------------------
  const isQualified = scheduleData.status === "success";
  const block: ScheduledBlock | undefined = isQualified
    ? scheduleData.recommendation
    : scheduleData.alternative;

  if (!block) return null;

  const taskTitle = (block.task_name || scheduleData.task_name || "WALK").toUpperCase();
  const displayWindow = block.display_window || `${block.start_time}–${block.end_time}`;
  const whyBullets = isQualified ? block.why_this_window : block.why_this_alternative;

  // -------------------------------------------------------------
  // STATE 3: Opt-in alternative state ("OUTSIDE YOUR PREFERENCES")
  // Color: AMBER / MUTED COPPER. Never green, never styled as success!
  // -------------------------------------------------------------
  if (!isQualified) {
    const topViolation = block.preference_violations?.[0];

    return (
      <div className="rounded-3xl p-8 sm:p-10 border-2 border-amber-500/40 bg-gradient-to-b from-amber-950/25 to-obsidian-950/95 shadow-2xl space-y-6">
        {/* Top Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-wider font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>OUTSIDE YOUR PREFERENCES</span>
          </div>
          <div className="text-xs text-amber-300/70">
            Lowest-ranked available window:
          </div>
        </div>

        {/* Big window header */}
        <div className="space-y-1">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {displayWindow}
          </h2>
          <span className="text-xs text-amber-400/80 font-mono">
            Location: {locationName}
          </span>
        </div>

        {/* Excess Metrics Comparison */}
        {topViolation && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 space-y-1">
            <span className="text-xs font-semibold text-amber-200 block uppercase tracking-wider">
              Exceeds {topViolation.label} preference
            </span>
            <div className="text-sm font-mono text-amber-300">
              Forecast: <strong className="text-white">{topViolation.forecast_value}{topViolation.unit}</strong> · Your preference: {topViolation.limit}{topViolation.unit}
            </div>
            <p className="text-[11px] text-amber-400/70 pt-0.5">
              Exceeds preference by +{topViolation.excess} {topViolation.unit}.
            </p>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-obsidian-950/80 border border-amber-500/20">
          <div>
            <span className="text-[10px] uppercase font-mono text-amber-400/70 block">PM2.5 forecast</span>
            <span className="text-base sm:text-xl font-bold font-mono text-white">{block.mean_pm25} µg/m³</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-amber-400/70 block">Apparent temp</span>
            <span className="text-base sm:text-xl font-bold font-mono text-white">{block.mean_apparent_temperature}°C</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-amber-400/70 block">Rain prob</span>
            <span className="text-base sm:text-xl font-bold font-mono text-white">{block.max_precipitation_probability}%</span>
          </div>
        </div>

        {/* Explainability Accordion: "Why this alternative?" */}
        {whyBullets && whyBullets.length > 0 && (
          <div className="border-t border-amber-500/15 pt-4">
            <button
              onClick={() => setIsWhyDrawerOpen(!isWhyDrawerOpen)}
              className="flex items-center justify-between w-full text-xs font-semibold text-amber-300 hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-amber-400" />
                <span>Why this alternative?</span>
              </span>
              {isWhyDrawerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isWhyDrawerOpen && (
              <ul className="mt-3 space-y-1.5 text-xs text-amber-200/90 pl-5 list-disc animate-in fade-in duration-150">
                {whyBullets.map((bullet, i) => (
                  <li key={i} className="leading-relaxed font-light">
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[11px] text-amber-400/70 leading-relaxed italic border-t border-amber-500/15 pt-3">
          Forecasts are uncertain; this is not a safety or medical recommendation.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATE 1: Preference-Qualified state ("BEST WINDOW FOR YOUR WALK")
  // Color: EMERALD / GREEN GLOW
  // -------------------------------------------------------------
  return (
    <div className="rounded-3xl p-8 sm:p-10 border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 via-obsidian-950/90 to-obsidian-950/95 shadow-[0_0_50px_-10px_rgba(16,185,129,0.25)] space-y-7 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 block">
            BEST WINDOW FOR YOUR {taskTitle}
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {displayWindow}
          </h2>
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-semibold text-xs shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Meets your preferences</span>
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-obsidian-950/90 border border-emerald-500/20">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase text-emerald-400/80 block">
            PM2.5 forecast
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {block.mean_pm25}
            </span>
            <span className="text-xs text-emerald-400/70 font-mono">µg/m³</span>
          </div>
        </div>

        <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-emerald-500/15 pt-3 sm:pt-0 sm:pl-4">
          <span className="text-[11px] font-mono uppercase text-emerald-400/80 block">
            Apparent temperature
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {block.mean_apparent_temperature}
            </span>
            <span className="text-xs text-emerald-400/70 font-mono">°C</span>
          </div>
        </div>

        <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-emerald-500/15 pt-3 sm:pt-0 sm:pl-4">
          <span className="text-[11px] font-mono uppercase text-emerald-400/80 block">
            Rain probability
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
              {block.max_precipitation_probability}
            </span>
            <span className="text-xs text-emerald-400/70 font-mono">%</span>
          </div>
        </div>
      </div>

      {/* Chosen Rationale Copy */}
      <div className="text-sm text-emerald-200/90 leading-relaxed font-light">
        {block.chosen_rationale ||
          `Chosen because it is the lowest-ranked available continuous ${
            block.duration_desc || "scheduled"
          } block within your preferences.`}
      </div>

      {/* Explainability Accordion: "Why this window?" */}
      {whyBullets && whyBullets.length > 0 && (
        <div className="border-t border-emerald-500/15 pt-4">
          <button
            onClick={() => setIsWhyDrawerOpen(!isWhyDrawerOpen)}
            className="flex items-center justify-between w-full text-xs font-semibold text-emerald-300 hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-emerald-400" />
              <span>Why this window?</span>
            </span>
            {isWhyDrawerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {isWhyDrawerOpen && (
            <ul className="mt-3 space-y-1.5 text-xs text-emerald-200/90 pl-5 list-disc animate-in fade-in duration-150">
              {whyBullets.map((bullet, i) => (
                <li key={i} className="leading-relaxed font-light">
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
