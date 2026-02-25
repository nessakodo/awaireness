/**
 * Relatable Comparisons
 *
 * Converts abstract metrics into everyday American equivalents.
 * All reference values sourced from EPA, USGS, EIA, and DOE.
 */

export interface Comparison {
  text: string;
  detail: string;
}

// ─── Water comparisons ──────────────────────────────────

const GLASS_OF_WATER_L = 0.24;       // 8 oz glass
const TOILET_FLUSH_L = 6.0;          // standard 1.6 gal flush
const SHOWER_MINUTE_L = 7.6;         // 2 gal/min average
const BOTTLE_OF_WATER_L = 0.5;       // standard 16.9 oz bottle
const GARDEN_HOSE_MINUTE_L = 34;     // ~9 gal/min
const LOAD_OF_LAUNDRY_L = 57;        // ~15 gal, modern washer
const BATH_L = 150;                   // ~40 gal average bath
const POOL_FILL_L = 56_000;          // 15,000 gal average pool

export function waterComparison(liters: number): Comparison {
  if (liters < 0.01) {
    return {
      text: 'A few drops of water',
      detail: 'Less than a teaspoon — barely enough to notice.',
    };
  }
  if (liters < GLASS_OF_WATER_L) {
    const sips = Math.round(liters / 0.03); // ~1 oz sip
    return {
      text: `About ${sips} sip${sips !== 1 ? 's' : ''} of water`,
      detail: `Like taking ${sips} sip${sips !== 1 ? 's' : ''} from a glass.`,
    };
  }
  if (liters < BOTTLE_OF_WATER_L) {
    const glasses = (liters / GLASS_OF_WATER_L);
    return {
      text: `${glasses.toFixed(1)} glasses of water`,
      detail: `About ${glasses.toFixed(1)} standard 8-oz glasses.`,
    };
  }
  if (liters < TOILET_FLUSH_L) {
    const bottles = (liters / BOTTLE_OF_WATER_L);
    return {
      text: `${bottles.toFixed(1)} water bottles`,
      detail: `Like drinking ${bottles.toFixed(1)} standard water bottles.`,
    };
  }
  if (liters < SHOWER_MINUTE_L * 3) {
    const flushes = (liters / TOILET_FLUSH_L);
    return {
      text: `${flushes.toFixed(1)} toilet flushes`,
      detail: `Same water as flushing a standard toilet ${flushes.toFixed(1)} times.`,
    };
  }
  if (liters < LOAD_OF_LAUNDRY_L) {
    const minutes = (liters / SHOWER_MINUTE_L);
    return {
      text: `A ${minutes.toFixed(0)}-minute shower`,
      detail: `Same water as running an average shower for ${minutes.toFixed(0)} minutes.`,
    };
  }
  if (liters < BATH_L) {
    const loads = (liters / LOAD_OF_LAUNDRY_L);
    return {
      text: `${loads.toFixed(1)} loads of laundry`,
      detail: `Same water as running a modern washing machine ${loads.toFixed(1)} times.`,
    };
  }
  if (liters < GARDEN_HOSE_MINUTE_L * 60) {
    const baths = (liters / BATH_L);
    return {
      text: `${baths.toFixed(1)} baths`,
      detail: `Same as filling a bathtub ${baths.toFixed(1)} times.`,
    };
  }
  if (liters < POOL_FILL_L) {
    const hoseMinutes = (liters / GARDEN_HOSE_MINUTE_L);
    return {
      text: `${hoseMinutes.toFixed(0)} min of garden hose`,
      detail: `Like running a garden hose for ${hoseMinutes.toFixed(0)} minutes.`,
    };
  }
  const pools = (liters / POOL_FILL_L);
  return {
    text: `${pools.toFixed(2)} swimming pools`,
    detail: `Enough to fill ${pools.toFixed(2)} average backyard swimming pools.`,
  };
}

// ─── Energy comparisons ──────────────────────────────────

const PHONE_CHARGE_KWH = 0.012;       // iPhone/Android full charge
const LAPTOP_HOUR_KWH = 0.05;         // typical laptop
const MICROWAVE_10MIN_KWH = 0.17;     // 1000W microwave
const LOAD_LAUNDRY_KWH = 0.5;         // modern washer cycle
const TV_HOUR_KWH = 0.1;              // 55" LED TV
const FRIDGE_DAY_KWH = 1.5;           // modern fridge per day
const AC_HOUR_KWH = 3.0;             // central AC per hour
const EV_MILE_KWH = 0.3;             // average EV per mile
const US_HOME_DAY_KWH = 29;          // average US household daily

export function energyComparison(kwh: number): Comparison {
  if (kwh < 0.001) {
    return {
      text: 'A fraction of a phone charge',
      detail: 'Barely a blip — less energy than your phone uses in a minute.',
    };
  }
  if (kwh < PHONE_CHARGE_KWH) {
    const pct = (kwh / PHONE_CHARGE_KWH) * 100;
    return {
      text: `${pct.toFixed(0)}% of a phone charge`,
      detail: `About ${pct.toFixed(0)}% of the energy to fully charge a smartphone.`,
    };
  }
  if (kwh < LAPTOP_HOUR_KWH) {
    const charges = (kwh / PHONE_CHARGE_KWH);
    return {
      text: `${charges.toFixed(1)} phone charges`,
      detail: `Enough energy to fully charge a smartphone ${charges.toFixed(1)} times.`,
    };
  }
  if (kwh < MICROWAVE_10MIN_KWH) {
    const hours = (kwh / LAPTOP_HOUR_KWH);
    return {
      text: `${hours.toFixed(1)}h of laptop use`,
      detail: `Same energy as running a laptop for ${hours.toFixed(1)} hours.`,
    };
  }
  if (kwh < LOAD_LAUNDRY_KWH) {
    const tvHours = (kwh / TV_HOUR_KWH);
    return {
      text: `${tvHours.toFixed(1)}h of watching TV`,
      detail: `Like watching a 55" LED TV for ${tvHours.toFixed(1)} hours.`,
    };
  }
  if (kwh < FRIDGE_DAY_KWH) {
    const loads = (kwh / LOAD_LAUNDRY_KWH);
    return {
      text: `${loads.toFixed(1)} laundry loads`,
      detail: `Same energy as running ${loads.toFixed(1)} washing machine cycles.`,
    };
  }
  if (kwh < AC_HOUR_KWH) {
    const fridgeDays = (kwh / FRIDGE_DAY_KWH);
    return {
      text: `${fridgeDays.toFixed(1)} days of fridge`,
      detail: `Like powering your refrigerator for ${fridgeDays.toFixed(1)} days.`,
    };
  }
  if (kwh < US_HOME_DAY_KWH) {
    const acHours = (kwh / AC_HOUR_KWH);
    return {
      text: `${acHours.toFixed(1)}h of AC`,
      detail: `Same as running central air conditioning for ${acHours.toFixed(1)} hours.`,
    };
  }
  if (kwh < US_HOME_DAY_KWH * 7) {
    const evMiles = (kwh / EV_MILE_KWH);
    return {
      text: `${evMiles.toFixed(0)} miles in an EV`,
      detail: `Enough to drive an electric car about ${evMiles.toFixed(0)} miles.`,
    };
  }
  const homeDays = (kwh / US_HOME_DAY_KWH);
  return {
    text: `${homeDays.toFixed(1)} days powering a home`,
    detail: `Same energy as an average US household uses in ${homeDays.toFixed(1)} days.`,
  };
}

// ─── CO₂ comparisons ──────────────────────────────────────

const GOOGLE_SEARCH_G = 0.2;          // per search
const STREAMING_HOUR_G = 36;          // 1h Netflix
const MILE_DRIVEN_G = 400;            // avg gasoline car
const CHEESEBURGER_G = 3600;          // lifecycle CO2
const TREE_YEAR_ABSORB_G = 22_000;    // one tree absorbs per year

export function co2Comparison(grams: number): Comparison {
  if (grams < 1) {
    return {
      text: `${(grams / GOOGLE_SEARCH_G).toFixed(0)} Google searches`,
      detail: `About the same CO₂ as ${(grams / GOOGLE_SEARCH_G).toFixed(0)} Google searches.`,
    };
  }
  if (grams < STREAMING_HOUR_G) {
    const searches = (grams / GOOGLE_SEARCH_G);
    return {
      text: `${searches.toFixed(0)} Google searches`,
      detail: `Same carbon footprint as about ${searches.toFixed(0)} Google searches.`,
    };
  }
  if (grams < MILE_DRIVEN_G) {
    const hours = (grams / STREAMING_HOUR_G);
    return {
      text: `${hours.toFixed(1)}h of streaming`,
      detail: `Like streaming Netflix for ${hours.toFixed(1)} hours.`,
    };
  }
  if (grams < CHEESEBURGER_G) {
    const miles = (grams / MILE_DRIVEN_G);
    return {
      text: `Driving ${miles.toFixed(1)} miles`,
      detail: `Same emissions as driving an average car ${miles.toFixed(1)} miles.`,
    };
  }
  if (grams < TREE_YEAR_ABSORB_G) {
    const burgers = (grams / CHEESEBURGER_G);
    return {
      text: `${burgers.toFixed(1)} cheeseburgers`,
      detail: `Same lifecycle carbon as producing ${burgers.toFixed(1)} cheeseburgers.`,
    };
  }
  const treePct = (grams / TREE_YEAR_ABSORB_G) * 100;
  return {
    text: `${treePct.toFixed(0)}% of what a tree absorbs/yr`,
    detail: `A single tree absorbs about 22 kg of CO₂ per year. Your usage equals ${treePct.toFixed(0)}% of that.`,
  };
}
