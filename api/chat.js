// Talking to Dwiddle about whatever is on screen.
//
// Every other endpoint writes one thing. This one answers follow ups: explain
// that again more simply, give me another example, I think this answer is
// wrong. The page sends what the student is looking at as context, so the
// answer is about their lesson or their question rather than the subject in
// general, and the last few turns of the conversation, so "why?" means
// something.

import { ask, fail, userError } from "./_llm.js";
import { allow } from "./_guard.js";

export const config = { maxDuration: 60 };

const SYSTEM = `You are Dwiddle, the duck in a study app, talking with a student about what they are studying. You are a patient, encouraging tutor with a light, friendly manner.

What is on the student's screen right now:
"""
__CONTEXT__
"""

How to answer:
- Answer what they asked, about what is on their screen. Keep it short: two to five sentences, or a short list, unless they ask for more.
- Explain the way a good teacher talks: plain words first, the technical term second, one concrete example where it helps.
- If they think the app got something wrong, check it properly against what you know. If it was wrong, say so plainly and give the correct version. If it was right, explain kindly why, and what probably made it look wrong.
- If they ask to be quizzed, ask one question at a time and wait for their answer before the next.
- Never invent facts, figures, dates or quotations. If you are not sure, say so.
- Write mathematics with real symbols: x², H₂O, √, π, ×, ÷, ≤, ≥, °.
- Plain text. You may use **bold** for a key term and lines starting "- " for a list. No headings, no tables.
- British English. Do not use em dashes or en dashes.`;

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 20 })) return;

  const context = String(req.body?.context || "Nothing in particular: the student is on the home page.").slice(0, 9000);
  const turns = (Array.isArray(req.body?.messages) ? req.body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (!turns.length || turns[turns.length - 1].role !== "user") {
    return userError(res, 400, "Ask Dwiddle something first.");
  }

  try {
    const text = await ask({
      system: SYSTEM.replace("__CONTEXT__", context),
      messages: turns,
      maxTokens: 800,
      temperature: 0.4,
    });
    const reply = String(text || "").replace(/\s*[–—]\s*/g, ", ").trim();
    if (!reply) return userError(res, 502, "Dwiddle lost its train of thought. Ask again.");
    res.status(200).json({ reply });
  } catch (err) {
    fail(res, err);
  }
}
