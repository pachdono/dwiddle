// Google Calendar, connected for real: the plan is written into the person's
// own calendar and their busy times are read back, so a session is never placed
// on top of a lesson or a match. It talks to Google straight from the browser
// with a short lived token the person grants (Google Identity Services); there
// is no Dwiddle server in the middle and nothing is stored beyond the token for
// the hour it lasts.
//
// Needs one thing from whoever runs the app: VITE_GOOGLE_CLIENT_ID, an OAuth
// client of type Web in Google Cloud with the Calendar API switched on.

import { isDesktop } from "./desktop.js";

// A Google OAuth client ID is public by design (it is sent to every browser), so
// it can live in the code. VITE_GOOGLE_CLIENT_ID overrides it for another copy.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "631828348249-lv62m8k2o2dt6g3ph3c04m9t3q5f7de2.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3";
const TOKEN_KEY = "dwiddle-gtoken";

export const gcalAvailable = () => !!CLIENT_ID && !isDesktop && typeof window !== "undefined";

let token = null; // { value, expires }
try { const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || "null"); if (t && t.expires > Date.now()) token = t; } catch { /* none */ }
export const setToken = (t) => { token = t; try { t ? sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t)) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* fine */ } };
export const connected = () => !!token && token.expires > Date.now() + 30e3;

function loadGsi() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Google could not be reached."));
    document.head.appendChild(s);
  });
}

// Opens Google's own consent window. Resolves once the person has said yes.
export async function connect() {
  if (!CLIENT_ID) throw new Error("Google Calendar is not set up for this copy of Dwiddle yet.");
  await loadGsi();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error === "access_denied" ? "Permission was not given." : r.error_description || r.error || "Google would not connect."));
        setToken({ value: r.access_token, expires: Date.now() + (Number(r.expires_in) || 3600) * 1000 });
        resolve();
      },
      error_callback: (e) => reject(new Error(e?.type === "popup_closed" ? "The Google window was closed." : "Google would not connect.")),
    });
    client.requestAccessToken({ prompt: connected() ? "" : "consent" });
  });
}

export function disconnect() {
  const t = token?.value;
  setToken(null);
  try { if (t) window.google?.accounts?.oauth2?.revoke(t, () => {}); } catch { /* fine */ }
}

async function call(path, init = {}) {
  if (!connected()) throw Object.assign(new Error("Connect Google Calendar first."), { expired: true });
  const r = await fetch(API + path, { ...init, headers: { Authorization: `Bearer ${token.value}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  if (r.status === 401) { setToken(null); throw Object.assign(new Error("The Google connection ran out. Connect again."), { expired: true }); }
  if (r.status === 204) return null;
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.error?.message || `Google said ${r.status}`);
  return data;
}

// Busy stretches in the main calendar, as [start, end] times. Sessions Dwiddle
// put there itself are left out, or the plan would keep dodging its own
// sessions and shift every time it was updated. Events marked as free, ones
// that were cancelled, and all day events (a birthday, a holiday) are not busy.
export async function busyTimes(from, to) {
  const q = new URLSearchParams({ timeMin: new Date(from).toISOString(), timeMax: new Date(to).toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "250" });
  const d = await call(`/calendars/primary/events?${q}`);
  return (d?.items || [])
    .filter((e) => e.status !== "cancelled" && e.transparency !== "transparent" && e.start?.dateTime && e.end?.dateTime && !e.extendedProperties?.private?.dwiddle)
    .map((e) => [Date.parse(e.start.dateTime), Date.parse(e.end.dateTime)])
    .filter(([s2, e2]) => e2 > s2);
}

const MARK = "dwiddle=plan";

// Puts the plan in the calendar. Sessions Dwiddle added before are replaced, so
// pressing it again after the plan changes updates the calendar rather than
// piling up copies. Nothing the person made themselves is touched.
export async function syncPlan(sessions, now = Date.now()) {
  const until = new Date(now + 21 * 864e5).toISOString();
  const q = new URLSearchParams({ privateExtendedProperty: MARK, timeMin: new Date(now - 36e5).toISOString(), timeMax: until, singleEvents: "true", maxResults: "100" });
  const old = await call(`/calendars/primary/events?${q}`);
  let removed = 0;
  for (const e of old?.items || []) {
    await call(`/calendars/primary/events/${encodeURIComponent(e.id)}`, { method: "DELETE" });
    removed++;
  }
  let added = 0;
  for (const s of sessions) {
    await call("/calendars/primary/events", {
      method: "POST",
      body: JSON.stringify({
        summary: s.topic ? `Study: ${s.topic}` : "Study session",
        description: `${s.reason}. Planned in Dwiddle.`,
        start: { dateTime: new Date(s.start).toISOString() },
        end: { dateTime: new Date(s.end).toISOString() },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] },
        extendedProperties: { private: { dwiddle: "plan" } },
      }),
    });
    added++;
  }
  return { added, removed };
}
