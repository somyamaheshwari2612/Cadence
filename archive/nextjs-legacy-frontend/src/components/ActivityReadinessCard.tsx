"use client";

import { useState } from "react";
import { Activity, Sparkles, Smile, Meh, Frown, ArrowRight, ShieldCheck } from "lucide-react";
import { LiveWeatherDetails } from "@/utils/apiClient";
import { calculateIndiaNaqi, calculateCpcbPm25Subindex } from "@/utils/cpcbNaqi";

interface ActivityItem {
  id: string;
  label: string;
  icon: string;
}

const ACTIVITIES: ActivityItem[] = [
  { id: "shopping", label: "Shopping", icon: "🛍️" },
  { id: "outing", label: "Outing & Walk", icon: "🌳" },
  { id: "dining", label: "Cafe & Dining", icon: "☕" },
  { id: "running", label: "Running", icon: "🏃" },
  { id: "cycling", label: "Cycling", icon: "🚴" },
  { id: "commute", label: "Commute", icon: "🚗" },
];

interface ActivityReadinessCardProps {
  weather: LiveWeatherDetails;
  onOpenPlanner?: (activity: string) => void;
}

export default function ActivityReadinessCard({
  weather,
  onOpenPlanner,
}: ActivityReadinessCardProps) {
  const [selectedActivityId, setSelectedActivityId] = useState<string>("shopping");
  const [customActivityName, setCustomActivityName] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const current = weather.current;
  const indiaNaqiResult = calculateIndiaNaqi(current.pm25);
  const naqi = indiaNaqiResult?.naqi ?? current.usAqi;
  const temp = current.temperature;

  const activeLabel = isCustomMode
    ? (customActivityName.trim() || "Custom Plan")
    : (ACTIVITIES.find((a) => a.id === selectedActivityId)?.label || "Shopping");

  // Determine readiness score based on CPCB atmospheric conditions & activity exertion
  const getReadiness = () => {
    const isStrenuous = selectedActivityId === "running" || selectedActivityId === "cycling";

    // CPCB: > 200 is Poor / Very Poor / Severe; or extreme heat
    if (naqi > 200 || temp > 40) {
      let msg = `High PM2.5 concentration & thermal strain (NAQI ${naqi}). Outdoor activity not advised.`;
      if (selectedActivityId === "shopping") {
        msg = `High pollution & thermal strain (NAQI ${naqi}). Prefer indoor enclosed malls or postpone outdoor street shopping.`;
      } else if (selectedActivityId === "outing") {
        msg = `Elevated particulate haze (NAQI ${naqi}). Outdoor outings, park walks, and picnics not advised right now.`;
      } else if (selectedActivityId === "dining") {
        msg = `Dense particulate haze (NAQI ${naqi}). Choose enclosed indoor dining over outdoor patio seating.`;
      } else if (isStrenuous) {
        msg = `High PM2.5 levels (NAQI ${naqi}). Heavy aerobic breathing and strenuous workouts outdoors not advised.`;
      }

      return {
        level: "Poor",
        color: "text-rose-400",
        bg: "bg-rose-500/10 border-rose-500/20",
        message: msg,
        icon: Frown,
      };
    }

    // CPCB: 101 - 200 is Moderate; or warm heat
    if (naqi > 100 || temp > 35) {
      let msg = "Acceptable conditions; sensitive individuals should moderate extended outdoor exposure.";
      if (selectedActivityId === "shopping") {
        msg = "Decent conditions for shopping & errands. Stay hydrated and stick to shaded lanes during peak sun.";
      } else if (selectedActivityId === "outing") {
        msg = "Fair conditions for casual strolls. Sensitive groups should avoid extended exposure under direct sun.";
      } else if (selectedActivityId === "dining") {
        msg = "Acceptable for outdoor dining. Sensitive individuals may prefer sheltered or indoor areas.";
      } else if (isStrenuous) {
        msg = "Acceptable for lighter sessions; sensitive individuals should moderate intense aerobic workouts.";
      }

      return {
        level: "Moderate",
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
        message: msg,
        icon: Meh,
      };
    }

    // CPCB: <= 100 is Good / Satisfactory
    let msg = "Crisp atmospheric quality and comfortable temperatures. Ideal for outdoor plans.";
    if (selectedActivityId === "shopping") {
      msg = "Comfortable air and pleasant temperatures. Perfect window for bazaar shopping, errands, and walking around.";
    } else if (selectedActivityId === "outing") {
      msg = "Clear skies and clean air. Outstanding window for a park outing, sight-seeing, or stroll with family.";
    } else if (selectedActivityId === "dining") {
      msg = "Fresh air and comfortable breeze. Excellent conditions for outdoor cafes, terraces, and dining.";
    } else if (isStrenuous) {
      msg = "Crisp atmospheric quality (CPCB Satisfactory/Good) and comfortable thermal index. Ideal for outdoor training.";
    }

    return {
      level: "Optimal",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      message: msg,
      icon: Smile,
    };
  };

  const readiness = getReadiness();
  const ReadinessIcon = readiness.icon;

  // Next 4 hourly slots evaluation using CPCB NAQI
  const upcomingSlots = weather.hourly.slice(0, 4).map((slot) => {
    const slotNaqi = (slot.pm25 ? calculateCpcbPm25Subindex(slot.pm25) : null) ?? (slot.usAqi ?? naqi);
    const isBad = slotNaqi > 200 || slot.temperature > 38;
    const isMod = slotNaqi > 100 || slot.temperature > 34;

    return {
      hour: slot.hourLabel,
      temp: slot.temperature,
      naqi: slotNaqi,
      status: isBad ? "poor" : isMod ? "mod" : "good",
      icon: isBad ? Frown : isMod ? Meh : Smile,
      color: isBad ? "text-rose-400" : isMod ? "text-amber-400" : "text-emerald-400",
    };
  });

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
      {/* Background radial accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="space-y-3 mb-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-100 tracking-wide">Outdoor Plan Readiness</h3>
              <p className="text-[10px] text-emerald-400/80">Real-time Environmental Assessment</p>
            </div>
          </div>
        </div>

        {/* Activity Selector Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ACTIVITIES.map((act) => {
            const isSelected = !isCustomMode && selectedActivityId === act.id;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  setSelectedActivityId(act.id);
                  setIsCustomMode(false);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1 border ${
                  isSelected
                    ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40 shadow-sm"
                    : "bg-obsidian-950/70 border-emerald-500/10 text-emerald-400/80 hover:text-emerald-200 hover:bg-emerald-950/50"
                }`}
              >
                <span>{act.icon}</span>
                <span>{act.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsCustomMode(true)}
            className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1 border ${
              isCustomMode
                ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40 shadow-sm"
                : "bg-obsidian-950/70 border-emerald-500/10 text-emerald-400/80 hover:text-emerald-200 hover:bg-emerald-950/50"
            }`}
          >
            <span>✨</span>
            <span>Custom</span>
          </button>
        </div>

        {isCustomMode && (
          <div className="pt-1">
            <input
              type="text"
              value={customActivityName}
              onChange={(e) => setCustomActivityName(e.target.value)}
              placeholder="e.g. Flea market, Photography walk, Park picnic..."
              className="input-glass w-full rounded-xl px-3 py-1.5 text-xs text-emerald-100 placeholder:text-emerald-500/50"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Main Readiness Assessment Bar */}
      <div className={`p-4 rounded-xl border ${readiness.bg} flex items-start justify-between gap-4 my-2`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold tracking-tight font-sans ${readiness.color}`}>
              {readiness.level}
            </span>
            <span className="text-[11px] text-emerald-300 font-mono">
              for {activeLabel} right now
            </span>
          </div>
          <p className="text-xs text-emerald-200/80 leading-relaxed font-light">
            {readiness.message}
          </p>
        </div>

        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${readiness.bg} ${readiness.color}`}>
          <ReadinessIcon className="h-6 w-6" />
        </div>
      </div>

      {/* Hourly Status Chips */}
      <div className="mt-4 pt-3 border-t border-emerald-500/10">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 block mb-2.5">
          Hourly Suitability for {activeLabel}
        </span>
        <div className="grid grid-cols-4 gap-2">
          {upcomingSlots.map((slot, i) => {
            const Icon = slot.icon;
            return (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-obsidian-900/90 border border-emerald-500/10 flex flex-col items-center justify-center gap-1 text-center"
              >
                <span className="text-[11px] font-mono text-emerald-300/80 font-medium">
                  {slot.hour}
                </span>
                <Icon className={`h-4 w-4 ${slot.color}`} />
                <span className="text-[10px] text-emerald-400 font-mono">
                  {slot.temp}° • NAQI {slot.naqi}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action to trigger Exposure Router */}
      {onOpenPlanner && (
        <div className="mt-4 pt-2">
          <button
            onClick={() => onOpenPlanner(activeLabel)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-obsidian-950 font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)] transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Find Safe Window for {activeLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
