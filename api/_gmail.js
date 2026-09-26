// Sending email from the Dwiddle Gmail account.
//
// Uses a Gmail app password (Google account, Security, 2-Step Verification,
// App passwords), kept only in the server's environment as GMAIL_USER and
// GMAIL_APP_PASSWORD. Without them nothing is sent and nothing breaks.

import nodemailer from "nodemailer";

const user = process.env.GMAIL_USER || "";
const pass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

export const gmailReady = Boolean(user && pass);

let transport = null;
const mailer = () => (transport ||= nodemailer.createTransport({ service: "gmail", auth: { user, pass } }));

export const escape = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A plain, friendly email: a few paragraphs and the Dwiddle sign off.
export function letter(paragraphs, quote) {
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#1b1d26;max-width:560px">
      ${paragraphs.map((p) => `<p style="margin:0 0 14px;white-space:pre-wrap">${escape(p)}</p>`).join("")}
      <p style="margin:18px 0 0">The Dwiddle team<br><a href="https://dwiddle.vercel.app" style="color:#3b5bfd">dwiddle.vercel.app</a></p>
      ${quote ? `<hr style="border:0;border-top:1px solid #e5e5e5;margin:22px 0 12px"><p style="margin:0 0 6px;color:#888;font-size:13px">What you sent:</p><p style="margin:0;color:#666;font-size:13px;white-space:pre-wrap">${escape(quote)}</p>` : ""}
    </div>`;
  const text = [...paragraphs, "", "The Dwiddle team", "https://dwiddle.vercel.app", ...(quote ? ["", "What you sent:", quote] : [])].join("\n\n");
  return { html, text };
}

// Only real looking single addresses, so nothing can be slipped into the headers.
export const isEmail = (v) => /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[a-z]{2,}$/i.test(String(v || "")) && String(v).length <= 200;

export async function sendGmail({ to, subject, paragraphs, quote }) {
  if (!gmailReady || !isEmail(to)) return false;
  const { html, text } = letter(paragraphs, quote);
  await mailer().sendMail({
    from: `Dwiddle <${user}>`,
    replyTo: user,
    to,
    subject: String(subject).replace(/[\r\n]+/g, " ").slice(0, 150),
    text,
    html,
  });
  return true;
}
