"use client";

import { useMemo } from "react";
import { MapPin, Sparkles, Wind, Droplets, ArrowUp, ArrowDown } from "lucide-react";
import { LiveWeatherDetails, getWeatherConditionInfo } from "@/utils/apiClient";
import { calculateIndiaNaqi } from "@/utils/cpcbNaqi";

interface HeroWeatherCardProps {
  weather: LiveWeatherDetails;
  locationName: string;
  onOpenLocationSearch?: () => void;
}

export default function HeroWeatherCard({
  weather,
  locationName,
  onOpenLocationSearch,
}: HeroWeatherCardProps) {
  const current = weather.current;
  const condition = getWeatherConditionInfo(current.weatherCode, current.isDay);
  const todayDaily = weather.daily[0];

  // Calculate official Indian CPCB NAQI from PM2.5
  const indiaNaqi = useMemo(() => {
    return calculateIndiaNaqi(current.pm25);
  }, [current.pm25]);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-emerald-500/20 bg-gradient-to-b from-obsidian-800/80 via-obsidian-900/90 to-obsidian-950 p-7 sm:p-9 min-h-[50vh] lg:min-h-0 flex flex-col justify-end lg:justify-center shadow-[0_0_50px_-15px_rgba(16,185,129,0.18)]">
      {/* Deep forest & emerald atmospheric glow orbs */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-60 h-60 bg-emerald-900/15 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative star speckles in dark sky */}
      <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        {/* Left Column: Location & Large Temperature Hero */}
        <div className="space-y-4">
          {/* Location button / pin */}
          <button
            onClick={onOpenLocationSearch}
            className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-200 transition-all text-xs"
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="font-medium tracking-wide">{locationName}</span>
            <span className="text-[10px] text-emerald-400/70 font-mono">Change</span>
          </button>

          {/* Temperature Display */}
          <div className="flex items-baseline gap-4">
            <span className="text-7xl sm:text-8xl font-light tracking-tighter text-white font-sans drop-shadow-sm">
              {current.temperature}°
            </span>
            <div className="space-y-1">
              <span className="text-2xl sm:text-3xl font-normal text-emerald-100 block">
                {condition.label}
              </span>
              <div className="flex items-center gap-2 text-xs text-emerald-400/90 font-mono">
                {todayDaily && (
                  <span className="flex items-center gap-0.5">
                    <ArrowUp className="h-3 w-3 text-emerald-300 inline" />
                    {todayDaily.tempMax}°
                    <ArrowDown className="h-3 w-3 text-emerald-400 inline ml-1" />
                    {todayDaily.tempMin}°
                  </span>
                )}
                <span>•</span>
                <span>Feels like {current.apparentTemperature}°</span>
              </div>
            </div>
          </div>

          {/* Condition description sentence */}
          <p className="text-xs sm:text-sm text-emerald-200/80 max-w-md leading-relaxed font-light">
            {condition.description}. Air quality is{" "}
            <strong className="text-emerald-300">{indiaNaqi?.category || "Moderate"}</strong> under Indian CPCB standards (NAQI {indiaNaqi?.naqi ?? current.usAqi}, PM2.5: {current.pm25} µg/m³).
          </p>
        </div>

        {/* Right Column: Quick Status Badges & Exposure Readiness */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
          {/* Authentic Indian CPCB NAQI Badge */}
          <div className="p-3.5 rounded-2xl bg-obsidian-900/90 border border-emerald-500/20 backdrop-blur-md flex items-center justify-between gap-4 min-w-[240px]">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-semibold text-emerald-400 block tracking-wider">
                  India NAQI (CPCB)
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  Official
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold text-white font-mono">
                  {indiaNaqi?.naqi ?? current.usAqi}
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono">
                  PM2.5 {current.pm25} µg/m³
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border block ${indiaNaqi?.badgeClass || "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"}`}>
                {indiaNaqi?.category || "Moderate"}
              </span>
              <span className="text-[9px] text-emerald-400/70 font-mono mt-1 block">
                US EPA: {current.usAqi}
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-obsidian-900/80 border border-emerald-500/15 flex items-center gap-2 text-emerald-300">
              <Wind className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{current.windSpeedKmh} km/h wind</span>
            </div>
            <div className="p-2.5 rounded-xl bg-obsidian-900/80 border border-emerald-500/15 flex items-center gap-2 text-emerald-300">
              <Droplets className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>{current.relativeHumidity}% humidity</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
