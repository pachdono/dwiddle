// Chat with Dwiddle.
//
// A panel that opens from the duck in the corner, or from an "Ask Dwiddle"
// button next to a question, a worked solution or a lesson card. Whatever the
// student is looking at goes with the question, so "explain that more simply"
// or "I think this is wrong" is about that, not the subject in general.
//
// The duck reacts as the conversation goes: it listens when the microphone is
// on, thinks while the answer is coming, moves its beak while the reply is
// written out or read aloud, and hops when it is done.
//
// Pages say what is on screen with setPageContext; buttons open the panel
// about something specific with openDwiddle. Both go through window events,
// so any page, including the full screen lesson, can reach the one panel.

import { M } from "./MathText.jsx";
import { sayAs, stopSpeaking } from "./tts.js";
import { useEffect, useRef, useState } from "react";
import { DuckParts, PuddleParts } from "./Duck.jsx";
import { Icon, Portal } from "./ui.jsx";
import { agentTurn } from "./agent.js";
import { Sketch } from "./Sketch.jsx";
import { findPicture } from "./wikiPic.js";
import { browse } from "./ai.js";

/* ---------- reaching the panel from anywhere ---------- */

let pageContext = "";
export function setPageContext(text) { pageContext = String(text || ""); }
export function usePageContext(text) {
  useEffect(() => { setPageContext(text); return () => setPageContext(""); }, [text]);
}
export function openDwiddle(context, { ask } = {}) {
  window.dispatchEvent(new CustomEvent("dwiddle:ask", { detail: { context, ask } }));
}

export function AskDwiddleButton({ context, label = "Ask Dwiddle", className = "btn ghost", ask }) {
  return (
    <button className={className + " ask-btn"} onClick={() => openDwiddle(context, { ask })}>
      <MiniDuck /> {label}
    </button>
  );
}

function MiniDuck() {
  return (
    <svg width="18" height="18" viewBox="20 3 88 88" aria-hidden="true"><DuckParts /></svg>
  );
}

/* ---------- the duck, animated by state ---------- */

// mood: idle | listening | thinking | talking | happy | oops
export function DuckTalk({ mood = "idle", size = 64, who = "dwiddle" }) {
  return (
    <svg className={"dt dt-" + mood} width={size} height={size * (140 / 132)} viewBox="-6 -10 132 140" aria-hidden="true">
      <g className="dt-body">
        {who === "puddle" ? <PuddleParts /> : <DuckParts />}
        <ellipse className="dt-mouth" cx="64" cy="64.5" rx="12" ry="5" fill="#6B2F12" />
        <g className="dt-think">
          <circle cx="104" cy="14" r="4" fill="currentColor" />
          <circle cx="113" cy="3" r="5" fill="currentColor" />
          <circle cx="122" cy="-8" r="6" fill="currentColor" />
        </g>
        <g className="dt-ears" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M14 46 q-6 8 0 16" /><path d="M6 40 q-10 14 0 28" />
        </g>
      </g>
    </svg>
  );
}

/* ---------- asking for the microphone ---------- */

// Asked in Dwiddle's own words first, then by the browser. The browser's
// prompt on its own is a bare "use your microphone?" with no reason given,
// which is exactly when people press Block. Once allowed, it is never asked
// again; if blocked, it says how to undo that, since the browser will not
// ask a second time.
async function micState() {
  try { return (await navigator.permissions.query({ name: "microphone" })).state; } catch { return "prompt"; }
}
export function requestMic(reason) {
  return new Promise(async (resolve) => {
    const state = await micState();
    if (state === "granted") return resolve(true);
    window.dispatchEvent(new CustomEvent("dwiddle:perm", { detail: { reason, blocked: state === "denied", resolve } }));
  });
}

export function PermissionPrompt() {
  const [ask, setAsk] = useState(null);
  const [trying, setTrying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const on = (e) => { setAsk(e.detail); setBlocked(!!e.detail.blocked); setTrying(false); };
    window.addEventListener("dwiddle:perm", on);
    return () => window.removeEventListener("dwiddle:perm", on);
  }, []);
  if (!ask) return null;
  const done = (ok) => { ask.resolve(ok); setAsk(null); };
  async function allow() {
    setTrying(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      done(true);
    } catch {
      setTrying(false);
      setBlocked(true);
    }
  }
  const mac = /Mac/.test(navigator.platform);
  return (
    <Portal>
      <div className="gate-scrim perm-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) done(false); }}>
        <div className="gate perm" role="dialog" aria-modal="true" aria-labelledby="perm-title">
          <div className="perm-art"><DuckTalk mood={blocked ? "oops" : "listening"} size={96} /></div>
          <h2 id="perm-title">{blocked ? "The microphone is blocked" : "Can Dwiddle use your microphone?"}</h2>
          {blocked ? (
            <div className="perm-steps">
              <p>It was turned off for this site, so the browser will not ask again. To turn it back on:</p>
              <ol>
                <li>Click the <b>lock</b> or <b>settings</b> icon at the left of the address bar.</li>
                <li>Set <b>Microphone</b> to <b>Allow</b>, then try again.</li>
                {mac && <li>If it is still silent: System Settings, <b>Privacy and Security</b>, <b>Microphone</b>, and switch your browser on.</li>}
              </ol>
            </div>
          ) : (
            <p className="gate-sub">{ask.reason || "So you can speak instead of type."} Nothing is recorded until you press the button, and you can stop at any time.</p>
          )}
          <div className="gate-actions">
            {blocked
              ? <button className="btn cta gate-go" onClick={() => allow()} disabled={trying}>{trying ? "Checking" : "I've allowed it, try again"}</button>
              : <button className="btn cta gate-go" onClick={allow} disabled={trying}>{trying ? "Waiting for your browser" : "Allow microphone"}</button>}
            <button className="btn ghost" onClick={() => done(false)}>Not now</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ---------- voice ---------- */

const Recognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
const inApp = typeof window !== "undefined" && !!window.DWIDDLE_DESKTOP;

// Speech to text, from the browser itself. Chrome, Edge and Safari do it; the
// installed app's engine has no speech service behind it, so it says so
// rather than pretending to listen.
export function useDictation(onText) {
  const [on, setOn] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef(null);
  const want = useRef(false);   // still meant to be listening
  const kept = useRef("");      // text from sessions the browser already ended
  const supported = !!Recognition && !inApp;

  async function start({ continuous = false, from = "", reason = "" } = {}) {
    if (!supported) {
      setError(inApp
        ? "Voice works on the Dwiddle website in Chrome, Edge or Safari. The installed app cannot hear yet."
        : "This browser cannot turn speech into text. Chrome, Edge and Safari can.");
      return;
    }
    setError("");
    if (!(await requestMic(reason))) return;
    want.current = true;
    kept.current = from ? from.trim() + " " : "";
    const begin = () => {
      const r = new Recognition();
      r.lang = navigator.language || "en-GB";
      r.interimResults = true;
      r.continuous = continuous;
      let committed = "";
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) committed += t.trim() + " ";
          else interim += t;
        }
        onText(kept.current + committed + interim, { final: !interim });
      };
      r.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        want.current = false;
        setError(e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Dwiddle needs permission to use the microphone."
          : e.error === "network" ? "Speech recognition needs an internet connection." : "Listening stopped. Try again.");
      };
      // Browsers end a session after a pause. A long recording carries on
      // in a new one, keeping what the last one heard.
      r.onend = () => {
        kept.current += committed;
        if (continuous && want.current) { try { begin(); return; } catch {} }
        want.current = false;
        setOn(false);
      };
      rec.current = r;
      r.start();
    };
    try { begin(); setOn(true); } catch { want.current = false; setOn(false); }
  }

  function stop() {
    want.current = false;
    setOn(false);
    try { rec.current?.stop(); } catch {}
  }

  useEffect(() => () => { want.current = false; try { rec.current?.stop(); } catch {} }, []);
  return { on, start, stop, error, supported };
}

// Reading a reply aloud, in the most natural voice the device has.
function speak(text, { onStart, onEnd } = {}) {
  sayAs("dwiddle", plainText(text), { rate: 1.02, onStart, onEnd });
}
const plainText = (t) => String(t).replace(/\*\*/g, "").replace(/^\s*[-*]\s+/gm, "");

/* ---------- replies, lightly formatted ---------- */

function Bold({ text }) {
  return String(text).split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <b key={i}><M t={part.slice(2, -2)} /></b> : <span key={i}><M t={part} /></span>);
}

export function Reply({ text }) {
  const blocks = [];
  String(text).split(/\n+/).forEach((line) => {
    const item = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.*)/);
    if (item) {
      const last = blocks[blocks.length - 1];
      if (last?.list) last.list.push(item[1]); else blocks.push({ list: [item[1]] });
    } else if (line.trim()) blocks.push({ p: line.trim() });
  });
  return blocks.map((b, i) => b.list
    ? <ul key={i}>{b.list.map((x, j) => <li key={j}><Bold text={x} /></li>)}</ul>
    : <p key={i}><Bold text={b.p} /></p>);
}

/* ---------- the panel ---------- */

const STARTERS = ["Explain it more simply", "Give me another example", "I think this is wrong", "Quiz me on this", "Draw me a diagram"];

export function DwiddleChat({ hidden = false }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState("");
  const [msgs, setMsgs] = useState([]); // { role, content, shown }
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState("idle");
  const [voiceOn, setVoiceOn] = useState(false);
  const [error, setError] = useState("");
  const list = useRef(null);
  const input = useRef(null);
  const dict = useDictation((t, { final }) => { setText(t); if (final) setMood("idle"); });

  // Opened about something specific: a new conversation about that.
  useEffect(() => {
    const onAsk = (e) => {
      const next = e.detail?.context || pageContext;
      setContext((prev) => {
        if (next !== prev) setMsgs([]);
        return next;
      });
      setOpen(true);
      setError("");
      if (e.detail?.ask) setTimeout(() => send(e.detail.ask, next), 50);
      else setTimeout(() => input.current?.focus(), 250);
    };
    window.addEventListener("dwiddle:ask", onAsk);
    return () => window.removeEventListener("dwiddle:ask", onAsk);
  });

  // Something else (the Friends window) wants the corner this one is in.
  useEffect(() => {
    const onClose = () => { if (open) close(); };
    window.addEventListener("dwiddle:close-chat", onClose);
    return () => window.removeEventListener("dwiddle:close-chat", onClose);
  });

  useEffect(() => { if (dict.on) setMood("listening"); }, [dict.on]);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    dict.stop();
    stopSpeaking();
    setMood("idle");
  }

  async function send(raw, ctx = context) {
    const q = String(raw ?? text).trim();
    if (!q || busy) return;
    dict.stop();
    setText("");
    setError("");
    const history = [...msgs, { role: "user", content: q, shown: q.length }];
    setMsgs(history);
    setBusy(true);
    setMood("thinking");
    try {
      const { reply, did } = await agentTurn(ctx || pageContext, history.map(({ role, content }) => ({ role, content })));
      setBusy(false);
      reveal([...history, { role: "assistant", content: reply, shown: 0, did }]);
    } catch (err) {
      // Never a bare error: say sorry the way a teacher would and offer a way on.
      setBusy(false);
      setMood("oops");
      setTimeout(() => setMood("idle"), 1600);
      const offline = /fetch|network|offline/i.test(String(err?.message));
      reveal([...history, { role: "assistant", shown: 0, content: offline
        ? "Sorry, I can't reach my brain right now. Check your connection and ask me again in a moment."
        : "Sorry, I got in a muddle there. Let's try a simpler way: tell me in one short sentence what you'd like, and I'll do just that." }]);
    }
  }

  // The reply is written out rather than dropped in, with the beak moving,
  // and read aloud too when voice is on.
  function reveal(all) {
    const last = all[all.length - 1];
    const total = last.content.length;
    const step = Math.max(2, Math.ceil(total / 90));
    setMood("talking");
    let n = 0;
    setMsgs(all);
    const tick = setInterval(() => {
      n = Math.min(total, n + step);
      setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, shown: n } : x)));
      if (n >= total) {
        clearInterval(tick);
        if (voiceOn) speak(last.content, { onStart: () => setMood("talking"), onEnd: () => cheer() });
        else cheer();
      }
    }, 22);
  }
  function cheer() {
    setMood("happy");
    setTimeout(() => setMood((m) => (m === "happy" ? "idle" : m)), 1300);
  }

  if (hidden && !open) return null;

  return (
    <Portal>
      {!open && (
        <button className="dc-fab" onClick={() => openDwiddle(pageContext)} aria-label="Chat with Dwiddle">
          <DuckTalk size={46} />
          <span className="dc-fab-label">Ask Dwiddle</span>
        </button>
      )}
      {open && (
        <div className="dc" role="dialog" aria-label="Chat with Dwiddle">
          <div className="dc-head">
            <DuckTalk mood={mood} size={58} />
            <div className="dc-title">
              <b>Dwiddle</b>
              <span>{mood === "thinking" ? "thinking..." : mood === "listening" ? "listening..." : mood === "talking" ? "talking" : context ? "about what's on your screen" : "ask me anything you're studying"}</span>
            </div>
            <button className={"dc-icon" + (voiceOn ? " on" : "")} title={voiceOn ? "Stop reading replies aloud" : "Read replies aloud"}
              aria-pressed={voiceOn} onClick={() => { setVoiceOn((v) => !v); stopSpeaking(); }}>
              <SpeakerIcon on={voiceOn} />
            </button>
            <button className="dc-icon" onClick={close} aria-label="Close"><Icon name="close" size={16} /></button>
          </div>

          <div className="dc-list" ref={list}>
            {msgs.length === 0 && (
              <div className="dc-hello">
                <p>Hi! I can see what you're working on. Ask me anything, or tell me what to do: fix a note, draw a graph, change your theme, start new material.</p>
                <div className="dc-chips">
                  {STARTERS.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={"dc-msg " + (m.role === "user" ? "dc-me" : "dc-bot")}>
                {m.role === "assistant" ? <Reply text={m.content.slice(0, m.shown ?? m.content.length)} /> : <p>{m.content}</p>}
                {m.did?.length > 0 && (m.shown ?? m.content.length) >= m.content.length && <Did did={m.did} onShow={close} />}
              </div>
            ))}
            {busy && <div className="dc-msg dc-bot typing"><i /><i /><i /></div>}
            {error && <div className="dc-err">{error}</div>}
            {dict.error && <div className="dc-err">{dict.error}</div>}
          </div>

          {msgs.length > 0 && !busy && (
            <div className="dc-chips dc-more">
              {["Explain more simply", "Another example", "Quiz me"].map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
            </div>
          )}

          <form className="dc-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <button type="button" className={"dc-icon mic" + (dict.on ? " on" : "")}
              onClick={() => (dict.on ? dict.stop() : dict.start({ reason: "So you can ask Dwiddle by speaking." }))} aria-label={dict.on ? "Stop listening" : "Speak"}>
              <Icon name="mic" size={18} />
            </button>
            <textarea ref={input} rows={1} value={text} placeholder={dict.on ? "Listening..." : "Ask Dwiddle..."}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "40px";
                e.target.style.height = Math.min(120, e.target.scrollHeight) + "px";
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button type="submit" className="dc-send" disabled={!text.trim() || busy} aria-label="Send">
              <Icon name="arrow" size={18} />
            </button>
          </form>
        </div>
      )}
    </Portal>
  );
}

// What Dwiddle did, as small chips, with any drawing it made.
function Did({ did, onShow }) {
  return (
    <>
      {did.map((d, i) => d.art && (
        <div key={i} className={"dc-art" + (d.art.svg ? " svg" : "")}>
          {d.art.sketch && <Sketch spec={d.art.sketch} />}
          {d.art.svg && <><div dangerouslySetInnerHTML={{ __html: d.art.svg }} />{d.art.caption && <p className="small muted">{d.art.caption}</p>}</>}
          {d.art.paint ? <ChatPaint prompt={d.art.paint} query={d.art.query} /> : d.art.query && <ChatPicture query={d.art.query} />}
        </div>
      ))}
      <div className="dc-did">{did.map((d, i) => d.where
        ? <button key={i} className="dc-chip-go" onClick={() => { window.dispatchEvent(new CustomEvent("dwiddle:show", { detail: d.where })); onShow?.(); }}>Done: {d.text}. <u>View in notes</u></button>
        : <span key={i} className={d.ok ? "" : "no"}>{d.ok ? "Done: " : "Could not: "}{d.text}</span>)}</div>
    </>
  );
}

// A picture made from a description. If every image maker is busy, the real
// picture of the thing is shown instead, so there is always something.
function ChatPaint({ prompt, query }) {
  const [img, setImg] = useState(undefined);
  const [why, setWhy] = useState("");
  useEffect(() => {
    let live = true;
    browse("paint", { q: prompt }).then((r) => { if (live) setImg(r?.data || null); }).catch((e) => { if (live) { setWhy(e?.message || ""); setImg(null); } });
    return () => { live = false; };
  }, [prompt]);
  if (img === undefined) return <p className="small muted">Drawing it, this can take up to half a minute...</p>;
  if (!img) return query ? <ChatPicture query={query} /> : <p className="small muted">I could not make that picture just now. {why}</p>;
  return (
    <figure className="nt-pic">
      <img src={img} alt={prompt} />
      <figcaption>Made by Dwiddle. AI pictures can have mistakes, so check any labels.</figcaption>
    </figure>
  );
}

function ChatPicture({ query }) {
  const [pic, setPic] = useState(undefined);
  useEffect(() => { let live = true; findPicture(query).then((p) => { if (live) setPic(p); }).catch(() => { if (live) setPic(null); }); return () => { live = false; }; }, [query]);
  if (pic === undefined) return <p className="small muted">Looking for a picture...</p>;
  if (!pic) return <p className="small muted">I could not find a picture that really matches.</p>;
  return (
    <figure className="nt-pic">
      <img src={pic.src} alt={pic.title} referrerPolicy="no-referrer" />
      <figcaption>{pic.title} · <a href={pic.page} target="_blank" rel="noreferrer">Wikipedia</a></figcaption>
    </figure>
  );
}

function SpeakerIcon({ on }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 7.5h3l4-3.5v12l-4-3.5h-3z" />
      {on ? <path d="M13.5 7a4 4 0 0 1 0 6M15.8 4.8a7 7 0 0 1 0 10.4" /> : <path d="M13.5 8l4 4M17.5 8l-4 4" />}
    </svg>
  );
}
