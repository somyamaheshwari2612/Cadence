"use client";

import { useState } from "react";
import { Shield, ExternalLink, ChevronDown, ChevronUp, FileText, Info } from "lucide-react";

interface MethodologySectionProps {
  locationName: string;
  coords: { lat: number; lng: number };
  metadata?: Record<string, any>;
}

export default function MethodologySection({
  locationName,
  coords,
  metadata = {},
}: MethodologySectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4 pt-6 border-t border-emerald-500/10">
      {/* Expandable "About this forecast" Trigger */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-500/15 bg-obsidian-950/70">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full text-xs font-semibold text-emerald-300 hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-emerald-400" />
            <span>About this forecast & Methodology disclosures</span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isOpen && (
          <div className="pt-4 space-y-4 text-xs text-emerald-300/80 leading-relaxed border-t border-emerald-500/10 mt-3 animate-in fade-in duration-150">
            {/* Grid vs Requested Location */}
            <div className="space-y-1">
              <span className="font-semibold text-white block">
                Requested Location vs. Forecast Model Grid
              </span>
              <p>
                Requested place: <strong className="text-white">{locationName}</strong>. 
                Atmospheric data is calculated using numerical weather prediction models interpolated to the nearest coordinate grid cell ({coords.lat.toFixed(4)}°N, {coords.lng.toFixed(4)}°E). Local microclimates, street canyons, and localized point emissions may produce variations from modeled regional fields.
              </p>
            </div>

            {/* Retrieval Time and Valid Times */}
            <div className="space-y-1">
              <span className="font-semibold text-white block">
                Forecast Retrieval & Operational Validity
              </span>
              <p>
                Fetched: {metadata.retrieval_timestamp_utc ? new Date(metadata.retrieval_timestamp_utc).toLocaleString() : "Live run"}. 
                Forecast window spans the next 24 to 36 hourly horizons. Valid start: {metadata.valid_time_start_utc ? new Date(metadata.valid_time_start_utc).toLocaleTimeString() : "Current cycle"}.
              </p>
            </div>

            {/* Units */}
            <div className="space-y-1">
              <span className="font-semibold text-white block">
                Standard Units
              </span>
              <p>
                Particulate matter (PM2.5) concentrations are reported strictly in <strong>µg/m³</strong>. Apparent temperature (&ldquo;feels like&rdquo;) is reported in <strong>°C</strong>, accounting for wind chill and relative humidity.
              </p>
            </div>

            {/* Missing and Stale Data Definition */}
            <div className="space-y-1">
              <span className="font-semibold text-white block">
                What Counts as Missing / Stale Data
              </span>
              <p>
                Data is flagged as <em>missing</em> if null values, discontinuous time steps, or missing particulate bands are detected. Data is considered <em>stale</em> if upstream provider cache age exceeds 3 hours (10,800 seconds). When data is incomplete, slots cannot be ranked.
              </p>
            </div>

            {/* Product Ranking Formula */}
            <div className="space-y-1">
              <span className="font-semibold text-white block">
                Product Ranking Formula (Not Clinical Health Risk)
              </span>
              <p>
                Candidate time slots are ordered using the deterministic formula:
                <code className="block my-1.5 p-2 rounded-lg bg-obsidian-900 border border-emerald-500/15 font-mono text-emerald-200">
                  Product Score = |apparent_temp - 22.0| × 2.0 + pm2.5 × 1.5
                </code>
                This is a product ordering score intended for convenience ranking. It is not an epidemiological model, biological intake formula, or clinical safety certification.
              </p>
            </div>

            {/* U.S. AQI vs Indian CPCB NAQI */}
            <div className="space-y-1">
              <span className="font-semibold text-white block">
                U.S. Index Scale vs. Indian National AQI (NAQI)
              </span>
              <p>
                Open-Meteo reports index values according to the United States EPA Air Quality Index formula. This application prioritizes raw PM2.5 in µg/m³. This index is <strong>not</strong> India&apos;s Central Pollution Control Board (CPCB) NAQI, which uses a 24-hour breakpoint and averaging methodology. Consult official Indian authorities at{" "}
                <a
                  href="https://www.cpcb.nic.in/aqi_bulletin.php"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-300 hover:text-white underline underline-offset-2"
                >
                  cpcb.nic.in
                </a>{" "}
                for regulatory bulletins.
              </p>
            </div>

            {/* Attribution and Licensing */}
            <div className="pt-2 border-t border-emerald-500/10 flex flex-wrap items-center justify-between gap-3 text-[11px]">
              <span>Data provider: Open-Meteo & Copernicus Atmospheric Monitoring Service (CAMS)</span>
              <a
                href="https://open-meteo.com/en/terms"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                Open-Meteo Terms & Attribution <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Compact Standard Footer Copy (Mandatory from prompt) */}
      <footer className="text-center sm:text-left text-[11px] text-emerald-400/80 leading-relaxed pb-4">
        Weather and air-quality forecast data by Open-Meteo; air-quality model data from CAMS. Forecasts are modeled estimates and may differ from local conditions. This tool supports planning and is not medical advice.
      </footer>
    </div>
  );
}
