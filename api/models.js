// Lists the models your NVIDIA key can use, and which the server would try.
//
// Add ?probe=1 to actually call the top candidates with a tiny request and see
// which answer and how quickly. Being listed is not the same as being usable,
// and a model that is listed, accepts the request and then never replies looks
// identical from the outside until you measure it.

import { listModels, candidates, fail } from "./_nvidia.js";

export const config = { maxDuration: 60 };

async function probe(model) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 40,
        temperature: 0.2,
        messages: [{ role: "user", content: 'Reply with only this JSON: {"ok":true}' }],
      }),
    });
    clearTimeout(timer);
    const body = await res.text();
    return { model, status: res.status, ms: Date.now() - started, ok: res.ok, note: res.ok ? undefined : body.slice(0, 120) };
  } catch (err) {
    clearTimeout(timer);
    return { model, status: err.name === "AbortError" ? "timeout" : "error", ms: Date.now() - started, ok: false };
  }
}

export default async function handler(req, res) {
  try {
    const order = await candidates({ includeRejected: Boolean(req.query?.probe) });

    if (req.query?.probe) {
      const top = order.slice(0, 18);
      const results = [];
      for (const model of top) results.push(await probe(model));
      const working = results.filter((r) => r.ok).sort((a, b) => a.ms - b.ms);
      return res.status(200).json({
        tried: results,
        fastestWorking: working[0]?.model ?? null,
        advice: working.length
          ? `Set NVIDIA_MODEL to ${working[0].model} to skip the search.`
          : "None of the top candidates answered. Try again, since this can be transient load.",
      });
    }

    const models = await listModels();
    res.status(200).json({
      count: models.length,
      pinned: process.env.NVIDIA_MODEL || null,
      willTry: order.slice(0, 8),
      hint: "Add ?probe=1 to test which of these actually answer.",
      models,
    });
  } catch (err) {
    fail(res, err);
  }
}
