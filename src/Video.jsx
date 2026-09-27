// Explainer videos: a question, or a whole set of material, talked through
// at a whiteboard.
//
// A video here is a script, not a file (see api/video.js). Each scene has a
// heading, lines read aloud one at a time by the narrator, and a diagram and
// board whose parts arrive with the line that talks about them. A set of
// material becomes one long video with a chapter per topic, and timestamps
// for every chapter and scene. The transcript sits beside it throughout.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sayAs, stopSpeaking, prepareNarrator, naturalState, onNaturalProgress, narrate, playClip } from "./tts.js";
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
      setSaved(loadAll());
      setOpen(whole);
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
                ? `${video.chapters?.length || 1} chapters · about ${minutesOf(video)} min`
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
  // Where each line starts, in seconds, for the clock and the timestamps.
  const at = useMemo(() => { let t = 0; return beats.map((b) => { const s = t; t += lineSeconds(b.text); return s; }); }, [beats]);
  const total = beats.length ? at[at.length - 1] + lineSeconds(beats[beats.length - 1].text) : 0;
  const chapters = video.chapters || [];
  const chapterOf = (si) => { let c = -1; chapters.forEach((ch, i) => { if (ch.scene <= si) c = i; }); return c; };

  const sceneStart = useCallback((si) => beats.findIndex((b) => b.si === si), [beats]);
  const [pos, setPos] = useState(() => (video.startScene ? Math.max(0, sceneStart(video.startScene)) : 0));
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(!!video.startScene);
  const [finished, setFinished] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [rate, setRate] = useState(1);
  const token = useRef(0);
  const list = useRef(null);
  // Every video is read aloud by the model's British narrator. The first
  // video waits for her to download. Only if she cannot load at all (no
  // connection the first time) does the device's own British woman's voice
  // read instead, and then for the whole video.
  const [voice, setVoice] = useState(() => (naturalState() === "ready" ? "natural" : "pending"));
  const [loadingVoice, setLoadingVoice] = useState(null); // 0..1 while the voice downloads
  const [buffering, setBuffering] = useState(false); // a line is still being made
  useEffect(() => onNaturalProgress((p) => setLoadingVoice(p)), []);
  async function readyVoice() {
    if (voice !== "pending") return;
    setLoadingVoice(0);
    const ok = await prepareNarrator();
    setLoadingVoice(null);
    setVoice(ok ? "natural" : "device");
  }

  // Each line's audio, made once per speed and kept while the video is open.
  const clips = useRef(new Map());
  const clipFor = useCallback((i, r) => {
    const key = `${i}@${r}`;
    if (!clips.current.has(key)) clips.current.set(key, narrate(beats[i].text, r).catch(() => null));
    return clips.current.get(key);
  }, [beats]);

  const beat = beats[pos];
  const scene = video.scenes[beat.si];

  const stop = useCallback(() => { token.current += 1; stopSpeaking(); }, []);
  useEffect(() => stop, [stop]);

  // Reads the current line, then moves on.
  useEffect(() => {
    if (!playing || voice === "pending") return;
    const mine = ++token.current;
    let timer = 0, guard = 0, stopClip = null;
    const next = () => {
      if (token.current !== mine) return;
      timer = setTimeout(() => {
        if (token.current !== mine) return;
        if (pos + 1 >= beats.length) { setPlaying(false); setFinished(true); return; }
        setPos(pos + 1);
      }, 450 / rate);
    };
    if (voice === "natural") {
      // The narrator's own voice: this line, with the next two being made
      // meanwhile so there is no gap between them.
      setBuffering(true);
      clipFor(pos, rate).then((clip) => {
        if (token.current !== mine) return;
        setBuffering(false);
        for (let k = 1; k <= 2 && pos + k < beats.length; k++) clipFor(pos + k, rate);
        if (clip) stopClip = playClip(clip, { onEnd: next });
        else sayAs("narrator", beats[pos].text, { rate, onEnd: next, device: true });
      });
    } else {
      let done = false;
      const once = () => { if (!done) { done = true; clearTimeout(guard); next(); } };
      sayAs("narrator", beats[pos].text, { rate, onEnd: once, device: true });
      // Some browsers never say when speech ends. Never wait forever on one.
      guard = setTimeout(once, (8000 + wordsOf(beats[pos].text) * 700) / rate);
    }
    return () => {
      clearTimeout(timer); clearTimeout(guard); stopClip?.(); setBuffering(false);
      if (token.current === mine) { token.current += 1; stopSpeaking(); }
    };
  }, [playing, pos, rate, beats, voice, clipFor]);

  useEffect(() => {
    list.current?.querySelector(`[data-beat="${pos}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pos]);

  const play = () => {
    if (finished) { setPos(0); setFinished(false); }
    setStarted(true);
    setPlaying(true);
    readyVoice();
  };
  const pause = () => { setPlaying(false); stop(); };
  const seek = (i) => { setFinished(false); setStarted(true); setPos(Math.max(0, Math.min(beats.length - 1, i))); };

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
              {playing && buffering && voice === "natural" && (
                <div className="vd-buffer" aria-live="polite"><span className="vd-spin" aria-hidden="true" />Preparing the narration</div>
              )}
              {playing && voice === "pending" && (
                <div className="vd-voice" onClick={(e) => e.stopPropagation()}>
                  <b>Getting the narrator's voice ready</b>
                  <span>Only the first time. It is kept on this device after.</span>
                  <div className="vd-voice-bar"><i style={{ width: `${Math.round((loadingVoice || 0) * 100)}%` }} /></div>
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
          {board.map((b, i) => (
            <div key={i} className={`vd-b ${b.kind} c-${b.color}` + (b.at === line ? " fresh" : "")}>{b.text}</div>
          ))}
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

function Shape({ s, X, Y, k, fresh }) {
  const cls = `vd-shape c-${s.color}` + (fresh ? " fresh" : "");
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
    default:
      return null;
  }
}
