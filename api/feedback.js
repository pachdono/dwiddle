// Emails a copy of feedback as it arrives.
//
// The message is stored in Supabase by the client, which is what makes it
// durable and moderatable. This is only the notification, so if email is not
// configured the feedback is still safely recorded and readable in the
// dashboard: the endpoint says so rather than pretending it sent.

import { allow } from "./_guard.js";

export const config = { maxDuration: 20 };

const TO = process.env.FEEDBACK_EMAIL || "dwiddle36@gmail.com";

const escape = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 4 })) return;

  const kind = ["review", "bug"].includes(req.body?.kind) ? req.body.kind : "feedback";
  const message = String(req.body?.message || "").trim().slice(0, 4000);
  const contact = String(req.body?.contact || "").trim().slice(0, 200);
  const rating = Number(req.body?.rating);
  const from = String(req.body?.from || "").trim().slice(0, 200);

  if (message.length < 3) {
    return res.status(400).json({ error: "Say a little more than that" });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Not an error. It is stored, and this is the part that is optional.
    return res.status(200).json({ emailed: false, reason: "No email service configured" });
  }

  const stars = Number.isFinite(rating) && rating >= 1 && rating <= 5 ? `${rating} of 5` : "not rated";

  try {
    const reply = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.FEEDBACK_FROM || "Dwiddle <onboarding@resend.dev>",
        to: [TO],
        // Replying goes to the person who wrote it, when they left an address.
        reply_to: contact && contact.includes("@") ? contact : undefined,
        subject: `Dwiddle ${kind}${kind === "review" ? ` (${stars})` : ""}`,
        html: `
          <p><strong>${escape(kind)}</strong>${kind === "review" ? ` &middot; ${escape(stars)}` : ""}</p>
          <p style="white-space:pre-wrap">${escape(message)}</p>
          <hr>
          <p style="color:#666;font-size:13px">
            From: ${escape(from || "not signed in")}<br>
            Contact: ${escape(contact || "none given")}<br>
            ${kind === "review" ? "This review is hidden until you approve it in the Supabase table editor." : ""}
          </p>`,
      }),
    });

    if (!reply.ok) {
      const detail = await reply.text().catch(() => "");
      console.error("[feedback] email failed", reply.status, detail.slice(0, 200));
      return res.status(200).json({ emailed: false, reason: "The email service refused it" });
    }

    res.status(200).json({ emailed: true });
  } catch (err) {
    console.error("[feedback] email error", err.message);
    res.status(200).json({ emailed: false, reason: "Could not reach the email service" });
  }
}
