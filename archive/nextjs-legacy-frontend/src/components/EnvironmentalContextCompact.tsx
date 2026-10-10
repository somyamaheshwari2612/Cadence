"use client";

import { useState } from "react";
import { LiveWeatherDetails } from "@/utils/apiClient";
import { Thermometer, Wind, Droplets, CloudRain, Sun, Eye, Gauge, Compass, ChevronDown, ChevronUp } from "lucide-react";

interface EnvironmentalContextCompactProps {
  weather: LiveWeatherDetails;
}

export default function EnvironmentalContextCompact({ weather }: EnvironmentalContextCompactProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const current = weather.current;

  // Format sunrise/sunset for runners
  const formatTimeStr = (isoStr?: string) => {
    if (!isoStr) return "--:--";
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 border border-emerald-500/20 bg-obsidian-950/70 space-y-4 shadow-lg">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-500/10">
        <div>
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
            Current Telemetry
          </span>
          <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
            Environmental Context
          </h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-400/60 uppercase">
          Modeled Now
        </span>
      </div>

      {/* Show Now: Compact 6-item Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* 1. Current modeled temperature */}
        <div className="p-3 rounded-2xl bg-obsidian-900/60 border border-emerald-500/15">
          <span className="text-[10px] font-mono uppercase text-emerald-400/70 block">
            Current Temp
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-white">{current.temperature}°</span>
            <span className="text-[11px] text-emerald-400/60 font-mono">C</span>
          </div>
        </div>

        {/* 2. Apparent temperature / feels like */}
        <div className="p-3 rounded-2xl bg-obsidian-900/60 border border-emerald-500/15">
          <span className="text-[10px] font-mono uppercase text-emerald-400/70 block">
            Feels Like
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-white">{current.apparentTemperature}°</span>
            <span className="text-[11px] text-emerald-400/60 font-mono">C</span>
          </div>
        </div>

        {/* 3. Forecast PM2.5 */}
        <div className="p-3 rounded-2xl bg-obsidian-900/60 border border-emerald-500/15">
          <span className="text-[10px] font-mono uppercase text-emerald-400/70 block">
            Forecast PM2.5
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-white">{current.pm25}</span>
            <span className="text-[10px] text-emerald-400/60 font-mono">µg/m³</span>
          </div>
        </div>

        {/* 4. Rain probability */}
        <div className="p-3 rounded-2xl bg-obsidian-900/60 border border-emerald-500/15">
          <span className="text-[10px] font-mono uppercase text-emerald-400/70 flex items-center gap-1">
            <CloudRain className="h-3 w-3 text-cyan-400" />
            <span>Rain Prob</span>
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-white">
              {weather.hourly[0]?.precipProb ?? 0}%
            </span>
          </div>
        </div>

        {/* 5. Wind speed and direction */}
        <div className="p-3 rounded-2xl bg-obsidian-900/60 border border-emerald-500/15">
          <span className="text-[10px] font-mono uppercase text-emerald-400/70 flex items-center gap-1">
            <Compass className="h-3 w-3 text-emerald-400" />
            <span>Wind</span>
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-white">{current.windSpeedKmh}</span>
            <span className="text-[10px] text-emerald-400/60 font-mono">km/h ({current.windDirectionDeg}°)</span>
          </div>
        </div>

        {/* 6. Humidity */}
        <div className="p-3 rounded-2xl bg-obsidian-900/60 border border-emerald-500/15">
          <span className="text-[10px] font-mono uppercase text-emerald-400/70 flex items-center gap-1">
            <Droplets className="h-3 w-3 text-emerald-400" />
            <span>Humidity</span>
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-white">{current.relativeHumidity}%</span>
          </div>
        </div>
      </div>

      {/* Show only if used (Collapsed by default) */}
      <div className="pt-2 border-t border-emerald-500/10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-xs font-semibold text-emerald-300 hover:text-white transition-colors cursor-pointer py-1"
        >
          <span>Additional atmospheric telemetry (UV, Sunrise, Pressure)</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isExpanded && (
          <div className="pt-3 space-y-3 animate-in fade-in duration-150">
            {/* Basic Sunrise / Sunset row for runners */}
            <div className="p-3 rounded-2xl bg-obsidian-900/70 border border-emerald-500/15 flex items-center justify-around text-xs">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-400" />
                <div>
                  <span className="text-[10px] font-mono text-emerald-400/60 block">Sunrise</span>
                  <span className="font-semibold text-white">{formatTimeStr(weather.todaySunrise)}</span>
                </div>
              </div>
              <div className="h-6 w-px bg-emerald-500/20" />
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-orange-400" />
                <div>
                  <span className="text-[10px] font-mono text-emerald-400/60 block">Sunset</span>
                  <span className="font-semibold text-white">{formatTimeStr(weather.todaySunset)}</span>
                </div>
              </div>
            </div>

            {/* UV, Visibility, Pressure, Dew Point */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-obsidian-900/50 border border-emerald-500/10">
                <span className="text-[9px] font-mono text-emerald-400/60 block uppercase">UV Index</span>
                <span className="font-mono font-bold text-white text-sm">{current.uvIndex}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-obsidian-900/50 border border-emerald-500/10">
                <span className="text-[9px] font-mono text-emerald-400/60 block uppercase">Visibility</span>
                <span className="font-mono font-bold text-white text-sm">{current.visibilityKm} km</span>
              </div>
              <div className="p-2.5 rounded-xl bg-obsidian-900/50 border border-emerald-500/10">
                <span className="text-[9px] font-mono text-emerald-400/60 block uppercase">Pressure</span>
                <span className="font-mono font-bold text-white text-sm">{current.surfacePressure} hPa</span>
              </div>
              <div className="p-2.5 rounded-xl bg-obsidian-900/50 border border-emerald-500/10">
                <span className="text-[9px] font-mono text-emerald-400/60 block uppercase">Dew Point</span>
                <span className="font-mono font-bold text-white text-sm">{current.dewPoint}°C</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
