// The mascot, drawn as vectors so it stays sharp at 16px in a browser tab and
// at 240px on an empty state, and so it costs nothing to load.
//
// Proportions are measured off the reference art: the brim spans about 68% of
// the width and clears the top of the sunglasses, the body about 75%, and the
// head sits inside the top of the body so the two read as one silhouette.
//
// The colours are deliberately fixed rather than themed. A mascot that changes
// colour in dark mode stops being the same character.

import { CHARACTERS as OUTFITS } from "./DuckAvatars.jsx";

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

export function Duck({ size = 120, className = "", shadow = true, outfit }) {
  const dress = outfit && OUTFITS.find((c) => c.id === outfit);
  const top = dress ? -14 : 0; // room for taller hats
  return (
    <svg
      className={className}
      width={size}
      height={size * ((140 - top) / 120)}
      viewBox={`0 ${top} 120 ${140 - top}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dwiddle duck"
    >
      {shadow && <ellipse cx="61" cy="126" rx="38" ry="6" fill="#000" opacity="0.055" />}

      {dress
        ? <><DuckParts hat={false} shades={!dress.eyes} />{dress.eyes}{dress.hat}</>
        : <DuckParts />}
    </svg>
  );
}

// The duck itself, in its own 120 by 140 space, for drawings that place it in
// a scene of their own.
// Puddle, Dwiddle's co-host: the same duck, with a little tuft of hair
// and round sunglasses instead of the hat and square ones.
export function PuddleParts() {
  const HAIR = "#D99A34";
  return (
    <>
      <ellipse cx="49" cy="124" rx="11" ry="6" fill={FOOT} transform="rotate(-8 49 124)" />
      <ellipse cx="77" cy="124" rx="11" ry="6" fill={FOOT} transform="rotate(8 77 124)" />
      <ellipse cx="63" cy="90" rx="45" ry="31" fill={YELLOW} />
      <circle cx="63" cy="59" r="29" fill={YELLOW} />
      <ellipse cx="63" cy="74" rx="42" ry="24" fill={YELLOW} />
      <ellipse cx="65" cy="97" rx="27" ry="21" fill={BELLY} />
      <ellipse cx="31" cy="88" rx="12" ry="19" fill={WING} transform="rotate(-6 31 88)" />
      <ellipse cx="64" cy="63" rx="17" ry="10" fill={BEAK} />
      <rect x="47" y="61.6" width="34" height="3" rx="1.5" fill={BEAK_LINE} />
      {/* a bob: full on top, a side fringe, falling past the cheeks */}
      <path d="M30 74 C22 50 30 24 63 22 C96 24 104 50 96 74 C95 66 92 58 89 52 C86 46 80 42 72 40 C62 38 50 40 44 44 C38 48 34 56 33 64 C32 68 31 71 30 74 Z" fill={HAIR} />
      <path d="M40 46 C46 34 60 30 74 33 C62 34 52 38 46 46 Z" fill="#C9892A" />
      {/* one small hair clip */}
      <rect x="80" y="29" width="12" height="4.4" rx="2.2" fill="#F08BA8" transform="rotate(-28 86 31)" />
      {/* round sunglasses */}
      <rect x="27" y="43" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="87" y="43" width="14" height="5" rx="2.5" fill={BLACK} />
      <circle cx="50" cy="45.5" r="10.5" fill={BLACK} />
      <circle cx="77" cy="45.5" r="10.5" fill={BLACK} />
      <rect x="59" y="42.5" width="9" height="4" rx="1.6" fill={BLACK} />
      <ellipse cx="46" cy="42" rx="3.4" ry="2" fill={LENS} />
      <ellipse cx="73" cy="42" rx="3.4" ry="2" fill={LENS} />
    </>
  );
}

// hat and shades can be left off, for a duck wearing something else.
export function DuckParts({ hat = true, shades = true }) {
  return (
    <>
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

      {shades && (<>
      {/* sunglasses: arms, then lenses, sitting clear of the brim above */}
      <rect x="27" y="43" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="87" y="43" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="40" y="39" width="21" height="13" rx="4.5" fill={BLACK} />
      <rect x="66" y="39" width="21" height="13" rx="4.5" fill={BLACK} />
      <rect x="59" y="43" width="9" height="4" rx="1.6" fill={BLACK} />
      <rect x="44" y="42" width="8" height="3.4" rx="1.7" fill={LENS} />
      <rect x="70" y="42" width="8" height="3.4" rx="1.7" fill={LENS} />
      </>)}

      {hat && (<>
      {/* straw hat: wide flat brim, band, then the crown on top */}
      <ellipse cx="64" cy="27" rx="41" ry="8.6" fill={STRAW} />
      <ellipse cx="64" cy="25" rx="27" ry="6" fill={STRAW_LIGHT} />
      <path d="M47 24.5c4-7 30-7 34 0" stroke={STRAW_LINE} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <rect x="46" y="19" width="37" height="9.5" rx="1.8" fill={BAND} />
      <ellipse cx="64.5" cy="18.5" rx="18" ry="5" fill={STRAW_LIGHT} />
      <path d="M52 17c4-3.5 21-3.5 25 0" stroke={STRAW_LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </>)}
    </>
  );
}

// The duck for small spaces: the sidebar, the floating bar on the landing
// page. It is the full drawing, cropped to the head and shoulders, rather than
// a second simplified one.
//
// There used to be a separate mark here of fewer, chunkier shapes, on the idea
// that the detail would turn to mush below 32px. It did not look like the duck
// at all: a yellow disc with one black bar across it, which read as a
// blindfold, and a blob for a beak. On any screen made in the last decade a
// 26px icon is drawn at 52 or 78 real pixels, which is plenty for two lenses,
// a bridge and a beak line.
export function DuckMark({ size = 24, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="20 3 88 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dwiddle"
    >
      <ellipse cx="63" cy="90" rx="45" ry="31" fill={YELLOW} />
      <circle cx="63" cy="59" r="29" fill={YELLOW} />
      <ellipse cx="63" cy="74" rx="42" ry="24" fill={YELLOW} />
      <ellipse cx="65" cy="97" rx="27" ry="21" fill={BELLY} />
      <ellipse cx="64" cy="63" rx="17" ry="10" fill={BEAK} />
      <rect x="47" y="61.6" width="34" height="3" rx="1.5" fill={BEAK_LINE} />
      <rect x="27" y="43" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="87" y="43" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="40" y="39" width="21" height="13" rx="4.5" fill={BLACK} />
      <rect x="66" y="39" width="21" height="13" rx="4.5" fill={BLACK} />
      <rect x="59" y="43" width="9" height="4" rx="1.6" fill={BLACK} />
      <rect x="44" y="42" width="8" height="3.4" rx="1.7" fill={LENS} />
      <rect x="70" y="42" width="8" height="3.4" rx="1.7" fill={LENS} />
      <ellipse cx="64" cy="27" rx="41" ry="8.6" fill={STRAW} />
      <ellipse cx="64" cy="25" rx="27" ry="6" fill={STRAW_LIGHT} />
      <path d="M47 24.5c4-7 30-7 34 0" stroke={STRAW_LINE} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <rect x="46" y="19" width="37" height="9.5" rx="1.8" fill={BAND} />
      <ellipse cx="64.5" cy="18.5" rx="18" ry="5" fill={STRAW_LIGHT} />
      <path d="M52 17c4-3.5 21-3.5 25 0" stroke={STRAW_LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
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

// The duck on a sofa, for the desktop app's sign in screen.
//
// A window has room a browser tab does not, and the app is the version you
// keep, so it opens with the character at home rather than posed. Same hat,
// same sunglasses, same beak.
export function DuckCouch({ size = 300, className = "" }) {
  const CUSHION = "#7E86C9";
  const COUCH = "#6A73BC";
  const COUCH_DARK = "#5A63A8";
  const COUCH_LIGHT = "#8D95D4";

  return (
    <svg
      className={className}
      width={size}
      height={size * (200 / 300)}
      viewBox="0 0 300 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dwiddle duck sitting on a sofa"
    >
      <ellipse cx="150" cy="186" rx="118" ry="9" fill="#000" opacity="0.06" />

      {/* back of the sofa, then the arms, then the seat, so each overlaps the
          one behind it the way upholstery does */}
      <rect x="34" y="52" width="232" height="86" rx="22" fill={COUCH} />
      <rect x="52" y="64" width="88" height="60" rx="14" fill={CUSHION} />
      <rect x="160" y="64" width="88" height="60" rx="14" fill={CUSHION} />

      <rect x="18" y="86" width="40" height="80" rx="18" fill={COUCH_LIGHT} />
      <rect x="242" y="86" width="40" height="80" rx="18" fill={COUCH_LIGHT} />

      <rect x="34" y="126" width="232" height="46" rx="16" fill={COUCH_DARK} />
      <path d="M150 126v46" stroke={COUCH} strokeWidth="2" opacity="0.5" />

      {/* feet */}
      <rect x="52" y="168" width="14" height="14" rx="4" fill="#4A5290" />
      <rect x="234" y="168" width="14" height="14" rx="4" fill="#4A5290" />

      {/* the duck, sunk into the seat rather than standing on it */}
      <g transform="translate(150 116)">
        <ellipse cx="-26" cy="46" rx="13" ry="6" fill={FOOT} transform="rotate(-8 -26 46)" />
        <ellipse cx="26" cy="46" rx="13" ry="6" fill={FOOT} transform="rotate(8 26 46)" />

        <path d="M0 -18c30 0 52 22 52 47 0 8-8 12-52 12s-52-4-52-12c0-25 22-47 52-47Z" fill={YELLOW} />
        <ellipse cx="2" cy="28" rx="33" ry="20" fill={BELLY} />
        <ellipse cx="-44" cy="18" rx="12" ry="20" fill={WING} transform="rotate(-18 -44 18)" />
        <ellipse cx="44" cy="18" rx="12" ry="20" fill={WING} transform="rotate(18 44 18)" />

        <circle cx="0" cy="-24" r="31" fill={YELLOW} />
        <ellipse cx="1" cy="-19" rx="17" ry="10" fill={BEAK} />
        <rect x="-16" y="-20.4" width="34" height="3" rx="1.5" fill={BEAK_LINE} />

        <rect x="-36" y="-40" width="14" height="5" rx="2.5" fill={BLACK} />
        <rect x="24" y="-40" width="14" height="5" rx="2.5" fill={BLACK} />
        <rect x="-23" y="-44" width="21" height="13" rx="4.5" fill={BLACK} />
        <rect x="3" y="-44" width="21" height="13" rx="4.5" fill={BLACK} />
        <rect x="-4" y="-40" width="9" height="4" rx="1.6" fill={BLACK} />
        <rect x="-19" y="-41" width="8" height="3.4" rx="1.7" fill={LENS} />
        <rect x="7" y="-41" width="8" height="3.4" rx="1.7" fill={LENS} />

        <ellipse cx="1" cy="-56" rx="41" ry="8.6" fill={STRAW} />
        <ellipse cx="1" cy="-58" rx="27" ry="6" fill={STRAW_LIGHT} />
        <path d="M-16 -58.5c4-7 30-7 34 0" stroke={STRAW_LINE} strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <rect x="-17" y="-64" width="37" height="9.5" rx="1.8" fill={BAND} />
        <ellipse cx="1.5" cy="-64.5" rx="18" ry="5" fill={STRAW_LIGHT} />
        <path d="M-11 -66c4-3.5 21-3.5 25 0" stroke={STRAW_LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// The same duck, holding up a sign.
//
// Drawn for the moment the free generation runs out, where it has to carry
// the news without sounding like a penalty. Same hat, same sunglasses, same
// beak: only a raised wing and a placard are new. The board is left mostly
// empty on purpose, because the sentence beside it does the talking and a
// second copy of it painted into a drawing would be one too many.
// The sign says whatever it is given: infinity for the free gate, 404 for a lost page.
export function DuckSign({ size = 190, className = "", label = "\u221e" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size * (150 / 200)}
      viewBox="0 0 200 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dwiddle duck holding a sign"
    >
      <ellipse cx="61" cy="136" rx="38" ry="6" fill="#000" opacity="0.055" />

      {/* the post, behind the duck so the wing reads as gripping it */}
      <rect x="132" y="44" width="6" height="58" rx="3" fill={STRAW_LINE} />

      {/* feet */}
      <ellipse cx="49" cy="134" rx="11" ry="6" fill={FOOT} transform="rotate(-8 49 134)" />
      <ellipse cx="77" cy="134" rx="11" ry="6" fill={FOOT} transform="rotate(8 77 134)" />

      {/* body and head, as one silhouette */}
      <ellipse cx="63" cy="100" rx="45" ry="31" fill={YELLOW} />
      <circle cx="63" cy="69" r="29" fill={YELLOW} />
      <ellipse cx="63" cy="84" rx="42" ry="24" fill={YELLOW} />
      <ellipse cx="65" cy="107" rx="27" ry="21" fill={BELLY} />

      {/* the far wing, tucked, and the near one raised to the post */}
      <ellipse cx="31" cy="98" rx="12" ry="19" fill={WING} transform="rotate(-6 31 98)" />
      <ellipse cx="113" cy="88" rx="11" ry="20" fill={WING} transform="rotate(-52 113 88)" />

      {/* beak */}
      <ellipse cx="64" cy="73" rx="17" ry="10" fill={BEAK} />
      <rect x="47" y="71.6" width="34" height="3" rx="1.5" fill={BEAK_LINE} />

      {/* sunglasses */}
      <rect x="27" y="53" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="87" y="53" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="40" y="49" width="21" height="13" rx="4.5" fill={BLACK} />
      <rect x="66" y="49" width="21" height="13" rx="4.5" fill={BLACK} />
      <rect x="59" y="53" width="9" height="4" rx="1.6" fill={BLACK} />
      <rect x="44" y="52" width="8" height="3.4" rx="1.7" fill={LENS} />
      <rect x="70" y="52" width="8" height="3.4" rx="1.7" fill={LENS} />

      {/* straw hat */}
      <ellipse cx="64" cy="37" rx="41" ry="8.6" fill={STRAW} />
      <ellipse cx="64" cy="35" rx="27" ry="6" fill={STRAW_LIGHT} />
      <path d="M47 34.5c4-7 30-7 34 0" stroke={STRAW_LINE} strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <rect x="46" y="29" width="37" height="9.5" rx="1.8" fill={BAND} />
      <ellipse cx="64.5" cy="28.5" rx="18" ry="5" fill={STRAW_LIGHT} />
      <path d="M52 27c4-3.5 21-3.5 25 0" stroke={STRAW_LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* the board, tilted so it reads as held rather than mounted */}
      <g transform="rotate(-7 148 30)">
        <rect x="106" y="8" width="84" height="46" rx="7" fill="#fff" stroke="#E3E3DF" strokeWidth="2" />
        <text x="148" y={label.length > 1 ? 39 : 40} textAnchor="middle" fontSize={label.length > 1 ? 24 : 30} fontWeight="800"
          fill={BAND} fontFamily="Inter, system-ui, sans-serif">{label}</text>
      </g>
    </svg>
  );
}

// The same duck, holding a door shut on more paper than fits behind it.
//
// Drawn for material that is too long to take in one go. It has to say "too
// much" without saying "you did something wrong", so the duck is on the
// student's side of the problem: bracing the door, sweating a little, with the
// pages escaping round the edges.
export function DuckDoor({ size = 220, className = "" }) {
  const PAPER = "#FFFFFF";
  const RULE = "#D9DCE3";
  const DOOR = "#C98F5E";
  const DOOR_DARK = "#A8723F";
  const FRAME = "#8A5A30";
  return (
    <svg
      className={className}
      width={size}
      height={size * (160 / 220)}
      viewBox="0 0 220 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dwiddle duck holding a door shut against a pile of paper"
    >
      <ellipse cx="112" cy="150" rx="92" ry="6" fill="#000" opacity="0.06" />

      {/* pages escaping from behind the door, over the top and out of the far side */}
      <g transform="rotate(-14 142 22)">
        <rect x="128" y="8" width="26" height="32" rx="2" fill={PAPER} stroke={RULE} />
        <path d="M133 16h16M133 21h16M133 26h11" stroke={RULE} strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <g transform="rotate(10 166 20)">
        <rect x="153" y="6" width="26" height="32" rx="2" fill={PAPER} stroke={RULE} />
        <path d="M158 14h16M158 19h16M158 24h11" stroke={RULE} strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <g transform="rotate(-6 186 24)">
        <rect x="174" y="12" width="24" height="30" rx="2" fill={PAPER} stroke={RULE} />
        <path d="M179 20h14M179 25h14M179 30h9" stroke={RULE} strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <g transform="rotate(24 196 62)">
        <rect x="184" y="48" width="24" height="30" rx="2" fill={PAPER} stroke={RULE} />
        <path d="M189 56h14M189 61h14M189 66h9" stroke={RULE} strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <g transform="rotate(-12 196 104)">
        <rect x="185" y="90" width="24" height="30" rx="2" fill={PAPER} stroke={RULE} />
        <path d="M190 98h14M190 103h14M190 108h9" stroke={RULE} strokeWidth="1.6" strokeLinecap="round" />
      </g>
      {/* and one that got away */}
      <g transform="rotate(28 206 26)">
        <rect x="198" y="16" width="16" height="20" rx="1.5" fill={PAPER} stroke={RULE} />
        <path d="M201 22h10M201 26h10M201 30h6" stroke={RULE} strokeWidth="1.3" strokeLinecap="round" />
      </g>

      {/* the door, frame first, pushed a touch open at the far edge */}
      <rect x="116" y="20" width="80" height="128" rx="3" fill={FRAME} />
      <path d="M121 25 L193 21 L193 147 L121 143 Z" fill={DOOR} />
      <path d="M129 34 L185 31 L185 78 L129 80 Z" fill={DOOR_DARK} opacity="0.45" />
      <path d="M129 92 L185 91 L185 136 L129 134 Z" fill={DOOR_DARK} opacity="0.45" />
      <circle cx="182" cy="86" r="4" fill="#E9C46A" />
      {/* a sliver of page caught in the gap at the hinge side */}
      <path d="M193 40 l9 -4 l3 9 l-9 3 z" fill={PAPER} stroke={RULE} />

      {/* strain lines where the door is being held */}
      <path d="M112 12 l-5 -7 M122 9 l0 -8 M132 11 l5 -7" stroke="#B9BFCC" strokeWidth="2" strokeLinecap="round" />

      {/* the duck, leaning its whole weight into the door */}
      <g transform="translate(6 10) rotate(10 63 124)">
        <ellipse cx="49" cy="124" rx="11" ry="6" fill={FOOT} transform="rotate(-8 49 124)" />
        <ellipse cx="77" cy="124" rx="11" ry="6" fill={FOOT} transform="rotate(8 77 124)" />
        <ellipse cx="63" cy="90" rx="45" ry="31" fill={YELLOW} />
        <circle cx="63" cy="59" r="29" fill={YELLOW} />
        <ellipse cx="63" cy="74" rx="42" ry="24" fill={YELLOW} />
        <ellipse cx="65" cy="97" rx="27" ry="21" fill={BELLY} />
        <ellipse cx="31" cy="88" rx="12" ry="19" fill={WING} transform="rotate(-6 31 88)" />
        {/* the near wing, flat against the door */}
        <ellipse cx="107" cy="72" rx="9" ry="21" fill={WING} transform="rotate(-10 107 72)" />
        <ellipse cx="64" cy="63" rx="17" ry="10" fill={BEAK} />
        <rect x="47" y="61.6" width="34" height="3" rx="1.5" fill={BEAK_LINE} />
        <rect x="27" y="43" width="14" height="5" rx="2.5" fill={BLACK} />
        <rect x="87" y="43" width="14" height="5" rx="2.5" fill={BLACK} />
        <rect x="40" y="39" width="21" height="13" rx="4.5" fill={BLACK} />
        <rect x="66" y="39" width="21" height="13" rx="4.5" fill={BLACK} />
        <rect x="59" y="43" width="9" height="4" rx="1.6" fill={BLACK} />
        <rect x="44" y="42" width="8" height="3.4" rx="1.7" fill={LENS} />
        <rect x="70" y="42" width="8" height="3.4" rx="1.7" fill={LENS} />
        <ellipse cx="64" cy="27" rx="41" ry="8.6" fill={STRAW} />
        <ellipse cx="64" cy="25" rx="27" ry="6" fill={STRAW_LIGHT} />
        <path d="M47 24.5c4-7 30-7 34 0" stroke={STRAW_LINE} strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <rect x="46" y="19" width="37" height="9.5" rx="1.8" fill={BAND} />
        <ellipse cx="64.5" cy="18.5" rx="18" ry="5" fill={STRAW_LIGHT} />
        <path d="M52 17c4-3.5 21-3.5 25 0" stroke={STRAW_LINE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      {/* one bead of sweat */}
      <path d="M30 40 c-4 6 -4 10 0 11 c4 -1 4 -5 0 -11 z" fill="#8FB8F0" />
    </svg>
  );
}

// The same duck, watching a video that will not quite load.
//
// Drawn for the warning before a YouTube import on the website, which may or
// may not work. The duck is curious rather than cross: head tilted, a question
// over it, the play button on the screen ringed by a buffering spinner.
export function DuckTV({ size = 230, className = "" }) {
  const CASE = "#2B2B33";
  const SCREEN = "#3A3A45";
  const RED = "#FF3B30";
  return (
    <svg
      className={"duck-tv " + className}
      width={size}
      height={size * (160 / 230)}
      viewBox="0 0 230 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dwiddle duck watching a video that is still loading"
    >
      <ellipse cx="118" cy="151" rx="100" ry="6" fill="#000" opacity="0.06" />

      {/* the television, on two short legs */}
      <path d="M150 128 l-8 18 M196 128 l8 18" stroke={CASE} strokeWidth="5" strokeLinecap="round" />
      <rect x="120" y="44" width="106" height="86" rx="14" fill={CASE} />
      <rect x="129" y="53" width="88" height="62" rx="8" fill={SCREEN} />
      {/* a little static across the screen */}
      <g className="dtv-static">
        <path d="M136 64h22M170 72h30M140 100h18M176 106h26" stroke="#fff" strokeOpacity="0.14" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* the play button, and the buffering ring going round it */}
      <rect x="159" y="72" width="28" height="20" rx="6" fill={RED} />
      <path d="M169.5 77v10l8.5-5z" fill="#fff" />
      <circle className="dtv-spin" cx="173" cy="82" r="21" stroke="#fff" strokeOpacity="0.75"
        strokeWidth="3" strokeLinecap="round" strokeDasharray="22 110" />
      {/* knobs */}
      <circle cx="140" cy="122" r="2.6" fill="#55555F" />
      <circle cx="149" cy="122" r="2.6" fill="#55555F" />
      {/* the aerial, with a bit of wobble */}
      <g className="dtv-aerial">
        <path d="M173 44 L158 22 M173 44 L190 20" stroke={CASE} strokeWidth="3" strokeLinecap="round" />
        <circle cx="158" cy="22" r="3.2" fill={RED} />
        <circle cx="190" cy="20" r="3.2" fill={CASE} />
      </g>

      {/* the question, bobbing over the duck */}
      <text className="dtv-q" x="82" y="20" textAnchor="middle" fontSize="22" fontWeight="800"
        fill="#8A8A94" fontFamily="Inter, system-ui, sans-serif">?</text>

      {/* the duck, head tilted at the screen */}
      <g transform="translate(-4 20)">
        <g className="dtv-duck">
          <DuckParts />
        </g>
      </g>
    </svg>
  );
}

// Dwiddle at the microphone with a stopwatch, for the "narration takes
// longer" notice: the narrator, and how long the voice will take.
export function DuckNarrator({ size = 110, className = "" }) {
  return (
    <svg className={"dn " + className} width={size} height={size * (150 / 168)} viewBox="-8 -10 168 150" aria-hidden="true">
      <ellipse cx="64" cy="128" rx="48" ry="5" fill="rgba(0,0,0,0.12)" />
      <DuckParts />
      {/* the wing on the mic side, reaching out to hold it */}
      <ellipse cx="100" cy="92" rx="9" ry="17" fill={WING} transform="rotate(32 100 92)" />
      {/* a studio microphone: stem, then the grille */}
      <rect x="123" y="94" width="8" height="26" rx="4" fill="#3A3F4B" />
      <rect x="121" y="104" width="12" height="4" rx="2" fill="#6B7280" />
      <circle cx="127" cy="84" r="13" fill="#2B2F3A" />
      <path d="M116 80h22M115.6 85h22.8M116.6 90h20.8" stroke="#4B5263" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="122" cy="77" rx="4" ry="3" fill="#fff" opacity="0.35" />
      {/* sound leaving it */}
      <g className="dn-wave" fill="none" stroke="#2F80ED" strokeWidth="3" strokeLinecap="round">
        <path d="M146 78q5 6 0 12" /><path d="M153 73q9 11 0 22" />
      </g>
      {/* the stopwatch: how long it takes */}
      <g transform="translate(6 12)">
        <rect x="-3" y="-17" width="6" height="4" rx="1.5" fill="#6B7280" />
        <circle r="13" fill="#fff" stroke="#2B2F3A" strokeWidth="3" />
        <path d="M0 -9V-6M9 0H6M0 9V6M-9 0H-6" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" />
        <path className="dn-hand" d="M0 0V-8" stroke="#E5484D" strokeWidth="2.4" strokeLinecap="round" />
        <circle r="2" fill="#2B2F3A" />
      </g>
    </svg>
  );
}
