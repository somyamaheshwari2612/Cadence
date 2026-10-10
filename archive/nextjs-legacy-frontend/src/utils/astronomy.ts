/**
 * Astronomy Engine: Solar & Lunar calculations
 * Implements SunCalc astronomical formulas + 24-hour shifting-window logic
 * based on the specification in moon.txt
 */

const PI = Math.PI;
const rad = PI / 180;
const deg = 180 / PI;
const sin = Math.sin;
const cos = Math.cos;
const tan = Math.tan;
const asin = Math.asin;
const atan2 = Math.atan2;

// Date / time conversions
const dayMs = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;

function toJulian(date: Date): number {
  return date.getTime() / dayMs - 0.5 + J1970;
}

function fromJulian(j: number): Date {
  return new Date((j + 0.5 - J1970) * dayMs);
}

function toDays(date: Date): number {
  return toJulian(date) - J2000;
}

// Obliquity of the Earth
const e = rad * 23.4397;

function rightAscension(l: number, b: number): number {
  return atan2(sin(l) * cos(e) - tan(b) * sin(e), cos(l));
}

function declination(l: number, b: number): number {
  return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l));
}

function azimuth(H: number, phi: number, dec: number): number {
  return atan2(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi));
}

function altitude(H: number, phi: number, dec: number): number {
  return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H));
}

function siderealTime(d: number, lw: number): number {
  return rad * (280.16 + 360.9856235 * d) - lw;
}

// Sun calculations
function solarMeanAnomaly(d: number): number {
  return rad * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M: number): number {
  const C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)); // equation of center
  const P = rad * 102.9372; // perihelion of the Earth
  return M + C + P + PI;
}

function sunCoords(d: number) {
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  return {
    dec: declination(L, 0),
    ra: rightAscension(L, 0),
  };
}

// Moon calculations
function moonCoords(d: number) {
  // geocentric ecliptic coordinates of the moon
  const L = rad * (218.316 + 13.176396 * d); // ecliptic longitude
  const M = rad * (134.963 + 13.064993 * d); // mean anomaly
  const F = rad * (93.272 + 13.22935 * d);  // mean distance

  const l = L + rad * 6.289 * sin(M); // longitude
  const b = rad * 5.128 * sin(F);     // latitude
  const dt = 385001 - 20905 * cos(M); // distance to the moon in km

  return {
    ra: rightAscension(l, b),
    dec: declination(l, b),
    dist: dt,
  };
}

export function getMoonPosition(date: Date, lat: number, lng: number) {
  const lw = rad * -lng;
  const phi = rad * lat;
  const d = toDays(date);
  const c = moonCoords(d);
  const H = siderealTime(d, lw) - c.ra;
  let h = altitude(H, phi, c.dec);
  // altitude correction for parallax
  h = h + rad * 0.017 / tan(h + rad * 10.26 / (h + rad * 5.1));

  return {
    azimuth: azimuth(H, phi, c.dec),
    altitude: h,
    distance: c.dist,
  };
}

export function getMoonIllumination(date: Date) {
  const d = toDays(date);
  const s = sunCoords(d);
  const m = moonCoords(d);

  const sdist = 149598000; // distance from Earth to Sun in km

  const phi = Math.acos(
    sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra)
  );
  const inc = atan2(sdist * sin(phi), m.dist - sdist * cos(phi));
  const angle = atan2(
    cos(s.dec) * sin(s.ra - m.ra),
    sin(s.dec) * cos(m.dec) - cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra)
  );

  const fraction = (1 + cos(inc)) / 2;
  const phase = 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / PI;

  return {
    fraction,
    phase,
    angle,
  };
}

/**
 * Calculates raw moonrise and moonset for a single date
 */
function getRawMoonTimes(date: Date, lat: number, lng: number) {
  const t = new Date(date);
  t.setHours(0, 0, 0, 0);

  const hc = 0.133 * rad;
  let h0 = getMoonPosition(t, lat, lng).altitude - hc;
  let rise: number | null = null;
  let set: number | null = null;

  // Step through the day in 2-hour increments
  for (let i = 1; i <= 24; i += 2) {
    const d1 = new Date(t.getTime() + i * 3600000);
    const d2 = new Date(t.getTime() + (i + 1) * 3600000);

    const h1 = getMoonPosition(d1, lat, lng).altitude - hc;
    const h2 = getMoonPosition(d2, lat, lng).altitude - hc;

    const a = (h0 + h2) / 2 - h1;
    const b = (h2 - h0) / 2;
    const xe = -b / (2 * a);
    const ye = (a * xe + b) * xe + h1;
    const d = b * b - 4 * a * h1;
    let roots = 0;

    let x1 = 0;
    let x2 = 0;

    if (d >= 0) {
      const dx = Math.sqrt(d) / (Math.abs(a) * 2);
      x1 = xe - dx;
      x2 = xe + dx;
      if (Math.abs(x1) <= 1) roots++;
      if (Math.abs(x2) <= 1) roots++;
      if (x1 < -1) x1 = x2;
    }

    if (roots === 1) {
      if (h0 < 0) rise = i + x1;
      else set = i + x1;
    } else if (roots === 2) {
      rise = i + (ye < 0 ? x2 : x1);
      set = i + (ye < 0 ? x1 : x2);
    }

    if (rise !== null && set !== null) break;
    h0 = h2;
  }

  const moonrise = rise !== null ? new Date(t.getTime() + rise * 3600000) : undefined;
  const moonset = set !== null ? new Date(t.getTime() + set * 3600000) : undefined;

  return { moonrise, moonset };
}

/**
 * High-level Moon Times calculation implementing the exact 3-step shifting algorithm
 * specified in moon.txt:
 *
 * Step 1: Anchor at Noon (12:00 PM local time)
 * Step 2: Calculate Base Times
 * Step 3: Forward-Scan for Missing Events (24-hour shift)
 */
export function calculateLunarTimes(
  currentDate: Date = new Date(),
  latitude: number = 27.1767,
  longitude: number = 78.0081
) {
  // Step 1: Anchor at Noon (12:00 PM local time)
  const searchDate = new Date(currentDate);
  searchDate.setHours(12, 0, 0, 0);

  // Step 2: Calculate Base Times
  const baseTimes = getRawMoonTimes(searchDate, latitude, longitude);
  let moonrise = baseTimes.moonrise;
  let moonset = baseTimes.moonset;
  let moonriseShifted = false;
  let moonsetShifted = false;

  // Step 3: Forward-Scan for Missing Events (The 24-hour shift)
  if (!moonrise) {
    const nextDay = new Date(searchDate.getTime() + 24 * 60 * 60 * 1000);
    const nextTimes = getRawMoonTimes(nextDay, latitude, longitude);
    moonrise = nextTimes.moonrise;
    moonriseShifted = true;
  }

  if (!moonset) {
    const nextDay = new Date(searchDate.getTime() + 24 * 60 * 60 * 1000);
    const nextTimes = getRawMoonTimes(nextDay, latitude, longitude);
    moonset = nextTimes.moonset;
    moonsetShifted = true;
  }

  // Illumination & Phase calculations
  const illumination = getMoonIllumination(currentDate);
  const phaseInfo = getMoonPhaseDetails(illumination.phase, illumination.fraction);

  return {
    moonrise,
    moonset,
    moonriseShifted,
    moonsetShifted,
    fraction: illumination.fraction, // 0 to 1
    fractionPercent: Math.round(illumination.fraction * 100),
    phase: illumination.phase,       // 0 to 1
    phaseName: phaseInfo.name,
    phaseCategory: phaseInfo.category,
    phaseDescription: phaseInfo.description,
    isWaxing: illumination.phase < 0.5,
  };
}

export function getMoonPhaseDetails(phase: number, fraction: number) {
  // Phase is 0 to 1 (0: New Moon, 0.25: First Quarter, 0.5: Full Moon, 0.75: Last Quarter)
  let name = "";
  let category = "";
  let description = "";

  if (phase < 0.03 || phase > 0.97) {
    name = "New Moon";
    category = "new";
    description = "The Moon is positioned between Earth and Sun; dark disc.";
  } else if (phase < 0.22) {
    name = "Waxing Crescent";
    category = "waxing_crescent";
    description = "A silver sliver growing brighter in the western evening sky.";
  } else if (phase < 0.28) {
    name = "First Quarter";
    category = "first_quarter";
    description = "Half the lunar disc is illuminated; rising around midday.";
  } else if (phase < 0.47) {
    name = "Waxing Gibbous";
    category = "waxing_gibbous";
    description = "More than half illuminated, approaching full brilliance.";
  } else if (phase < 0.53) {
    name = "Full Moon";
    category = "full";
    description = "Fully illuminated disc opposite the Sun all night long.";
  } else if (phase < 0.72) {
    name = "Waning Gibbous";
    category = "waning_gibbous";
    description = "Illumination gradually tapering after the full peak.";
  } else if (phase < 0.78) {
    name = "Last Quarter";
    category = "last_quarter";
    description = "Half illuminated on the waning side; visible in early morning.";
  } else {
    name = "Waning Crescent";
    category = "waning_crescent";
    description = "A delicate crescent rising in the pre-dawn eastern sky.";
  }

  return { name, category, description };
}

/**
 * Calculates Solar Arc (Sunrise, Sunset, and current sun progression)
 */
export function calculateSolarArc(
  currentDate: Date = new Date(),
  sunriseStr?: string,
  sunsetStr?: string,
  latitude: number = 27.1767,
  longitude: number = 78.0081
) {
  let sunrise: Date;
  let sunset: Date;

  if (sunriseStr && sunsetStr) {
    sunrise = new Date(sunriseStr);
    sunset = new Date(sunsetStr);
  } else {
    // Fallback astronomical calculation
    const d = toDays(currentDate);
    const lw = rad * -longitude;
    const phi = rad * latitude;
    const n = Math.round(d - 0.0009 - lw / (2 * PI));
    const ds = n + 0.0009 + lw / (2 * PI);
    const M = solarMeanAnomaly(ds);
    const L = eclipticLongitude(M);
    const dec = declination(L, 0);
    const Jnoon = J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L);

    const h0 = -0.833 * rad; // horizon refraction angle
    const cosw = (sin(h0) - sin(phi) * sin(dec)) / (cos(phi) * cos(dec));
    const clampedCosw = Math.max(-1, Math.min(1, cosw));
    const w = Math.acos(clampedCosw);

    const Jrise = Jnoon - w / (2 * PI);
    const Jset = Jnoon + w / (2 * PI);

    sunrise = fromJulian(Jrise);
    sunset = fromJulian(Jset);
  }

  const now = currentDate.getTime();
  const riseTime = sunrise.getTime();
  const setTime = sunset.getTime();

  const isDaytime = now >= riseTime && now <= setTime;
  const dayLengthMs = Math.max(0, setTime - riseTime);
  const dayLengthHours = (dayLengthMs / 3600000).toFixed(1);

  // Position along the parabolic arc (0 = Sunrise, 0.5 = Solar Noon, 1 = Sunset)
  let sunProgress = 0;
  if (now < riseTime) {
    sunProgress = 0; // Pre-dawn
  } else if (now > setTime) {
    sunProgress = 1; // Post-dusk
  } else {
    sunProgress = (now - riseTime) / dayLengthMs;
  }

  // Golden hour estimation (approx 45 minutes before sunset)
  const goldenHourStart = new Date(sunset.getTime() - 45 * 60 * 1000);

  return {
    sunrise,
    sunset,
    isDaytime,
    sunProgress: Math.min(1, Math.max(0, sunProgress)),
    dayLengthHours,
    goldenHourStart,
  };
}

/**
 * Format a Date to HH:mm (24-hour) or hh:mm a (12-hour)
 */
export function formatTime(date?: Date | null, use24h: boolean = false): string {
  if (!date || isNaN(date.getTime())) return "--:--";
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (use24h) {
    return `${pad(hours)}:${pad(minutes)}`;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${pad(minutes)} ${period}`;
}
