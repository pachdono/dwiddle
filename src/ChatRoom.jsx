// Chat with Dwiddle: learning in conversation, the way a chat assistant works,
// with Dwiddle itself up at the top reacting to everything. It listens while
// you speak, thinks while an answer comes, talks while it is written out,
// hops when it is done, and dances now and then.
//
// Any answer can become a narrated video right there in the chat, a quiz, a
// simpler explanation, or a full set of study material. Asking for a video
// ("make a video on photosynthesis") does it in one go.
//
// The conversation is kept on this device, so it is there when you come back.

import { ready as notifyReady } from "./notify.js";
import { useEffect, useRef, useState } from "react";
import { DuckTalk, Reply, useDictation } from "./Chat.jsx";
import { chatWithDwiddle, writeVideo, generateFromNotes } from "./ai.js";
import { sayAs, stopSpeaking } from "./tts.js";
import { Icon } from "./ui.jsx";
import { generationsLeft, countGeneration } from "./limits.js";
import { readFile, IMAGE } from "./readfile.js";
import { shrink } from "./custom.js";

const KEY = "dwiddle-chatroom";
const keep = (msgs) => {
  try { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-40).map(({ busy, ...m }) => (m.video?.state === "making" || m.video?.state === "voicing" ? { ...m, video: null } : m)))); } catch { /* full or private */ }
};
const loadKept = () => { try { const m = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(m) ? m : []; } catch { return []; } };

const STARTERS = [
  "Teach me photosynthesis from scratch",
  "Make a video on how the heart works",
  "Quiz me on the French Revolution",
  "Explain Newton's laws like I'm 10",
];
const HELLO = ["Hi! What do you want to learn today?", "Ask me anything you're studying.", "I can explain it, quiz you, or make you a video."];
const wantsVideo = (q) => /\b(make|create|generate|show|give)\b[^.?!]{0,30}\bvideos?\b|\bvideo (on|about|of)\b/i.test(q);
const plain = (t) => String(t).replace(/\*\*/g, "").replace(/^\s*[-*]\s+/gm, "");

// Dwiddle at the top of the chat: the duck and what it is saying.
export function DwiddleHero({ mood, say, size = 120 }) {
  // A little life when nothing is happening: a hop or a wiggle now and then.
  const [fidget, setFidget] = useState("");
  useEffect(() => {
    if (mood !== "idle") return;
    const t = setInterval(() => {
      const f = ["hop", "look", "wiggle"][Math.floor(Math.random() * 3)];
      setFidget(f);
      setTimeout(() => setFidget(""), 1200);
    }, 5200);
    return () => clearInterval(t);
  }, [mood]);
  const face = mood === "dance" || mood === "jump" ? "happy" : mood;
  return (
    <div className={`dh dh-${mood}${fidget ? " dh-" + fidget : ""}`}>
      <div className="dh-duck"><DuckTalk mood={face} size={size} /></div>
      {say && <div className="dh-say" key={say}><span>{say}</span></div>}
    </div>
  );
}

export default function ChatRoom({ go, setMade, auth, made }) {
  const [msgs, setMsgs] = useState(loadKept);
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // [{ id, name, thumb, text, state: "reading" | "ready" | "failed", error }]
  const [busy, setBusy] = useState(false);
  const picker = useRef(null);
  const [mood, setMood] = useState("idle");
  const [say, setSay] = useState(() => HELLO[Math.floor(Math.random() * HELLO.length)]);
  const [voiceOn, setVoiceOn] = useState(false);
  const [watching, setWatching] = useState(null);
  const [Player, setPlayer] = useState(null);
  const list = useRef(null);
  const input = useRef(null);
  const live = useRef(true);
  const dict = useDictation((t, { final }) => { setText(t); if (final) setMood("idle"); });

  useEffect(() => () => { live.current = false; stopSpeaking(); }, []);
  useEffect(() => { keep(msgs); }, [msgs]);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [msgs.length, busy]);
  useEffect(() => { if (dict.on) { setMood("listening"); setSay("I'm listening..."); } }, [dict.on]);
  const [Narration, setNarration] = useState(null);
  useEffect(() => { import("./Video.jsx").then((m) => { setPlayer(() => m.VideoPlayer); setNarration(() => m.NarrationToggle); }); }, []);

  const update = (id, change) => setMsgs((all) => all.map((m) => (m.id === id ? { ...m, ...(typeof change === "function" ? change(m) : change) } : m)));
  const moodFor = (m, ms) => { setMood(m); if (ms) setTimeout(() => setMood((x) => (x === m ? "idle" : x)), ms); };
  const context = made?.title ? `The student's study material is "${made.title}", on: ${(made.topics || []).map((t) => t.name).join(", ").slice(0, 600)}` : "";

  // Photos and files: read here (text pulled out of a PDF, a photo of a
  // page read by the model) and sent along with the next message.
  async function attach(list) {
    for (const file of [...(list || [])].slice(0, 5)) {
      const id = Date.now() + Math.random().toString(36).slice(2, 6);
      const thumb = IMAGE.test(file.name) ? await shrink(file, 160, 0.7).catch(() => "") : "";
      setFiles((f) => [...f, { id, name: file.name, thumb, state: "reading" }]);
      setSay(thumb ? "Ooh, a picture! Let me look..." : "Reading your file...");
      moodFor("thinking", 1500);
      readFile(file)
        .then((t) => setFiles((f) => f.map((x) => (x.id === id ? { ...x, state: "ready", text: String(t || "").trim().slice(0, 12000) } : x))))
        .catch((err) => setFiles((f) => f.map((x) => (x.id === id ? { ...x, state: "failed", error: err.message || "That file could not be read." } : x))));
    }
  }
  const reading = files.some((f) => f.state === "reading");

  async function send(raw) {
    const ready = files.filter((f) => f.state === "ready" && f.text);
    const q = String(raw ?? text).trim() || (ready.length ? "Help me understand this." : "");
    if (!q || busy || reading) return;
    import("./notify.js").then((m) => m.askOnce());
    dict.stop();
    stopSpeaking();
    setText("");
    setFiles([]);
    if (input.current) input.current.style.height = "";
    const sent = ready.map((f) => `\n\n[Attached ${f.thumb ? "photo" : "file"}: ${f.name}]\n${f.text}`).join("");
    const mine = { id: Date.now() + "u", role: "user", content: (q + sent).slice(0, 20000), display: q, files: ready.map(({ name, thumb }) => ({ name, thumb })) };
    const history = [...msgs, mine];
    setMsgs(history);
    setBusy(true);
    moodFor("thinking");
    setSay(wantsVideo(q) ? "Ooh, a video! Let me think it through first..." : "Hmm, let me think...");
    try {
      const turns = history.filter((m) => m.content && !m.note).map(({ role, content }) => ({ role, content }));
      const reply = await chatWithDwiddle(context, turns, { mode: "learn" });
      if (!live.current) return;
      notifyReady("Dwiddle answered", reply.replace(/\*\*/g, "").slice(0, 120), "/chat");
      const id = Date.now() + "a";
      setBusy(false);
      await reveal({ id, role: "assistant", content: reply, asked: q });
      if (wantsVideo(q)) makeVideo(id, q, reply);
    } catch (err) {
      setBusy(false);
      moodFor("oops", 1800);
      setSay("Oops, that didn't work.");
      setMsgs((m) => [...m, { id: Date.now() + "e", role: "assistant", note: true, content: err.message || "I couldn't answer just now. Try again?" }]);
    }
  }

  // Written out rather than dropped in, with the beak moving, then a hop.
  function reveal(msg) {
    return new Promise((done) => {
      setMood("talking");
      setSay("");
      const total = msg.content.length;
      const step = Math.max(3, Math.ceil(total / 110));
      let n = 0;
      setMsgs((m) => [...m, { ...msg, shown: 0 }]);
      const tick = setInterval(() => {
        n = Math.min(total, n + step);
        update(msg.id, { shown: n });
        if (n >= total) {
          clearInterval(tick);
          update(msg.id, { shown: undefined });
          const finish = () => {
            const happy = /\b(thank|thanks|cheers|got it|yay|love)\b/i.test(msg.asked || "");
            moodFor(happy ? "dance" : "jump", happy ? 2600 : 1200);
            setSay(happy ? "Yay! Happy to help!" : ["Does that make sense?", "Want a video of that?", "Shall I quiz you?", "Anything else?"][Math.floor(Math.random() * 4)]);
            done();
          };
          if (voiceOn) sayAs("dwiddle", plain(msg.content), { rate: 1.02, onStart: () => setMood("talking"), onEnd: finish });
          else finish();
        }
      }, 20);
    });
  }

  // A narrated video of an answer, made and voiced right here in the chat.
  async function makeVideo(afterId, topic, notes) {
    const { askNarration } = await import("./Video.jsx");
    if (!(await askNarration({ chapters: 1 }))) return;
    import("./notify.js").then((m) => m.askOnce());
    const id = Date.now() + "v";
    setMsgs((m) => {
      const at = m.findIndex((x) => x.id === afterId);
      const card = { id, role: "assistant", video: { state: "making" }, content: "" };
      return at < 0 ? [...m, card] : [...m.slice(0, at + 1), card, ...m.slice(at + 1)];
    });
    setSay("Making your video! This takes about a minute.");
    moodFor("dance", 2400);
    try {
      const name = String(topic).replace(/^(please\s+)?(can you\s+)?(make|create|generate|show|give)( me)?( a)? videos?( on| about| of)?\s*/i, "").replace(/[?.!]+$/, "").slice(0, 80) || "Your topic";
      const video = await writeVideo({ topic: name, notes: plain(notes).slice(0, 6000) });
      update(id, { video: { state: "voicing", done: 0, total: 0 } });
      const { voice } = await import("./Video.jsx");
      await voice(video, (done, total) => update(id, { video: { state: "voicing", done, total } }));
      update(id, { video: { state: "ready", data: video } });
      notifyReady("Your video is ready", video?.title || "It is waiting in your chat.", "/chat");
      setSay("Your video is ready! Press play.");
      moodFor("jump", 1400);
    } catch (err) {
      update(id, { video: { state: "failed", error: err.message || "The video could not be made." } });
      moodFor("oops", 1600);
    }
  }

  // The conversation so far, turned into a full set of study material.
  const [making, setMaking] = useState("");
  async function toMaterial() {
    if (generationsLeft(auth?.user) <= 0) { setMaking("Sign in to make more study material."); return; }
    const notes = msgs.filter((m) => m.role === "assistant" && m.content && !m.note).map((m) => plain(m.content)).join("\n\n");
    if (notes.length < 120) return;
    setMaking("Making your study material...");
    moodFor("thinking");
    try {
      const data = await generateFromNotes(notes);
      countGeneration(auth?.user);
      setMade(data, { material: "new" });
      setMaking("");
      go("sheet");
    } catch (err) {
      setMaking(err.message || "That did not work. Try again.");
      moodFor("oops", 1600);
    }
  }

  const clear = () => { if (confirm("Start a new chat? This one is cleared.")) { stopSpeaking(); setMsgs([]); setSay(HELLO[0]); } };
  const lastBot = [...msgs].reverse().find((m) => m.role === "assistant" && m.content && !m.note);

  return (
    <div className="cr">
      <div className="cr-top">
        <DwiddleHero mood={mood} say={say} />
        <div className="cr-tools">
          <button className={"cr-tool" + (voiceOn ? " on" : "")} onClick={() => { setVoiceOn((v) => !v); stopSpeaking(); }} aria-pressed={voiceOn}
            title={voiceOn ? "Stop reading answers aloud" : "Read answers aloud"}>
            <Icon name="mic" size={15} /> {voiceOn ? "Voice on" : "Voice off"}
          </button>
          {Narration && <Narration />}
          {msgs.length > 0 && <button className="cr-tool" onClick={clear}><Icon name="plus" size={15} /> New chat</button>}
        </div>
      </div>

      <div className="cr-list" ref={list}>
        {msgs.length === 0 && (
          <div className="cr-start">
            <p className="muted">Learn anything here, like with a tutor. Ask a question, say what you want to study, or ask for a video.</p>
            <div className="cr-chips">{STARTERS.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={"cr-msg " + (m.role === "user" ? "me" : "bot") + (m.note ? " note" : "")}>
            {m.video ? <VideoCard v={m.video} onWatch={() => setWatching(m.video.data)} />
              : m.role === "assistant" ? <Reply text={m.content.slice(0, m.shown ?? m.content.length)} /> : <>
                {m.files?.length > 0 && <div className="cr-files sent">{m.files.map((f, i) => <FileChip key={i} f={f} />)}</div>}
                <p>{m.display ?? m.content}</p>
              </>}
            {m.role === "assistant" && !m.video && !m.note && m.shown === undefined && !busy && (
              <div className="cr-acts">
                <button onClick={() => makeVideo(m.id, m.asked || "this", m.content)}><Icon name="video" size={14} /> Make a video</button>
                <button onClick={() => send("Quiz me on that, one question at a time.")}><Icon name="quiz" size={14} /> Quiz me</button>
                <button onClick={() => send("Explain that more simply, with an everyday example.")}><Icon name="bulb" size={14} /> Simpler</button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="cr-msg bot typing"><i /><i /><i /></div>}
        {lastBot && !busy && (
          <div className="cr-material">
            <button className="btn ghost small" onClick={toMaterial} disabled={!!making && making.endsWith("...")}>
              Turn this chat into study material
            </button>
            {making && <span className="small muted">{making}</span>}
          </div>
        )}
        {dict.error && <div className="cr-msg bot note"><p>{dict.error}</p></div>}
      </div>

      {files.length > 0 && (
        <div className="cr-files">
          {files.map((f) => <FileChip key={f.id} f={f} onRemove={() => setFiles((all) => all.filter((x) => x.id !== f.id))} />)}
        </div>
      )}
      <form className="cr-input" onSubmit={(e) => { e.preventDefault(); send(); }}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); attach(e.dataTransfer.files); }}>
        <input ref={picker} type="file" multiple hidden accept=".pdf,.docx,.pptx,.txt,.md,image/*" onChange={(e) => { attach(e.target.files); e.target.value = ""; }} />
        <button type="button" className="cr-mic" onClick={() => picker.current?.click()} aria-label="Add a photo or file" title="Add a photo or file">
          <Icon name="plus" size={18} />
        </button>
        <button type="button" className={"cr-mic" + (dict.on ? " on" : "")} aria-label={dict.on ? "Stop listening" : "Speak"}
          onClick={() => (dict.on ? dict.stop() : dict.start({ reason: "So you can talk to Dwiddle." }))}>
          <Icon name="mic" size={18} />
        </button>
        <textarea ref={input} rows={1} value={text} placeholder={dict.on ? "Listening..." : "Message Dwiddle..."}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "";
            e.target.style.height = Math.min(160, e.target.scrollHeight) + "px";
            if (mood === "idle" && e.target.value) setSay("Ooh, what are you typing?");
          }}
          onPaste={(e) => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); attach(fs); } }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button type="submit" className="cr-send" disabled={(!text.trim() && !files.some((f) => f.state === "ready")) || busy || reading} aria-label="Send"><Icon name="arrow" size={18} /></button>
      </form>

      {watching && Player && <Player video={watching} onClose={() => setWatching(null)} />}
    </div>
  );
}

function FileChip({ f, onRemove }) {
  return (
    <span className={"cr-file " + (f.state || "ready")} title={f.error || f.name}>
      {f.thumb ? <img src={f.thumb} alt="" /> : <Icon name="file" size={16} />}
      <span>{f.state === "reading" ? "Reading..." : f.state === "failed" ? f.error : f.name}</span>
      {onRemove && <button type="button" onClick={onRemove} aria-label={`Remove ${f.name}`}>×</button>}
    </span>
  );
}

function VideoCard({ v, onWatch }) {
  if (v.state === "failed") return <p className="cr-video-fail">{v.error} <span className="muted">Press Make a video to try again.</span></p>;
  if (v.state !== "ready") {
    return (
      <div className="cr-video making">
        <span className="cr-video-spin" aria-hidden="true" />
        <div>
          <b>{v.state === "voicing" ? "Recording the narration" : "Making your video"}</b>
          <span className="small muted">{v.state === "voicing" && v.total ? `${v.done} of ${v.total} lines` : "Drawing every scene, about a minute"}</span>
        </div>
      </div>
    );
  }
  return (
    <button className="cr-video" onClick={onWatch}>
      <span className="cr-video-play" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor"><path d="M6 4l10 6-10 6z" /></svg></span>
      <div>
        <b>{v.data?.title || "Your video"}</b>
        <span className="small muted">{v.data?.scenes?.length || 0} scenes · narrated · tap to watch</span>
      </div>
    </button>
  );
}
