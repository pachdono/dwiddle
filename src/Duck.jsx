// The mascot, drawn as vectors so it stays sharp at 16px in a browser tab and
// at 240px on an empty state, and so it costs nothing to load.
//
// Proportions are measured off the reference art: the brim spans about 68% of
// the width and clears the top of the sunglasses, the body about 75%, and the
// head sits inside the top of the body so the two read as one silhouette.
//
// The colours are deliberately fixed rather than themed. A mascot that changes
// colour in dark mode stops being the same character.

const YELLOW = "#F8DC6E";
const BELLY = "#FAE491";
const WING = "#EFC94E";
const BEAK = "#E8963C";
const BEAK_LINE = "#C9762A";
const FOOT = "#E8933A";
const STRAW = "#D9BE7E";
const STRAW_LIGHT = "#E2CB93";
const STRAW_LINE = "#CDB076";
const BAND = "#C0563A";
const BLACK = "#1A1A1A";
const LENS = "#4A4A4A";

export function Duck({ size = 120, className = "", shadow = true }) {
  return (
    <svg
      className={className}
      width={size}
      height={size * (140 / 120)}
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dwiddle duck"
    >
      {shadow && <ellipse cx="61" cy="126" rx="38" ry="6" fill="#000" opacity="0.055" />}

      {/* feet, splayed slightly outward */}
      <ellipse cx="49" cy="124" rx="11" ry="6" fill={FOOT} transform="rotate(-8 49 124)" />
      <ellipse cx="77" cy="124" rx="11" ry="6" fill={FOOT} transform="rotate(8 77 124)" />

      {/* body, then head set into its top, so the outline reads as one shape */}
      <ellipse cx="63" cy="90" rx="45" ry="31" fill={YELLOW} />
      <circle cx="63" cy="59" r="29" fill={YELLOW} />
      <ellipse cx="63" cy="74" rx="42" ry="24" fill={YELLOW} />

      {/* belly */}
      <ellipse cx="65" cy="97" rx="27" ry="21" fill={BELLY} />

      {/* wing, tucked against the body rather than floating beside it */}
      <ellipse cx="31" cy="88" rx="12" ry="19" fill={WING} transform="rotate(-6 31 88)" />

      {/* beak */}
      <ellipse cx="64" cy="63" rx="17" ry="10" fill={BEAK} />
      <rect x="47" y="61.6" width="34" height="3" rx="1.5" fill={BEAK_LINE} />

      {/* sunglasses: arms, then lenses, sitting clear of the brim above */}
      <rect x="27" y="43" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="87" y="43" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="40" y="39" width="21" height="13" rx="4.5" fill={BLACK} />
      <rect x="66" y="39" width="21" height="13" rx="4.5" fill={BLACK} />
      <rect x="59" y="43" width="9" height="4" rx="1.6" fill={BLACK} />
      <rect x="44" y="42" width="8" height="3.4" rx="1.7" fill={LENS} />
      <rect x="70" y="42" width="8" height="3.4" rx="1.7" fill={LENS} />

      {/* straw hat: wide flat brim, band, then the crown on top */}
      <ellipse cx="64" cy="27" rx="41" ry="8.6" fill={STRAW} />
      <ellipse cx="64" cy="25" rx="27" ry="6" fill={STRAW_LIGHT} />
      <path d="M47 24.5c4-7 30-7 34 0" stroke={STRAW_LINE} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <rect x="46" y="19" width="37" height="9.5" rx="1.8" fill={BAND} />
      <ellipse cx="64.5" cy="18.5" rx="18" ry="5" fill={STRAW_LIGHT} />
      <path d="M52 17c4-3.5 21-3.5 25 0" stroke={STRAW_LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// For small spaces. Fewer, chunkier shapes, because the detailed version turns
// to mush below about 32px.
export function DuckMark({ size = 24, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dwiddle"
    >
      <circle cx="32" cy="37" r="24" fill={YELLOW} />
      <ellipse cx="32" cy="48" rx="9.5" ry="5.5" fill={BEAK} />
      <rect x="9" y="28" width="46" height="10" rx="5" fill={BLACK} />
      <ellipse cx="32" cy="19" rx="30" ry="5.8" fill={STRAW} />
      <rect x="22" y="11" width="20" height="8" rx="1.5" fill={BAND} />
      <ellipse cx="32" cy="11" rx="10" ry="3.2" fill={STRAW_LIGHT} />
    </svg>
  );
}

// The same duck, sitting down.
//
// Drawn for the desktop app's sign in screen, where there is time to look at
// it. The character is unchanged: same hat, same sunglasses, same beak. Only
// the posture differs, so it reads as the same duck at rest rather than as a
// second mascot.
export function DuckSitting({ size = 150, className = "", shadow = true }) {
  return (
    <svg
      className={className}
      width={size}
      height={size * (132 / 150)}
      viewBox="0 0 150 132"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dwiddle duck, sitting"
    >
      {shadow && <ellipse cx="75" cy="120" rx="48" ry="7" fill="#000" opacity="0.06" />}

      {/* The body spreads where it meets the ground, which is what sitting
          looks like. A circle would read as standing seen from the front. */}
      <path
        d="M75 40c26 0 45 20 45 43 0 21-20 32-45 32s-45-11-45-32c0-23 19-43 45-43Z"
        fill={YELLOW}
      />

      {/* feet, tucked forward from under the body */}
      <ellipse cx="58" cy="113" rx="12" ry="5.5" fill={FOOT} transform="rotate(-6 58 113)" />
      <ellipse cx="92" cy="113" rx="12" ry="5.5" fill={FOOT} transform="rotate(6 92 113)" />
      {/* redrawn over the feet so they emerge from the body rather than sit beside it */}
      <path
        d="M75 44c24 0 43 19 43 39 0 19-19 28-43 28s-43-9-43-28c0-20 19-39 43-39Z"
        fill={YELLOW}
      />

      <ellipse cx="76" cy="92" rx="30" ry="21" fill={BELLY} />

      {/* a wing resting against the body, lower than when standing */}
      <ellipse cx="36" cy="86" rx="12" ry="20" fill={WING} transform="rotate(-14 36 86)" />
      <ellipse cx="114" cy="86" rx="12" ry="20" fill={WING} transform="rotate(14 114 86)" />

      {/* head set into the shoulders */}
      <circle cx="75" cy="50" r="30" fill={YELLOW} />

      <ellipse cx="76" cy="55" rx="17" ry="10" fill={BEAK} />
      <rect x="59" y="53.6" width="34" height="3" rx="1.5" fill={BEAK_LINE} />

      <rect x="39" y="34" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="99" y="34" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="52" y="30" width="21" height="13" rx="4.5" fill={BLACK} />
      <rect x="78" y="30" width="21" height="13" rx="4.5" fill={BLACK} />
      <rect x="71" y="34" width="9" height="4" rx="1.6" fill={BLACK} />
      <rect x="56" y="33" width="8" height="3.4" rx="1.7" fill={LENS} />
      <rect x="82" y="33" width="8" height="3.4" rx="1.7" fill={LENS} />

      <ellipse cx="76" cy="18" rx="41" ry="8.6" fill={STRAW} />
      <ellipse cx="76" cy="16" rx="27" ry="6" fill={STRAW_LIGHT} />
      <path d="M59 15.5c4-7 30-7 34 0" stroke={STRAW_LINE} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <rect x="58" y="10" width="37" height="9.5" rx="1.8" fill={BAND} />
      <ellipse cx="76.5" cy="9.5" rx="18" ry="5" fill={STRAW_LIGHT} />
      <path d="M64 8c4-3.5 21-3.5 25 0" stroke={STRAW_LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
