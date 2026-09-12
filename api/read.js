// Turns a picture of notes into text.
//
// This is transcription only. The text then goes through /api/generate like
// anything typed or read from a PDF, so one tuned prompt keeps producing the
// questions and nothing has to be duplicated for images.
//
// Nothing here is trained. It asks a model that already reads images, chosen
// from whichever ones the configured key can reach.

import { ask, fail, userError } from "./_llm.js";
import { allow } from "./_guard.js";

export const config = { maxDuration: 60 };

// A data URL of a photograph is large, and the platform caps a request body.
const MAX_IMAGE = 3_500_000;

const SYSTEM = `You transcribe a photograph or scan of study material into plain text.

Rules:
- Write out every word you can read, in reading order.
- Keep headings on their own line. Keep lists as lines. Keep the original wording.
- Where the page has a table, write it as lines with columns separated by a tab.
- Where there is a diagram or a chart, describe it in one or two sentences in square brackets, including any labels, so it can still be revised from.
- Do not summarise, do not correct mistakes, and do not add anything of your own.
- If part of it is genuinely illegible, write [unclear] there rather than guessing.

Return the text only. No preamble, no commentary, no code fences.`;

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
