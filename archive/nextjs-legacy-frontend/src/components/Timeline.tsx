"use client";

import { ScheduleResponse, ScheduledBlock } from "@/utils/apiClient";
import { CheckCircle2, AlertTriangle, Info, Clock, Thermometer, Wind, Droplets, Sparkles, ShieldAlert, ArrowRight } from "lucide-react";

interface TimelineProps {
  scheduleData: ScheduleResponse | null;
  locationName: string;
  onEnableFallbackAndRetry?: () => void;
}

export default function Timeline({ scheduleData, locationName, onEnableFallbackAndRetry }: TimelineProps) {
  if (!scheduleData) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-emerald-500/20 flex flex-col items-center justify-center min-h-[300px]">
        <div className="h-12 w-12 rounded-2xl bg-obsidian-950 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-sm">
          <Clock className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-emerald-100">Ready to find your window?</h3>
        <p className="text-xs text-emerald-400/80 max-w-sm mt-1 leading-relaxed">
          Tell us what you're looking for above, and we'll find the perfect time for you to step outside.
        </p>
      </div>
    );
  }

  // 1. Case: Data-Quality Issue (Missing / Stale Data)
  if (scheduleData.status === "unable_to_compare") {
    return (
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border-rose-500/30 space-y-4">
        <div className="flex items-center gap-2.5 text-rose-400">
          <ShieldAlert className="h-5 w-5" />
          <h3 className="text-sm font-semibold">Missing Forecast Data</h3>
        </div>
        <p className="text-xs text-emerald-200 leading-relaxed">
          {scheduleData.reason || "We couldn't find complete forecast data for this location today."}
        </p>
        <span className="text-[11px] text-emerald-400/70 block">
          We need complete data to find your window safely.
        </span>
      </div>
    );
  }

  // 2. Case: No slots meet preferences & fallback was OFF
  if (scheduleData.status === "no_suitable_slots") {
    return (
      <div className="glass-panel-warning rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              No clear windows for {scheduleData.task_name || "your plans"} today
            </h3>
            <p className="text-xs text-amber-200/90 mt-1">
              All available times in <strong className="text-white">{locationName}</strong> are outside your comfort zone for {scheduleData.task_name ? `your ${scheduleData.task_name}` : "this activity"}.
            </p>
          </div>
        </div>

        {/* General Exposure Reduction Options */}
        <div className="space-y-2 pt-2 border-t border-amber-500/15">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 block">
            Consider these alternatives
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {scheduleData.general_exposure_reduction_options?.map((opt) => (
              <div key={opt.action} className="p-3 rounded-xl bg-obsidian-950/80 border border-amber-500/15 space-y-1">
                <span className="font-semibold text-amber-200 block">{opt.title}</span>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">{opt.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Opt-in Call to Action */}
        {onEnableFallbackAndRetry && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-obsidian-950 border border-amber-500/20">
            <div className="text-xs text-amber-300/80">
              If you absolutely must go outside, we can show you the best available option, even if it's not perfect.
            </div>
            <button
              onClick={onEnableFallbackAndRetry}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>Show me anyway</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. Either Preference-Qualified OR Best Available Alternative Block
  const block: ScheduledBlock | undefined = scheduleData.recommendation || scheduleData.alternative;
  const isQualified = scheduleData.status === "success";

  if (!block) return null;

  return (
    <div
      className={`rounded-2xl p-6 sm:p-8 space-y-6 transition-all ${
        isQualified ? "glass-panel-glow" : "glass-panel-warning"
      }`}
    >
      {/* Outcome Badge Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-500/15">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs uppercase font-mono font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                isQualified
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                  : "bg-amber-500/15 border-amber-500/40 text-amber-300"
              }`}
            >
              {isQualified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {block.outcome_label || (isQualified ? "Perfect window found" : "Outside your comfort zone")}
            </span>
            <span className="text-xs text-emerald-400">in {locationName}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap my-1">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {block.start_time} — {block.end_time}
            </h3>
            {(scheduleData.task_name || block.task_name) && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 flex items-center gap-1 shadow-sm">
                <span>🎯</span>
                <span>{scheduleData.task_name || block.task_name}</span>
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-emerald-400/80">
            UTC: {block.start_time_utc} → {block.end_time_utc} ({block.duration_hours}h)
          </span>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[10px] uppercase font-mono text-emerald-400 block">Cadence Score</span>
          <span className="text-lg font-bold font-mono text-emerald-300">{block.experimental_product_score}</span>
        </div>
      </div>

      {/* Exceeded limits list if fallback */}
      {!isQualified && block.preference_violations && block.preference_violations.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/20 space-y-2">
          <span className="text-xs font-semibold text-amber-300 block">
            Why this isn't perfect:
          </span>
          <ul className="space-y-1 text-xs text-amber-200/90">
            {block.preference_violations.map((v, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                <span>
                  <strong>{v.description}</strong> (Excess: +{v.excess}{v.unit})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid of Key Underlying Environmental Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-obsidian-950/80 border border-emerald-500/10 space-y-1">
          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
            <Thermometer className="h-3.5 w-3.5 text-amber-400" />
            Mean Apparent Temp
          </span>
          <p className="text-lg font-bold text-white">{block.mean_apparent_temperature}°C</p>
        </div>

        <div className="p-3.5 rounded-xl bg-obsidian-950/80 border border-emerald-500/10 space-y-1">
          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
            <Wind className="h-3.5 w-3.5 text-emerald-400" />
            U.S. Index Scale AQI
          </span>
          <p className="text-lg font-bold text-white">
            {block.mean_forecast_us_aqi}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-obsidian-950/80 border border-emerald-500/10 space-y-1">
          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
            <Info className="h-3.5 w-3.5 text-emerald-400" />
            Mean PM2.5
          </span>
          <p className="text-lg font-bold text-white">{block.mean_pm25} µg/m³</p>
        </div>

        <div className="p-3.5 rounded-xl bg-obsidian-950/80 border border-emerald-500/10 space-y-1">
          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
            <Droplets className="h-3.5 w-3.5 text-emerald-300" />
            Max Precipitation
          </span>
          <p className="text-lg font-bold text-white">{block.max_precipitation_probability}%</p>
        </div>
      </div>

      {/* Deterministic String Explanation */}
      {block.human_explanation && (
        <div className="p-4 rounded-xl bg-obsidian-950/90 border border-emerald-500/20 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Why this window?</span>
          </div>
          <p className="text-xs text-emerald-100 leading-relaxed italic">
            &ldquo;{block.human_explanation}&rdquo;
          </p>
        </div>
      )}

      {/* Hourly Breakdown Chips */}
      {block.hourly_forecast_breakdown && block.hourly_forecast_breakdown.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-emerald-500/10">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Hourly Breakdown
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {block.hourly_forecast_breakdown.map((h, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-obsidian-950/80 border border-emerald-500/10 text-[11px] space-y-0.5">
                <span className="font-mono text-emerald-400 block truncate">{h.time}</span>
                <div className="flex justify-between text-emerald-200">
                  <span>PM2.5: {h.pm2_5_ug_m3}</span>
                  <span>{h.apparent_temperature}°C</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mandatory Model & Medical Caveat */}
      <div className="pt-2 text-[11px] text-emerald-400/80 border-t border-emerald-500/10 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
        <span>
          {scheduleData.model_caveat || "Forecasts are uncertain; this is not a safety or medical recommendation."}
          {" "}Consult the Central Pollution Control Board (CPCB) for official Indian ambient station bulletins.
        </span>
      </div>
    </div>
  );
}
