// The Dwiddle email design, with no server code in it, so the staff site
// can show a preview of exactly what will be sent.
//
// This file is shared word for word by the Dwiddle site and the staff site.

const SITE = "https://dwiddle.vercel.app";
const OWNER = "dwiddle36@gmail.com";

export const escape = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A short, readable reference for a message, from its id.
export const refOf = (id) => "DW-" + String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase();
export const staffId = (n) => (n ? "DWS-" + String(n).padStart(3, "0") : "");

// A branded email: the Dwiddle banner, the message, who it is from, the
// reference, what they sent, and how to complain. Tables and inline styles,
// because that is all email apps reliably draw.
export function letter({ paragraphs, quote, sign, reference, unsubscribe }) {
  const p = (t) => `<p style="margin:0 0 14px;white-space:pre-wrap">${escape(t)}</p>`;
  // Staff sign off as themselves, gamer style: "- Dono" over the team name,
  // with their staff ID underneath. Automatic emails come from the team.
  const signature = sign?.name
    ? `<p style="margin:22px 0 0">- ${escape(sign.name)}<br><b>The Dwiddle Team</b>${sign.id ? `<br><span style="color:#8a8f9c;font-size:12.5px">Staff ID ${escape(sign.id)}</span>` : ""}</p>`
    : `<p style="margin:22px 0 0">Kind regards,<br><b>The Dwiddle Team</b></p>`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f3f0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e6e1">
  <tr><td style="background:#FFF1C2;padding:18px 24px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px"><img src="${SITE}/icon-192.png" width="40" height="40" alt="" style="display:block;border-radius:10px"></td>
      <td style="font:700 20px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b1d26">Dwiddle</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:26px 28px 8px;font:15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b1d26">
    ${paragraphs.map(p).join("")}
    ${signature}
    ${reference ? `<p style="margin:18px 0 0;color:#8a8f9c;font-size:12.5px">Reference: ${escape(reference)}</p>` : ""}
  </td></tr>
  ${quote ? `<tr><td style="padding:14px 28px 4px"><div style="border-left:3px solid #e3e1dc;padding:6px 0 6px 14px;color:#6b6f80;font:13.5px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;white-space:pre-wrap"><span style="font-size:12px;color:#8a8f9c">What you sent:</span><br>${escape(quote)}</div></td></tr>` : ""}
  <tr><td style="padding:22px 28px 26px;font:12.5px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#8a8f9c">
    <div style="border-top:1px solid #eeece8;padding-top:16px">
      You can reply to this email. Not happy with how we handled something? Email
      <a href="mailto:${OWNER}" style="color:#3b5bfd">${OWNER}</a> or send a complaint from
      <a href="${SITE}/feedback" style="color:#3b5bfd">dwiddle.vercel.app/feedback</a>${reference ? `, quoting ${escape(reference)}` : ""}.
      Complaints go to the Dwiddle owners and the staff team.
    </div>
    ${unsubscribe ? `<div style="margin-top:12px;border-top:1px solid #eeece8;padding-top:14px">You are getting this because you have a Dwiddle account. <a href="${escape(unsubscribe)}" style="color:#3b5bfd;font-weight:600">Unsubscribe from these emails</a> and we will not send them again. You can change your mind any time in Settings.</div>` : ""}
    <div style="margin-top:12px"><a href="${SITE}" style="color:#8a8f9c;text-decoration:none">Dwiddle &middot; free study app</a> &middot; <a href="${SITE}/privacy" style="color:#8a8f9c;text-decoration:none">Privacy</a></div>
  </td></tr>
</table>
</td></tr></table></body></html>`;
  const text = [
    ...paragraphs, "",
    sign?.name ? `- ${sign.name}\nThe Dwiddle Team${sign.id ? `\nStaff ID ${sign.id}` : ""}` : "Kind regards,\nThe Dwiddle Team",
    ...(reference ? ["", `Reference: ${reference}`] : []),
    ...(quote ? ["", "What you sent:", quote] : []),
    ...(unsubscribe ? ["", `Unsubscribe from these emails: ${unsubscribe}`] : []),
    "", `Not happy with how we handled something? Email ${OWNER} or send a complaint from ${SITE}/feedback${reference ? `, quoting ${reference}` : ""}.`,
  ].join("\n");
  return { html, text };
}

