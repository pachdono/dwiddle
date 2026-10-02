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

// "Explain like I'm 4": a handful of tiny cards about the one idea that
// matters, rather than a paragraph retelling everything on screen.
const FOUR = `You make a hard idea dead simple for a student, as 3 or 4 short picture cards. The student is 11 to 16. The button says "Explain like I'm 4", but that is a joke: never talk down to them, never sound babyish or cheesy.

What the student is looking at:
"""
__CONTEXT__
"""

First decide THE single core idea here. For a question, it is the one idea needed to answer that question. For a set of notes, it is the main idea of the topic. Ignore everything else on screen: no side facts, nothing that is not in what they are looking at.

Return ONE JSON object and nothing else:
{ "cards": [ { "pic": "one emoji", "text": "one short sentence" } ], "word": "the proper term", "means": "what it means, in under 14 plain words" }

Example, for a question on why firms might not maximise profit:
{ "cards": [
  { "pic": "🎁", "text": "A toy company gives every kid a free toy on their birthday." },
  { "pic": "📉", "text": "That costs a lot, so this year's profit is lower." },
  { "pic": "📣", "text": "But everyone talks about how nice they are." },
  { "pic": "🛒", "text": "More families buy from them, so they grow." }
], "word": "Non-profit-maximising objectives", "means": "Firms giving up some profit now for goals like reputation or growth." }

Example, for notes on osmosis:
{ "cards": [
  { "pic": "🥒", "text": "Leave cucumber slices in salty water and they go floppy." },
  { "pic": "💧", "text": "Water leaves the cucumber cells to dilute the salty water." },
  { "pic": "🧱", "text": "The cell membrane lets water through but not the salt." }
], "word": "Osmosis", "means": "Water moving through a membrane from dilute to concentrated." }

Make cards about the idea the student is looking at, in this style. Never copy the examples unless it is exactly the same idea.

Rules:
- 3 or 4 cards. Each "text" is ONE sentence of at most 14 words, in plain everyday words.
- Use a real, concrete example a teenager actually knows: games, phones, YouTubers, football, shops, food, school, sports, social media. Never parents, mummy, teddies, bedtime, fairy tales, robots or made-up characters explaining the theory.
- The example must work exactly like the real idea, so understanding the cards means understanding the idea.
- The cards build: what happens, why it happens, what it leads to.
- "pic" is one emoji for that card, a different emoji on every card. Never a sparkle or star emoji.
- No jargon in the cards, and the cards never use the proper term; that only appears in "word".
- British English. No dashes.`;

// The Chat page, where a student learns a topic from scratch in conversation,
// the way they would with a tutor or a chat assistant: fuller answers, built
// up step by step, checked as it goes.
const LEARN = `You are Dwiddle, the duck in a study app, teaching a student in a chat. They may want to learn a topic from scratch, understand something they are stuck on, revise, or be quizzed. You are a patient, encouraging tutor with a light, friendly manner.

__CONTEXT__

How to answer:
- Teach properly, like the best private tutor. Start from what they already know, build the idea up in small steps, give a concrete everyday example, and define each technical term the first time you use it.
- Short paragraphs and lists of "- " lines, with **bold** for key terms. Usually 80 to 250 words; longer only when they ask for everything on a topic.
- End most answers with one short question that checks they understood, or offer what to look at next. When they answer, tell them kindly whether they are right and why.
- If they give you a question to solve (typed, or in a photo or file), solve it fully, like a worked solution: say briefly what it asks and the method, then every step on its own line with the reason, then the final answer in **bold**. Check the answer before giving it.
- If they ask to be quizzed, ask one question at a time and wait for their answer.
- Stay on what they asked. Never wander into extra topics they did not ask about.
- Never invent facts, figures, dates or quotations. If you are not sure, say so.
- Write mathematics with real symbols: x², H₂O, √, π, ×, ÷, ≤, ≥, °. Work maths step by step, one step per line.
- Plain text only: no headings, no tables, no code blocks.
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
    if (req.body?.mode === "four") {
      const clean = (t) => String(t || "").replace(/\s*[–—]\s*/g, ", ").replace(/[✨⭐🌟💫✦✧]/gu, "").trim();
      const words = (t) => t.split(/\s+/).filter(Boolean).length;
      const emoji = (t) => (String(t || "").match(/\p{Extended_Pictographic}(\uFE0F)?/u) || [""])[0];
      // Cards that came back long, or with words where the picture goes, are
      // asked for again once; the model's first go is often a paragraph.
      let best = null;
      for (let attempt = 0; attempt < 3 && !best?.good; attempt++) {
        const raw = await ask({ system: FOUR.replace("__CONTEXT__", context), user: attempt ? "Make the cards. Each card ONE short sentence, at most 14 words, a different emoji on each, a real teenage example, and never the proper term in a card." : "Make the cards.", maxTokens: 500, temperature: attempt ? 0.2 : 0.4, json: true });
        let d = null;
        try { d = JSON.parse(String(raw).slice(String(raw).indexOf("{"), String(raw).lastIndexOf("}") + 1)); } catch { continue; }
        const cards = (Array.isArray(d?.cards) ? d.cards : []).map((c) => ({ pic: emoji(c?.pic) || "🦆", text: clean(c?.text) }))
          .filter((c) => c.text && !/grown.?up/i.test(c.text)).slice(0, 4);
        if (cards.length < 2) continue;
        const term = clean(d.word).toLowerCase();
        const good = cards.every((c) => words(c.text) <= 16 && !/\b(mummy|mommy|mum|teddy|bedtime|robot)\b/i.test(c.text) && !(term && c.text.toLowerCase().includes(term)))
          && new Set(cards.map((c) => c.pic)).size === cards.length;
        if (!best || good) best = { good, cards, word: clean(d.word).slice(0, 60), means: clean(d.means).slice(0, 120) };
      }
      if (!best) return userError(res, 502, "Dwiddle could not make that simple just now. Try again.");
      return res.status(200).json({ cards: best.cards, word: best.word, means: best.means });
    }
    const learn = req.body?.mode === "learn";
    const text = await ask({
      system: learn
        ? LEARN.replace("__CONTEXT__", req.body?.context ? `What the student is studying or has open:\n"""\n${context}\n"""` : "")
        : SYSTEM.replace("__CONTEXT__", context),
      messages: turns,
      maxTokens: learn ? 1400 : 800,
      temperature: 0.4,
    });
    const reply = String(text || "").replace(/\s*[–—]\s*/g, ", ").trim();
    if (!reply) return userError(res, 502, "Dwiddle lost its train of thought. Ask again.");
    res.status(200).json({ reply });
  } catch (err) {
    fail(res, err);
  }
}
