"use client";

import { useState } from "react";
import { requestSchedule, ScheduleResponse } from "@/utils/apiClient";
import { Sparkles, RefreshCw, Thermometer, Wind, CloudRain, Clock, Calendar, Check, AlertCircle } from "lucide-react";

interface RouterFormProps {
  onScheduleCalculated: (result: ScheduleResponse, locationName: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  coords: { lat: number; lng: number };
  locationName: string;
  initialTask?: string;
}

const ACTIVITY_TYPES = [
  { id: "Walk", label: "Walk", icon: "🚶", defaultDuration: 45 },
  { id: "Run", label: "Run", icon: "🏃", defaultDuration: 30 },
  { id: "Cycling", label: "Cycling", icon: "🚴", defaultDuration: 60 },
  { id: "Commute", label: "Commute", icon: "🚗", defaultDuration: 30 },
  { id: "Custom", label: "Custom outdoor task", icon: "✨", defaultDuration: 60 },
];

const DURATION_PRESETS = [
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 45, label: "45 min" },
  { minutes: 60, label: "1 hr" },
  { minutes: 120, label: "2 hr" },
  { minutes: -1, label: "Custom" },
];

export default function RouterForm({
  onScheduleCalculated,
  isLoading,
  setIsLoading,
  coords,
  locationName,
  initialTask = "Walk",
}: RouterFormProps) {
  // Activity Selection
  const [selectedActivity, setSelectedActivity] = useState<string>(initialTask);
  const [customTaskName, setCustomTaskName] = useState<string>("");

  // Duration Selection
  const [selectedDurationPreset, setSelectedDurationPreset] = useState<number>(45);
  const [customDurationMinutes, setCustomDurationMinutes] = useState<number>(90);

  // Available Window (Start hour & End hour)
  const [startHour, setStartHour] = useState<number>(6); // 6 AM
  const [endHour, setEndHour] = useState<number>(21); // 9 PM

  // User Preferences (Never call them safe limits)
  const [maxTemp, setMaxTemp] = useState<number>(34); // °C
  const [maxPm25, setMaxPm25] = useState<number>(60); // µg/m³
  const [rainOk, setRainOk] = useState<boolean>(false);
  const [rainThreshold, setRainThreshold] = useState<number>(20); // %
  const [enableFallback, setEnableFallback] = useState<boolean>(false);

  const [formError, setFormError] = useState<string | null>(null);

  // Compute actual duration in minutes
  const activeDurationMinutes =
    selectedDurationPreset === -1
      ? Math.max(15, customDurationMinutes || 15)
      : selectedDurationPreset;

  // Active task display label
  const activeTaskName =
    selectedActivity === "Custom"
      ? (customTaskName.trim() || "Custom task")
      : selectedActivity;

  // Format 12-hour label for availability display
  const formatHourLabel = (h: number) => {
    const ampm = h < 12 ? "AM" : "PM";
    const h12 = h % 12 || 12;
    return `${h12}:00 ${ampm}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setFormError(null);

      const res = await requestSchedule({
        latitude: coords.lat,
        longitude: coords.lng,
        duration_minutes: activeDurationMinutes,
        availability_start_hour: startHour,
        availability_end_hour: endHour,
        max_temp: maxTemp,
        max_pm25: maxPm25,
        rain_ok: rainOk,
        rain_threshold: rainThreshold,
        enable_fallback: enableFallback,
        task_name: activeTaskName,
      });

      onScheduleCalculated(res, locationName);
    } catch (err: any) {
      setFormError(err.message || "Failed to calculate window");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel rounded-3xl p-6 sm:p-8 space-y-7 border border-emerald-500/25 bg-obsidian-950/80 shadow-2xl relative overflow-hidden"
    >
      {/* Subtle emerald atmospheric background tint */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-emerald-500/15">
        <div>
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
            Exposure Router
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
            Activity Planner
          </h2>
        </div>
        <div className="text-xs text-emerald-400/80 font-mono">
          Route your schedule by personal preference
        </div>
      </div>

      {/* Control 1: Activity Type */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-emerald-200 uppercase tracking-wider flex items-center justify-between">
          <span>Activity type</span>
          <span className="text-[11px] text-emerald-400/70 lowercase font-normal">
            currently: {activeTaskName}
          </span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {ACTIVITY_TYPES.map((act) => {
            const isSelected = selectedActivity === act.id;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  setSelectedActivity(act.id);
                  if (act.defaultDuration && selectedDurationPreset !== -1) {
                    setSelectedDurationPreset(act.defaultDuration);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                    : "bg-obsidian-900/60 border-emerald-500/15 text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-950/40"
                }`}
              >
                <span className="text-lg">{act.icon}</span>
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>

        {selectedActivity === "Custom" && (
          <div className="pt-2 animate-in fade-in duration-200">
            <input
              type="text"
              value={customTaskName}
              onChange={(e) => setCustomTaskName(e.target.value)}
              placeholder="e.g. Shopping, Gardening, Photography, Market run..."
              className="w-full rounded-xl bg-obsidian-900 border border-emerald-500/30 px-4 py-2.5 text-xs text-white placeholder-emerald-500/40 focus:outline-none focus:border-emerald-400"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Control 2: Duration */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-emerald-200 uppercase tracking-wider flex items-center justify-between">
          <span>Duration</span>
          <span className="text-[11px] text-emerald-400/70 lowercase font-normal">
            {activeDurationMinutes < 60
              ? `${activeDurationMinutes} minutes`
              : activeDurationMinutes % 60 === 0
              ? `${activeDurationMinutes / 60} hour(s)`
              : `${activeDurationMinutes} minutes`}
          </span>
        </label>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {DURATION_PRESETS.map((d) => {
            const isSelected = selectedDurationPreset === d.minutes;
            return (
              <button
                key={d.label}
                type="button"
                onClick={() => setSelectedDurationPreset(d.minutes)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                  isSelected
                    ? "bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)]"
                    : "bg-obsidian-900/60 border-emerald-500/15 text-emerald-300 hover:border-emerald-500/40"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>

        {selectedDurationPreset === -1 && (
          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs text-emerald-300">Custom minutes:</span>
            <input
              type="number"
              min={15}
              max={480}
              step={15}
              value={customDurationMinutes}
              onChange={(e) => setCustomDurationMinutes(parseInt(e.target.value) || 15)}
              className="w-28 rounded-xl bg-obsidian-900 border border-emerald-500/30 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
          </div>
        )}
      </div>

      {/* Control 3: Available Window */}
      <div className="space-y-3 p-4 rounded-2xl bg-obsidian-900/60 border border-emerald-500/15">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <span>Available window</span>
          </label>
          <span className="text-xs font-mono font-semibold text-emerald-300">
            Today · {formatHourLabel(startHour)}–{formatHourLabel(endHour)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-emerald-400/80">
              <span>Earliest start</span>
              <span className="font-mono text-white">{formatHourLabel(startHour)}</span>
            </div>
            <input
              type="range"
              min={4}
              max={endHour - 1}
              value={startHour}
              onChange={(e) => setStartHour(parseInt(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-emerald-400/80">
              <span>Latest finish</span>
              <span className="font-mono text-white">{formatHourLabel(endHour)}</span>
            </div>
            <input
              type="range"
              min={startHour + 1}
              max={23}
              value={endHour}
              onChange={(e) => setEndHour(parseInt(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Controls 4, 5, 6: Preferences (Temperature, PM2.5, Rain) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
            Your Preferences
          </span>
          <span className="text-[11px] text-emerald-500/70 italic">
            Not medical or safety limits; purely your preferred thresholds
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Temperature Preference */}
          <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-emerald-500/15 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-200 flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5 text-emerald-400" />
                <span>Max Apparent Temp</span>
              </span>
              <span className="font-mono font-bold text-white text-sm">{maxTemp}°C</span>
            </div>
            <input
              type="range"
              min={20}
              max={45}
              value={maxTemp}
              onChange={(e) => setMaxTemp(parseInt(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <p className="text-[10px] text-emerald-400/60">
              Maximum comfortable feels-like temperature.
            </p>
          </div>

          {/* PM2.5 Concentration Preference */}
          <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-emerald-500/15 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-200 flex items-center gap-1">
                <Wind className="h-3.5 w-3.5 text-emerald-400" />
                <span>PM2.5 Preference</span>
              </span>
              <span className="font-mono font-bold text-white text-sm">{maxPm25} µg/m³</span>
            </div>
            <input
              type="range"
              min={15}
              max={250}
              step={5}
              value={maxPm25}
              onChange={(e) => setMaxPm25(parseInt(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <p className="text-[10px] text-emerald-400/60">
              µg/m³ particulate target. Model provider also reports U.S.-scale index.
            </p>
          </div>

          {/* Rain Preference */}
          <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-emerald-500/15 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-200 flex items-center gap-1">
                <CloudRain className="h-3.5 w-3.5 text-emerald-400" />
                <span>Rain Preference</span>
              </span>
              <button
                type="button"
                onClick={() => setRainOk(!rainOk)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                  rainOk
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-obsidian-950 border-emerald-500/20 text-emerald-400/60"
                }`}
              >
                {rainOk ? "Rain Acceptable" : "Avoid Rain"}
              </button>
            </div>

            {!rainOk ? (
              <>
                <div className="flex justify-between text-[11px] text-emerald-300/80">
                  <span>Acceptable probability:</span>
                  <span className="font-mono text-white">{rainThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={rainThreshold}
                  onChange={(e) => setRainThreshold(parseInt(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </>
            ) : (
              <p className="text-[10px] text-emerald-400/60 pt-2">
                Precipitation will not exclude forecast candidate slots.
              </p>
            )}
          </div>
        </div>
      </div>

      {formError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main Action: Find a better window */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-obsidian-950 font-bold text-base sm:text-lg transition-all shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_-2px_rgba(16,185,129,0.6)] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Scanning atmospheric forecast hours...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              <span>Find a better window</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
