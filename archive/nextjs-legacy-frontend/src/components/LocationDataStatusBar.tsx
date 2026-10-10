"use client";

import { useState } from "react";
import { MapPin, RefreshCw, ChevronDown, Info, X, ExternalLink, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { GeocodeCandidate, geocodeLocation } from "@/utils/apiClient";

interface LocationDataStatusBarProps {
  locationName: string;
  coords: { lat: number; lng: number };
  onSelectLocation: (candidate: GeocodeCandidate) => void;
  retrievedTimeStr?: string;
  hasDataIssue?: boolean;
  metadata?: Record<string, any>;
}

export default function LocationDataStatusBar({
  locationName,
  coords,
  onSelectLocation,
  retrievedTimeStr,
  hasDataIssue = false,
  metadata = {},
}: LocationDataStatusBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Format retrieved time e.g. "Forecast retrieved 10 Oct · 11:42 AM IST"
  const displayRetrievedTime = retrievedTimeStr || (() => {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleDateString("en-US", { month: "short" });
    const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `Forecast retrieved ${day} ${month} · ${time} IST`;
  })();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchError(null);
      const results = await geocodeLocation(searchQuery);
      setCandidates(results);
      if (results.length === 0) {
        setSearchError(`No locations found matching "${searchQuery}".`);
      }
    } catch (err: any) {
      setSearchError(err.message || "Failed to find location");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (candidate: GeocodeCandidate) => {
    onSelectLocation(candidate);
    setIsSearchOpen(false);
    setSearchQuery("");
    setCandidates([]);
  };

  return (
    <div className="w-full">
      {/* Top Status Panel */}
      <div className="glass-panel rounded-2xl p-4 sm:px-6 sm:py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border border-emerald-500/20 bg-obsidian-950/70">
        {/* Left: Location & Change Location Dropdown Trigger */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Confirmed location</span>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{locationName}</span>
            </h1>

            <button
              onClick={() => setIsSearchOpen(true)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
              title="Select another city or town"
            >
              <span>Change location</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Right: Coverage, Retrieved Time, Model Status & Info Drawer Trigger */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs text-emerald-300/80">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-obsidian-900 border border-emerald-500/10">
            <Clock className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-medium text-emerald-200">Next 24 hours</span>
          </div>

          <span className="hidden sm:inline text-emerald-500/40">·</span>

          <span className="text-[11px] sm:text-xs text-emerald-400/90">{displayRetrievedTime}</span>

          <span className="hidden sm:inline text-emerald-500/40">·</span>

          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
              Modeled forecast
            </span>

            {hasDataIssue && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span>Some forecast hours unavailable</span>
              </span>
            )}
          </div>

          {/* Data details trigger */}
          <button
            onClick={() => setIsDetailsOpen(true)}
            className="p-1 rounded-lg text-emerald-400/70 hover:text-emerald-200 hover:bg-emerald-500/10 transition-colors"
            title="View Data details and model grid coordinates"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Change Location Modal / Search Dropdown */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-obsidian-900 border border-emerald-500/30 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/15">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Change Location</h3>
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-emerald-400/60 hover:text-emerald-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter city or district (e.g. Mathura, Agra, Delhi)..."
                  className="w-full rounded-xl bg-obsidian-950 border border-emerald-500/30 px-4 py-2.5 text-xs text-white placeholder-emerald-500/40 focus:outline-none focus:border-emerald-400"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 hover:bg-emerald-500/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  {isSearching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Search"}
                </button>
              </div>
            </form>

            {searchError && (
              <p className="text-xs text-rose-400 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                {searchError}
              </p>
            )}

            {candidates.length > 0 && (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pt-2">
                <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider">Select place:</span>
                {candidates.map((c, i) => (
                  <button
                    key={`${c.name}-${c.latitude}-${i}`}
                    onClick={() => handleSelect(c)}
                    className="w-full text-left p-2.5 rounded-xl bg-obsidian-950 hover:bg-emerald-950/60 border border-emerald-500/15 hover:border-emerald-500/40 text-xs text-emerald-100 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-white">{c.name}</span>
                      <span className="text-emerald-400/70 ml-1.5">
                        {[c.admin1, c.country].filter(Boolean).join(", ")}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400/60">
                      {c.latitude.toFixed(2)}°, {c.longitude.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Details Drawer / Modal */}
      {isDetailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-obsidian-900 border border-emerald-500/30 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/15">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Data Details & Technical Grid</h3>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="text-emerald-400/60 hover:text-emerald-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-emerald-200/90 leading-relaxed">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-obsidian-950 border border-emerald-500/15 font-mono text-[11px]">
                <div>
                  <span className="text-emerald-400/60 block text-[10px] uppercase">Requested Place</span>
                  <span className="font-semibold text-white">{locationName}</span>
                </div>
                <div>
                  <span className="text-emerald-400/60 block text-[10px] uppercase">Model Grid Coordinates</span>
                  <span className="text-emerald-300">
                    {coords.lat.toFixed(4)}°N, {coords.lng.toFixed(4)}°E
                  </span>
                </div>
                <div>
                  <span className="text-emerald-400/60 block text-[10px] uppercase">Timezone</span>
                  <span className="text-white">{metadata.timezone || "Asia/Kolkata (IST)"}</span>
                </div>
                <div>
                  <span className="text-emerald-400/60 block text-[10px] uppercase">Cache Freshness</span>
                  <span className="text-emerald-300">
                    {metadata.cache_age_seconds !== undefined ? `${metadata.cache_age_seconds}s old (3h limit)` : "Live fetch"}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-emerald-400/80">
                Weather models interpolate spatial grid cells (~2 to 11 km resolution) provided by Open-Meteo. 
                Air quality particulate data is produced by the Copernicus Atmosphere Monitoring Service (CAMS Global ensemble).
              </p>

              <div className="pt-2 border-t border-emerald-500/10 flex justify-between items-center text-[11px]">
                <span className="text-emerald-400/60">Data Source: Open-Meteo & CAMS</span>
                <a
                  href="https://open-meteo.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  open-meteo.com <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
