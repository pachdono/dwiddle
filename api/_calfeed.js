// The live calendar link: /api/models?cal=<token>. Google Calendar, Apple
// Calendar and Outlook fetch this on their own schedule and show the study
// sessions the person planned. It rides on models.js like the other small
// endpoints, since all twelve function slots are taken.

import { createClient } from "@supabase/supabase-js";
import { makeIcs } from "../src/insights.js";
import { allow } from "./_guard.js";

const URL_ = (process.env.VITE_SUPABASE_URL || "").trim();
const ANON = (process.env.VITE_SUPABASE_ANON_KEY || "").trim();

export async function calfeed(req, res) {
  const tok = String(req.query?.cal || "");
  if (!/^[0-9a-f]{20,64}$/.test(tok) || !URL_ || !ANON) return res.status(404).send("Not found");
  const db = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("calfeed_get", { tok });
  if (error || data == null) return res.status(404).send("Not found");
  const sessions = (Array.isArray(data) ? data : [])
    .filter((s) => Number.isFinite(s?.start) && Number.isFinite(s?.end) && s.end > s.start)
    .map((s) => ({ start: s.start, end: s.end, topic: String(s.topic || "").slice(0, 120), reason: String(s.reason || "").slice(0, 160) }))
    .slice(0, 60);
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=900");
  res.setHeader("Content-Disposition", 'inline; filename="dwiddle-study-plan.ics"');
  return res.status(200).send(makeIcs(sessions, Date.now(), "Dwiddle study plan"));
}

// Fetches a calendar's secret address on the person's behalf (the calendar's own
// server does not allow a browser to read it directly), so the plan can keep
// clear of what is booked. Only the calendar providers named here are fetched,
// so it cannot be used to reach anything else, and nothing is kept.
const HOSTS = [/^calendar\.google\.com$/, /^outlook\.office365\.com$/, /^outlook\.live.com$/, /^[a-z0-9-]+\.icloud\.com$/];

export async function fetchIcs(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!allow(req, res, { limit: 60 })) return;
  let url;
  try { url = new URL(String(req.body?.url || "").trim().replace(/^webcal:\/\//i, "https://")); } catch { return res.status(400).json({ error: "That is not a calendar address." }); }
  if (url.protocol !== "https:" || !HOSTS.some((h) => h.test(url.hostname))) return res.status(400).json({ error: "Only Google, Outlook and iCloud calendar addresses can be used." });
  try {
    const r = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10000), headers: { Accept: "text/calendar" } });
    if (!r.ok) return res.status(502).json({ error: "The calendar would not open. Check the address, and that it is the secret address." });
    const text = await r.text();
    if (!text.includes("BEGIN:VCALENDAR")) return res.status(422).json({ error: "That address did not give a calendar." });
    return res.status(200).json({ ics: text.slice(0, 4_000_000) });
  } catch {
    return res.status(502).json({ error: "The calendar could not be reached just now." });
  }
}
