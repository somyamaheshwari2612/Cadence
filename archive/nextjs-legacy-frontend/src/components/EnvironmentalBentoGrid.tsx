"use client";

import { useMemo } from "react";
import { LiveWeatherDetails } from "@/utils/apiClient";
import { Sun, Droplets, Wind, Gauge, Eye, Thermometer, Compass } from "lucide-react";

interface EnvironmentalBentoGridProps {
  weather: LiveWeatherDetails;
}

export default function EnvironmentalBentoGrid({ weather }: EnvironmentalBentoGridProps) {
  const current = weather.current;

  // UV interpretation
  const uvRating = useMemo(() => {
    const uv = current.uvIndex;
    if (uv <= 2) return { label: "Low", desc: "Minimal sun hazard rest of day", pct: (uv / 11) * 100 };
    if (uv <= 5) return { label: "Moderate", desc: "Take precautions around midday", pct: (uv / 11) * 100 };
    if (uv <= 7) return { label: "High", desc: "Protection required; seek shade", pct: (uv / 11) * 100 };
    if (uv <= 10) return { label: "Very High", desc: "Extra protection needed", pct: (uv / 11) * 100 };
    return { label: "Extreme", desc: "Avoid peak outdoor sun exposure", pct: 100 };
  }, [current.uvIndex]);

  // Humidity & Dew Point comfort assessment
  const humidityNote = useMemo(() => {
    const h = current.relativeHumidity;
    if (h < 30) return "Dry air; stay hydrated";
    if (h <= 60) return "Optimal respiratory comfort";
    return "Similar to yesterday; elevated moisture";
  }, [current.relativeHumidity]);

  const dewPointNote = useMemo(() => {
    const dp = current.dewPoint;
    if (dp < 10) return "Crisp and dry air";
    if (dp <= 16) return "Comfortable and pleasant";
    if (dp <= 21) return "It feels muggy and humid";
    return "Muggy and oppressive moisture";
  }, [current.dewPoint]);

  // Wind speed description
  const windDescription = useMemo(() => {
    const speed = current.windSpeedKmh;
    if (speed < 5) return "Calm and still air";
    if (speed < 15) return "There is a light breeze";
    if (speed < 28) return "Moderate steady airflow";
    return "Strong gusts present";
  }, [current.windSpeedKmh]);

  // Atmospheric Pressure trend
  const pressureNote = useMemo(() => {
    const p = current.surfacePressure;
    if (p > 1013) return "High pressure • Stable conditions";
    if (p > 1005) return "Normal pressure • Currently steady";
    return "Low pressure • Active front expected";
  }, [current.surfacePressure]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
      {/* 1. UV Index Card */}
      <div className="glass-panel rounded-2xl p-5 space-y-3 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
        <div className="flex items-center justify-between text-xs text-emerald-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Sun className="h-4 w-4 text-emerald-300" />
            <span>UV Index</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono">Rest of day</span>
        </div>

        <div>
          <span className="text-2xl font-bold text-white font-sans">{uvRating.label}</span>
          <span className="text-xs text-emerald-400 font-mono ml-2">({current.uvIndex} / 11)</span>
          <p className="text-[11px] text-emerald-400/90 mt-1">{uvRating.desc}</p>
        </div>

        {/* Gradient Bar with Indicator Needle */}
        <div className="pt-2">
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-emerald-500 via-lime-400 to-amber-500 relative">
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3.5 w-1.5 bg-white rounded-full shadow-md border border-obsidian-950 transition-all duration-500"
              style={{ left: `${Math.min(96, Math.max(4, uvRating.pct))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Humidity Card */}
      <div className="glass-panel rounded-2xl p-5 space-y-3 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
        <div className="flex items-center justify-between text-xs text-emerald-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Droplets className="h-4 w-4 text-emerald-300" />
            <span>Humidity</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono">Real-time</span>
        </div>

        <div>
          <span className="text-3xl font-bold text-white font-mono">{current.relativeHumidity}%</span>
          <p className="text-[11px] text-emerald-400/90 mt-1">{humidityNote}</p>
        </div>

        <div className="pt-2">
          <div className="h-2 w-full rounded-full bg-obsidian-950 border border-emerald-500/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${current.relativeHumidity}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Wind Card with Compass Dial */}
      <div className="glass-panel rounded-2xl p-5 space-y-3 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
        <div className="flex items-center justify-between text-xs text-emerald-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Wind className="h-4 w-4 text-emerald-300" />
            <span>Wind & Direction</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono">{current.windDirectionDeg}° N</span>
        </div>

        <p className="text-[11px] text-emerald-400/90">{windDescription}</p>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-3xl font-bold text-white font-mono">{current.windSpeedKmh}</span>
            <span className="text-xs text-emerald-400 ml-1.5 font-mono">km/h</span>
          </div>

          {/* Compass Dial with Rotating Arrow */}
          <div className="h-12 w-12 rounded-full border border-emerald-500/30 bg-obsidian-950 relative flex items-center justify-center">
            <span className="absolute top-1 text-[8px] font-mono text-emerald-500 font-bold">N</span>
            <div
              className="transition-transform duration-700 ease-out flex items-center justify-center"
              style={{ transform: `rotate(${current.windDirectionDeg}deg)` }}
            >
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[14px] border-b-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Dew Point Card */}
      <div className="glass-panel rounded-2xl p-5 space-y-3 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
        <div className="flex items-center justify-between text-xs text-emerald-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Thermometer className="h-4 w-4 text-emerald-300" />
            <span>Dew Point</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono">Vapor Saturation</span>
        </div>

        <div>
          <span className="text-3xl font-bold text-white font-mono">{current.dewPoint}°</span>
          <p className="text-[11px] text-emerald-400/90 mt-1">{dewPointNote}</p>
        </div>

        <div className="pt-2 text-[10px] text-emerald-400/80">
          Air temperature: {current.temperature}°C • Delta: {Math.abs(current.temperature - current.dewPoint)}°C
        </div>
      </div>

      {/* 5. Atmospheric Pressure Card */}
      <div className="glass-panel rounded-2xl p-5 space-y-3 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
        <div className="flex items-center justify-between text-xs text-emerald-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Gauge className="h-4 w-4 text-emerald-300" />
            <span>Atmospheric Pressure</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono">Surface</span>
        </div>

        <div>
          <span className="text-3xl font-bold text-white font-mono">{current.surfacePressure}</span>
          <span className="text-xs text-emerald-400 ml-1.5 font-mono">mb</span>
          <p className="text-[11px] text-emerald-400/90 mt-1">{pressureNote}</p>
        </div>

        <div className="pt-2">
          {/* Circular arc gauge simulation */}
          <div className="h-2 w-full rounded-full bg-obsidian-950 border border-emerald-500/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-lime-400 rounded-full"
              style={{ width: `${Math.min(100, Math.max(10, ((current.surfacePressure - 980) / 50) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 6. Visibility Card */}
      <div className="glass-panel rounded-2xl p-5 space-y-3 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
        <div className="flex items-center justify-between text-xs text-emerald-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Eye className="h-4 w-4 text-emerald-300" />
            <span>Visibility</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono">Atmospheric Line</span>
        </div>

        <div>
          <span className="text-3xl font-bold text-white font-mono">{current.visibilityKm.toFixed(2)}</span>
          <span className="text-xs text-emerald-400 ml-1.5 font-mono">km</span>
          <p className="text-[11px] text-emerald-400/90 mt-1">
            {current.visibilityKm >= 10 ? "Clear horizon • Unobstructed view" : current.visibilityKm >= 5 ? "Good right now • Mild particulate haze" : "Reduced visibility • Inversion fog"}
          </p>
        </div>

        <div className="pt-2 text-[10px] text-emerald-400/80 flex items-center justify-between">
          <span>Max Range: 15.00 km</span>
          <span className="text-emerald-300 font-mono">{Math.round((current.visibilityKm / 15) * 100)}% Clarity</span>
        </div>
      </div>
    </div>
  );
}
