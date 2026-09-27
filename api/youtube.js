// A YouTube video, as text to study from.
//
// Cloud addresses are often refused by YouTube. When configured, use a
// transcript provider on the server; keep the direct reader for local setups.

import { userError } from "./_llm.js";
import { allow } from "./_guard.js";

export const config = { maxDuration: 30 };

const MAX = 150000; // characters of transcript: a long lecture, split into parts later

export function videoId(input) {
  const s = String(input || "").trim();
  const valid = (v) => /^[A-Za-z0-9_-]{11}$/.test(v || "") ? v : null;
  if (valid(s)) return s;
  try {
    const url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be") return valid(url.pathname.slice(1));
    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"].includes(host)) return null;
    if (url.pathname === "/watch") return valid(url.searchParams.get("v"));
    return valid(url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/]+)\/?$/)?.[1]);
  } catch { return null; }
}

const clean = (text) => text.replace(/\[(music|applause|laughter)\]/gi, " ").replace(/\s+/g, " ").trim();
const fail = (status, message) => Object.assign(new Error(message), { status });
const UNAVAILABLE = "This video has no readable captions. Open it on YouTube and check for Show transcript, or add your own notes below.";

async function providerTranscript(id, lang, key) {
  const url = new URL("https://api.supadata.ai/v1/transcript");
  url.search = new URLSearchParams({ url: `https://www.youtube.com/watch?v=${id}`, lang, text: "true", mode: "native" }).toString();
  const signal = AbortSignal.timeout(22000);
  const get = (address) => fetch(address, { headers: { "x-api-key": key }, signal, redirect: "error" });
  let response = await get(url);
  let data = await response.json().catch(() => null);
  // Native captions normally return immediately; handle asynchronous replies
  // within the same deadline without starting a second billable request.
  if (response.status === 202 && typeof data?.jobId === "string") {
    const job = `https://api.supadata.ai/v1/transcript/${encodeURIComponent(data.jobId)}`;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      signal.throwIfAborted();
      response = await get(job);
      data = await response.json().catch(() => null);
    } while (response.ok && ["queued", "active"].includes(data?.status));
    if (data?.status === "completed") data = data.result || data;
  }
  if ([401, 402].includes(response.status)) {
    throw fail(503, "Video importing is not configured or its allowance has run out. You can paste the video's transcript in the notes box below.");
  }
  if (response.status === 429) throw fail(503, "Video importing is busy or its allowance has run out. Try again later, or paste the transcript below.");
  if (response.status === 206) throw fail(422, UNAVAILABLE);
  if ([403, 404].includes(response.status)) throw fail(422, "That video is private, restricted or unavailable. Try a public video, or paste your notes below.");
  if (!response.ok || !data || data.error || data.status === "failed") throw fail(502, "The video service could not read this video just now. Try again later, or paste its transcript below.");
  const text = clean(typeof data.content === "string" ? data.content : Array.isArray(data.content)
    ? data.content.map((part) => typeof part?.text === "string" ? part.text : "").join(" ") : "");
  if (!text) throw fail(422, UNAVAILABLE);
  return { text, lang: typeof data.lang === "string" ? data.lang : lang };
}

async function videoInfo(id) {
  // Metadata is optional: a blocked oEmbed request must not lose a transcript.
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`, { signal: AbortSignal.timeout(3000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

const decode = (t) => t
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/<[^>]+>/g, "");

// The player's answer, from the Android client first, which returns caption
// addresses that can be fetched directly, then the web client.
async function player(id, signal) {
  const clients = [
    { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 30,
      ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip" },
    { clientName: "IOS", clientVersion: "20.10.4", deviceModel: "iPhone16,2",
      ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3 like Mac OS X)" },
    { clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER", clientVersion: "2.0",
      ua: "Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko)" },
    { clientName: "WEB_EMBEDDED_PLAYER", clientVersion: "1.20250101.00.00",
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" },
    { clientName: "MWEB", clientVersion: "2.20250101.00.00",
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1" },
    { clientName: "WEB", clientVersion: "2.20250101.00.00",
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" },
  ];
  let last = null;
  for (const c of clients) {
    signal.throwIfAborted();
    const { ua, ...client } = c;
    const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
      headers: { "Content-Type": "application/json", "User-Agent": ua, "Accept-Language": "en-GB,en;q=0.9" },
      body: JSON.stringify({
        context: { client: { ...client, hl: "en", gl: "GB" },
          ...(client.clientName.includes("EMBED") ? { thirdParty: { embedUrl: "https://www.google.com" } } : {}) },
        videoId: id,
      }),
    }).catch(() => null);
    if (!r?.ok) continue;
    const data = await r.json().catch(() => null);
    last = data;
    if (data?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length) return data;
  }
  return last;
}

async function transcriptFrom(track, signal) {
  const r = await fetch(track.baseUrl.replace(/&fmt=[^&]*/, "") + "&fmt=json3", { signal }).catch(() => null);
  if (r?.ok) {
    const data = await r.json().catch(() => null);
    const text = (data?.events || [])
      .map((e) => (e.segs || []).map((s) => s.utf8 || "").join(""))
      .join(" ");
    if (text.trim()) return text;
  }
  const x = await fetch(track.baseUrl, { signal }).catch(() => null);
  if (!x?.ok) return "";
  const xml = await x.text();
  return [...xml.matchAll(/<(?:text|p)[^>]*>([\s\S]*?)<\/(?:text|p)>/g)].map((m) => decode(m[1])).join(" ");
}

export default async function handler(req, res) {
  // Each try can spend a transcript credit, so a few a minute is plenty.
  if (!allow(req, res, { limit: 3 })) return;
  const id = videoId(req.body?.url);
  if (!id) return userError(res, 400, "That does not look like a YouTube link. Copy it from the Share button on the video.");

  try {
    const want = String(req.body?.lang || "en").slice(0, 2).toLowerCase();
    const key = process.env.SUPADATA_API_KEY?.trim();
    if (key) {
      const [captions, info] = await Promise.all([providerTranscript(id, want, key), videoInfo(id)]);
      const title = String(info?.title || "YouTube video");
      return res.status(200).json({ title, channel: String(info?.author_name || ""), minutes: 0,
        lang: captions.lang, transcript: `${title}\n\n${captions.text}`.slice(0, MAX) });
    }
    const signal = AbortSignal.timeout(22000);
    const data = await player(id, signal);
    if (!data) return userError(res, 502, "YouTube could not be reached. Try again later, or paste the transcript below.");
    const status = data?.playabilityStatus?.status;
    if (status && status !== "OK" && !data?.captions) {
      return userError(res, 422, status === "LOGIN_REQUIRED"
        ? "YouTube blocked automatic caption reading for this video. Open it on YouTube, choose Show transcript under the description, and paste the text in the notes box below."
        : "That video is private, removed or not available where Dwiddle runs.");
    }
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (!tracks.length) {
      return userError(res, 422, "That video has no captions to read. Try another, or paste your own notes on it.");
    }
    const pick = tracks.find((t) => t.languageCode?.startsWith(want) && t.kind !== "asr")
      || tracks.find((t) => t.languageCode?.startsWith(want))
      || tracks.find((t) => t.languageCode?.startsWith("en"))
      || tracks[0];
    const text = clean(await transcriptFrom(pick, signal));
    if (!text) {
      return userError(res, 422, "YouTube did not send that video's captions. Open it on YouTube, choose Show transcript, copy it and paste it here instead.");
    }
    const title = String(data?.videoDetails?.title || "YouTube video");
    res.status(200).json({
      title,
      channel: String(data?.videoDetails?.author || ""),
      minutes: Math.round(Number(data?.videoDetails?.lengthSeconds || 0) / 60),
      lang: pick.languageCode,
      transcript: `${title}\n\n${text}`.slice(0, MAX),
    });
  } catch (err) {
    userError(res, err.status || 502, err.status ? err.message : "The video could not be read just now. Try again, or paste its transcript instead.");
  }
}
