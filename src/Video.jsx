// Explainer videos: a question, or a whole set of material, talked through
// at a whiteboard.
//
// A video here is a script, not a file (see api/video.js). Each scene has a
// heading, lines read aloud one at a time by the narrator, and a diagram and
// board whose parts arrive with the line that talks about them. A set of
// material becomes one long video with a chapter per topic, and timestamps
// for every chapter and scene. The transcript sits beside it throughout.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { sayAs, stopSpeaking } from "./tts.js";
import { onNarration, narrationAudio, prepareNarration } from "./narration.js";
import { writeVideo } from "./ai.js";
import { blockPlain } from "./marks.js";
import { Icon, PageHead, Portal, BusyScreen, Boundary } from "./ui.jsx";
import { Duck } from "./Duck.jsx";

/* ---------- saved videos ---------- */

const KEY = "dwiddle-videos";
// A saved video the player can open: anything else (from an older version,
// or cut short when storage filled) is left out rather than opened.
const playable = (v) => !!v && Array.isArray(v.scenes) && v.scenes.length > 0 &&
  v.scenes.every((sc) => sc && Array.isArray(sc.lines) && sc.lines.length && Array.isArray(sc.board));
const loadAll = () => {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}");
    return Object.fromEntries(Object.entries(all && typeof all === "object" ? all : {}).filter(([k, v]) => playable(v) || k.startsWith("parts::")));
  } catch { return {}; }
};
function saveOne(id, video) {
  try {
    const all = loadAll();
    delete all[id];
    if (video) all[id] = video;
    const keys = Object.keys(all);
    keys.slice(0, Math.max(0, keys.length - 12)).forEach((k) => delete all[k]); // the newest twelve
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage full: the video still plays, it just is not kept */ }
}
const materialKey = (made) => `all::${made?.title || "material"}`;
const partsKey = (made) => `parts::${made?.title || "material"}`;

// The chapters made so far, joined into one video.
function joinChapters(made, parts) {
  const chapters = [], scenes = [];
  for (const part of parts) {
    chapters.push({ title: part.topic, scene: scenes.length });
    scenes.push(...part.video.scenes);
  }
  return { title: made?.title || "Your material", subtitle: `${chapters.length} chapter${chapters.length === 1 ? "" : "s"}`, chapters, scenes };
}

/* ---------- the Videos page ---------- */

export function Videos({ made, go, early }) {
  if (!early) {
    return (
      <div className="page fade">
        <PageHead title="Videos" sub="Narrated explainer videos of your material." />
        <div className="card card-pad" style={{ textAlign: "center", padding: 44 }}>
          <Duck size={84} outfit="dj" />
          <b style={{ display: "block", marginTop: 10 }}>Coming soon</b>
          <p className="muted small" style={{ margin: "6px auto 18px", maxWidth: 400 }}>Videos are being tried out by testers first.</p>
          <button className="btn" onClick={() => go("sheet")}>Back to your notes</button>
        </div>
      </div>
    );
  }
  return <VideosPage made={made} go={go} />;
}

function VideosPage({ made, go }) {
  const topics = made?.topics || [];
  const [saved, setSaved] = useState(loadAll);
  const [making, setMaking] = useState(null); // { n, of, topic } while chapters are being made
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  const video = saved[materialKey(made)];
  const parts = saved[partsKey(made)]?.list || [];
  // The narration is made in the background as soon as there is a video,
  // so it is ready, or nearly, by the time Watch is pressed.
  const [narr, setNarr] = useState(null);
  useEffect(() => (video ? onNarration(video, setNarr) : undefined), [video]);
  const withNotes = topics.filter((t) => (made?.notes?.[t.name] || []).map(blockPlain).join("\n").length >= 80);

  // A chapter per topic, one request each so every request stays small, one
  // after another. What is made is kept as it goes, so a failure part way
  // picks up where it stopped rather than starting again.
  async function make(fresh) {
    setError("");
    let done = fresh ? [] : parts.filter((p) => withNotes.some((t) => t.name === p.topic));
    if (fresh) { saveOne(partsKey(made), null); saveOne(materialKey(made), null); }
    const todo = withNotes.filter((t) => !done.some((p) => p.topic === t.name));
    try {
      for (let i = 0; i < todo.length; i++) {
        const t = todo[i];
        setMaking({ n: done.length + 1, of: withNotes.length, topic: t.name });
        const notes = (made.notes[t.name] || []).map(blockPlain).filter(Boolean).join("\n");
        const part = await writeVideo({ topic: t.name, notes });
        done = [...done, { topic: t.name, video: part }];
        saveOne(partsKey(made), { scenes: [], list: done });
      }
      // In the order the material has them, whatever order they were made in.
      const ordered = withNotes.map((t) => done.find((p) => p.topic === t.name)).filter(Boolean);
      const whole = joinChapters(made, ordered);
      saveOne(materialKey(made), whole);
      saveOne(partsKey(made), null);
      prepareNarration(whole);
      setSaved(loadAll());
    } catch (err) {
      setSaved(loadAll());
      setError(`${err.message || "A chapter could not be made."} ${done.length ? `${done.length} of ${withNotes.length} chapters are made and kept; carry on to make the rest.` : ""}`);
    } finally {
      setMaking(null);
    }
  }

  if (!topics.length) {
    return (
      <div className="page fade">
        <PageHead title="Videos" sub="Your material explained at a whiteboard, step by step, with the transcript beside it." />
        <div className="card card-pad" style={{ textAlign: "center", padding: 44 }}>
          <Duck size={84} outfit="dj" />
          <b style={{ display: "block", marginTop: 10 }}>No video yet</b>
          <p className="muted small" style={{ margin: "6px auto 18px", maxWidth: 400 }}>
            Add your notes, or pick a course topic, and it can become one narrated video here, a chapter for each topic.
          </p>
          <button className="btn" onClick={() => go("upload")}><Icon name="upload" size={14} /> Add material</button>
        </div>
      </div>
    );
  }

  const times = video ? chapterTimes(video) : [];
  return (
    <div className="page fade">
      <PageHead
        title="Videos"
        sub={`One narrated video of ${made?.title || "your material"}, a chapter for each topic, with timestamps and the transcript beside it.`}
      />

      <div className="card card-pad vd-card">
        <div className="vd-card-head">
          <span className="sv-video-icon"><Icon name="video" size={20} /></span>
          <div>
            <b>{video ? video.title : "Make the video"}</b>
            <p className="small muted" style={{ margin: "2px 0 0" }}>
              {video
                ? `${video.chapters?.length || 1} chapters · about ${minutesOf(video)} min${narr && narr.state === "making" ? ` · narration ${Math.round((narr.done / (narr.total || 1)) * 100)}% ready` : narr?.state === "ready" ? " · narration ready" : ""}`
                : parts.length
                  ? `${parts.length} of ${withNotes.length} chapters made so far.`
                  : `${withNotes.length} chapter${withNotes.length === 1 ? "" : "s"}, one for each topic. Takes about half a minute a chapter.`}
            </p>
          </div>
          <div className="row">
            {video && <button className="btn cta" onClick={() => setOpen(video)} disabled={!!making}>Watch</button>}
            {!video && parts.length > 0 && <button className="btn cta" onClick={() => make(false)} disabled={!!making}>Carry on</button>}
            {!video && !parts.length && <button className="btn cta" onClick={() => make(true)} disabled={!!making || !withNotes.length}>Make the video</button>}
            {(video || parts.length > 0) && <button className="btn ghost" onClick={() => make(true)} disabled={!!making}>Make a new one</button>}
          </div>
        </div>

        {video && narr?.state === "making" && (
          <div className="vd-narr" aria-live="polite">
            <div className="vd-voice-bar"><i style={{ width: `${Math.round((narr.done / (narr.total || 1)) * 100)}%` }} /></div>
            <span className="small muted">Preparing the narration in the background: {narr.done} of {narr.total} lines. Carry on with anything else meanwhile; it keeps going while Dwiddle is open.</span>
          </div>
        )}
        {video?.chapters?.length > 0 && (
          <ol className="vd-chapters">
            {video.chapters.map((c, i) => (
              <li key={i}>
                <button onClick={() => setOpen({ ...video, startScene: c.scene })}>
                  <span className="vd-stamp">{stamp(times[i])}</span>{c.title}
                </button>
              </li>
            ))}
          </ol>
        )}
        {withNotes.length < topics.length && (
          <p className="small muted" style={{ margin: "12px 0 0" }}>
            {topics.length - withNotes.length} topic{topics.length - withNotes.length === 1 ? " has" : "s have"} no full notes yet, so {topics.length - withNotes.length === 1 ? "it is" : "they are"} left out. Write them on the Notes tab to include them.
          </p>
        )}
        {error && <p className="small vd-err" style={{ marginTop: 10 }}>{error}</p>}
      </div>

      {making && <BusyScreen title="Making your video" detail={`Chapter ${making.n} of ${making.of}: ${making.topic}.`} progress={(making.n - 1) / making.of} outfit="dj" />}
      {open && (
        <Boundary fallback={({ error: e }) => (
          <Portal>
            <div className="vd vd-broken" role="alert">
              <div className="card card-pad crash">
                <Duck size={72} outfit="detective" />
                <b>This video could not be played</b>
                <p className="small muted">Making a new one usually fixes it.</p>
                <div className="row">
                  <button className="btn cta" onClick={() => { setOpen(null); make(true); }}>Make a new one</button>
                  <button className="btn ghost" onClick={() => setOpen(null)}>Close</button>
                </div>
                <code className="crash-detail">{String(e?.message || e).slice(0, 300)}</code>
              </div>
            </div>
          </Portal>
        )}>
          <VideoPlayer video={open} onClose={() => setOpen(null)} />
        </Boundary>
      )}
    </div>
  );
}

/* ---------- timing ---------- */

// Timestamps from the words: the narrator reads about two and a half words a
// second, with a short pause after each line.
const wordsOf = (s) => String(s).split(/\s+/).filter(Boolean).length;
const lineSeconds = (text) => wordsOf(text) / 2.5 + 0.45;
const sceneSeconds = (sc) => sc.lines.reduce((n, l) => n + lineSeconds(l), 0);
function stamp(seconds) {
  const s = Math.round(seconds || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}
// When each scene starts, in seconds.
function sceneTimes(video) {
  const out = [];
  let t = 0;
  for (const sc of video.scenes) { out.push(t); t += sceneSeconds(sc); }
  return out;
}
function chapterTimes(video) {
  const starts = sceneTimes(video);
  return (video.chapters || []).map((c) => starts[c.scene] || 0);
}
export const minutesOf = (video) => Math.max(1, Math.round(video.scenes.reduce((n, sc) => n + sceneSeconds(sc), 0) / 60));

/* ---------- the player ---------- */

export function VideoPlayer({ video, onClose }) {
  const beats = useMemo(() => video.scenes.flatMap((sc, si) => sc.lines.map((text, li) => ({ si, li, text }))), [video]);
  const chapters = video.chapters || [];
  const chapterOf = (si) => { let c = -1; chapters.forEach((ch, i) => { if (ch.scene <= si) c = i; }); return c; };

  const sceneStart = useCallback((si) => beats.findIndex((b) => b.si === si), [beats]);
  const [pos, setPos] = useState(() => (video.startScene ? Math.max(0, sceneStart(video.startScene)) : 0));
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(!!video.startScene);
  const [finished, setFinished] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [rate, setRate] = useState(1);
  const list = useRef(null);

  // The narration is one recording, made in the background (see
  // narration.js). Until it is ready, playing waits for it; only if the
  // narrator cannot load at all does the device's own voice read, line by
  // line, instead.
  const [narr, setNarr] = useState({ state: "making", done: 0, total: beats.length });
  const [track, setTrack] = useState(null); // { url, starts, duration }
  const audio = useRef(null);
  useEffect(() => onNarration(video, setNarr), [video]);
  useEffect(() => {
    if (narr.state !== "ready" || track) return;
    let live = true;
    narrationAudio(video).then((t) => { if (live && t) setTrack(t); });
    return () => { live = false; };
  }, [narr.state, track, video]);
  useEffect(() => () => { if (track) URL.revokeObjectURL(track.url); }, [track]);
  const mode = track ? "track" : narr.state === "failed" ? "device" : "waiting";

  // Where each line starts, in seconds: from the recording when there is one.
  const at = useMemo(() => {
    if (track) return track.starts;
    let t = 0;
    return beats.map((b) => { const s = t; t += lineSeconds(b.text); return s; });
  }, [beats, track]);
  const total = track ? track.duration : beats.length ? at[at.length - 1] + lineSeconds(beats[beats.length - 1].text) : 0;

  const beat = beats[pos];
  const scene = video.scenes[beat.si];

  // With the recording: it plays straight through, and the line on screen
  // follows its clock.
  useEffect(() => {
    const el = audio.current;
    if (mode !== "track" || !el) return;
    el.playbackRate = rate;
    el.preservesPitch = true;
    if (playing) {
      if (Math.abs(el.currentTime - at[pos]) > 0.6 && !(el.currentTime >= at[pos] && el.currentTime < (at[pos + 1] ?? Infinity))) el.currentTime = at[pos];
      el.play().catch(() => setPlaying(false));
      let raf = 0;
      const tick = () => {
        const t = el.currentTime;
        let i = pos;
        while (i + 1 < at.length && at[i + 1] <= t) i++;
        while (i > 0 && at[i] > t) i--;
        if (i !== pos) setPos(i);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    el.pause();
  }, [mode, playing, pos, at, rate]);

  // Without it: the device's voice, a line at a time.
  const token = useRef(0);
  useEffect(() => {
    if (mode !== "device" || !playing) return;
    const mine = ++token.current;
    let timer = 0, guard = 0, done = false;
    const next = () => {
      if (done || token.current !== mine) return;
      done = true;
      clearTimeout(guard);
      timer = setTimeout(() => {
        if (token.current !== mine) return;
        if (pos + 1 >= beats.length) { setPlaying(false); setFinished(true); return; }
        setPos(pos + 1);
      }, 450 / rate);
    };
    sayAs("narrator", beats[pos].text, { rate, onEnd: next, device: true });
    // Some browsers never say when speech ends. Never wait forever on one.
    guard = setTimeout(next, (8000 + wordsOf(beats[pos].text) * 700) / rate);
    return () => { clearTimeout(timer); clearTimeout(guard); if (token.current === mine) { token.current += 1; stopSpeaking(); } };
  }, [mode, playing, pos, rate, beats]);
  useEffect(() => () => { stopSpeaking(); audio.current?.pause(); }, []);

  useEffect(() => {
    list.current?.querySelector(`[data-beat="${pos}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pos]);

  const play = () => {
    if (finished) { setPos(0); setFinished(false); if (audio.current) audio.current.currentTime = 0; }
    setStarted(true);
    setPlaying(true);
  };
  const pause = () => { setPlaying(false); audio.current?.pause(); stopSpeaking(); };
  const seek = (i) => {
    const n = Math.max(0, Math.min(beats.length - 1, i));
    setFinished(false); setStarted(true); setPos(n);
    if (audio.current && track) audio.current.currentTime = at[n];
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("select, input, textarea")) return;
      if (e.key === "Escape") { pause(); onClose(); }
      else if (e.key === " " || e.key === "k") { e.preventDefault(); playing ? pause() : play(); }
      else if (e.key === "ArrowRight") seek(pos + 1);
      else if (e.key === "ArrowLeft") seek(pos - 1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const rt = (sec) => stamp(sec / rate);
  const chapterNow = chapterOf(beat.si);

  return (
    <Portal>
      <div className="vd" role="dialog" aria-modal="true" aria-label={`Video: ${video.title}`}>
        <div className="vd-top">
          <div className="vd-titles">
            <b>{video.title}</b>
            <span>{chapterNow >= 0 && started ? `Chapter ${chapterNow + 1}: ${chapters[chapterNow].title}` : video.subtitle}</span>
          </div>
          <button className="icon-btn" onClick={() => { pause(); onClose(); }} aria-label="Close video"><Icon name="close" size={18} /></button>
        </div>

        <div className="vd-main">
          <div className="vd-left">
            <div className="vd-stage" onClick={() => (playing ? pause() : play())}>
              {!started ? (
                <div className="vd-poster">
                  <h2>{video.title}</h2>
                  {video.subtitle && <p className="vd-sub">{video.subtitle}</p>}
                  <span className="vd-bigplay" aria-hidden="true"><PlayIcon size={30} /></span>
                  <p className="vd-hint">About {minutesOf(video)} min · with sound</p>
                </div>
              ) : (
                <Scene key={beat.si} scene={scene} line={beat.li} />
              )}
              {started && captions && <div className="vd-caption" aria-hidden="true">{beat.text}</div>}
              {track && <audio ref={audio} src={track.url} preload="auto" onEnded={() => { setPlaying(false); setFinished(true); }} />}
              {playing && mode === "waiting" && (
                <div className="vd-voice" onClick={(e) => e.stopPropagation()}>
                  <b>Preparing the narration</b>
                  <span>{narr.done} of {narr.total} lines ready. It plays straight through once it is done, and is kept on this device after.</span>
                  <div className="vd-voice-bar"><i style={{ width: `${Math.round((narr.done / (narr.total || 1)) * 100)}%` }} /></div>
                </div>
              )}
              {finished && (
                <div className="vd-done" onClick={(e) => e.stopPropagation()}>
                  <b>That is the whole video</b>
                  <button className="btn cta" onClick={play}>Watch again</button>
                </div>
              )}
            </div>

            <div className="vd-bar" role="group" aria-label="Video controls">
              <button className="vd-ctl" onClick={() => seek(sceneStart(Math.max(0, beat.si - (beat.li ? 0 : 1))))} aria-label="Previous scene">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4h2v12H5zM16 4v12L8 10z" /></svg>
              </button>
              <button className="vd-ctl vd-play" onClick={() => (playing ? pause() : play())} aria-label={playing ? "Pause" : "Play"}>
                {playing ? <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z" /></svg> : <PlayIcon size={18} />}
              </button>
              <button className="vd-ctl" onClick={() => seek(beat.si + 1 < video.scenes.length ? sceneStart(beat.si + 1) : beats.length - 1)} aria-label="Next scene">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path d="M13 4h2v12h-2zM4 4v12l8-6z" /></svg>
              </button>
              <div className="vd-seek" aria-label="Progress">
                <input type="range" min="0" max={beats.length - 1} step="1" value={pos} onChange={(e) => seek(+e.target.value)}
                  aria-label="Seek" aria-valuetext={rt(at[pos])} style={{ "--p": `${(at[pos] / (total || 1)) * 100}%` }} />
                {chapters.slice(1).map((c, i) => (
                  <i key={i} className="vd-mark" style={{ left: `${((at[sceneStart(c.scene)] || 0) / (total || 1)) * 100}%` }} title={c.title} />
                ))}
              </div>
              <span className="vd-time">{rt(at[pos])} / {rt(total)}</span>
              <select className="vd-rate" value={rate} onChange={(e) => setRate(+e.target.value)} aria-label="Speed">
                {[0.75, 1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r}×</option>)}
              </select>
              <button className={"vd-ctl" + (captions ? " on" : "")} onClick={() => setCaptions((c) => !c)} aria-pressed={captions} aria-label="Captions" title="Captions">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="4.5" width="15" height="11" rx="2" /><path d="M8.5 8.4a2 2 0 1 0 0 3.2M14 8.4a2 2 0 1 0 0 3.2" /></svg>
              </button>
            </div>
          </div>

          <aside className="vd-transcript" aria-label="Transcript">
            <span className="qv-label">Transcript</span>
            <ol ref={list}>
              {video.scenes.map((sc, si) => {
                const ch = chapters.findIndex((c) => c.scene === si);
                const first = sceneStart(si);
                return (
                  <li key={si} className={"vd-tscene" + (si === beat.si && started ? " on" : "")}>
                    {ch >= 0 && (
                      <button className="vd-tchapter" onClick={() => seek(first)}>
                        <span className="vd-stamp">{rt(at[first])}</span>Chapter {ch + 1}: {chapters[ch].title}
                      </button>
                    )}
                    <button className="vd-thead" onClick={() => seek(first)}>
                      <span className="vd-stamp">{rt(at[first])}</span>{sc.heading}
                    </button>
                    {sc.lines.map((l, li) => {
                      const i = first + li;
                      return (
                        <button key={li} data-beat={i} className={"vd-tline" + (started && i === pos ? " now" : started && i < pos ? " past" : "")} onClick={() => seek(i)}>
                          {l}
                        </button>
                      );
                    })}
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      </div>
    </Portal>
  );
}

function PlayIcon({ size }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor"><path d="M6 4l10 6-10 6z" /></svg>;
}

/* ---------- a scene ---------- */

// A real labelled diagram from Wikipedia, for a figure given as a picture.
// Kept per query while the page is open, so scenes sharing it do not flicker.
const pictures = new Map();
function usePicture(query) {
  const [pic, setPic] = useState(() => (query ? pictures.get(query) : null));
  useEffect(() => {
    if (!query || pictures.has(query)) { setPic(query ? pictures.get(query) : null); return; }
    let live = true;
    import("./wikiPic.js").then(({ findDiagram }) => findDiagram(query)).catch(() => null)
      .then((p) => { pictures.set(query, p || null); if (live) setPic(p || null); });
    return () => { live = false; };
  }, [query]);
  return pic;
}

function Scene({ scene, line }) {
  const board = scene.board.filter((b) => b.at <= line);
  const pic = usePicture(scene.diagram?.picture);
  const drawn = scene.diagram && !scene.diagram.picture;
  const figure = drawn || !!pic;
  return (
    <div className={"vd-scene" + (figure ? " with-diagram" : "")}>
      <h3 className="vd-heading">{scene.heading}</h3>
      <div className="vd-body">
        {drawn && <Diagram d={scene.diagram} line={line} />}
        {pic && (
          <figure className="vd-picture">
            <img src={pic.src} alt={pic.title} referrerPolicy="no-referrer" />
            <figcaption>{pic.title} · Wikimedia</figcaption>
          </figure>
        )}
        <div className="vd-board">
          {board.map((b, i) => <BoardItem key={i} b={b} fresh={b.at === line} />)}
        </div>
      </div>
    </div>
  );
}

const W = 520, H = 400, PAD = 28;

function niceStep(span) {
  const raw = span / 8;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) || p * 10;
}

function Diagram({ d, line }) {
  const [x0, x1] = d.x, [y0, y1] = d.y;
  const k = Math.min((W - 2 * PAD) / (x1 - x0), (H - 2 * PAD) / (y1 - y0));
  const ox = (W - k * (x1 - x0)) / 2, oy = (H - k * (y1 - y0)) / 2;
  const X = (x) => ox + (x - x0) * k;
  const Y = (y) => oy + (y1 - y) * k;
  const step = niceStep(Math.max(x1 - x0, y1 - y0));
  const grid = [];
  if (d.grid) {
    for (let x = Math.ceil(x0 / step) * step; x <= x1 + 1e-9; x += step) grid.push(<line key={"gx" + x} x1={X(x)} y1={Y(y0)} x2={X(x)} y2={Y(y1)} className="vd-grid" />);
    for (let y = Math.ceil(y0 / step) * step; y <= y1 + 1e-9; y += step) grid.push(<line key={"gy" + y} x1={X(x0)} y1={Y(y)} x2={X(x1)} y2={Y(y)} className="vd-grid" />);
  }
  const axes = d.axes && (
    <g className="vd-axes">
      {y0 <= 0 && y1 >= 0 && <line x1={X(x0)} y1={Y(0)} x2={X(x1)} y2={Y(0)} />}
      {x0 <= 0 && x1 >= 0 && <line x1={X(0)} y1={Y(y0)} x2={X(0)} y2={Y(y1)} />}
    </g>
  );
  return (
    <svg className={"vd-diagram" + (d.axes ? " is-graph" : " is-picture")} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Diagram">
      <defs>
        <marker id="vd-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="context-stroke" />
        </marker>
      </defs>
      {grid}
      {axes}
      {d.shapes.filter((s) => s.at <= line).map((s, i) => <Shape key={i} s={s} X={X} Y={Y} k={k} fresh={s.at === line} />)}
    </svg>
  );
}

// A soft, slightly irregular closed outline for living things: points round
// the shape, nudged in and out by a gentle wave fixed by where the shape is,
// joined with a smooth curve. The same shape always gets the same outline.
function organicPath(s, X, Y) {
  const pts = [];
  const seed = (s.c ? s.c[0] * 7.3 + s.c[1] * 3.1 : s.from[0] * 5.7 + s.to[1] * 2.3) % 6.283;
  const wave = (a) => 1 + 0.025 * Math.sin(3 * a + seed) + 0.012 * Math.sin(5 * a + 2 * seed);
  if (s.type === "rect") {
    const [x0, y0] = s.from, [x1, y1] = s.to;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
    // A rounded box as a superellipse, which the wave then softens.
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * 2 * Math.PI, c = Math.cos(a), sn = Math.sin(a);
      const f = wave(a) ** 0.5;
      pts.push([X(cx + hw * f * Math.sign(c) * Math.abs(c) ** 0.3), Y(cy + hh * f * Math.sign(sn) * Math.abs(sn) ** 0.3)]);
    }
  } else {
    const rx = s.rx ?? s.r, ry = s.ry ?? s.r, t = ((s.turn || 0) * Math.PI) / 180;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * 2 * Math.PI, f = wave(a);
      const x = rx * f * Math.cos(a), y = ry * f * Math.sin(a);
      pts.push([X(s.c[0] + x * Math.cos(t) - y * Math.sin(t)), Y(s.c[1] + x * Math.sin(t) + y * Math.cos(t))]);
    }
  }
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + " Z";
}

/* ---------- the board, with its animations ---------- */

// The opposite operation, for a term carried across the equals sign.
function flipped(term) {
  const t = term.trim();
  if (/^[+]/.test(t)) return "− " + t.replace(/^[+]\s*/, "");
  if (/^[−-]/.test(t)) return "+ " + t.replace(/^[−-]\s*/, "");
  if (/^[×*]/.test(t)) return "÷ " + t.replace(/^[×*]\s*/, "");
  if (/^[÷/]/.test(t)) return "× " + t.replace(/^[÷/]\s*/, "");
  return "− " + t;
}

// Text with one part ringed by hand, the ring drawing itself in.
function Marked({ text, mark }) {
  if (!mark || !text.includes(mark)) return text;
  const i = text.indexOf(mark);
  return (
    <>
      {text.slice(0, i)}
      <span className="vd-ring">
        {mark}
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength="1" d="M8 22 C6 8 40 3 62 5 C88 7 97 14 95 23 C93 34 60 37 36 36 C14 35 3 29 9 17 C12 11 22 8 30 7" />
        </svg>
      </span>
      {text.slice(i + mark.length)}
    </>
  );
}

// One item on the board. Plain working, or one of the animated steps:
// a curved arrow from the line above saying what was done, a division
// sliding in under both sides, or a term carried across the equals sign.
function BoardItem({ b, fresh }) {
  const cls = `vd-b ${b.kind} c-${b.color}` + (fresh ? " fresh" : "") + (b.via ? " has-via" : "");
  const via = b.via && (
    <span className="vd-via" aria-hidden="true">
      <svg viewBox="0 0 40 46"><path pathLength="1" d="M4 3 C30 5 34 30 12 41" /><path className="vd-via-head" d="M18 36 L11 42 L20 44" /></svg>
      <em>{b.via}</em>
    </span>
  );
  if (b.kind === "divide") {
    const [left, right] = b.text.includes("=") ? [b.text.slice(0, b.text.indexOf("=")), b.text.slice(b.text.indexOf("=") + 1)] : [b.text, null];
    const frac = (part) => (
      <span className="vd-frac"><span>{part.trim()}</span><i className="vd-frac-bar" /><span className="vd-frac-den">{b.by}</span></span>
    );
    return (
      <div className={cls + " math"}>
        {via}
        <div className="vd-div">{frac(left)}{right !== null && <><span className="vd-eq">=</span>{frac(right)}</>}</div>
        <div className="vd-then"><span className="vd-then-arrow">↓</span>{b.result}</div>
      </div>
    );
  }
  if (b.kind === "move") return <MoveItem b={b} cls={cls} via={via} fresh={fresh} />;
  return <div className={cls}>{via}<Marked text={b.text} mark={b.mark} /></div>;
}

// A term lifts off, flies to the far end of the line with its sign flipped,
// and the tidied line appears underneath.
function MoveItem({ b, cls, via, fresh }) {
  const line = useRef(null), term = useRef(null);
  const [dx, setDx] = useState(0);
  useLayoutEffect(() => {
    if (!line.current || !term.current) return;
    const l = line.current.getBoundingClientRect(), t = term.current.getBoundingClientRect();
    setDx(Math.max(20, l.right - t.left + 10));
  }, [b.text, b.term]);
  const i = b.text.indexOf(b.term);
  return (
    <div className={cls + " math"}>
      {via}
      <div className="vd-move" ref={line}>
        {b.text.slice(0, i)}
        <span className="vd-term" ref={term}>{b.term}{fresh && <span className="vd-fly" style={{ "--dx": `${dx}px` }}>{flipped(b.term)}</span>}</span>
        {b.text.slice(i + b.term.length)}
      </div>
      <div className="vd-then"><span className="vd-then-arrow">↓</span>{b.result}</div>
    </div>
  );
}

function Shape({ s, X, Y, k, fresh }) {
  const cls = `vd-shape c-${s.color}` + (fresh ? " fresh" : "") + (s.pulse && fresh ? " pulse" : "");
  const label = (x, y, text, dy = -10) => text && <text className={`vd-label c-${s.color}`} x={x} y={y + dy} textAnchor="middle">{text}</text>;
  if (s.organic && !s.half && ["circle", "ellipse", "rect"].includes(s.type)) {
    const top = s.type === "rect" ? [(X(s.from[0]) + X(s.to[0])) / 2, Y(s.to[1])] : [X(s.c[0]), Y(s.c[1]) - (s.ry ?? s.r) * k];
    return <g><path d={organicPath(s, X, Y)} pathLength="1" className={cls + (s.fill ? " filled" : "") + " organic"} />{label(top[0], top[1], s.label)}</g>;
  }
  switch (s.type) {
    case "circle": {
      const cx = X(s.c[0]), cy = Y(s.c[1]), r = s.r * k;
      const shape = s.half
        ? <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 ${s.half === "upper" ? 1 : 0} ${cx + r} ${cy} Z`} pathLength="1" className={cls + (s.fill ? " filled" : "")} />
        : <circle cx={cx} cy={cy} r={r} pathLength="1" className={cls + (s.fill ? " filled" : "")} />;
      return <g>{shape}{label(cx, s.half === "lower" ? cy + r + 22 : cy - r, s.label)}</g>;
    }
    case "ellipse": {
      const cx = X(s.c[0]), cy = Y(s.c[1]);
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={s.rx * k} ry={s.ry * k} transform={s.turn ? `rotate(${-s.turn} ${cx} ${cy})` : undefined}
            pathLength="1" className={cls + (s.fill ? " filled" : "")} />
          {label(cx, cy - s.ry * k, s.label)}
        </g>
      );
    }
    case "rect": {
      const x = X(s.from[0]), y = Y(s.to[1]), w = (s.to[0] - s.from[0]) * k, h = (s.to[1] - s.from[1]) * k;
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} rx={(s.round || 0) * k} pathLength="1" className={cls + (s.fill ? " filled" : "")} />
          {label(x + w / 2, y, s.label)}
        </g>
      );
    }
    case "callout": {
      // A label out to the side, with a line to the part it names.
      const px = X(s.p[0]), py = Y(s.p[1]), tx = X(s.pos[0]), ty = Y(s.pos[1]);
      const right = tx >= px;
      return (
        <g className={fresh ? "vd-callout fresh" : "vd-callout"}>
          <line x1={px} y1={py} x2={tx + (right ? -4 : 4)} y2={ty} className={`vd-leader c-${s.color}`} />
          <circle cx={px} cy={py} r="3" className={`vd-dot c-${s.color}`} />
          <text className={`vd-label c-${s.color}`} x={tx} y={ty + 5} textAnchor={right ? "start" : "end"}>{s.text}</text>
        </g>
      );
    }
    case "segment": case "arrow": {
      const [a, b] = [s.from, s.to];
      const x1 = X(a[0]), y1 = Y(a[1]), x2 = X(b[0]), y2 = Y(b[1]);
      // The label sits off the middle of the line, on its upper side, so two
      // lines meeting at a point keep their labels apart.
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      let nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
      if (ny > 0) { nx = -nx; ny = -ny; }
      return (
        <g>
          <line x1={x1} y1={y1} x2={x2} y2={y2} pathLength="1" className={cls + (s.dashed ? " dashed" : "")}
            markerEnd={s.type === "arrow" ? "url(#vd-head)" : undefined} />
          {/* Something moving along it: dashes marching from start to end. */}
          {s.flow && <line x1={x1} y1={y1} x2={x2} y2={y2} className={`vd-flow c-${s.color}`} />}
          {label((x1 + x2) / 2 + nx * 16, (y1 + y2) / 2 + ny * 16 + 5, s.label, 0)}
        </g>
      );
    }
    case "point":
      return <g><circle cx={X(s.p[0])} cy={Y(s.p[1])} r="4.5" className={`vd-dot c-${s.color}` + (fresh ? " fresh" : "")} />{label(X(s.p[0]), Y(s.p[1]) + 26, s.label, 0)}</g>;
    case "polygon": case "path": {
      const d = s.points.map(([x, y], i) => `${i ? "L" : "M"}${X(x)} ${Y(y)}`).join(" ") + (s.type === "polygon" ? " Z" : "");
      return <path d={d} pathLength="1" className={cls + (s.fill ? " filled" : "")} />;
    }
    case "text":
      return <text className={`vd-label c-${s.color}` + (fresh ? " fresh" : "")} x={X(s.p[0])} y={Y(s.p[1])} textAnchor="middle">{s.text}</text>;
    case "mover": {
      // Dots travelling the path over and over, spaced out along it.
      const pts = s.closed ? [...s.points, s.points[0]] : s.points;
      const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(" ");
      return (
        <g className={`vd-mover c-${s.color}`}>
          <path d={d} className="vd-mover-path" />
          {[0, 1, 2, 3].map((n) => (
            <circle key={n} r="5" className="vd-mover-dot">
              <animateMotion dur="4s" repeatCount="indefinite" begin={`${-n}s`} path={d} rotate="auto" />
            </circle>
          ))}
        </g>
      );
    }
    default:
      return null;
  }
}
