// An audio overview: a short podcast about your notes, two ducks talking it
// through, the idea NotebookLM made popular.
//
// The script is written once and kept, then read aloud on the device in two
// different voices, so listening again costs nothing. Whoever is speaking
// talks on screen, and the transcript follows along.

import { useEffect, useRef, useState } from "react";
import { Icon, Portal, Loading } from "./ui.jsx";
import { DuckTalk } from "./Chat.jsx";
import { writePodcast } from "./ai.js";
import { say, sayAs, onVoices, voicePair, stopSpeaking, prepareNatural, naturalOn, naturalSupported, naturalState, onNaturalProgress } from "./tts.js";

const KEY = "dwiddle-podcasts";
const loadAll = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
const saveOne = (id, ep) => { try { const all = loadAll(); all[id] = ep; localStorage.setItem(KEY, JSON.stringify(all)); } catch {} };


const flat = (t) => String(t || "").replace(/\{(?:def|key|exam)\|([^{}]*)\}/g, "$1");
export function notesText(made) {
  const out = [];
  for (const t of made?.topics || []) {
    out.push(`## ${t.name}`);
    for (const b of made?.notes?.[t.name] || []) {
      if (b.h) out.push(b.h);
      else if (b.term) out.push(`${b.term}: ${flat(b.def)}`);
      else if (b.list) out.push(b.list.map((x) => "- " + flat(x)).join("\n"));
      else out.push(flat(Object.values(b)[0]));
    }
  }
  return out.join("\n").slice(0, 20000);
}

export function Podcast({ made, onClose }) {
  const id = made?.title || "material";
  const [ep, setEp] = useState(() => loadAll()[id] || null);
  const [error, setError] = useState("");
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const voices = useRef({});
  const list = useRef(null);
  const playingRef = useRef(false);

  useEffect(() => {
    const off = onVoices(() => { const [a, b] = voicePair(); voices.current = { dwiddle: a, puddle: b }; });
    return () => { off(); stopSpeaking(); };
  }, []);

  useEffect(() => {
    if (ep) return;
    const text = notesText(made);
    if (text.length < 200) { setError("These notes are too short for an episode yet."); return; }
    writePodcast(text).then((e) => { setEp(e); saveOne(id, e); }).catch((err) => setError(err.message || "The episode could not be written."));
  }, [ep, made, id]);

  useEffect(() => {
    list.current?.querySelector(`[data-line="${at}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [at]);

  function speakFrom(i) {
    const synth = window.speechSynthesis;
    if (!synth || !ep) return;
    synth.cancel();
    if (i >= ep.lines.length) { setPlaying(false); playingRef.current = false; return; }
    setAt(i);
    const line = ep.lines[i];
    // Two different voices are enough to tell the ducks apart; the pitch is
    // only nudged when the device has a single voice.
    const v = voices.current[line.who];
    const same = voices.current.dwiddle === voices.current.puddle;
    say(line.text, { voice: v || null, rate, pitch: same && line.who === "puddle" ? 1.12 : 1,
      onEnd: () => { if (playingRef.current) speakFrom(i + 1); } });
  }
  function play() { playingRef.current = true; setPlaying(true); speakFrom(at); }
  function pause() { playingRef.current = false; setPlaying(false); stopSpeaking(); }
  function jump(i) { const n = Math.max(0, Math.min((ep?.lines.length || 1) - 1, i)); setAt(n); if (playingRef.current) speakFrom(n); }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { pause(); onClose(); }
      if (e.key === " ") { e.preventDefault(); playingRef.current ? pause() : play(); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const speaker = ep?.lines[at]?.who;
  const minutes = ep ? Math.max(1, Math.round(ep.lines.reduce((n, l) => n + l.text.split(/\s+/).length, 0) / 150 / rate)) : 0;

  return (
    <Portal>
      <div className="pod" role="dialog" aria-modal="true" aria-label="Podcast">
        <div className="pod-top">
          <span className="qv-label">Podcast</span>
          <button className="icon-btn" onClick={() => { pause(); onClose(); }} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>

        {!ep && !error && (
          <div className="pod-wait">
            <div className="pod-ducks"><DuckTalk mood="thinking" size={90} /><DuckTalk who="puddle" mood="thinking" size={78} /></div>
            <h2>Writing your episode</h2>
            <p className="muted">Two ducks are reading your notes to talk you through them. About half a minute.</p>
            <Loading label="Writing" />
          </div>
        )}
        {error && <div className="pod-wait"><h2>That did not work</h2><p className="muted">{error}</p>
          <button className="btn cta" onClick={() => { setError(""); setEp(null); }}>Try again</button></div>}

        {ep && (
          <>
            <div className="pod-stage">
              <div className={"pod-host" + (speaker === "dwiddle" && playing ? " on" : "")}>
                <DuckTalk mood={speaker === "dwiddle" && playing ? "talking" : "idle"} size={110} />
                <b>Dwiddle</b>
              </div>
              <div className={"pod-host puddle" + (speaker === "puddle" && playing ? " on" : "")}>
                <DuckTalk who="puddle" mood={speaker === "puddle" && playing ? "talking" : "idle"} size={96} />
                <b>Puddle</b>
              </div>
            </div>
            <h2 className="pod-title">{ep.title}</h2>
            <p className="small muted pod-meta">{made?.title} · about {minutes} min · {ep.lines.length} lines</p>

            <div className="pod-controls">
              <button className="icon-btn" onClick={() => jump(at - 1)} aria-label="Previous line"><Icon name="back" size={18} /></button>
              <button className="pod-play" onClick={playing ? pause : play} aria-label={playing ? "Pause" : "Play"}>
                {playing ? <span className="pod-pause" /> : <span className="pod-tri" />}
              </button>
              <button className="icon-btn" onClick={() => jump(at + 1)} aria-label="Next line"><Icon name="arrow" size={18} /></button>
              <div className="seg tight pod-rate">
                {[1, 1.25, 1.5].map((r) => <button key={r} className={rate === r ? "on" : ""} onClick={() => setRate(r)}>{r}×</button>)}
              </div>
            </div>
            <div className="pod-progress"><i style={{ width: `${((at + (playing ? 0.5 : 0)) / ep.lines.length) * 100}%` }} /></div>

            <div className="pod-lines" ref={list}>
              {ep.lines.map((l, i) => (
                <button key={i} data-line={i} className={"pod-line " + l.who + (i === at ? " on" : "") + (i < at ? " done" : "")}
                  onClick={() => { playingRef.current = true; setPlaying(true); speakFrom(i); }}>
                  <b>{l.who === "puddle" ? "Puddle" : "Dwiddle"}</b>{l.text}
                </button>
              ))}
            </div>
            <button className="btn quiet small pod-new" onClick={() => { pause(); setEp(null); setAt(0); saveOne(id, null); }}>Write a new episode</button>
          </>
        )}
      </div>
    </Portal>
  );
}
