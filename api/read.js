// Turns a picture of notes into text.
//
// This is transcription only. The text then goes through /api/generate like
// anything typed or read from a PDF, so one tuned prompt keeps producing the
// questions and nothing has to be duplicated for images.
//
// Nothing here is trained. It asks a model that already reads images, chosen
// from whichever ones the configured key can reach.

import { safeParse, ask, fail, userError } from "./_llm.js";
import { allow } from "./_guard.js";

export const config = { maxDuration: 60 };

// A data URL of a photograph is large, and the platform caps a request body.
const MAX_IMAGE = 3_500_000;

const SYSTEM = `You transcribe a photograph or scan of study material into plain text.

Rules:
- Write out every word you can read, in reading order.
- Keep headings on their own line. Keep lists as lines. Keep the original wording.
- Where the page has a table, write it as lines with columns separated by a tab.
- Where there is a diagram or a chart, describe it in square brackets, including every label, so it can still be revised from.
- A geometry or maths diagram is described so exactly it could be redrawn from the words alone: every shape, every labelled point and which shape it is on, every length, angle and coordinate written on it, what touches what (tangent), what is perpendicular or parallel, what is shaded, and where things sit relative to each other (left, above, inside). Begin it with [Diagram: and use as many sentences as it needs.
- Do not summarise, do not correct mistakes, and do not add anything of your own.
- If part of it is genuinely illegible, write [unclear] there rather than guessing.

Return the text only. No preamble, no commentary, no code fences.`;

// Checking a notebook page, as a careful teacher marks work: real mistakes
// only, each with where it is on the page, why it is wrong and the fix.
const CHECK = `You check a page from a student's notebook for mistakes, the way a careful teacher marks work. The page is a picture of their handwriting and drawings; anything they typed is also given as text.

Find genuine mistakes only:
- maths: arithmetic slips, a wrong step in the algebra, a wrong formula, a sign error, a missing or wrong unit, a wrong final answer
- facts: a statement that is false for their subject and level
- spelling of subject terms, and grammar only where it changes the meaning
Never flag messy handwriting, layout, abbreviations, crossings out, or work that is simply unfinished. If you are not sure something is wrong, leave it.

Return ONE JSON object and nothing else:
{
  "errors": [
    {
      "wrong": "the wrong part exactly as it is written on the page",
      "fix": "the correct version of that part",
      "why": "one or two plain sentences on why it is wrong",
      "kind": "maths" | "fact" | "spelling" | "units" | "other",
      "box": [left, top, right, bottom]
    }
  ],
  "summary": "one short, encouraging sentence about the page"
}
"box" is where the wrong part is on the picture, as fractions of its width and height from the top left, from 0 to 1, drawn a little generously around it.
No mistakes: "errors" is []. At most 8. Write mathematics with real symbols (x², √, ×, ÷). British English. No em dashes.`;

async function check(req, res, image) {
  const typed = String(req.body?.typed || "").slice(0, 6000);
  const text = await ask({
    system: CHECK,
    user: [
      { type: "text", text: typed ? `Check this page. What they typed on it:\n${typed}` : "Check this page." },
      { type: "image_url", image_url: { url: image } },
    ],
    vision: true,
    maxTokens: 2200,
    temperature: 0.1,
  });
  const data = safeParse(text, "errors");
  if (!data) return userError(res, 502, "Dwiddle could not check this page just now. Try again.");
  const clamp = (v) => Math.max(0, Math.min(1, Number(v) || 0));
  const errors = (Array.isArray(data.errors) ? data.errors : [])
    .filter((e) => e && String(e.wrong || "").trim() && String(e.why || "").trim())
    .slice(0, 8)
    .map((e) => {
      let [l, t, r, b] = Array.isArray(e.box) ? e.box.map(clamp) : [0, 0, 0, 0];
      if (r < l) [l, r] = [r, l];
      if (b < t) [t, b] = [b, t];
      const box = r - l > 0.01 && b - t > 0.005 ? [l, t, r, b] : null;
      return {
        wrong: String(e.wrong).trim().slice(0, 200),
        fix: String(e.fix || "").trim().slice(0, 200),
        why: String(e.why).trim().slice(0, 500),
        kind: ["maths", "fact", "spelling", "units", "other"].includes(e.kind) ? e.kind : "other",
        box,
      };
    });
  res.status(200).json({ errors, summary: String(data.summary || "").trim().slice(0, 200) });
}

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 8 })) return;

  const image = String(req.body?.image || "");

  if (!image.startsWith("data:image/")) {
    return userError(res, 400, "Send an image.");
  }
  if (image.length > MAX_IMAGE) {
    return userError(res, 413, "That image is too large. Take the photo again at a smaller size.");
  }

  try {
    if (req.body?.mode === "check") return await check(req, res, image);
    const text = await ask({
      system: SYSTEM,
      // The multimodal message shape: the picture, then what to do with it.
      user: [
        { type: "text", text: "Transcribe this page." },
        { type: "image_url", image_url: { url: image } },
      ],
      vision: true,
      maxTokens: 3000,
      temperature: 0.1,
    });

    const clean = String(text || "")
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/```\s*$/, "")
      .trim();

    if (clean.length < 20) {
      return userError(res, 422, "No readable text was found in that image. A sharper, straighter photo usually fixes it.");
    }

    res.status(200).json({ text: clean });
  } catch (err) {
    fail(res, err);
  }
}
