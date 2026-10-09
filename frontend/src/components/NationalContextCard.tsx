"use client";

import { useEffect, useState } from "react";
import { fetchNationalContext, NationalContextData } from "@/utils/apiClient";
import { Activity, RefreshCw, ChevronDown, ChevronUp, MapPin } from "lucide-react";

export default function NationalContextCard() {
  const [data, setData] = useState<NationalContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadData = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchNationalContext(force);
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load national context");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div className="glass-panel rounded-2xl p-6 animate-pulse">
        <div className="h-4 w-48 bg-slate-800 rounded mb-4"></div>
        <div className="h-8 w-32 bg-slate-800 rounded mb-2"></div>
        <div className="h-4 w-64 bg-slate-800 rounded"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-panel rounded-2xl p-6 border-rose-500/20 text-xs text-rose-300">
        <p>Could not load national air quality context ({error}).</p>
        <button
          onClick={() => loadData(true)}
          className="mt-2 text-xs text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
        >
          Retry fetch
        </button>
      </div>
    );
  }

  const summary = data?.card_summary;

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:border-white/15">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">
              {summary?.title || "National Context (100 Cities)"}
            </h3>
            <span className="text-[10px] text-slate-400">
              India Macro Exposure Benchmark
            </span>
          </div>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={loading}
          title="Refresh national statistics"
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2 border-y border-white/5 my-3">
        <div>
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            Median U.S. AQI
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {summary?.median_us_aqi}
            </span>
            <span className="text-[10px] text-slate-400">
              (Mean: {summary?.mean_us_aqi})
            </span>
          </div>
        </div>

        <div className="sm:col-span-2">
          <span className="text-[11px] font-medium text-slate-400 block mb-1">
            Range Across 100 Cities
          </span>
          <p className="text-sm font-semibold text-emerald-400 truncate">
            {summary?.range}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
        <span>Model: {summary?.model}</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
        >
          {expanded ? "Hide extremes" : "View extremes"}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {expanded && data && (
        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-in fade-in duration-200">
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/10">
            <span className="text-[11px] font-semibold text-emerald-400 block mb-2">
              Cleanest 5 Regions
            </span>
            <ul className="space-y-1">
              {data.cleanest_cities.map((c) => (
                <li key={c.city} className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-400" />
                    {c.city}
                  </span>
                  <span className="font-mono font-medium text-emerald-300">AQI {c.us_aqi}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/10">
            <span className="text-[11px] font-semibold text-rose-400 block mb-2">
              Most Strained 5 Regions
            </span>
            <ul className="space-y-1">
              {data.most_polluted_cities.map((c) => (
                <li key={c.city} className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-rose-400" />
                    {c.city}
                  </span>
                  <span className="font-mono font-medium text-rose-300">AQI {c.us_aqi}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
