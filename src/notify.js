// Notifications: a ping when something you made is ready, and a daily nudge
// to study, like Duolingo's.
//
// "Ready" ones are shown by this page when Dwiddle is in the background. The
// daily one comes from the server by web push, so it arrives with Dwiddle
// closed (api/_remind.js); the desktop app, which has no web push, reminds
// from here while it is running.

import { supabase } from "./supabase.js";
import { load, save, KEYS } from "./store.js";

// The public half of the key push messages are signed with. Public by design.
const VAPID = "BAwftQaOipX-vK2ZiT8oFDzyNbeQ9OtohN2tTJb5qksDyeVilbLvcICoJkOaOT1R7AnjwQ5NwhlGewdb-kvW4dI";
const PREFS = "dwiddle-notify"; // { ready: bool, daily: bool }
const desktop = typeof window !== "undefined" && !!window.DWIDDLE_DESKTOP;

export const supported = () => typeof window !== "undefined" && "Notification" in window;
export const prefs = () => ({ ready: true, daily: false, ...load(PREFS, {}) });
const setPrefs = (p) => save(PREFS, { ...prefs(), ...p });

// Asked once, at a moment the student is waiting for something, rather than
// the second the page opens.
export async function askOnce() {
  if (!supported() || Notification.permission !== "default" || load("dwiddle-notify-asked", false)) return;
  save("dwiddle-notify-asked", true);
  try { await Notification.requestPermission(); } catch { /* old Safari */ }
}

async function show(title, body, url = "/") {
  if (!supported() || Notification.permission !== "granted") return;
  const opts = { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: title, data: { url } };
  try {
    const reg = !desktop && "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (reg) { await reg.showNotification(title, opts); return; }
    const n = new Notification(title, opts);
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* the browser said no */ }
}

// Something finished: only worth a notification when Dwiddle is not on screen.
export function ready(title, body, url) {
  if (!prefs().ready || document.visibilityState === "visible") return;
  show(title, body, url);
}

/* ---------- the daily reminder ---------- */

const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

export async function setDaily(on, user) {
  if (on) {
    if (!supported()) throw new Error("This browser cannot show notifications.");
    const p = await Notification.requestPermission();
    if (p !== "granted") throw new Error("Notifications are blocked for Dwiddle. Allow them in your browser settings, then try again.");
    if (!desktop) {
      if (!user) throw new Error("Sign in first, so the reminder knows when you have already studied.");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("This browser cannot get reminders while Dwiddle is closed. On an iPhone, add Dwiddle to your Home Screen first.");
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) });
      const j = sub.toJSON();
      const { error } = await supabase.from("push_subs").upsert({
        endpoint: j.endpoint, user_id: user.id, p256dh: j.keys.p256dh, auth: j.keys.auth,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
      if (error) throw new Error(/push_subs/.test(error.message) ? "Reminders are not switched on for Dwiddle yet (run supabase/push.sql)." : error.message);
    }
  } else if (!desktop && "serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) {
      await supabase?.from("push_subs").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe().catch(() => {});
    }
  }
  setPrefs({ daily: on });
}

// The desktop app reminds by itself: from five in the afternoon, once a day,
// if nothing has been studied yet.
const LINES = [
  ["Dwiddle misses you", "Pop in for five minutes. Your notes are right where you left them."],
  ["Your streak is waiting!", "A few minutes today keeps it going."],
  ["Quick study break?", "One short lesson today and Dwiddle will be very proud."],
];
export function startDesktopReminder() {
  if (!desktop) return () => {};
  const tick = () => {
    if (!prefs().daily) return;
    const now = new Date(), today = now.toISOString().slice(0, 10);
    if (now.getHours() < 17 || load("dwiddle-reminded", "") === today) return;
    const days = load(KEYS.stats, {})?.days || [];
    if (days.includes(today)) return;
    save("dwiddle-reminded", today);
    const [t, b] = LINES[Math.floor(Math.random() * LINES.length)];
    show(t, b);
  };
  tick();
  const t = setInterval(tick, 10 * 60 * 1000);
  return () => clearInterval(t);
}
