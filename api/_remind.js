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
import { createHmac, timingSafeEqual } from "node:crypto";
import { sendGmail, gmailReady } from "./_gmail.js";

const SITE = "https://dwiddle.vercel.app";
// The unsubscribe link carries the account id signed with the secret, so it
// works from the email without signing in, and cannot be made up for anyone.
const sign = (uid, secret) => createHmac("sha256", secret).update("unsub:" + uid).digest("base64url").slice(0, 32);

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

  // Once a day, an email to everyone who has not studied for a week.
  let emailed = 0;
  if ((new Date().getUTCHours() === 10 || req.query?.nudge === "1") && gmailReady) {
    const { data: away } = await db.rpc("nudge_targets", { key: secret });
    const done = [];
    for (const u of (away || []).slice(0, 30)) {
      const days = u.last_day ? Math.round((Date.now() - new Date(u.last_day + "T12:00:00Z")) / 864e5) : null;
      const ok = await sendGmail({
        to: u.email,
        subject: "Dwiddle misses you",
        paragraphs: [
          `Hi${u.first_name ? " " + u.first_name : ""},`,
          days ? `It has been ${days} days since your last study session, and Dwiddle has been waiting by the pond.` : "You have not studied with Dwiddle for a little while, and Dwiddle has been waiting by the pond.",
          "Your notes, lessons and questions are all still there. Even ten minutes today makes a real difference, and a quick quiz is the easiest way back in.",
          `Pick up where you left off: ${SITE}`,
        ],
        unsubscribe: `${SITE}/api/models?unsub=${u.user_id}.${sign(u.user_id, secret)}`,
      }).catch(() => false);
      if (ok) { done.push(u.user_id); emailed++; }
    }
    if (done.length) await db.rpc("nudge_mark", { key: secret, ids: done });
  }
  res.status(200).json({ checked: (data || []).length, sent: sent.length, removed: gone.length, emailed });
}

// The unsubscribe link from the week-away email.
export async function unsubscribe(req, res) {
  const secret = process.env.CRON_SECRET || "";
  const [uid, sig] = String(req.query?.unsub || "").split(".");
  const page = (msg, more = "") => res.status(200).setHeader("Content-Type", "text/html; charset=utf-8")
    .send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font:16px system-ui,sans-serif;display:grid;place-items:center;height:90vh;text-align:center;color:#1e2a21;background:#eef3e7"><div><h2>${msg}</h2>${more ? `<p style="color:#4a5a4e">${more}</p>` : ""}<p><a href="${SITE}" style="color:#3d8c58">Back to Dwiddle</a></p></div>`);
  const good = /^[0-9a-f-]{36}$/i.test(uid || "") && sig && secret && (() => {
    const a = Buffer.from(sig), b = Buffer.from(sign(uid, secret));
    return a.length === b.length && timingSafeEqual(a, b);
  })();
  if (!good) return page("That link is not valid any more.");
  const db = createClient(URL_, ANON, { auth: { persistSession: false } });
  await db.rpc("nudge_optout", { key: secret, uid });
  return page("Done. Dwiddle will not email you again.", "You can turn emails back on any time in Settings, under Notifications.");
}
