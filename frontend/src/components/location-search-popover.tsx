import { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  Loader2,
  ChevronDown,
  X,
  Compass,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { searchLocations, reverseGeocode, GeocodePlace } from '@/lib/api';
import {
  type LocationCoords,
  formatAccuracy,
  isCoarseAccuracy,
  GEOLOCATION_PRE_PERMISSION_EXPLANATION,
} from '@/lib/location-utils';
import { LocationAccuracyPopover } from '@/components/location-accuracy-popover';

const POPULAR_LOCATIONS = [
  { name: 'Mathura, Uttar Pradesh', latitude: 27.4924, longitude: 77.6737 },
  { name: 'Agra, Uttar Pradesh', latitude: 27.1767, longitude: 78.0081 },
  { name: 'New Delhi, Delhi', latitude: 28.6139, longitude: 77.209 },
  { name: 'Mumbai, Maharashtra', latitude: 19.076, longitude: 72.8777 },
  { name: 'Bengaluru, Karnataka', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Jaipur, Rajasthan', latitude: 26.9124, longitude: 75.7873 },
  { name: 'Varanasi, Uttar Pradesh', latitude: 25.3176, longitude: 82.9739 },
  { name: 'Hyderabad, Telangana', latitude: 17.385, longitude: 78.4867 },
  { name: 'Pune, Maharashtra', latitude: 18.5204, longitude: 73.8567 },
  { name: 'Kolkata, West Bengal', latitude: 22.5726, longitude: 88.3639 },
  { name: 'London, United Kingdom', latitude: 51.5074, longitude: -0.1278 },
  { name: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503 },
];

interface LocationSearchPopoverProps {
  location: string;
  onLocationSelect: (
    locationName: string,
    coords?: LocationCoords
  ) => void;
  coords?: LocationCoords | undefined;
  triggerVariant?: 'hero' | 'bar' | 'banner' | undefined;
}

export function LocationSearchPopover({
  location,
  onLocationSelect,
  coords,
  triggerVariant = 'hero',
}: LocationSearchPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodePlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showPrePermissionPrompt, setShowPrePermissionPrompt] = useState(false);
  const [coarseAccuracyNotice, setCoarseAccuracyNotice] = useState<{
    meters: number;
    formatted: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeQueryRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  // First-visit highlight for new users
  const FIRST_VISIT_KEY = 'cadence_location_highlight_seen_v1';
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const seen = localStorage.getItem(FIRST_VISIT_KEY);
        if (!seen) {
          setIsFirstVisit(true);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const dismissFirstVisit = () => {
    setIsFirstVisit(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FIRST_VISIT_KEY, 'true');
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (open && isFirstVisit) {
      dismissFirstVisit();
    }
  }, [open, isFirstVisit]);

  // Core search executor with request cancellation and race condition prevention
  const executeSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    activeQueryRef.current = trimmed;

    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      setErrorMessage(null);
      return;
    }

    // Cancel any previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setErrorMessage(null);

    try {
      const places = await searchLocations(trimmed, controller.signal);

      // Verify that this response still matches the user's latest query
      if (activeQueryRef.current.toLowerCase() !== trimmed.toLowerCase()) {
        return; // Discard outdated response from earlier keystrokes
      }

      setResults(places);
      setErrorMessage(null);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return; // Silently ignore aborted requests
      }
      if (activeQueryRef.current.toLowerCase() === trimmed.toLowerCase()) {
        setErrorMessage('Unable to reach geocoding service. Try again.');
      }
    } finally {
      if (activeQueryRef.current.toLowerCase() === trimmed.toLowerCase()) {
        setIsSearching(false);
      }
    }
  };

  // Debounced search when typing (snappy 180ms delay)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      setErrorMessage(null);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(query);
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setErrorMessage(null);
      setShowPrePermissionPrompt(false);
      setCoarseAccuracyNotice(null);
    } else {
      setQuery('');
      setResults([]);
      setErrorMessage(null);
      setShowPrePermissionPrompt(false);
      abortRef.current?.abort();
    }
  }, [open]);

  // Execute browser geolocation after explaining to user
  const executeGeolocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      setShowPrePermissionPrompt(false);
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);
    setCoarseAccuracyNotice(null);

    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude, accuracy } = position.coords;
        // Do not assume accuracy based on phone versus laptop: read position.coords.accuracy directly (in meters)
        const accuracyMeters = typeof accuracy === 'number' && !isNaN(accuracy) ? accuracy : undefined;
        const formattedAcc = formatAccuracy(accuracyMeters);
        const isCoarse = accuracyMeters !== undefined && accuracyMeters > 5000;

        try {
          const friendlyName = await reverseGeocode(latitude, longitude);
          onLocationSelect(friendlyName, {
            latitude,
            longitude,
            accuracy: accuracyMeters,
            source: 'gps',
          });
        } catch {
          const fallbackName = `${latitude.toFixed(2)}° N, ${longitude.toFixed(2)}° E`;
          onLocationSelect(fallbackName, {
            latitude,
            longitude,
            accuracy: accuracyMeters,
            source: 'gps',
          });
        } finally {
          setIsLocating(false);
          setShowPrePermissionPrompt(false);

          if (isCoarse) {
            // If reported accuracy is above 5 km, present city search as the preferred alternative
            setCoarseAccuracyNotice({
              meters: accuracyMeters!,
              formatted: formattedAcc,
            });
          } else {
            setOpen(false);
          }
        }
      },
      error => {
        setIsLocating(false);
        setShowPrePermissionPrompt(false);
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage(
            'Location permission denied. You can search for your city in the box below.'
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMessage('Location information is currently unavailable. Please search for your city below.');
        } else {
          setErrorMessage('Location request timed out. Please search for your city below.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSelectPlace = (place: GeocodePlace | undefined) => {
    if (!place) return;
    const displayName = place.admin1
      ? `${place.name}, ${place.admin1}`
      : place.country
      ? `${place.name}, ${place.country}`
      : place.name;

    onLocationSelect(displayName, {
      latitude: place.latitude,
      longitude: place.longitude,
      source: 'search',
    });
    setOpen(false);
  };

  const handleSelectPopular = (pop: (typeof POPULAR_LOCATIONS)[0]) => {
    onLocationSelect(pop.name, {
      latitude: pop.latitude,
      longitude: pop.longitude,
      source: 'city',
    });
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstResult = results[0];
      if (firstResult) {
        handleSelectPlace(firstResult);
      } else if (query.trim().length >= 2) {
        executeSearch(query);
      }
    }
  };

  return (
    <div className="location-popover-wrapper relative inline-flex items-center gap-1.5 flex-wrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {triggerVariant === 'hero' ? (
            <button
              type="button"
              className={`weather-select-trigger weather-select-location location-trigger-btn ${
                isFirstVisit ? 'location-trigger-first-visit' : ''
              }`}
              aria-label={`Current location: ${location}. Click to change city or use device location.`}
            >
              <span className="location-name-label font-medium whitespace-nowrap text-emerald-100">{location}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--primary)] opacity-80 shrink-0 ml-0.5" />
            </button>
          ) : triggerVariant === 'banner' ? (
            <button
              type="button"
              className="px-2.5 py-1.5 rounded-md bg-[var(--card)] hover:bg-[color-mix(in_oklch,var(--card)_90%,white)] border border-[var(--primary)] text-xs font-semibold text-[var(--primary)] shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 shadow-[0_0_8px_var(--panel-glow)]"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search city</span>
            </button>
          ) : (
            <button
              type="button"
              className="weather-select-trigger weather-select-location location-trigger-btn"
              aria-label={`Change location from ${location}. Click to search or use device location.`}
            >
              <span className="location-name-label whitespace-nowrap text-emerald-100">{location}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted-foreground)] ml-1 shrink-0" />
            </button>
          )}
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={8}
          className="location-popover-content w-[340px] sm:w-[390px] p-0"
        >
          <div className="location-search-header p-3 border-b border-[var(--fine-line)]">
            {/* Active device location indicator if currently using GPS */}
            {coords?.accuracy !== undefined && (
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--fine-line)] text-xs">
                <span className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-[var(--primary)]" />
                  Device accuracy:
                </span>
                <LocationAccuracyPopover
                  accuracy={coords.accuracy}
                  onOpenSearch={() => inputRef.current?.focus()}
                />
              </div>
            )}

          {/* 1. PRE-PERMISSION EXPLANATION PROMPT */}
          {showPrePermissionPrompt ? (
            <div className="gps-pre-permission-card p-3 mb-2.5 rounded-lg bg-[color-mix(in_oklch,var(--card)_80%,transparent)] border border-[var(--primary)] text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <Navigation className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[var(--foreground)] mb-0.5">
                    Device Location Permission
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                    {GEOLOCATION_PRE_PERMISSION_EXPLANATION}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={executeGeolocation}
                  disabled={isLocating}
                  className="flex-1 py-1.5 px-2 rounded-md bg-[var(--primary)] text-[#041a10] font-semibold text-xs hover:bg-[var(--foreground)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <span>Continue with device location</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPrePermissionPrompt(false);
                    inputRef.current?.focus();
                  }}
                  className="py-1.5 px-2.5 rounded-md border border-[var(--fine-line)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors cursor-pointer"
                >
                  Search city instead
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* GPS Quick Action Button */}
              <button
                type="button"
                onClick={() => setShowPrePermissionPrompt(true)}
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-[var(--primary)] bg-[var(--menu-highlight)] hover:bg-emerald-950/40 border border-[var(--border)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Detecting your coordinates...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
                    <span>Use Current Location (Device)</span>
                  </>
                )}
              </button>

              {/* Pre-permission explanation note below button */}
              <p className="text-[10.5px] text-[var(--muted-foreground)] px-1 mt-1 mb-2.5 leading-relaxed">
                Cadence uses an approximate device location to load local forecasts. You can search for a city instead.
              </p>
            </>
          )}

          {/* 2. COARSE ACCURACY WARNING BANNER (> 5 km) */}
          {coarseAccuracyNotice && (
            <div className="p-2.5 mb-2.5 rounded-lg bg-[color-mix(in_oklch,var(--caution)_15%,transparent)] border border-[color-mix(in_oklch,var(--caution)_35%,transparent)] text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[var(--caution)] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[var(--caution)]">
                    Coarse accuracy ({coarseAccuracyNotice.formatted})
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)] leading-snug mt-0.5">
                    Reported device accuracy is above 5 km. Searching for your city by name is the preferred alternative for more reliable forecasts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCoarseAccuracyNotice(null);
                  inputRef.current?.focus();
                }}
                className="w-full py-1.5 px-3 rounded-md bg-[var(--primary)] text-[#041a10] font-semibold text-xs hover:bg-[var(--foreground)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search for your city now</span>
              </button>
            </div>
          )}

          {/* Search Input Box */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => {
                const val = e.target.value;
                setQuery(val);
                setErrorMessage(null);
                activeQueryRef.current = val.trim();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type city or town (e.g. Jaipur, Pune, Mursan)..."
              className="w-full pl-9 pr-8 py-2 rounded-lg text-xs sm:text-sm bg-[var(--background)] border border-[var(--fine-line)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--primary)] transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setErrorMessage(null);
                  activeQueryRef.current = '';
                  abortRef.current?.abort();
                }}
                className="absolute right-2.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isSearching && (
            <div className="flex items-center gap-2 mt-2 text-xs text-[var(--muted-foreground)]">
              <Loader2 className="w-3 h-3 animate-spin text-[var(--primary)]" />
              <span>Searching locations...</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-1.5 mt-2 text-xs text-[var(--caution)] bg-[var(--caution-surface)] border border-[var(--caution-border)] p-2 rounded-md">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Live Search Results List */}
        <div className="max-h-[260px] overflow-y-auto p-1.5 scrollbar-thin">
          {results.length > 0 ? (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">
                Matching Places ({results.length})
              </div>
              {results.map((place, idx) => (
                <button
                  key={`${place.name}-${place.latitude}-${place.longitude}-${idx}`}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  className="w-full text-left flex items-center justify-between p-2 rounded-md hover:bg-[var(--menu-highlight)] hover:text-[var(--primary)] text-xs text-[var(--foreground)] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] shrink-0" />
                    <div className="truncate">
                      <span className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)]">
                        {place.name}
                      </span>
                      {(place.admin1 || place.country) && (
                        <span className="text-[var(--muted-foreground)] ml-1">
                          · {[place.admin1, place.country].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--muted-foreground)] shrink-0 ml-2 font-mono">
                    {place.latitude.toFixed(1)}°, {place.longitude.toFixed(1)}°
                  </span>
                </button>
              ))}
            </div>
          ) : query.trim().length >= 2 && !isSearching ? (
            /* Helpful "Different spelling or nearby city?" guide rather than saying "doesn't exist" */
            <div className="p-3 space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[color-mix(in_oklch,var(--card)_70%,transparent)] border border-[var(--fine-line)]">
                <HelpCircle className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--foreground)]">
                    Could it be under a different spelling?
                  </p>
                  <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                    We couldn't find a direct match for “<span className="text-[var(--primary)] font-medium">{query.trim()}</span>”. Weather and map directories often index towns or localities under a different spelling, transliteration, or parent district.
                  </p>
                </div>
              </div>

              <div className="px-1 space-y-1.5">
                <p className="text-[11px] font-semibold text-[var(--foreground)]">Suggestions to try:</p>
                <ul className="text-[11px] space-y-1 text-[var(--muted-foreground)] list-disc list-inside pl-0.5">
                  <li>Check alternate spellings (e.g. <em>Mursan</em> vs <em>Mursna</em>, <em>Bengaluru</em> vs <em>Bangalore</em>)</li>
                  <li>Search for the nearby district or state (e.g. <em>Hathras</em>, <em>Mathura</em>, <em>Aligarh</em>)</li>
                  <li>Or use <strong>device location (GPS)</strong> to get coordinates directly</li>
                </ul>
              </div>

              <div className="pt-1 border-t border-[var(--fine-line)]">
                <button
                  type="button"
                  onClick={() => setShowPrePermissionPrompt(true)}
                  className="w-full py-1.5 px-2.5 rounded-md bg-[var(--menu-highlight)] hover:bg-emerald-950/40 text-[var(--primary)] border border-[var(--border)] text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Use device location instead</span>
                </button>
              </div>
            </div>
          ) : !query.trim() ? (
            /* Popular Suggested Locations */
            <div className="p-1.5 space-y-2">
              <div className="flex items-center justify-between px-1 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold">
                <span>Suggested Cities</span>
                <Compass className="w-3 h-3 text-[var(--muted-foreground)]" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_LOCATIONS.map(pop => {
                  const cityName = pop.name.split(',')[0] ?? pop.name;
                  const isCurrent = location.toLowerCase().includes(cityName.toLowerCase());
                  return (
                    <button
                      key={pop.name}
                      type="button"
                      onClick={() => handleSelectPopular(pop)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[var(--primary)] text-[#041a10] border-[var(--primary)] font-semibold shadow-[0_0_8px_var(--primary)]'
                          : 'bg-[var(--card)] text-[var(--foreground)] border-[var(--fine-line)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                      }`}
                    >
                      {pop.name.split(',')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>

    {/* Subtle, non-intrusive first-visit nudge */}
    {isFirstVisit && triggerVariant === 'hero' && (
      <span
        className="first-visit-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-normal shrink-0"
        role="status"
        aria-label="Click location to change city or use GPS"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0 opacity-80 animate-pulse" />
        <span className="text-[var(--primary)]/90 tracking-normal">Change city</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismissFirstVisit();
          }}
          className="first-visit-dismiss-btn"
          aria-label="Dismiss tip"
          title="Dismiss tip"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      </span>
    )}
  </div>
);
}
