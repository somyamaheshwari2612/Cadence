"use client";

import { useMemo, useRef } from "react";
import { HourlyForecastPoint } from "@/utils/apiClient";
import { Sun, Moon, Cloud, CloudRain, Droplets, Clock, ChevronRight } from "lucide-react";

interface HourlyForecastCardProps {
  hourly: HourlyForecastPoint[];
}

export default function HourlyForecastCard({ hourly }: HourlyForecastCardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Display the next 12 to 16 hourly slots
  const slots = useMemo(() => hourly.slice(0, 16), [hourly]);

  // Compute temperature min and max to scale the SVG trend curve
  const { minTemp, maxTemp, range } = useMemo(() => {
    if (slots.length === 0) return { minTemp: 20, maxTemp: 35, range: 15 };
    const temps = slots.map((s) => s.temperature);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    return {
      minTemp: min,
      maxTemp: max,
      range: Math.max(1, max - min),
    };
  }, [slots]);

  // Geometry for the continuous SVG curve across the horizontal cards
  const itemWidth = 64; // px per hourly slot
  const svgWidth = slots.length * itemWidth;
  const svgHeight = 44; // px curve amplitude
  const paddingY = 8;

  // Build Bezier spline path points
  const points = useMemo(() => {
    return slots.map((slot, idx) => {
      const x = idx * itemWidth + itemWidth / 2;
      // Inverted Y: higher temp is higher up (lower Y)
      const normalized = (slot.temperature - minTemp) / range;
      const y = svgHeight - paddingY - normalized * (svgHeight - 2 * paddingY);
      return { x, y };
    });
  }, [slots, minTemp, range]);

  // Generate smooth SVG Catmull-Rom or cubic Bezier path
  const curvePath = useMemo(() => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [points]);

  const renderIcon = (slot: HourlyForecastPoint) => {
    if (slot.precipProb > 40) return <CloudRain className="h-4 w-4 text-emerald-400" />;
    if (slot.weatherCode >= 2) return <Cloud className="h-4 w-4 text-emerald-300" />;
    if (slot.isDay) return <Sun className="h-4 w-4 text-emerald-300" />;
    return <Moon className="h-4 w-4 text-emerald-200" />;
  };

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-100 tracking-wide">Hourly Trend & Trajectory</h3>
            <p className="text-[10px] text-emerald-400/80">Next 16 Hours • Connected Thermal Spline</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono hover:text-emerald-300 cursor-pointer">
          <span>Scroll for 48h</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>

      {/* Horizontal Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto no-scrollbar relative pt-2 pb-1 scroll-smooth"
      >
        <div className="relative" style={{ minWidth: `${svgWidth}px` }}>
          {/* Top Row: Time Pills & Icons */}
          <div className="flex justify-between">
            {slots.map((slot, idx) => (
              <div
                key={idx}
                className="w-16 shrink-0 flex flex-col items-center justify-center gap-1.5 text-center"
              >
                <span className="text-[11px] font-mono text-emerald-300/80 font-medium">
                  {slot.hourLabel}
                </span>
                <div className="h-6 flex items-center justify-center">
                  {renderIcon(slot)}
                </div>
                <span className="text-sm font-bold text-white font-mono mt-0.5">
                  {slot.temperature}°
                </span>
              </div>
            ))}
          </div>

          {/* Middle Row: Connected SVG Curve */}
          <div className="relative h-11 w-full my-1 pointer-events-none">
            <svg
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="overflow-visible"
            >
              <defs>
                <linearGradient id="hourlySplineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="50%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>

              {/* The Temperature Curve */}
              <path
                d={curvePath}
                fill="none"
                stroke="url(#hourlySplineGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Data Point Dots on Curve */}
              {points.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill="#030704"
                  stroke="#34d399"
                  strokeWidth="2"
                />
              ))}
            </svg>
          </div>

          {/* Bottom Row: Precipitation Chance Percentage */}
          <div className="flex justify-between pt-1">
            {slots.map((slot, idx) => (
              <div
                key={idx}
                className="w-16 shrink-0 flex items-center justify-center gap-1 text-[10px] font-mono text-emerald-400/80"
              >
                <Droplets className="h-2.5 w-2.5 text-emerald-400" />
                <span>{slot.precipProb}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
