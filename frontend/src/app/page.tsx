"use client";

import { useState } from "react";
import NationalContextCard from "@/components/NationalContextCard";
import RouterForm from "@/components/RouterForm";
import Timeline from "@/components/Timeline";
import EcoStreak from "@/components/EcoStreak";
import { ScheduleResponse, requestSchedule } from "@/utils/apiClient";
import { Shield, Sparkles, ExternalLink } from "lucide-react";

export default function Home() {
  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [locationName, setLocationName] = useState<string>("Agra, Uttar Pradesh, India");
  const [isLoading, setIsLoading] = useState(false);

  // If user clicks "View Lowest-Ranked Alternative" on the timeline, automatically re-run with fallback
  const handleEnableFallbackAndRetry = async () => {
    if (!scheduleData?.location) return;

    try {
      setIsLoading(true);
      const res = await requestSchedule({
        latitude: scheduleData.location.latitude,
        longitude: scheduleData.location.longitude,
        duration_hours: 2,
        max_temp: 38,
        max_aqi: 150,
        rain_ok: false,
        enable_fallback: true,
      });
      setScheduleData(res);
    } catch (err) {
      console.error("Fallback retry failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Top Section: 100-City National Context Card */}
      <section>
        <NationalContextCard />
      </section>

      {/* 2. Main Workspace: 2-Column Responsive Dashboard */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Routing Form & Scheduled Results Timeline */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          <RouterForm
            onScheduleCalculated={(res, loc) => {
              setScheduleData(res);
              setLocationName(loc);
            }}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />

          <Timeline
            scheduleData={scheduleData}
            locationName={locationName}
            onEnableFallbackAndRetry={handleEnableFallbackAndRetry}
          />
        </div>

        {/* Right Column (4 cols): Eco-Streak Action & Official Standards */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <EcoStreak />

          {/* Official Standards Reference Card */}
          <div className="glass-panel rounded-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Official Air Quality Standards</span>
            </div>

            <p className="text-slate-400 leading-relaxed">
              Open-Meteo forecasts utilize the <strong>U.S. EPA AQI</strong> sub-index scale. In India, official station bulletins are published under the <strong>National Air Quality Index (NAQI)</strong> by the Central Pollution Control Board (CPCB).
            </p>

            <div className="pt-2 border-t border-white/5 space-y-2">
              <a
                href="https://www.cpcb.nic.in/aqi_bulletin.php"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 hover:text-white transition-colors border border-white/5"
              >
                <span>CPCB AQI Bulletins (India)</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </a>

              <a
                href="https://www.airnow.gov/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 hover:text-white transition-colors border border-white/5"
              >
                <span>U.S. EPA AirNow Portal</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </a>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/40 text-[11px] text-slate-500 border border-white/5 flex items-start gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Gemini Flash-Lite translates deterministic model outputs into natural-language reasoning without adding ungrounded claims.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
