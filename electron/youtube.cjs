// Reading a YouTube video's captions from the installed app.
//
// The website cannot do this: YouTube refuses these requests from a data
// centre, which is where the website's server runs. The app asks from the
// person's own connection, the same way YouTube's own apps do, which it
// answers. Same approach as api/youtube.js, kept here in CommonJS for the main
// process.

const MAX = 150000;

function videoId(input) {
  const s = String(input || "").trim();
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/))([A-Za-z0-9_-]{11})/)
    || s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : null;
}

// Tags go first, entities last and in one pass, so "if x &lt; 5 and y &gt; 2" keeps its signs and
// "&amp;lt;" stays the five characters it was written as, instead of being decoded twice.
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (t) => String(t).replace(/<[^>]+>/g, "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") {
    const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
    return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
  }
  return ENTITIES[e.toLowerCase()] ?? m;
});

const CLIENTS = [
  { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 30,
    ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip" },
  { clientName: "IOS", clientVersion: "20.10.4", deviceModel: "iPhone16,2",
    ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3 like Mac OS X)" },
  { clientName: "WEB", clientVersion: "2.20250101.00.00",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36" },
];

async function player(id) {
  let last = null;
  for (const { ua, ...client } of CLIENTS) {
    const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": ua, "Accept-Language": "en-GB,en;q=0.9" },
      body: JSON.stringify({ context: { client: { ...client, hl: "en", gl: "GB" } }, videoId: id }),
    }).catch(() => null);
    if (!r || !r.ok) continue;
    const data = await r.json().catch(() => null);
    last = data;
    if (data?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length) return data;
  }
  return last;
}

async function transcriptFrom(track) {
  const r = await fetch(track.baseUrl.replace(/&fmt=[^&]*/, "") + "&fmt=json3").catch(() => null);
  if (r && r.ok) {
    const data = await r.json().catch(() => null);
    const text = (data?.events || []).map((e) => (e.segs || []).map((s) => s.utf8 || "").join("")).join(" ");
    if (text.trim()) return text;
  }
  const x = await fetch(track.baseUrl).catch(() => null);
  if (!x || !x.ok) return "";
  const xml = await x.text();
  return [...xml.matchAll(/<(?:text|p)[^>]*>([\s\S]*?)<\/(?:text|p)>/g)].map((m) => decode(m[1])).join(" ");
}

async function read(url, lang = "en") {
  const id = videoId(url);
  if (!id) return { error: "That does not look like a YouTube link. Copy it from the Share button on the video." };
  const data = await player(id);
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  if (!tracks.length) {
    return { error: data?.playabilityStatus?.status && data.playabilityStatus.status !== "OK"
      ? "That video is private, age restricted or not available here."
      : "That video has no captions to read. Try another, or paste your own notes on it." };
  }
  const want = String(lang).slice(0, 2).toLowerCase();
  const pick = tracks.find((t) => t.languageCode?.startsWith(want) && t.kind !== "asr")
    || tracks.find((t) => t.languageCode?.startsWith(want))
    || tracks.find((t) => t.languageCode?.startsWith("en")) || tracks[0];
  const text = (await transcriptFrom(pick)).replace(/\s+/g, " ").replace(/\[(music|applause|laughter)\]/gi, "").trim();
  if (text.length < 200) return { error: "YouTube did not send that video's captions. Try again in a moment." };
  const title = String(data?.videoDetails?.title || "YouTube video");
  return {
    title,
    channel: String(data?.videoDetails?.author || ""),
    minutes: Math.round(Number(data?.videoDetails?.lengthSeconds || 0) / 60),
    lang: pick.languageCode,
    transcript: `${title}\n\n${text}`.slice(0, MAX),
  };
}

module.exports = { read, decode };
