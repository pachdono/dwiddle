// Sending email from the Dwiddle Gmail account.
//
// Uses a Gmail app password (Google account, Security, 2-Step Verification,
// App passwords), kept only in the server's environment as GMAIL_USER and
// GMAIL_APP_PASSWORD. Without them nothing is sent and nothing breaks.
//
// This file is shared word for word by the Dwiddle site and the staff site.

import nodemailer from "nodemailer";
import { letter } from "./_letter.js";
export { escape, refOf, staffId, letter } from "./_letter.js";

const user = process.env.GMAIL_USER || "";
const pass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

export const gmailReady = Boolean(user && pass);

let transport = null;
const mailer = () => (transport ||= nodemailer.createTransport({ service: "gmail", auth: { user, pass } }));

// Only real looking single addresses, so nothing can be slipped into the headers.
export const isEmail = (v) => /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[a-z]{2,}$/i.test(String(v || "")) && String(v).length <= 200;

export async function sendGmail({ to, subject, paragraphs, quote, sign, reference, unsubscribe }) {
  if (!gmailReady || !isEmail(to)) return false;
  const { html, text } = letter({ paragraphs, quote, sign, reference, unsubscribe });
  const from = sign?.name ? `${sign.name.replace(/["<>\r\n]/g, "")} at Dwiddle <${user}>` : `Dwiddle <${user}>`;
  await mailer().sendMail({
    from,
    replyTo: user,
    to,
    subject: String(subject).replace(/[\r\n]+/g, " ").slice(0, 150),
    text,
    html,
    // the one click unsubscribe mail apps show beside the sender's name
    ...(unsubscribe && /^https:\/\//.test(unsubscribe) ? { headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
  });
  return true;
}
