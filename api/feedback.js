// Emails about feedback as it arrives: a copy to the team, and a "we got it"
// to the person who sent it.
//
// The message itself is stored in Supabase by the client, which is what makes
// it durable and moderatable. Both emails are extras on top: if email is not
// configured the feedback is still safely recorded and readable on the staff
// site, and the endpoint says so rather than pretending it sent.

import { allow } from "./_guard.js";
import { sendGmail, gmailReady, escape, isEmail, refOf } from "./_gmail.js";

export const config = { maxDuration: 20 };

const TO = process.env.FEEDBACK_EMAIL || "dwiddle36@gmail.com";
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
const ANON = (process.env.VITE_SUPABASE_ANON_KEY || "").trim();

// Who sent it, checked with Supabase from their sign in token. Never taken
// from the request body, so nobody can have an email sent "as" someone else.
async function accountFrom(req) {
  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Bearer ") || !SUPABASE_URL || !ANON) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: ANON } });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u?.email || !u.email_confirmed_at) return null;
    const m = u.user_metadata || {};
    return { email: u.email, first: String(m.full_name || m.name || "").trim().split(/\s+/)[0] || "" };
  } catch {
    return null;
  }
}

// The automatic reply for each kind of message: what we got, what happens
// next, and what they can do.
const THANKS = {
  bug: {
    subject: "We have received your bug report",
    body: [
      "Thank you for reporting this issue. Your report has been logged and passed to the team that builds Dwiddle.",
      "What happens next: we will try to reproduce the problem and work on a fix. If we need more details, such as the device you were using or the steps that led to it, we will reply to this email. We will let you know once it is fixed.",
      "In the meantime, reloading the page, or updating the desktop app to the latest version, sometimes clears the problem.",
    ],
  },
  review: {
    subject: "Thank you for your review",
    body: [
      "Thank you for taking the time to review Dwiddle. Reviews like yours help other students find us, and help us understand what is working.",
      "Every review is read by our team before anything is published. If yours is chosen for our website, it will appear with your profile name and picture, never your email address. You can ask us to remove it at any time by replying to this email.",
    ],
  },
  feedback: {
    subject: "We have received your feedback",
    body: [
      "Thank you for your feedback. Every message is read by the team and helps decide what we build next.",
      "We are not always able to reply to every suggestion individually, but if we have a question or an update for you, we will reply to this email.",
    ],
  },
  complaint: {
    subject: "We have received your complaint",
    body: [
      "We are sorry to hear that something has not gone the way it should. Thank you for taking the time to tell us.",
      "Your complaint has been recorded and escalated to the Dwiddle owners, who review every complaint personally. We aim to respond as soon as possible, usually within a few days.",
      "If you have anything to add, such as screenshots, the reference of an email you received from us, or the staff name or ID involved, please reply to this email and it will be added to your complaint.",
    ],
  },
};

async function toTeam({ kind, stars, message, account, contact, reference }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const reply = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.FEEDBACK_FROM || "Dwiddle <onboarding@resend.dev>",
      to: [TO],
      reply_to: account?.email || (isEmail(contact) ? contact : undefined),
      subject: `${kind === "complaint" ? "COMPLAINT: " : ""}Dwiddle ${kind}${kind === "review" ? ` (${stars})` : ""}${reference ? ` [${reference}]` : ""}`,
      html: `
        <p><strong>${escape(kind)}</strong>${kind === "review" ? ` &middot; ${escape(stars)}` : ""}</p>
        <p style="white-space:pre-wrap">${escape(message)}</p>
        <hr>
        <p style="color:#666;font-size:13px">
          From: ${escape(account?.email || "not signed in")}<br>
          Contact: ${escape(contact || "none given")}<br>
          Answer it on the staff site.
        </p>`,
    }),
  });
  if (!reply.ok) console.error("[feedback] team email failed", reply.status, (await reply.text().catch(() => "")).slice(0, 200));
  return reply.ok;
}

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 4 })) return;

  const kind = ["review", "bug", "complaint"].includes(req.body?.kind) ? req.body.kind : "feedback";
  const id = String(req.body?.id || "");
  const reference = /^[0-9a-f-]{36}$/i.test(id) ? refOf(id) : "";
  const message = String(req.body?.message || "").trim().slice(0, 4000);
  const contact = String(req.body?.contact || "").trim().slice(0, 200);
  const rating = Number(req.body?.rating);

  if (message.length < 3) {
    return res.status(400).json({ error: "Say a little more than that" });
  }

  const stars = Number.isFinite(rating) && rating >= 1 && rating <= 5 ? `${rating} of 5` : "not rated";
  const account = await accountFrom(req);
  // Only signed in accounts can send feedback, so only they get emails.
  if (!account) return res.status(401).json({ error: "Sign in to send feedback" });

  // The thank you goes to the confirmed account email, or to the address
  // they typed. For an address that was only typed, their message is not
  // repeated back, so this can never be used to send someone else's words
  // to a stranger.
  const to = account.email;
  const t = THANKS[kind];
  const [team, thanks] = await Promise.allSettled([
    toTeam({ kind, stars, message, account, contact, reference }),
    to && gmailReady
      ? sendGmail({ to, subject: t.subject + (reference ? ` (${reference})` : ""), paragraphs: [`Hi${account?.first ? " " + account.first : ""},`, ...t.body], quote: message, reference })
      : Promise.resolve(false),
  ]);
  if (team.status === "rejected") console.error("[feedback] team email error", team.reason?.message);
  if (thanks.status === "rejected") console.error("[feedback] thanks email error", thanks.reason?.message);

  // Says why no thank you went out, without any detail from Gmail itself.
  const mail = !to ? "no address" : !gmailReady ? "not set up" : thanks.status === "rejected" ? "refused" : "sent";
  res.status(200).json({ emailed: team.value === true, thanked: thanks.value === true, mail });
}
