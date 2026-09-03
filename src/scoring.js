// Turning a raw score into a scaled score and an estimated percentile.
//
// The scales and the percentile anchors below come from the score reports the
// test makers publish. They are ESTIMATES here for two reasons: a practice set
// of eight questions is far shorter than a real paper, and real tests equate
// each administration so the same raw score can map to slightly different
// scaled scores on different days. Treat the band, not the number.

// Linear interpolation through a table of [value, percentile] anchors,
// which must be listed high to low.
function interpolate(table, value) {
  if (value >= table[0][0]) return table[0][1];
  const last = table[table.length - 1];
  if (value <= last[0]) return last[1];
  for (let i = 0; i < table.length - 1; i++) {
    const [hiV, hiP] = table[i];
    const [loV, loP] = table[i + 1];
    if (value <= hiV && value >= loV) {
      const span = hiV - loV;
      const t = span === 0 ? 0 : (value - loV) / span;
      return loP + t * (hiP - loP);
    }
  }
  return last[1];
}

const PERCENTILES = {
  // Composite score, percentile of test takers at or below it.
  sat: [[1600, 99], [1500, 98], [1400, 94], [1300, 86], [1200, 74], [1100, 58], [1000, 40], [900, 23], [800, 10], [700, 3], [400, 1]],
  act: [[36, 100], [34, 99], [32, 96], [30, 93], [28, 88], [26, 82], [24, 74], [22, 63], [20, 52], [18, 41], [16, 27], [14, 14], [12, 6], [1, 1]],
  toefl: [[120, 100], [110, 96], [100, 82], [90, 62], [80, 42], [70, 24], [60, 12], [50, 5], [0, 1]],
  // SSAT percentiles are against same grade and gender only, so they run low.
  ssat: [[800, 99], [750, 90], [720, 78], [700, 65], [680, 52], [650, 33], [620, 18], [600, 10], [500, 1]],
  // IELTS publishes band distributions rather than percentiles.
  ielts: [[9, 99], [8.5, 97], [8, 93], [7.5, 86], [7, 75], [6.5, 60], [6, 43], [5.5, 27], [5, 15], [4, 5], [0, 1]],
};

// IELTS Listening and Reading are marked out of 40 and converted to a band.
// This is the widely published Academic Reading conversion.
const IELTS_BANDS = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7],
  [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [0, 3.5],
];

function ieltsBand(rawOutOf40) {
  for (const [min, band] of IELTS_BANDS) {
    if (rawOutOf40 >= min) return band;
  }
  return 3.5;
}

const round10 = (n) => Math.round(n / 10) * 10;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * @param {string} scoring  which test's scale to use
 * @param {number} right    questions answered correctly
 * @param {number} total    questions in the set
 */
export function estimate(scoring, right, total) {
  const pct = total === 0 ? 0 : right / total;

  switch (scoring) {
    case "sat": {
      const scaled = clamp(round10(400 + pct * 1200), 400, 1600);
      return {
        scaled: String(scaled),
        unit: "out of 1600",
        percentile: interpolate(PERCENTILES.sat, scaled),
        detail: `About ${round10(200 + pct * 600)} per section if you scored evenly.`,
      };
    }

    case "act": {
      const scaled = clamp(Math.round(1 + pct * 35), 1, 36);
      return {
        scaled: String(scaled),
        unit: "composite, out of 36",
        percentile: interpolate(PERCENTILES.act, scaled),
        detail: "The composite is the average of your section scores, rounded.",
      };
    }

    case "toefl": {
      const scaled = clamp(Math.round(pct * 120), 0, 120);
      return {
        scaled: String(scaled),
        unit: "out of 120",
        percentile: interpolate(PERCENTILES.toefl, scaled),
        detail: `Roughly ${Math.round(pct * 30)} in each of the four sections.`,
      };
    }

    case "ssat": {
      const scaled = clamp(Math.round(500 + pct * 300), 500, 800);
      return {
        scaled: String(scaled),
        unit: "per section, 500 to 800",
        percentile: interpolate(PERCENTILES.ssat, scaled),
        detail: "SSAT percentiles compare you only with the same grade and gender, so they read lower than other tests.",
      };
    }

    case "ielts": {
      const band = ieltsBand(Math.round(pct * 40));
      return {
        scaled: band.toFixed(1),
        unit: "band, out of 9",
        percentile: interpolate(PERCENTILES.ielts, band),
        detail: `Equivalent to about ${Math.round(pct * 40)} out of 40 raw marks.`,
      };
    }

    default:
      return { scaled: `${right}/${total}`, unit: "", percentile: pct * 100, detail: "" };
  }
}
