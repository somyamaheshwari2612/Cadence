/**
 * Cadence Location & Geolocation Utilities
 * Provides standardized formatting, accuracy reporting, and explanations for device location.
 */

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number | undefined; // In meters, read directly from GeolocationPosition.coords.accuracy
  source?: 'gps' | 'city' | 'search' | undefined;
}

/** Threshold above which device location is considered coarse (> 5 km per specification). */
export const COARSE_ACCURACY_THRESHOLD_METERS = 5000;

/**
 * Formats a raw numeric accuracy (in meters) into the standardized display string:
 * “Approx. ±X m/km”. Does not assume device type (phone vs. laptop).
 */
export function formatAccuracy(accuracyInMeters?: number | null): string {
  if (accuracyInMeters === undefined || accuracyInMeters === null || isNaN(accuracyInMeters)) {
    return '';
  }
  if (accuracyInMeters < 1000) {
    return `Approx. ±${Math.round(accuracyInMeters)} m`;
  }
  const km = accuracyInMeters / 1000;
  // If under 10 km show 1 decimal place (e.g., 6.2 km); otherwise round to nearest km (e.g., 15 km)
  return `Approx. ±${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/**
 * Checks whether the reported accuracy is coarse (above 5 km).
 */
export function isCoarseAccuracy(accuracyInMeters?: number | null): boolean {
  return typeof accuracyInMeters === 'number' && accuracyInMeters > COARSE_ACCURACY_THRESHOLD_METERS;
}

/** Pre-permission explanation text */
export const GEOLOCATION_PRE_PERMISSION_EXPLANATION =
  'Cadence uses an approximate device location to load local forecasts. You can search for a city instead.';

/** Detailed educational text for info popover */
export const GEOLOCATION_EXPLANATION = {
  sources:
    'Device location may use GPS, Wi‑Fi, cellular, Bluetooth, IP, and sensors; accuracy varies by conditions.',
  modelGrid:
    'Forecast model-grid resolution can be much coarser than device-location accuracy. Numerical weather prediction systems (Open-Meteo) compute atmospheric models over ~11–25 km cells, and atmospheric chemistry models (CAMS) operate over ~40 km cells. Live forecasts reflect the average modeled atmosphere of the surrounding grid cell.',
  coarseAlternative:
    'Because your device location reported coarse accuracy (above 5 km), searching for your city by name is the preferred alternative for more reliable forecasts.',
};
