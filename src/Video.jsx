// Explainer videos: a question or a topic talked through at a whiteboard.
//
// A video here is a script, not a file (see api/video.js). Each scene has a
// heading, lines that are read aloud one at a time, and a diagram and board
// whose parts arrive with the line that talks about them. The transcript sits
// beside it, so someone who cannot play sound, or would rather read, follows
// the same thing at their own pace; with the sound off, the video moves on at
// reading speed instead.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sayAs, stopSpeaking } from "./tts.js";
import { writeVideo } from "./ai.js";
import { blockPlain } from "./marks.js";
import { Icon, PageHead, Portal, BusyScreen } from "./ui.jsx";
import { Duck } from "./Duck.jsx";

/* ---------- saved videos ---------- */

const KEY = "dwiddle-videos";
const loadAll = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
function saveOne(id, video) {
  try {
    const all = loadAll();
    delete all[id];
    all[id] = video;
    const keys = Object.keys(all);
    keys.slice(0, Math.max(0, keys.length - 30)).forEach((k) => delete all[k]); // the newest thirty
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage full: the video still plays, it just is not kept */ }
}
const topicKey = (made, topic) => `${made?.title || "material"}::${topic}`;

/* ---------- the Videos page ---------- */

export function Videos({ made, go }) {
  const topics = made?.topics || [];
  const [saved, setSaved] = useState(loadAll);
  const [making, setMaking] = useState("");
  const [error, setError] = useState({});
  const [open, setOpen] = useState(null); // { video, topic }

  async function make(t) {
    const blocks = made?.notes?.[t.name] || [];
    const notes = blocks.map(blockPlain).filter(Boolean).join("\n");
    if (notes.length < 80) { setError((e) => ({ ...e, [t.name]: "This topic needs its full notes first. Open Notes and write them, then come back." })); return; }
    setMaking(t.name);
    setError((e) => ({ ...e, [t.name]: "" }));
    try {
      const video = await writeVideo({ topic: t.name, notes });
      saveOne(topicKey(made, t.name), video);
      setSaved(loadAll());
      setOpen({ video, topic: t.name });
    } catch (err) {
      setError((e) => ({ ...e, [t.name]: err.message || "The video could not be made." }));
    } finally {
      setMaking("");
    }
  }

  if (!topics.length) {
    return (
      <div className="page fade">
        <PageHead title="Videos" sub="Every topic explained at a whiteboard, step by step, with the transcript beside it." />
        <div className="card card-pad" style={{ textAlign: "center", padding: 44 }}>
          <Duck size={84} outfit="dj" />
          <b style={{ display: "block", marginTop: 10 }}>No videos yet</b>
          <p className="muted small" style={{ margin: "6px auto 18px", maxWidth: 400 }}>
            Add your notes, or pick a course topic, and any topic in it can become a short explainer video here.
          </p>
          <button className="btn" onClick={() => go("upload")}><Icon name="upload" size={14} /> Add material</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade">
      <PageHead
        title="Videos"
        sub={`A short explainer for any topic in ${made?.title || "your material"}, narrated step by step with the transcript beside it.`}
      />
      <div className="ln-list">
        {topics.map((t, i) => {
          const video = saved[topicKey(made, t.name)];
          const busy = making === t.name;
          return (
            <div key={t.name} className="vd-item-wrap">
              <button className={"ln-item" + (video ? " ready" : " new")} style={{ "--i": i }} disabled={!!making}
                onClick={() => (video ? setOpen({ video, topic: t.name }) : make(t))}>
                <span className="ln-num"><Icon name="video" size={15} /></span>
                <span className="ln-text">
                  <b>{t.name}</b>
                  <span>{video ? `${video.scenes.length} scenes · about ${minutesOf(video)} min` : t.reason}</span>
                </span>
                <span className="ln-go">{busy ? "Making…" : video ? "Watch" : "Make video"}<Icon name="arrow" size={14} /></span>
              </button>
              {video && !making && (
                <button className="btn ghost small vd-remake" onClick={() => make(t)}>Make a new one</button>
              )}
              {error[t.name] && <p className="small vd-err">{error[t.name]}</p>}
            </div>
          );
        })}
      </div>
      {making && <BusyScreen title="Making your video" detail={`Planning the scenes, diagrams and narration for ${making}. About half a minute.`} outfit="dj" />}
      {open && <VideoPlayer video={open.video} onClose={() => setOpen(null)} />}
    </div>
  );
}

const wordsOf = (s) => String(s).split(/\s+/).filter(Boolean).length;
export const minutesOf = (video) =>
  Math.max(1, Math.round(video.scenes.flatMap((s) => s.lines).reduce((n, l) => n + wordsOf(l), 0) / 150));

/* ---------- the player ---------- */

export function VideoPlayer({ video, onClose }) {
  const beats = useMemo(() => video.scenes.flatMap((sc, si) => sc.lines.map((text, li) => ({ si, li, text }))), [video]);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sound, setSound] = useState(() => { try { return localStorage.getItem("dwiddle-video-sound") !== "off"; } catch { return true; } });
  const [captions, setCaptions] = useState(true);
  const [rate, setRate] = useState(1);
  const token = useRef(0);
  const list = useRef(null);

  const beat = beats[pos];
  const scene = video.scenes[beat.si];

  const stop = useCallback(() => { token.current += 1; stopSpeaking(); }, []);
  useEffect(() => stop, [stop]);

  // Reads the current line, then moves on. With the sound off, it waits about
  // as long as reading the line takes.
  useEffect(() => {
    if (!playing) return;
    const mine = ++token.current;
    let timer = 0;
    const next = () => {
      if (token.current !== mine) return;
      timer = setTimeout(() => {
        if (token.current !== mine) return;
        if (pos + 1 >= beats.length) { setPlaying(false); setFinished(true); return; }
        setPos(pos + 1);
      }, 450 / rate);
    };
    const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
    const words = wordsOf(beats[pos].text);
    let guard = 0;
    if (sound && canSpeak) {
      let done = false;
      const once = () => { if (!done) { done = true; clearTimeout(guard); next(); } };
      sayAs("narrator", beats[pos].text, { rate, onEnd: once });
      // Some browsers never say when speech ends. Never wait forever on one.
      guard = setTimeout(once, (8000 + words * 700) / rate);
    } else timer = setTimeout(next, Math.max(2200, words * 330) / rate);
    return () => { clearTimeout(timer); clearTimeout(guard); if (token.current === mine) { token.current += 1; stopSpeaking(); } };
  }, [playing, pos, sound, rate, beats]);

  useEffect(() => {
    list.current?.querySelector(`[data-beat="${pos}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pos]);

  const play = () => { if (finished) { setPos(0); setFinished(false); } setStarted(true); setPlaying(true); };
  const pause = () => { setPlaying(false); stop(); };
  const seek = (i) => { setFinished(false); setStarted(true); setPos(Math.max(0, Math.min(beats.length - 1, i))); };
  const sceneStart = (si) => beats.findIndex((b) => b.si === si);
  const toggleSound = () => setSound((on) => {
    try { localStorage.setItem("dwiddle-video-sound", on ? "off" : "on"); } catch { /* fine */ }
    return !on;
  });

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

  const elapsed = beats.slice(0, pos).reduce((n, b) => n + wordsOf(b.text), 0);
  const total = beats.reduce((n, b) => n + wordsOf(b.text), 0);
  const clock = (words) => { const s = Math.round(words / 2.5 / rate); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  return (
    <Portal>
      <div className="vd" role="dialog" aria-modal="true" aria-label={`Video: ${video.title}`}>
        <div className="vd-top">
          <div className="vd-titles">
            <b>{video.title}</b>
            {video.subtitle && <span>{video.subtitle}</span>}
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
                  <p className="vd-hint">{video.scenes.length} scenes · about {minutesOf(video)} min</p>
                </div>
              ) : (
                <Scene key={beat.si} scene={scene} line={beat.li} />
              )}
              {started && captions && <div className="vd-caption" aria-hidden="true">{beat.text}</div>}
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
              <div className="vd-progress" aria-label="Progress">
                {beats.map((b, i) => (
                  <button key={i} className={"vd-tick" + (i < pos ? " past" : i === pos ? " now" : "") + (i && b.si !== beats[i - 1].si ? " gap" : "")}
                    onClick={() => seek(i)} aria-label={`Line ${i + 1}`} />
                ))}
              </div>
              <span className="vd-time">{clock(elapsed)} / {clock(total)}</span>
              <select className="vd-rate" value={rate} onChange={(e) => setRate(+e.target.value)} aria-label="Speed">
                {[0.75, 1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r}×</option>)}
              </select>
              <button className={"vd-ctl" + (captions ? " on" : "")} onClick={() => setCaptions((c) => !c)} aria-pressed={captions} aria-label="Captions" title="Captions">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="4.5" width="15" height="11" rx="2" /><path d="M8.5 8.4a2 2 0 1 0 0 3.2M14 8.4a2 2 0 1 0 0 3.2" /></svg>
              </button>
              <button className={"vd-ctl" + (sound ? " on" : "")} onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Sound on" : "Sound off"} title={sound ? "Sound on" : "Sound off: moves on at reading speed"}>
                {sound
                  ? <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 8v4h3l4 3V5L6 8z" fill="currentColor" /><path d="M13 7.5a3.5 3.5 0 0 1 0 5M15.3 5.5a6.5 6.5 0 0 1 0 9" /></svg>
                  : <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 8v4h3l4 3V5L6 8z" fill="currentColor" /><path d="M13 8l4 4M17 8l-4 4" /></svg>}
              </button>
            </div>
          </div>

          <aside className="vd-transcript" aria-label="Transcript">
            <span className="qv-label">Transcript</span>
            <ol ref={list}>
              {video.scenes.map((sc, si) => (
                <li key={si} className={"vd-tscene" + (si === beat.si && started ? " on" : "")}>
                  <button className="vd-thead" onClick={() => seek(sceneStart(si))}>
                    <i>{si + 1}</i>{sc.heading}
                  </button>
                  {sc.lines.map((l, li) => {
                    const i = sceneStart(si) + li;
                    return (
                      <button key={li} data-beat={i} className={"vd-tline" + (started && i === pos ? " now" : started && i < pos ? " past" : "")} onClick={() => seek(i)}>
                        {l}
                      </button>
                    );
                  })}
                </li>
              ))}
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

function Scene({ scene, line }) {
  const board = scene.board.filter((b) => b.at <= line);
  return (
    <div className={"vd-scene" + (scene.diagram ? " with-diagram" : "")}>
      <h3 className="vd-heading">{scene.heading}</h3>
      <div className="vd-body">
        {scene.diagram && <Diagram d={scene.diagram} line={line} />}
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
    <svg className="vd-diagram" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Diagram">
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

function Shape({ s, X, Y, k, fresh }) {
  const cls = `vd-shape c-${s.color}` + (fresh ? " fresh" : "");
  const label = (x, y, text, dy = -10) => text && <text className={`vd-label c-${s.color}`} x={x} y={y + dy} textAnchor="middle">{text}</text>;
  switch (s.type) {
    case "circle": {
      const cx = X(s.c[0]), cy = Y(s.c[1]), r = s.r * k;
      const shape = s.half
        ? <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 ${s.half === "upper" ? 1 : 0} ${cx + r} ${cy} Z`} pathLength="1" className={cls + (s.fill ? " filled" : "")} />
        : <circle cx={cx} cy={cy} r={r} pathLength="1" className={cls + (s.fill ? " filled" : "")} />;
      return <g>{shape}{label(cx, s.half === "lower" ? cy + r + 22 : cy - r, s.label)}</g>;
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
