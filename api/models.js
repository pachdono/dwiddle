// Lists the models your NVIDIA key can use, and which the server would try.
//
// Add ?probe=1 to actually call the top candidates with a tiny request and see
// which answer and how quickly. Being listed is not the same as being usable,
// and a model that is listed, accepts the request and then never replies looks
// identical from the outside until you measure it.

import { listModels, candidates, provider, providers, fail } from "./_llm.js";
import { admin } from "./_guard.js";
import { remind, unsubscribe } from "./_remind.js";

export const config = { maxDuration: 60 };

async function probe(model, tokens = 40) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const p = provider();
    const res = await fetch(`${p.base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env[p.env]}`,
        ...p.extraHeaders,
      },
      body: JSON.stringify({
        model,
        max_tokens: tokens,
        temperature: 0.2,
        messages: [{
          role: "user",
          content: tokens > 100
            ? "Write a JSON array of 12 short multiple choice questions about photosynthesis. Each entry: {q, choices:[4], answer, why}. JSON only."
            : 'Reply with only this JSON: {"ok":true}',
        }],
      }),
    });
    clearTimeout(timer);
    const body = await res.text();
    let produced;
    try { produced = JSON.parse(body)?.usage?.completion_tokens; } catch { /* not json */ }
    return {
      model,
      status: res.status,
      ms: Date.now() - started,
      ok: res.ok,
      producedTokens: produced,
      tokensPerSecond: produced ? Math.round(produced / ((Date.now() - started) / 1000)) : undefined,
      note: res.ok ? undefined : body.slice(0, 120),
    };
  } catch (err) {
    clearTimeout(timer);
    return { model, status: err.name === "AbortError" ? "timeout" : "error", ms: Date.now() - started, ok: false };
  }
}

export default async function handler(req, res) {
  // The daily reminder rides on this endpoint, since the plan allows twelve
  // functions and all twelve are taken.
  if (req.query?.cron === "remind") return remind(req, res);
  if (req.query?.unsub) return unsubscribe(req, res);
  // Reports which provider and models the account can use, and the probe spends
  // quota on every model it tries, so it is not something to leave open.
  if (!admin(req, res)) return;

  try {
    const order = await candidates({ includeRejected: Boolean(req.query?.probe) });

    if (req.query?.probe) {
      const tokens = Number(req.query.tokens) || 40;
      const top = order.slice(0, Number(req.query.limit) || 18);
      const results = [];
      for (const model of top) results.push(await probe(model, tokens));
      const working = results.filter((r) => r.ok).sort((a, b) => a.ms - b.ms);
      return res.status(200).json({
        tried: results,
        fastestWorking: working[0]?.model ?? null,
        advice: working.length
          ? `Set ${provider().modelEnv} to ${working[0].model} to skip the search.`
          : "None of the top candidates answered. Try again, since this can be transient load.",
      });
    }

    const models = await listModels();
    res.status(200).json({
      provider: provider().id,
      fallbacks: providers().slice(1).map((p) => p.id),
      count: models.length,
      pinned: process.env[provider().modelEnv] || null,
      willTry: order.slice(0, 8),
      hint: "Add ?probe=1 to test which of these actually answer.",
      models,
    });
  } catch (err) {
    fail(res, err);
  }
}
