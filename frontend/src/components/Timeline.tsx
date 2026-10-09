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
      <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-white/10 flex flex-col items-center justify-center min-h-[360px]">
        <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 mb-4">
          <Clock className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-300">No Routing Requested Yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Configure your activity constraints on the left and run the deterministic scheduler to inspect forecast windows.
        </p>
      </div>
    );
  }

  // 1. Case: Data-Quality Issue (Missing / Stale Data)
  if (scheduleData.status === "unable_to_compare") {
    return (
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border-rose-500/20 space-y-4">
        <div className="flex items-center gap-2.5 text-rose-400">
          <ShieldAlert className="h-5 w-5" />
          <h3 className="text-sm font-semibold">Unable to compare slots with available forecast data</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {scheduleData.reason || "Missing, stale, or discontinuous forecast data prevented valid candidate block formation."}
        </p>
        <span className="text-[11px] text-slate-500 block">
          The engine refrains from ranking or fabricating candidate slots when upstream records are incomplete.
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
            <h3 className="text-base font-semibold text-white">No time slot meets your stated preferences today</h3>
            <p className="text-xs text-slate-300 mt-1">
              All available forecast windows in <strong className="text-white">{locationName}</strong> exceed your temperature, AQI, or precipitation thresholds.
            </p>
          </div>
        </div>

        {/* General Exposure Reduction Options */}
        <div className="space-y-2 pt-2 border-t border-amber-500/15">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 block">
            General Exposure-Reduction Choices (EPA-Grounded)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {scheduleData.general_exposure_reduction_options?.map((opt) => (
              <div key={opt.action} className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <span className="font-semibold text-slate-200 block">{opt.title}</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">{opt.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Opt-in Call to Action */}
        {onEnableFallbackAndRetry && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <div className="text-xs text-slate-400">
              Must this task happen outdoors? You can opt in to inspect the lowest-ranked available alternative.
            </div>
            <button
              onClick={onEnableFallbackAndRetry}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all"
            >
              <span>View Lowest-Ranked Slot</span>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs uppercase font-mono font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                isQualified
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
            >
              {isQualified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {block.outcome_label || (isQualified ? "meets your preferences" : "outside your preferences—not assessed as safe")}
            </span>
            <span className="text-xs text-slate-400">in {locationName}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {block.start_time} — {block.end_time}
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            UTC: {block.start_time_utc} → {block.end_time_utc} ({block.duration_hours}h)
          </span>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Experimental Score</span>
          <span className="text-lg font-bold font-mono text-white">{block.experimental_product_score}</span>
        </div>
      </div>

      {/* Exceeded limits list if fallback */}
      {!isQualified && block.preference_violations && block.preference_violations.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/20 space-y-2">
          <span className="text-xs font-semibold text-amber-300 block">
            Exceeded User Preference Limits:
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
        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Thermometer className="h-3.5 w-3.5 text-amber-400" />
            Mean Apparent Temp
          </span>
          <p className="text-lg font-bold text-white">{block.mean_apparent_temperature}°C</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Wind className="h-3.5 w-3.5 text-emerald-400" />
            Mean Forecast U.S. AQI
          </span>
          <p className="text-lg font-bold text-white">
            {block.mean_forecast_us_aqi}{" "}
            <span className="text-[11px] font-normal text-slate-400">(Peak: {block.max_forecast_us_aqi})</span>
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Info className="h-3.5 w-3.5 text-cyan-400" />
            Mean PM2.5
          </span>
          <p className="text-lg font-bold text-white">{block.mean_pm25} µg/m³</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
            <Droplets className="h-3.5 w-3.5 text-blue-400" />
            Max Precipitation
          </span>
          <p className="text-lg font-bold text-white">{block.max_precipitation_probability}%</p>
        </div>
      </div>

      {/* Gemini Flash-Lite Natural Language Explanation */}
      {block.human_explanation && (
        <div className="p-4 rounded-xl bg-slate-900/70 border border-emerald-500/20 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Gemini Flash-Lite Contextual Explanation</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed italic">
            &ldquo;{block.human_explanation}&rdquo;
          </p>
        </div>
      )}

      {/* Hourly Breakdown Chips */}
      {block.hourly_forecast_breakdown && block.hourly_forecast_breakdown.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Underlying Hourly Forecast Points
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {block.hourly_forecast_breakdown.map((h, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 text-[11px] space-y-0.5">
                <span className="font-mono text-slate-400 block truncate">{h.time}</span>
                <div className="flex justify-between text-slate-200">
                  <span>AQI: {h.forecast_us_aqi}</span>
                  <span>{h.apparent_temperature}°C</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mandatory Model & Medical Caveat */}
      <div className="pt-2 text-[11px] text-slate-500 border-t border-white/5 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span>
          {scheduleData.model_caveat || "Forecasts are uncertain; this is not a safety or medical recommendation."}
          {" "}Consult the Central Pollution Control Board (CPCB) for official Indian ambient station bulletins.
        </span>
      </div>
    </div>
  );
}
