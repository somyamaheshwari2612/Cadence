"use client";

import { useState } from "react";
import { geocodeLocation, GeocodeCandidate, requestSchedule, ScheduleResponse } from "@/utils/apiClient";
import { Search, MapPin, Clock, Thermometer, Wind, CloudRain, AlertCircle, Sparkles } from "lucide-react";

interface RouterFormProps {
  onScheduleCalculated: (result: ScheduleResponse, locationName: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function RouterForm({ onScheduleCalculated, isLoading, setIsLoading }: RouterFormProps) {
  const [searchQuery, setSearchQuery] = useState("Agra");
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<GeocodeCandidate>({
    name: "Agra",
    country: "India",
    admin1: "Uttar Pradesh",
    latitude: 27.1767,
    longitude: 78.0081,
  });

  const [durationHours, setDurationHours] = useState(2);
  const [maxTemp, setMaxTemp] = useState(38);
  const [maxAqi, setMaxAqi] = useState(150);
  const [rainOk, setRainOk] = useState(false);
  const [enableFallback, setEnableFallback] = useState(false);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Search places for disambiguation (No GPS permission required)
  const handleSearchLocations = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearchingGeocode(true);
      setFormError(null);
      const results = await geocodeLocation(searchQuery);
      setCandidates(results);
      if (results.length > 0) {
        setSelectedLocation(results[0]);
      } else {
        setFormError(`No locations found matching '${searchQuery}'. Try another city.`);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to search location");
    } finally {
      setIsSearchingGeocode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) {
      setFormError("Please select a location first.");
      return;
    }

    try {
      setIsLoading(true);
      setFormError(null);
      const res = await requestSchedule({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        duration_hours: durationHours,
        max_temp: maxTemp,
        max_aqi: maxAqi,
        rain_ok: rainOk,
        enable_fallback: enableFallback,
      });

      const displayName = `${selectedLocation.name}${selectedLocation.admin1 ? `, ${selectedLocation.admin1}` : ""}, ${selectedLocation.country}`;
      onScheduleCalculated(res, displayName);
    } catch (err: any) {
      setFormError(err.message || "Scheduling request failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">Configure Activity Window</h2>
          <p className="text-xs text-slate-400">Deterministic routing against Open-Meteo forecasts</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          <span>Task-Aware Engine</span>
        </div>
      </div>

      {/* 1. Location Selection with Disambiguation */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
          Target City / Location (No GPS Required)
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Indian or global city (e.g. Agra, Mumbai, Delhi)..."
              className="input-glass w-full rounded-xl pl-10 pr-4 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleSearchLocations}
            disabled={isSearchingGeocode}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-white/5"
          >
            {isSearchingGeocode ? "Searching..." : "Disambiguate"}
          </button>
        </div>

        {/* Candidate chips if multiple matches */}
        {candidates.length > 1 && (
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1 mt-2">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">
              Select specific location candidate:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {candidates.map((c, idx) => {
                const isSelected = selectedLocation.latitude === c.latitude && selectedLocation.longitude === c.longitude;
                return (
                  <button
                    key={`${c.name}-${idx}`}
                    type="button"
                    onClick={() => setSelectedLocation(c)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-medium"
                        : "bg-slate-800/40 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {c.name}{c.admin1 ? `, ${c.admin1}` : ""} ({c.country})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedLocation && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              Confirmed: <strong className="text-slate-200">{selectedLocation.name}</strong>
              {selectedLocation.admin1 ? `, ${selectedLocation.admin1}` : ""}, {selectedLocation.country} (
              {selectedLocation.latitude.toFixed(2)}°, {selectedLocation.longitude.toFixed(2)}°)
            </span>
          </div>
        )}
      </div>

      {/* 2. Duration Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            Continuous Duration
          </label>
          <span className="text-xs font-mono font-medium text-cyan-400">{durationHours} Hours</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((hrs) => (
            <button
              key={hrs}
              type="button"
              onClick={() => setDurationHours(hrs)}
              className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                durationHours === hrs
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm"
                  : "bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {hrs}h
            </button>
          ))}
        </div>
      </div>

      {/* 3. Sliders: Max Temperature & Max Forecast U.S. AQI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Thermometer className="h-3.5 w-3.5 text-amber-400" />
              Max Apparent Temp
            </label>
            <span className="text-xs font-mono font-medium text-amber-400">{maxTemp}°C</span>
          </div>
          <input
            type="range"
            min="20"
            max="48"
            step="1"
            value={maxTemp}
            onChange={(e) => setMaxTemp(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <span className="text-[10px] text-slate-500 block">
            Upper comfort limit (Indian conditions often exceed 40°C).
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5 text-emerald-400" />
              Max Forecast U.S. AQI
            </label>
            <span className="text-xs font-mono font-medium text-emerald-400">{maxAqi}</span>
          </div>
          <input
            type="range"
            min="50"
            max="350"
            step="10"
            value={maxAqi}
            onChange={(e) => setMaxAqi(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <span className="text-[10px] text-slate-500 block">
            U.S. EPA sub-index model from Open-Meteo.
          </span>
        </div>
      </div>

      {/* 4. Rain & Fallback Toggles */}
      <div className="pt-2 border-t border-white/5 space-y-3">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={rainOk}
            onChange={(e) => setRainOk(e.target.checked)}
            className="mt-0.5 rounded bg-slate-900 border-white/10 text-cyan-500 focus:ring-0 focus:ring-offset-0"
          />
          <div>
            <span className="text-xs font-medium text-slate-200 group-hover:text-white flex items-center gap-1.5">
              <CloudRain className="h-3.5 w-3.5 text-cyan-400" />
              Precipitation Acceptable (Rain OK)
            </span>
            <span className="text-[11px] text-slate-500 block">
              If unchecked, excludes hours with &gt; 20% precipitation probability.
            </span>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl bg-amber-950/10 border border-amber-500/20">
          <input
            type="checkbox"
            checked={enableFallback}
            onChange={(e) => setEnableFallback(e.target.checked)}
            className="mt-0.5 rounded bg-slate-900 border-amber-500/30 text-amber-500 focus:ring-0 focus:ring-offset-0"
          />
          <div>
            <span className="text-xs font-semibold text-amber-300 group-hover:text-amber-200 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              Opt-in to Lowest-Ranked Fallback Option
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              If no slot satisfies your limits, return the least-adverse available block (labeled{" "}
              <em>&ldquo;outside your preferences—not assessed as safe&rdquo;</em>).
            </span>
          </div>
        </label>
      </div>

      {formError && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-xs text-rose-300">
          {formError}
        </div>
      )}

      {/* 5. Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            <span>Evaluating Forecast Windows...</span>
          </>
        ) : (
          <span>Find Optimal Exposure Window</span>
        )}
      </button>
    </form>
  );
}
