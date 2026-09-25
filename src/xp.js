// Experience points and levels, the part of Gizmo that makes a run of
// questions feel like it is going somewhere.
//
// Right answers are worth the most, but trying counts too, so a hard topic is
// not a losing streak. Each level asks a little more than the last, so early
// levels come quickly and later ones mean something.

export const XP = { right: 10, tried: 3, lesson: 50, firstToday: 20 };

export function levelOf(xp = 0) {
  let level = 1, need = 100, left = Math.max(0, Math.floor(xp));
  while (left >= need) { left -= need; level += 1; need += 50; }
  return { level, into: left, need };
}

// Shows a small "+10 XP" wherever the app is.
export function announceXp(amount, label = "") {
  if (!amount) return;
  window.dispatchEvent(new CustomEvent("dwiddle:xp", { detail: { amount, label } }));
}
