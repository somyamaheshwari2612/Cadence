import { describe, it, expect } from 'vitest';
import {
  formatAccuracy,
  isCoarseAccuracy,
  COARSE_ACCURACY_THRESHOLD_METERS,
  GEOLOCATION_PRE_PERMISSION_EXPLANATION,
  GEOLOCATION_EXPLANATION,
} from '@/lib/location-utils';

describe('Location & Geolocation Utilities', () => {
  describe('formatAccuracy', () => {
    it('formats sub-kilometer accuracy in meters as "Approx. ±X m"', () => {
      expect(formatAccuracy(15)).toBe('Approx. ±15 m');
      expect(formatAccuracy(65.4)).toBe('Approx. ±65 m');
      expect(formatAccuracy(800)).toBe('Approx. ±800 m');
      expect(formatAccuracy(999)).toBe('Approx. ±999 m');
    });

    it('formats multi-kilometer accuracy in kilometers as "Approx. ±X km"', () => {
      expect(formatAccuracy(1200)).toBe('Approx. ±1.2 km');
      expect(formatAccuracy(3500)).toBe('Approx. ±3.5 km');
      expect(formatAccuracy(5200)).toBe('Approx. ±5.2 km');
      expect(formatAccuracy(15000)).toBe('Approx. ±15 km');
    });

    it('returns empty string for null, undefined, or invalid inputs', () => {
      expect(formatAccuracy(undefined)).toBe('');
      expect(formatAccuracy(null)).toBe('');
      expect(formatAccuracy(NaN)).toBe('');
    });

    it('does not assume device type and preserves direct API measurements', () => {
      // Regardless of whether device is a phone or laptop, accuracy is read directly
      const phoneAccuracyMeters = 12;
      const laptopWifiAccuracyMeters = 6500;
      expect(formatAccuracy(phoneAccuracyMeters)).toBe('Approx. ±12 m');
      expect(formatAccuracy(laptopWifiAccuracyMeters)).toBe('Approx. ±6.5 km');
    });
  });

  describe('isCoarseAccuracy', () => {
    it('correctly flags accuracy above 5 km (> 5000m)', () => {
      expect(isCoarseAccuracy(5001)).toBe(true);
      expect(isCoarseAccuracy(6500)).toBe(true);
      expect(isCoarseAccuracy(20000)).toBe(true);
    });

    it('does not flag accuracy at or below 5 km (<= 5000m)', () => {
      expect(isCoarseAccuracy(5000)).toBe(false);
      expect(isCoarseAccuracy(4999)).toBe(false);
      expect(isCoarseAccuracy(50)).toBe(false);
      expect(isCoarseAccuracy(undefined)).toBe(false);
    });

    it('uses the 5000m constant', () => {
      expect(COARSE_ACCURACY_THRESHOLD_METERS).toBe(5000);
    });
  });

  describe('Explanations & Educational Content', () => {
    it('provides clear pre-permission explanation recommending city search alternative', () => {
      expect(GEOLOCATION_PRE_PERMISSION_EXPLANATION).toContain('approximate device location');
      expect(GEOLOCATION_PRE_PERMISSION_EXPLANATION).toContain('search for a city instead');
    });

    it('explains all sensor sources in device location', () => {
      const sources = GEOLOCATION_EXPLANATION.sources;
      expect(sources).toContain('GPS');
      expect(sources).toContain('Wi‑Fi');
      expect(sources).toContain('cellular');
      expect(sources).toContain('Bluetooth');
      expect(sources).toContain('IP');
      expect(sources).toContain('sensors');
      expect(sources).toContain('accuracy varies by conditions');
    });

    it('clearly states that forecast model-grid resolution can be much coarser than device-location accuracy', () => {
      const modelGrid = GEOLOCATION_EXPLANATION.modelGrid;
      expect(modelGrid).toContain('model-grid resolution can be much coarser than device-location accuracy');
      expect(modelGrid).toContain('Open-Meteo');
      expect(modelGrid).toContain('CAMS');
    });

    it('presents city search as the preferred alternative when reported accuracy is above 5 km', () => {
      const coarseAlt = GEOLOCATION_EXPLANATION.coarseAlternative;
      expect(coarseAlt).toContain('above 5 km');
      expect(coarseAlt).toContain('searching for your city by name is the preferred alternative');
    });
  });
});
