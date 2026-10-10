"use client";

import { useEffect, useState, useRef } from "react";
import LocationDataStatusBar from "@/components/LocationDataStatusBar";
import RouterForm from "@/components/RouterForm";
import RecommendationCard from "@/components/RecommendationCard";
import DecisionTimeline from "@/components/DecisionTimeline";
import EnvironmentalContextCompact from "@/components/EnvironmentalContextCompact";
import MethodologySection from "@/components/MethodologySection";
import EcoStreak from "@/components/EcoStreak";
import {
  fetchLiveWeatherData,
  LiveWeatherDetails,
  ScheduleResponse,
  requestSchedule,
  GeocodeCandidate,
} from "@/utils/apiClient";
import { RefreshCw } from "lucide-react";

export default function Home() {
  // Confirmed location coordinates: Mathura, Uttar Pradesh (default as requested)
  const [coords, setCoords] = useState<{ lat: number; lng: number; name: string }>({
    lat: 27.4924,
    lng: 77.6737,
    name: "Mathura, Uttar Pradesh",
  });

  const [weatherData, setWeatherData] = useState<LiveWeatherDetails | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [activeTaskName, setActiveTaskName] = useState<string>("Walk");

  const plannerRef = useRef<HTMLDivElement>(null);
  const recommendationRef = useRef<HTMLDivElement>(null);

  // Load weather telemetry for current coordinates
  const loadWeather = async (lat: number, lng: number) => {
    try {
      setIsWeatherLoading(true);
      const data = await fetchLiveWeatherData(lat, lng);
      setWeatherData(data);
    } catch (err) {
      console.error("Failed to load weather data", err);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  useEffect(() => {
    loadWeather(coords.lat, coords.lng);
  }, [coords.lat, coords.lng]);

  // Handler when user selects a new location from the Location search dropdown
  const handleSelectLocation = (candidate: GeocodeCandidate) => {
    const displayName = `${candidate.name}${candidate.admin1 ? `, ${candidate.admin1}` : ""}${
      candidate.country ? `, ${candidate.country}` : ""
    }`;
    setCoords({
      lat: candidate.latitude,
      lng: candidate.longitude,
      name: displayName,
    });
    // Reset schedule to prompt user to recalculate for new location
    setScheduleData(null);
  };

  // Handler when a schedule calculation completes
  const handleScheduleCalculated = (res: ScheduleResponse, locName: string) => {
    setScheduleData(res);
    if (res.task_name) {
      setActiveTaskName(res.task_name);
    }
    // Auto-scroll to recommendation card
    setTimeout(() => {
      if (recommendationRef.current) {
        recommendationRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  // Handler for Opt-in fallback retry when no slots meet preferences
  const handleEnableFallback = async () => {
    try {
      setIsScheduleLoading(true);
      const res = await requestSchedule({
        latitude: coords.lat,
        longitude: coords.lng,
        duration_minutes: 45,
        availability_start_hour: 6,
        availability_end_hour: 21,
        max_temp: 34,
        max_pm25: 60,
        rain_ok: false,
        enable_fallback: true,
        task_name: activeTaskName,
      });
      setScheduleData(res);
      setTimeout(() => {
        if (recommendationRef.current) {
          recommendationRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (err) {
      console.error("Fallback request failed", err);
    } finally {
      setIsScheduleLoading(false);
    }
  };

  // Scroll back to planner to edit preferences
  const handleEditPreferences = () => {
    if (plannerRef.current) {
      plannerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const hasDataIssue =
    scheduleData?.status === "unable_to_compare" ||
    (scheduleData?.decision_timeline?.some((h) => h.data_status === "missing") ?? false);

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      {/* 1. Location and Data Status (Header / Top Panel) */}
      <section>
        <LocationDataStatusBar
          locationName={coords.name}
          coords={{ lat: coords.lat, lng: coords.lng }}
          onSelectLocation={handleSelectLocation}
          hasDataIssue={hasDataIssue}
          metadata={scheduleData?.metadata}
        />
      </section>

      {/* 2. Activity Planner (Input for the Exposure Router, sitting ABOVE weather dashboard) */}
      <section ref={plannerRef}>
        <RouterForm
          onScheduleCalculated={handleScheduleCalculated}
          isLoading={isScheduleLoading}
          setIsLoading={setIsScheduleLoading}
          coords={{ lat: coords.lat, lng: coords.lng }}
          locationName={coords.name}
          initialTask={activeTaskName}
        />
      </section>

      {/* 3. Recommendation Card (The BIGGEST card on the page) */}
      <section ref={recommendationRef}>
        <RecommendationCard
          scheduleData={scheduleData}
          locationName={coords.name}
          onEnableFallback={handleEnableFallback}
          onEditPreferences={handleEditPreferences}
        />
      </section>

      {/* 4. Hourly Decision Timeline (Visual evidence display directly under result card) */}
      {scheduleData?.decision_timeline && scheduleData.decision_timeline.length > 0 && (
        <section>
          <DecisionTimeline
            timeline={scheduleData.decision_timeline}
            outcomeType={scheduleData.outcome_type}
            taskName={activeTaskName}
            durationDesc={
              scheduleData.recommendation?.duration_desc ||
              scheduleData.alternative?.duration_desc ||
              "45-minute"
            }
          />
        </section>
      )}

      {/* 5. Environmental Context (Compact: supports recommendation without crowding it out) */}
      {weatherData ? (
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-8">
            <EnvironmentalContextCompact weather={weatherData} />
          </div>
          <div className="md:col-span-4">
            <EcoStreak />
          </div>
        </section>
      ) : isWeatherLoading ? (
        <div className="h-44 rounded-3xl bg-obsidian-950/60 border border-emerald-500/10 animate-pulse flex items-center justify-center text-emerald-400 text-xs">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Synchronizing atmospheric telemetry...
        </div>
      ) : null}

      {/* 7. Methodology and Trust (Compact footer + expandable 'About this forecast') */}
      <section>
        <MethodologySection
          locationName={coords.name}
          coords={{ lat: coords.lat, lng: coords.lng }}
          metadata={scheduleData?.metadata}
        />
      </section>
    </div>
  );
}
