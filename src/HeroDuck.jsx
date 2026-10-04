// The big duck for the front page: the same character as Duck.jsx, but drawn
// with light on it. Soft gradients give the body its roundness, the lenses
// catch a window, the hat has a lit crown and a shaded brim, and it breathes,
// waves a wing and tips its hat now and then. Too heavy for a 24px icon, which
// is why the plain one stays everywhere else.

let n = 0;

export function HeroDuck({ size = 220, className = "" }) {
  const id = `hd${(n = (n + 1) % 1000)}`;
  const u = (k) => `${id}${k}`;
  return (
    <svg className={"hd " + className} width={size} height={size * (150 / 130)} viewBox="-5 -5 130 150" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dwiddle duck">
      <defs>
        <radialGradient id={u("body")} cx="38%" cy="28%" r="85%">
          <stop offset="0" stopColor="#FFF0A0" />
          <stop offset=".45" stopColor="#FADB5F" />
          <stop offset="1" stopColor="#E9B63A" />
        </radialGradient>
        <radialGradient id={u("belly")} cx="50%" cy="30%" r="80%">
          <stop offset="0" stopColor="#FFF6C9" />
          <stop offset="1" stopColor="#F6D878" />
        </radialGradient>
        <linearGradient id={u("wing")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4CE55" />
          <stop offset="1" stopColor="#D9A22E" />
        </linearGradient>
        <radialGradient id={u("beak")} cx="40%" cy="25%" r="90%">
          <stop offset="0" stopColor="#FFB45A" />
          <stop offset="1" stopColor="#DE7F2A" />
        </radialGradient>
        <linearGradient id={u("brim")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EBD59A" />
          <stop offset="1" stopColor="#C9A862" />
        </linearGradient>
        <linearGradient id={u("crown")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E9D49C" />
          <stop offset=".5" stopColor="#F5E6B8" />
          <stop offset="1" stopColor="#D5B97A" />
        </linearGradient>
        <linearGradient id={u("lens")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4A4D57" />
          <stop offset="1" stopColor="#14151A" />
        </linearGradient>
        <radialGradient id={u("shadow")}>
          <stop offset="0" stopColor="#000" stopOpacity=".22" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse className="hd-shadow" cx="62" cy="133" rx="46" ry="7" fill={`url(#${u("shadow")})`} />

      <g className="hd-bob">
        {/* feet with toes */}
        <g fill="#E8892E">
          <path d="M36 126c0-6 8-9 14-7 5 2 7 6 5 9-2 4-18 4-19-2z" />
          <path d="M70 128c-2-3 0-7 5-9 6-2 14 1 14 7-1 6-17 6-19 2z" />
        </g>
        <g fill="#C96F1F" opacity=".5">
          <rect x="43" y="124" width="1.6" height="5" rx=".8" />
          <rect x="48" y="124" width="1.6" height="5" rx=".8" />
          <rect x="76" y="124" width="1.6" height="5" rx=".8" />
          <rect x="81" y="124" width="1.6" height="5" rx=".8" />
        </g>

        {/* body and head as one lit shape */}
        <ellipse cx="63" cy="90" rx="46" ry="33" fill={`url(#${u("body")})`} />
        <circle cx="63" cy="59" r="30" fill={`url(#${u("body")})`} />
        <ellipse cx="63" cy="74" rx="43" ry="25" fill={`url(#${u("body")})`} />
        {/* a lower shade so the belly sits forward */}
        <path d="M20 96c8 26 74 26 86 0-6 18-24 30-43 30S26 114 20 96z" fill="#C99421" opacity=".28" />
        <ellipse cx="65" cy="98" rx="28" ry="22" fill={`url(#${u("belly")})`} />
        <ellipse cx="58" cy="90" rx="14" ry="7" fill="#fff" opacity=".35" />

        {/* cheeks */}
        <ellipse cx="38" cy="66" rx="6" ry="3.6" fill="#F59A7A" opacity=".5" />
        <ellipse cx="90" cy="66" rx="6" ry="3.6" fill="#F59A7A" opacity=".5" />

        {/* wing */}
        <g className="hd-wing">
          <ellipse cx="29" cy="90" rx="13" ry="21" fill={`url(#${u("wing")})`} transform="rotate(-8 29 90)" />
          <path d="M22 80c-3 10-2 20 3 27" stroke="#fff" strokeOpacity=".4" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* beak */}
        <ellipse cx="64" cy="64" rx="18" ry="11" fill={`url(#${u("beak")})`} />
        <path d="M47.5 63c10 3 23 3 33 0" stroke="#B5621A" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="58" cy="59.5" rx="7" ry="2.6" fill="#fff" opacity=".4" />
        <circle cx="58" cy="62" r="1" fill="#9A4F14" opacity=".7" />
        <circle cx="70" cy="62" r="1" fill="#9A4F14" opacity=".7" />

        {/* sunglasses */}
        <rect x="26" y="43" width="15" height="5.4" rx="2.7" fill="#14151A" />
        <rect x="87" y="43" width="15" height="5.4" rx="2.7" fill="#14151A" />
        <rect x="39" y="38.5" width="23" height="14.5" rx="5.2" fill={`url(#${u("lens")})`} />
        <rect x="66" y="38.5" width="23" height="14.5" rx="5.2" fill={`url(#${u("lens")})`} />
        <rect x="59" y="43" width="9" height="4.4" rx="1.8" fill="#14151A" />
        <path d="M43 42.5l5-1.6M70 42.5l5-1.6" stroke="#fff" strokeOpacity=".65" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M45 47.5l9-2.5M72 47.5l9-2.5" stroke="#fff" strokeOpacity=".22" strokeWidth="1.6" strokeLinecap="round" />

        {/* straw hat, lit from above left */}
        <g className="hd-hat">
          <ellipse cx="64" cy="28.5" rx="43" ry="9.2" fill={`url(#${u("brim")})`} />
          <ellipse cx="64" cy="26" rx="29" ry="6.4" fill="#F3E3B3" />
          <path d="M26 30c14 7 62 7 76 0" stroke="#A98A4C" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="45" y="19" width="39" height="10.5" rx="2" fill="#C0563A" />
          <rect x="45" y="19" width="39" height="3.4" rx="1.7" fill="#E27A5C" opacity=".6" />
          <path d="M45 26.6h39" stroke="#8F3A24" strokeOpacity=".5" strokeWidth="1.2" />
          <path d="M45.5 19.5c0-9 8-14.5 19-14.5s19 5.5 19 14.5z" fill={`url(#${u("crown")})`} />
          <ellipse cx="64.5" cy="7" rx="14" ry="2.8" fill="#fff" opacity=".4" />
          <path d="M52 15c4-3 21-3 25 0M50 11c5-3.2 25-3.2 29 0" stroke="#B89B5A" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
