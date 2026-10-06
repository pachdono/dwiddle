// The live calendar link: /api/models?cal=<token>. Google Calendar, Apple
// Calendar and Outlook fetch this on their own schedule and show the study
// sessions the person planned. It rides on models.js like the other small
// endpoints, since all twelve function slots are taken.

import { createClient } from "@supabase/supabase-js";
import { makeIcs } from "../src/insights.js";

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
