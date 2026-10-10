"use client";

import { useMemo } from "react";
import { calculateLunarTimes, calculateSolarArc, formatTime } from "@/utils/astronomy";
import { Sunrise, Sunset, Moon, Sparkles, Compass, Clock, Info } from "lucide-react";

interface SunMoonCardProps {
  latitude: number;
  longitude: number;
  sunriseIso?: string;
  sunsetIso?: string;
  locationName?: string;
}

export default function SunMoonCard({
  latitude,
  longitude,
  sunriseIso,
  sunsetIso,
  locationName = "Current Location",
}: SunMoonCardProps) {
  // Compute astronomical details dynamically
  const now = useMemo(() => new Date(), []);

  // Solar Arc Calculations
  const solar = useMemo(() => {
    return calculateSolarArc(now, sunriseIso, sunsetIso, latitude, longitude);
  }, [now, sunriseIso, sunsetIso, latitude, longitude]);

  // Lunar Calculations with the 3-Step Shifting Window from moon.txt
  const lunar = useMemo(() => {
    return calculateLunarTimes(now, latitude, longitude);
  }, [now, latitude, longitude]);

  // Coordinates for parabolic SVG sun arc
  // Parabola: x goes from 20 to 280, y = 130 - 90 * 4 * t * (1 - t)
  const arcWidth = 300;
  const arcHeight = 140;
  const startX = 30;
  const endX = arcWidth - 30;
  const apexY = 30;
  const baselineY = 115;

  const t = Math.max(0, Math.min(1, solar.sunProgress));
  const sunX = startX + t * (endX - startX);
  // Parabolic trajectory formula: y = baselineY - (baselineY - apexY) * 4 * t * (1 - t)
  const sunY = baselineY - (baselineY - apexY) * 4 * t * (1 - t);

  // SVG path for parabola curve
  const curvePath = `M ${startX} ${baselineY} Q ${arcWidth / 2} ${apexY - 20} ${endX} ${baselineY}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Solar Arc Card */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
        {/* Ambient emerald back-glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sunrise className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-100 tracking-wide">Sun Trajectory</h3>
              <p className="text-[10px] text-emerald-400/80">Solar Cycle & Celestial Arc</p>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/20 text-emerald-300 font-mono">
            {solar.isDaytime ? "Daylight Active" : "Nighttime"}
          </span>
        </div>

        {/* Parabolic Sun Arc Visualization */}
        <div className="relative h-36 w-full flex items-center justify-center my-2">
          <svg
            viewBox={`0 0 ${arcWidth} ${arcHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="arcStrokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#34d399" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
              </linearGradient>

              <linearGradient id="arcFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
              </linearGradient>

              <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Baseline Horizon */}
            <line
              x1={startX - 10}
              y1={baselineY}
              x2={endX + 10}
              y2={baselineY}
              stroke="rgba(16, 185, 129, 0.2)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />

            {/* Shaded area under arc */}
            <path
              d={`${curvePath} L ${endX} ${baselineY} L ${startX} ${baselineY} Z`}
              fill="url(#arcFillGrad)"
            />

            {/* Trajectory Parabola Arc */}
            <path
              d={curvePath}
              fill="none"
              stroke="url(#arcStrokeGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Live Sun Marker (Only highlighted if daylight, or ghosted at horizon) */}
            {solar.isDaytime ? (
              <g transform={`translate(${sunX}, ${sunY})`} filter="url(#sunGlow)">
                {/* Outer halo */}
                <circle r="12" fill="#34d399" opacity="0.3" className="animate-pulse" />
                {/* Core Sun Orb */}
                <circle r="6" fill="#fef08a" stroke="#10b981" strokeWidth="2" />
              </g>
            ) : (
              <g transform={`translate(${sunX}, ${baselineY})`}>
                <circle r="5" fill="#064e3b" stroke="#34d399" strokeWidth="1.5" strokeDasharray="2 2" />
              </g>
            )}

            {/* Horizon Anchor Dots */}
            <circle cx={startX} cy={baselineY} r="3" fill="#34d399" />
            <circle cx={endX} cy={baselineY} r="3" fill="#10b981" />
          </svg>
        </div>

        {/* Sunrise and Sunset Labels */}
        <div className="flex items-center justify-between pt-2 border-t border-emerald-500/10 text-xs">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Sunrise className="h-3.5 w-3.5 text-emerald-300" />
              <span>Sunrise</span>
            </div>
            <span className="text-base font-bold text-white font-mono mt-0.5 block">
              {formatTime(solar.sunrise)}
            </span>
          </div>

          <div className="text-center px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/15">
            <span className="text-[10px] text-emerald-400/80 block uppercase tracking-wider">Day Length</span>
            <span className="text-xs font-semibold text-emerald-200">{solar.dayLengthHours} hrs</span>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-medium">
              <span>Sunset</span>
              <Sunset className="h-3.5 w-3.5 text-emerald-300" />
            </div>
            <span className="text-base font-bold text-white font-mono mt-0.5 block">
              {formatTime(solar.sunset)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Lunar Phase & Rise/Set Card (moon.txt Shifting Window Algorithm) */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
        {/* Subtle nocturnal emerald back-glow */}
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Moon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-100 tracking-wide">Lunar Phase & Transit</h3>
              <p className="text-[10px] text-emerald-400/80">24h 50m Shifting Cycle Model</p>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/20 text-emerald-300 font-mono">
            {lunar.fractionPercent}% Illumination
          </span>
        </div>

        {/* Realistic High-Fidelity SVG Lunar Disc Rendering */}
        <div className="flex items-center gap-5 my-3 py-2">
          <div className="relative w-24 h-24 shrink-0 rounded-full bg-obsidian-950 border border-emerald-500/30 p-1 shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)] flex items-center justify-center">
            {/* Lunar Surface Texture & Phase Curve */}
            <svg viewBox="0 0 100 100" className="w-full h-full rounded-full">
              <defs>
                {/* Dark unlit moon surface */}
                <radialGradient id="moonDark" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0b1710" />
                  <stop offset="85%" stopColor="#050c07" />
                  <stop offset="100%" stopColor="#020503" />
                </radialGradient>

                {/* Bright illuminated moon surface */}
                <radialGradient id="moonLit" cx="45%" cy="45%" r="55%">
                  <stop offset="0%" stopColor="#f0fdf4" />
                  <stop offset="50%" stopColor="#d1fae5" />
                  <stop offset="85%" stopColor="#a7f3d0" />
                  <stop offset="100%" stopColor="#6ee7b7" />
                </radialGradient>

                {/* Crater texture overlay */}
                <filter id="moonCraters">
                  <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" result="noise" />
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" />
                </filter>
              </defs>

              {/* Base moon sphere (unlit side) */}
              <circle cx="50" cy="50" r="46" fill="url(#moonDark)" />

              {/* Simulated Illumination Arc based on Phase */}
              {/* If fraction > 0, render illuminated crescent/gibbous */}
              {lunar.phase >= 0.5 ? (
                // Waning side
                <path
                  d={`M 50 4 A 46 46 0 0 0 50 96 A ${Math.abs(46 * (2 * (lunar.phase - 0.5) - 1))} 46 0 0 ${
                    lunar.phase < 0.75 ? "1" : "0"
                  } 50 4`}
                  fill="url(#moonLit)"
                />
              ) : (
                // Waxing side
                <path
                  d={`M 50 4 A 46 46 0 0 1 50 96 A ${Math.abs(46 * (1 - 4 * lunar.phase))} 46 0 0 ${
                    lunar.phase > 0.25 ? "1" : "0"
                  } 50 4`}
                  fill="url(#moonLit)"
                />
              )}

              {/* Crater subtle texture overlay */}
              <circle cx="50" cy="50" r="46" filter="url(#moonCraters)" />
              {/* Outer limb ring */}
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(52, 211, 153, 0.4)" strokeWidth="1" />
            </svg>
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <span className="text-base font-bold text-white tracking-tight block">
              {lunar.phaseName}
            </span>
            <p className="text-[11px] text-emerald-400/90 leading-relaxed line-clamp-2">
              {lunar.phaseDescription}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[10px] text-emerald-400">
              <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/20 font-mono">
                {lunar.isWaxing ? "Waxing (Growing)" : "Waning (Shrinking)"}
              </span>
            </div>
          </div>
        </div>

        {/* Moonrise and Moonset Timers */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-emerald-500/10 text-xs">
          <div className="p-2.5 rounded-xl bg-obsidian-900/80 border border-emerald-500/10">
            <div className="flex items-center justify-between text-emerald-400 mb-0.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold">Moonrise</span>
              {lunar.moonriseShifted && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono" title="Shifted 24h forward over midnight boundary">
                  +24h rollover
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-white font-mono">
              {formatTime(lunar.moonrise)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-obsidian-900/80 border border-emerald-500/10">
            <div className="flex items-center justify-between text-emerald-400 mb-0.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold">Moonset</span>
              {lunar.moonsetShifted && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono" title="Shifted 24h forward over midnight boundary">
                  +24h rollover
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-white font-mono">
              {formatTime(lunar.moonset)}
            </span>
          </div>
        </div>

        {/* Algorithmic footnote referencing the 24h shift */}
        <div className="mt-3 p-2 rounded-lg bg-emerald-950/40 text-[10px] text-emerald-400/80 border border-emerald-500/15 flex items-start gap-1.5">
          <Info className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Anchored at local noon with 24h forward-scan rollover for {locationName}.
          </span>
        </div>
      </div>
    </div>
  );
}
