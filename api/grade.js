// Marks a writing task against the published criteria of its test.

import { ask, safeParse, guard, fail, userError, MAX_INPUT } from "./_llm.js";
import { allow } from "./_guard.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 6 })) return;

  const answer = String(req.body?.answer || "").trim();
  const prompt = String(req.body?.prompt || "").trim();
  const criteria = Array.isArray(req.body?.criteria) ? req.body.criteria.map(String) : [];
  const scale = Array.isArray(req.body?.scale) ? req.body.scale : [];
  const rubricName = String(req.body?.rubric || "the assessment criteria");

  if (answer.length < 80) return userError(res, 400, "Write a bit more before asking for a mark");
  if (answer.length > MAX_INPUT) return userError(res, 413, "That answer is too long to mark");
  if (criteria.length === 0 || scale.length === 0) return userError(res, 400, "Missing the rubric");

  const SYSTEM = `You are an experienced examiner marking against ${rubricName}.

Return ONE JSON object and nothing else:
{
  "scores": [ one number per criterion, in the same order, chosen only from the allowed scale ],
  "comments": [ "one or two sentences per criterion, naming what in the answer earned that mark" ],
  "strength": "the single thing most worth keeping",
  "fix": "the single change that would raise the mark most, stated as an instruction"
}

Rules:
- Mark what is actually on the page, not what the student probably meant.
- Be accurate rather than generous. An inflated mark is useless to them.
- Quote a short phrase from the answer in at least one comment.
- Write in British English. Do not use em dashes or en dashes.`;

  const user = `Allowed scale: ${scale.join(", ")}

Criteria, in order:
${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

The task the student was set:
${prompt}

The student's answer:
${answer}`;

  try {
    const text = await ask({ system: SYSTEM, user, maxTokens: 1500, temperature: 0.2 });
    const data = safeParse(text, "scores");

    if (!data || !Array.isArray(data.scores) || data.scores.length !== criteria.length) {
      return userError(res, 502, "The model did not return a usable mark. Try again.");
    }

    // Snap each score to the nearest value the real scale allows.
    const scores = data.scores.map((v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return scale[0];
      return scale.reduce((best, s) => (Math.abs(s - n) < Math.abs(best - n) ? s : best), scale[0]);
    });

    res.status(200).json({
      scores,
      comments: (Array.isArray(data.comments) ? data.comments : []).map(String).slice(0, criteria.length),
      strength: String(data.strength || ""),
      fix: String(data.fix || ""),
    });
  } catch (err) {
    fail(res, err);
  }
}
