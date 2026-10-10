/**
 * CPCB National Air Quality Index (NAQI) Engine for India.
 * Implements the official Central Pollution Control Board (CPCB) linear interpolation
 * breakpoints to convert PM2.5 and PM10 (µg/m³) into authentic Indian NAQI values.
 *
 * Source: Central Pollution Control Board (CPCB), MoEFCC, Government of India.
 */

export interface CpcbNaqiResult {
  naqi: number;
  category: "Good" | "Satisfactory" | "Moderate" | "Poor" | "Very Poor" | "Severe";
  colorClass: string;
  badgeClass: string;
  advisory: string;
  dominantPollutant: string;
}

export function calculateCpcbPm25Subindex(pm25?: number | null): number | null {
  if (pm25 === undefined || pm25 === null || pm25 < 0) return null;

  if (pm25 <= 30) {
    return Math.round((50.0 / 30.0) * pm25);
  } else if (pm25 <= 60) {
    return Math.round(50.0 + (50.0 / 30.0) * (pm25 - 30.0));
  } else if (pm25 <= 90) {
    return Math.round(100.0 + (100.0 / 30.0) * (pm25 - 60.0));
  } else if (pm25 <= 120) {
    return Math.round(200.0 + (100.0 / 30.0) * (pm25 - 90.0));
  } else if (pm25 <= 250) {
    return Math.round(300.0 + (100.0 / 130.0) * (pm25 - 120.0));
  } else {
    const val = 400.0 + (100.0 / 150.0) * (pm25 - 250.0);
    return Math.round(Math.min(500.0, val));
  }
}

export function calculateCpcbPm10Subindex(pm10?: number | null): number | null {
  if (pm10 === undefined || pm10 === null || pm10 < 0) return null;

  if (pm10 <= 50) {
    return Math.round(pm10);
  } else if (pm10 <= 100) {
    return Math.round(50.0 + (pm10 - 50.0));
  } else if (pm10 <= 250) {
    return Math.round(100.0 + (100.0 / 150.0) * (pm10 - 100.0));
  } else if (pm10 <= 350) {
    return Math.round(200.0 + (100.0 / 100.0) * (pm10 - 250.0));
  } else if (pm10 <= 430) {
    return Math.round(300.0 + (100.0 / 80.0) * (pm10 - 350.0));
  } else {
    const val = 400.0 + (100.0 / 70.0) * (pm10 - 430.0);
    return Math.round(Math.min(500.0, val));
  }
}

export function getCpcbCategoryDetails(naqi: number) {
  if (naqi <= 50) {
    return {
      category: "Good" as const,
      colorClass: "text-emerald-300",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      advisory: "Minimal health impact. Clean breathing condition.",
    };
  } else if (naqi <= 100) {
    return {
      category: "Satisfactory" as const,
      colorClass: "text-lime-300",
      badgeClass: "bg-lime-500/15 text-lime-300 border-lime-500/30",
      advisory: "Minor breathing discomfort to sensitive individuals.",
    };
  } else if (naqi <= 200) {
    return {
      category: "Moderate" as const,
      colorClass: "text-yellow-300",
      badgeClass: "bg-amber-400/15 text-amber-300 border-amber-400/30",
      advisory: "Breathing discomfort to people with asthma or lung disease.",
    };
  } else if (naqi <= 300) {
    return {
      category: "Poor" as const,
      colorClass: "text-orange-400",
      badgeClass: "bg-orange-500/15 text-orange-300 border-orange-500/30",
      advisory: "Breathing discomfort to most people on prolonged exposure.",
    };
  } else if (naqi <= 400) {
    return {
      category: "Very Poor" as const,
      colorClass: "text-rose-400",
      badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      advisory: "Respiratory illness on prolonged exposure. Significant risk.",
    };
  } else {
    return {
      category: "Severe" as const,
      colorClass: "text-rose-300",
      badgeClass: "bg-rose-900/40 text-rose-200 border-rose-700/50",
      advisory: "Affects healthy individuals and seriously impacts vulnerable groups.",
    };
  }
}

export function calculateIndiaNaqi(pm25?: number | null, pm10?: number | null): CpcbNaqiResult | null {
  const s25 = calculateCpcbPm25Subindex(pm25);
  const s10 = calculateCpcbPm10Subindex(pm10);

  const candidates: number[] = [];
  if (s25 !== null) candidates.push(s25);
  if (s10 !== null) candidates.push(s10);

  if (candidates.length === 0) return null;

  const naqi = Math.max(...candidates);
  const details = getCpcbCategoryDetails(naqi);

  return {
    naqi,
    category: details.category,
    colorClass: details.colorClass,
    badgeClass: details.badgeClass,
    advisory: details.advisory,
    dominantPollutant: s25 === naqi ? "PM2.5" : "PM10",
  };
}
