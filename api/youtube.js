// A YouTube video, as text to study from.
//
// YouTube has no public, free way to ask for a transcript, so this reads the
// captions the same way YouTube's own apps do: it asks the player for the
// video's caption tracks, then fetches the one in the student's language, or
// English, or the first there is. Videos with no captions at all, and
// YouTube refusing a request, both come back as a plain message saying what
// to do instead.

import { userError } from "./_llm.js";
import { allow } from "./_guard.js";

export const config = { maxDuration: 30 };

const MAX = 150000; // characters of transcript: a long lecture, split into parts later

export function videoId(input) {
  const s = String(input || "").trim();
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/))([A-Za-z0-9_-]{11})/)
    || s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : null;
}

const decode = (t) => t
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/<[^>]+>/g, "");

// The player's answer, from the Android client first, which returns caption
// addresses that can be fetched directly, then the web client.
async function player(id) {
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
    const { ua, ...client } = c;
    const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
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

async function transcriptFrom(track) {
  const r = await fetch(track.baseUrl.replace(/&fmt=[^&]*/, "") + "&fmt=json3").catch(() => null);
  if (r?.ok) {
    const data = await r.json().catch(() => null);
    const text = (data?.events || [])
      .map((e) => (e.segs || []).map((s) => s.utf8 || "").join(""))
      .join(" ");
    if (text.trim()) return text;
  }
  const x = await fetch(track.baseUrl).catch(() => null);
  if (!x?.ok) return "";
  const xml = await x.text();
  return [...xml.matchAll(/<(?:text|p)[^>]*>([\s\S]*?)<\/(?:text|p)>/g)].map((m) => decode(m[1])).join(" ");
}

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 10 })) return;
  const id = videoId(req.body?.url);
  if (!id) return userError(res, 400, "That does not look like a YouTube link. Copy it from the Share button on the video.");

  try {
    const data = await player(id);
    const status = data?.playabilityStatus?.status;
    if (status && status !== "OK" && !data?.captions) {
      return userError(res, 422, status === "LOGIN_REQUIRED"
        ? "YouTube will not let the website read videos. Use the Dwiddle app for YouTube links, or open the video on YouTube, press Show transcript under the description, and paste it here."
        : "That video is private, removed or not available where Dwiddle runs.");
    }
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (!tracks.length) {
      return userError(res, 422, "That video has no captions to read. Try another, or paste your own notes on it.");
    }
    const want = String(req.body?.lang || "en").slice(0, 2).toLowerCase();
    const pick = tracks.find((t) => t.languageCode?.startsWith(want) && t.kind !== "asr")
      || tracks.find((t) => t.languageCode?.startsWith(want))
      || tracks.find((t) => t.languageCode?.startsWith("en"))
      || tracks[0];
    const text = (await transcriptFrom(pick)).replace(/\s+/g, " ").replace(/\[(music|applause|laughter)\]/gi, "").trim();
    if (text.length < 200) {
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
  } catch {
    userError(res, 502, "The video could not be read just now. Try again, or paste its transcript instead.");
  }
}
