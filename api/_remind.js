// The daily nudge, like Duolingo's: once a day Vercel's scheduler calls
// /api/models?cron=remind, and everyone who turned reminders on and has not
// studied yet today gets a push notification from Dwiddle.
//
// Needs, in Vercel: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (the keys push
// messages are signed with) and CRON_SECRET (Vercel sends it with the call,
// and supabase/push.sql is set up with the same value, so only the scheduler
// can read who to remind). No service key: the database hands the list over
// only to a caller that knows the secret.

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const URL_ = (process.env.VITE_SUPABASE_URL || "").trim();
const ANON = (process.env.VITE_SUPABASE_ANON_KEY || "").trim();

const KEEP = [
  ["Your streak is waiting!", "A few minutes with Dwiddle today keeps it going."],
  ["Don't let the streak go!", "Five questions is all it takes today."],
  ["Dwiddle is doing a little worried dance", "You studied yesterday. Keep it up today?"],
];
const COME = [
  ["Dwiddle misses you", "Pop in for five minutes. Your notes are right where you left them."],
  ["Quick study break?", "One short lesson today and Dwiddle will be very proud."],
  ["Ready when you are", "Dwiddle has your questions waiting."],
  ["Little and often wins", "Ten minutes today beats three hours the night before."],
];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export async function remind(req, res) {
  const secret = process.env.CRON_SECRET || "";
  if (!secret || String(req.headers.authorization || "") !== `Bearer ${secret}`) return res.status(404).json({ error: "Not found" });
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return res.status(503).json({ error: "Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel" });
  webpush.setVapidDetails("mailto:dwiddle36@gmail.com", pub, priv);

  const db = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("push_targets", { key: secret });
  if (error) return res.status(500).json({ error: error.message });

  const sent = [], gone = [];
  await Promise.all((data || []).map(async (t) => {
    const [title, body] = pick(t.streak_alive ? KEEP : COME);
    try {
      await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
        JSON.stringify({ title, body, url: "/" }), { TTL: 6 * 3600 });
      sent.push(t.endpoint);
    } catch (err) {
      // The browser threw the subscription away: forget it.
      if (err?.statusCode === 404 || err?.statusCode === 410) gone.push(t.endpoint);
    }
  }));
  await db.rpc("push_mark", { key: secret, sent, gone });
  res.status(200).json({ checked: (data || []).length, sent: sent.length, removed: gone.length });
}
