"use client";

import { DailyForecastDay } from "@/utils/apiClient";
import { Calendar, Droplets, Sun, Moon, Cloud, CloudRain, ChevronRight } from "lucide-react";

interface DailyForecastCardProps {
  daily: DailyForecastDay[];
}

export default function DailyForecastCard({ daily }: DailyForecastCardProps) {
  // Find global min and max to normalize the bar width
  const allMins = daily.map((d) => d.tempMin);
  const allMaxs = daily.map((d) => d.tempMax);
  const globalMin = Math.min(...allMins, 15);
  const globalMax = Math.max(...allMaxs, 40);
  const globalRange = Math.max(1, globalMax - globalMin);

  const renderGlyph = (code: number) => {
    if (code >= 51) return <CloudRain className="h-4 w-4 text-emerald-400" />;
    if (code >= 2) return <Cloud className="h-4 w-4 text-emerald-300" />;
    return <Sun className="h-4 w-4 text-emerald-300" />;
  };

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-100 tracking-wide">7-Day Outlook</h3>
            <p className="text-[10px] text-emerald-400/80">Thermal Spans & Rain Probabilities</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono hover:text-emerald-300 cursor-pointer">
          <span>7-day forecast</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>

      <div className="space-y-3.5">
        {daily.map((day, idx) => {
          // Normalize bar positions
          const leftPct = ((day.tempMin - globalMin) / globalRange) * 100;
          const widthPct = Math.max(12, ((day.tempMax - day.tempMin) / globalRange) * 100);

          return (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-emerald-500/5 last:border-0 hover:bg-emerald-950/20 px-2 rounded-xl transition-colors"
            >
              {/* Day Name */}
              <span className={`w-14 font-medium ${idx === 0 ? "text-emerald-300 font-bold" : "text-emerald-100/90"}`}>
                {day.dayLabel}
              </span>

              {/* Rain Probability */}
              <div className="flex items-center gap-1 w-14 text-emerald-400/80 font-mono text-[11px]">
                <Droplets className="h-3 w-3 text-emerald-400" />
                <span>{day.precipProbMax}%</span>
              </div>

              {/* Weather Glyph */}
              <div className="w-8 flex items-center justify-center">
                {renderGlyph(day.weatherCode)}
              </div>

              {/* Temperature Bar */}
              <div className="flex-1 flex items-center gap-3">
                <span className="text-[11px] font-mono text-emerald-300/80 w-6 text-right">
                  {day.tempMin}°
                </span>

                <div className="flex-1 h-2 rounded-full bg-obsidian-950 border border-emerald-500/10 relative overflow-hidden">
                  <div
                    className="absolute h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-lime-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                  />
                </div>

                <span className="text-[11px] font-mono text-white font-bold w-6 text-left">
                  {day.tempMax}°
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
