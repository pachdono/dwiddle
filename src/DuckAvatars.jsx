// Profile pictures: Dwiddle, Puddle, and Dwiddle dressed up.
//
// Each one is the same duck, head and shoulders on a coloured circle, drawn in
// the duck's own coordinates (the head is centred at 63, 59). Only what it
// wears changes: a hat, and sometimes something in place of the sunglasses.

import { useId } from "react";

const YELLOW = "#F8DC6E", BELLY = "#FAE491", BEAK = "#E8963C", BEAK_LINE = "#C9762A";
const BLACK = "#1A1A1A", LENS = "#4A4A4A";

function Body() {
  return (
    <>
      <ellipse cx="63" cy="104" rx="46" ry="31" fill={YELLOW} />
      <circle cx="63" cy="59" r="29" fill={YELLOW} />
      <ellipse cx="63" cy="78" rx="41" ry="22" fill={YELLOW} />
      <ellipse cx="65" cy="106" rx="26" ry="18" fill={BELLY} />
      <ellipse cx="64" cy="63" rx="17" ry="10" fill={BEAK} />
      <rect x="47" y="61.6" width="34" height="3" rx="1.5" fill={BEAK_LINE} />
    </>
  );
}

function Shades() {
  return (
    <>
      <rect x="27" y="43" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="87" y="43" width="14" height="5" rx="2.5" fill={BLACK} />
      <rect x="40" y="39" width="21" height="13" rx="4.5" fill={BLACK} />
      <rect x="66" y="39" width="21" height="13" rx="4.5" fill={BLACK} />
      <rect x="59" y="43" width="9" height="4" rx="1.6" fill={BLACK} />
      <rect x="44" y="42" width="8" height="3.4" rx="1.7" fill={LENS} />
      <rect x="70" y="42" width="8" height="3.4" rx="1.7" fill={LENS} />
    </>
  );
}

function RoundShades() {
  return (
    <>
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

const Eye = ({ x }) => <><circle cx={x} cy="46" r="4.2" fill={BLACK} /><circle cx={x + 1.4} cy="44.6" r="1.3" fill="#fff" /></>;

const STRAW = (
  <>
    <ellipse cx="64" cy="27" rx="41" ry="8.6" fill="#D9BE7E" />
    <ellipse cx="64" cy="25" rx="27" ry="6" fill="#E2CB93" />
    <rect x="46" y="19" width="37" height="9.5" rx="1.8" fill="#C0563A" />
    <ellipse cx="64.5" cy="18.5" rx="18" ry="5" fill="#E2CB93" />
  </>
);

// Each character: its name, background, what it wears, and what it has for eyes.
export const CHARACTERS = [
  { id: "dwiddle", name: "Dwiddle", bg: "#FFF1C2", hat: STRAW },
  {
    id: "puddle", name: "Puddle", bg: "#FFE0EA", eyes: <RoundShades />,
    hat: (
      <>
        <path d="M30 74 C22 50 30 24 63 22 C96 24 104 50 96 74 C95 66 92 58 89 52 C86 46 80 42 72 40 C62 38 50 40 44 44 C38 48 34 56 33 64 C32 68 31 71 30 74 Z" fill="#D99A34" />
        <path d="M40 46 C46 34 60 30 74 33 C62 34 52 38 46 46 Z" fill="#C9892A" />
        <rect x="80" y="29" width="12" height="4.4" rx="2.2" fill="#F08BA8" transform="rotate(-28 86 31)" />
      </>
    ),
  },
  {
    id: "pirate", name: "Pirate", bg: "#CDE7F7",
    eyes: (
      <>
        <path d="M30 36 L96 52" stroke={BLACK} strokeWidth="2.2" />
        <ellipse cx="49" cy="46" rx="9" ry="8" fill={BLACK} />
        <Eye x={77} />
      </>
    ),
    hat: (
      <>
        <path d="M36 32 Q63 -4 90 32 Z" fill="#232323" />
        <path d="M18 34 Q40 20 63 28 Q86 20 108 34 Q86 28 63 34 Q40 28 18 34 Z" fill={BLACK} />
        <path d="M22 33 Q63 20 104 33" stroke="#E0B84A" strokeWidth="1.6" fill="none" />
        <circle cx="63" cy="17" r="4.2" fill="#fff" />
        <path d="M57 23 L69 28 M69 23 L57 28" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: "chef", name: "Chef", bg: "#FFE3D3",
    hat: (
      <>
        <circle cx="47" cy="14" r="10" fill="#fff" />
        <circle cx="63" cy="9" r="12" fill="#fff" />
        <circle cx="79" cy="14" r="10" fill="#fff" />
        <rect x="42" y="16" width="42" height="17" rx="3" fill="#fff" stroke="#E6E1DA" strokeWidth="1.2" />
        <path d="M52 20 V31 M63 18 V31 M74 20 V31" stroke="#EDE8E1" strokeWidth="1.2" />
      </>
    ),
  },
  {
    id: "wizard", name: "Wizard", bg: "#E4DBFF",
    hat: (
      <>
        <path d="M34 33 L60 -6 Q64 -9 66 -4 L92 33 Z" fill="#6D4AE0" />
        <ellipse cx="63" cy="33" rx="36" ry="6.5" fill="#5536C2" />
        <path d="M55 12 l1.4 3 3.2.4 -2.4 2.2 .7 3.2 -2.9-1.6 -2.9 1.6 .7-3.2 -2.4-2.2 3.2-.4z" fill="#FBD34D" />
        <circle cx="71" cy="22" r="1.8" fill="#FBD34D" /><circle cx="66" cy="4" r="1.3" fill="#FBD34D" />
      </>
    ),
  },
  {
    id: "astronaut", name: "Astronaut", bg: "#1E2A44",
    back: <><circle cx="24" cy="18" r="1.3" fill="#fff" /><circle cx="104" cy="26" r="1" fill="#fff" /><circle cx="96" cy="8" r="1.4" fill="#fff" /><circle cx="30" cy="36" r=".9" fill="#fff" /></>,
    hat: (
      <>
        <rect x="26" y="84" width="74" height="20" rx="10" fill="#E5E9F0" />
        <circle cx="63" cy="56" r="37" fill="rgba(190,225,255,0.22)" stroke="#E5E9F0" strokeWidth="6" />
        <path d="M40 34 Q48 26 58 24" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" fill="none" />
      </>
    ),
  },
  {
    id: "king", name: "King", bg: "#FCE2E2",
    hat: (
      <>
        <path d="M38 33 L40 12 L51 23 L63 8 L75 23 L86 12 L88 33 Z" fill="#F5C542" stroke="#D9A21B" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="63" cy="26" r="3" fill="#E5484D" /><circle cx="50" cy="28" r="2.2" fill="#3B82F6" /><circle cx="76" cy="28" r="2.2" fill="#16A34A" />
        <circle cx="40" cy="12" r="2.2" fill="#F5C542" /><circle cx="63" cy="8" r="2.4" fill="#F5C542" /><circle cx="86" cy="12" r="2.2" fill="#F5C542" />
      </>
    ),
  },
  {
    id: "graduate", name: "Graduate", bg: "#DCE6FF",
    hat: (
      <>
        <rect x="45" y="20" width="36" height="13" rx="2" fill="#20232B" />
        <path d="M63 6 L101 18 L63 30 L25 18 Z" fill={BLACK} />
        <path d="M63 18 L94 22 L94 38" stroke="#F5C542" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M91 38 h6 l-1 8 h-4 z" fill="#F5C542" />
        <circle cx="63" cy="18" r="2" fill="#F5C542" />
      </>
    ),
  },
  {
    id: "detective", name: "Detective", bg: "#EFE4D4",
    hat: (
      <>
        <path d="M33 35 Q33 6 63 6 Q93 6 93 35 Z" fill="#9A6A43" />
        <path d="M33 22 H93 M33 29 H93 M48 7 V35 M63 6 V35 M78 7 V35" stroke="#7E5434" strokeWidth="1.4" opacity="0.8" />
        <path d="M26 34 Q40 42 56 35 Z M70 35 Q86 42 100 34 Z" fill="#6E4A2E" />
        <rect x="33" y="31" width="60" height="5" rx="2" fill="#5B3A22" />
        <circle cx="63" cy="6" r="2.6" fill="#6E4A2E" />
      </>
    ),
  },
  {
    id: "cowboy", name: "Cowboy", bg: "#FFE7C7",
    hat: (
      <>
        <path d="M40 31 Q40 8 55 12 Q63 17 71 12 Q86 8 86 31 Z" fill="#A0652E" />
        <rect x="41" y="25" width="44" height="6" fill="#5B3A1C" />
        <path d="M14 30 Q24 38 63 36 Q102 38 112 30 Q106 42 63 42 Q20 42 14 30 Z" fill="#8A5526" />
      </>
    ),
  },
  {
    id: "ninja", name: "Ninja", bg: "#FFD9D2",
    eyes: (
      <>
        <rect x="31" y="35" width="64" height="21" rx="10" fill="#23262E" />
        <path d="M94 42 Q106 36 110 28 M94 48 Q108 48 113 42" stroke="#23262E" strokeWidth="4" strokeLinecap="round" fill="none" />
        <rect x="41" y="41" width="18" height="8" rx="4" fill="#fff" /><rect x="67" y="41" width="18" height="8" rx="4" fill="#fff" />
        <circle cx="52" cy="45" r="2.8" fill={BLACK} /><circle cx="78" cy="45" r="2.8" fill={BLACK} />
      </>
    ),
    hat: <path d="M36 34 Q63 22 90 34 L90 28 Q63 16 36 28 Z" fill="#E5484D" />,
  },
  {
    id: "party", name: "Party", bg: "#FFE0F0",
    back: <><rect x="22" y="20" width="4" height="4" rx="1" fill="#3B82F6" transform="rotate(20 24 22)" /><rect x="98" y="30" width="4" height="4" rx="1" fill="#16A34A" transform="rotate(-15 100 32)" /><rect x="92" y="10" width="4" height="4" rx="1" fill="#F59E0B" /><circle cx="30" cy="8" r="2" fill="#E5484D" /></>,
    hat: (
      <>
        <path d="M49 32 L66 0 L80 30 Z" fill="#FF6FA3" />
        <path d="M54 23 L73 17 M58 14 L70 9 M51 29 L77 24" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="66" cy="0" r="4.2" fill="#FBD34D" />
      </>
    ),
  },
  {
    id: "dj", name: "DJ", bg: "#D5F3E5",
    hat: (
      <>
        <path d="M29 52 Q30 14 63 14 Q96 14 97 52" stroke="#2A2D35" strokeWidth="6" fill="none" strokeLinecap="round" />
        <rect x="19" y="40" width="15" height="24" rx="7" fill="#3B5BFD" /><rect x="92" y="40" width="15" height="24" rx="7" fill="#3B5BFD" />
        <rect x="23" y="44" width="7" height="16" rx="3.5" fill="#2A44C9" /><rect x="96" y="44" width="7" height="16" rx="3.5" fill="#2A44C9" />
      </>
    ),
  },
  {
    id: "winter", name: "Winter", bg: "#DCEEFF",
    hat: (
      <>
        <path d="M35 33 Q35 8 63 8 Q91 8 91 33 Z" fill="#3B82F6" />
        <path d="M49 12 V30 M63 9 V30 M77 12 V30" stroke="#2F6FDB" strokeWidth="2" />
        <rect x="32" y="26" width="62" height="10" rx="5" fill="#E5484D" />
        <circle cx="63" cy="6" r="6" fill="#fff" />
        <path d="M26 82 Q63 94 100 82 L100 92 Q63 104 26 92 Z" fill="#E5484D" />
      </>
    ),
  },
  {
    id: "viking", name: "Viking", bg: "#E4E8EE",
    hat: (
      <>
        <path d="M38 30 Q24 24 20 6 Q30 20 42 22 Z" fill="#F3EEE2" stroke="#D8D0BD" strokeWidth="1" />
        <path d="M88 30 Q102 24 106 6 Q96 20 84 22 Z" fill="#F3EEE2" stroke="#D8D0BD" strokeWidth="1" />
        <path d="M36 33 Q36 8 63 8 Q90 8 90 33 Z" fill="#9CA3AF" />
        <rect x="34" y="27" width="58" height="7" rx="3" fill="#6B7280" />
        <rect x="60" y="8" width="6" height="25" fill="#6B7280" />
        <circle cx="42" cy="30.5" r="1.3" fill="#D1D5DB" /><circle cx="84" cy="30.5" r="1.3" fill="#D1D5DB" />
      </>
    ),
  },
];

export function DuckAvatar({ id = "dwiddle", size = 44 }) {
  const c = CHARACTERS.find((x) => x.id === id) || CHARACTERS[0];
  const clip = "da" + useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="5 -12 116 116" role="img" aria-label={c.name} style={{ display: "block" }}>
      <defs><clipPath id={clip}><circle cx="63" cy="46" r="58" /></clipPath></defs>
      <g clipPath={`url(#${clip})`}>
        <circle cx="63" cy="46" r="58" fill={c.bg} />
        {c.back}
        <Body />
        {c.eyes || <Shades />}
        {c.hat}
      </g>
    </svg>
  );
}
