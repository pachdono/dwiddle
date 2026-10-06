// The live calendar link. The plan is kept with the account as a list of
// sessions, and a secret link (served by /api/models?cal=) shows it to any
// calendar app that subscribes. See supabase/calfeed.sql.
import { supabase } from "./supabase.js";

const SITE = "https://dwiddle.vercel.app";
const FEED = (token) => `${SITE}/api/models?cal=${token}`;
export const feedLinks = (token) => ({
  url: FEED(token),
  google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(FEED(token).replace("https://", "webcal://"))}`,
  webcal: FEED(token).replace("https://", "webcal://"),
});

const missing = (e) => /calfeeds|calfeed_get/.test(e?.message || "");

// The person's link, made the first time it is asked for.
export async function getFeed(userId) {
  if (!supabase || !userId) return { error: "Sign in to get a live calendar link." };
  const got = await supabase.from("calfeeds").select("token").eq("user_id", userId).maybeSingle();
  if (got.error) return { error: missing(got.error) ? "setup" : got.error.message };
  if (got.data?.token) return { token: got.data.token };
  const made = await supabase.from("calfeeds").insert({ user_id: userId }).select("token").single();
  if (made.error) return { error: made.error.message };
  return { token: made.data.token };
}

export async function pushSessions(userId, sessions) {
  if (!supabase || !userId) return false;
  const rows = sessions.map((s) => ({ start: s.start, end: s.end, topic: s.topic || "", reason: s.reason || "" }));
  const r = await supabase.from("calfeeds").update({ sessions: rows, updated_at: new Date().toISOString() }).eq("user_id", userId);
  return !r.error;
}

// A new link, so the old one stops working.
export async function replaceFeed(userId) {
  if (!supabase || !userId) return { error: "Sign in first." };
  await supabase.from("calfeeds").delete().eq("user_id", userId);
  return getFeed(userId);
}
