import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase.js";
import { Icon, PageHead } from "./ui.jsx";
import { useMyProfile } from "./Profile.jsx";
import { newCode, cleanCode } from "./duel.js";
import { W, H, COLOURS, SIZES, apply, thin, cutOut, baseId, newStrokeId, personColour } from "./whiteboard.js";

// A whiteboard two or more people draw on at once. Like Duel, nothing is
// stored: the screens talk over a realtime channel named after the room code,
// and someone who joins late is sent the board by whoever is already there.

const FLUSH_MS = 70; // how often new points are sent
const CURSOR_MS = 80;
const SYNC_POINTS = 6000; // points per sync message, to stay well under the message limit
const ERASE_REACH = 18;
const ERASE_STEP = 9; // the eraser is tested this often along its path, so a fast swipe leaves no gaps

function paint(ctx, strokes, cursors) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const s of strokes) {
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w;
    ctx.beginPath();
    ctx.moveTo(s.pts[0], s.pts[1]);
    if (s.pts.length === 2) ctx.lineTo(s.pts[0], s.pts[1]);
    for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i], s.pts[i + 1]);
    ctx.stroke();
  }
  if (!cursors) return;
  ctx.font = "600 26px system-ui, sans-serif";
  for (const c of cursors) {
    ctx.fillStyle = c.colour;
    ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.strokeText(c.name, c.x + 14, c.y - 12);
    ctx.fillText(c.name, c.x + 14, c.y - 12);
  }
}

export default function Whiteboard({ auth }) {
  const me = useMyProfile(auth?.user);
  const guest = useRef("g" + Math.random().toString(36).slice(2, 8));
  const myId = auth?.user?.id || guest.current;
  const myName = me?.handle || me?.display_name?.trim().split(/\s+/)[0] || "Guest";

  const [phase, setPhase] = useState("menu"); // menu | board
  const [code, setCode] = useState("");
  const [join, setJoin] = useState("");
  const [err, setErr] = useState("");
  const [here, setHere] = useState([]);
  const [tool, setTool] = useState("pen");
  const [colour, setColour] = useState(COLOURS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [count, setCount] = useState(0); // strokes on the board, for the buttons
  const [sure, setSure] = useState(false);

  const canvas = useRef(null);
  const chan = useRef(null);
  const strokes = useRef([]);
  const cursors = useRef(new Map()); // id -> { x, y, name, at }
  const dirty = useRef(true);
  const draw = useRef(null); // the stroke being drawn: { id, sent, last }
  const erased = useRef([]);
  const lastCursor = useRef(0);
  const toolRef = useRef({});
  toolRef.current = { tool, colour, size };

  const send = (event, payload) => chan.current?.send({ type: "broadcast", event, payload });
  function change(kind, p, remote) {
    const next = apply(strokes.current, kind, p);
    if (next !== strokes.current) { strokes.current = next; dirty.current = true; setCount(next.length); }
    if (!remote) send(kind, p);
  }

  useEffect(() => () => { chan.current && supabase?.removeChannel(chan.current); }, []);

  function open(room) {
    if (!supabase) { setErr("A shared board needs an online connection, which this copy does not have."); return; }
    setErr("");
    chan.current && supabase.removeChannel(chan.current);
    strokes.current = []; setCount(0); cursors.current.clear(); dirty.current = true;
    const ch = supabase.channel("board:" + room, { config: { broadcast: { self: false }, presence: { key: myId } } });
    ch.on("presence", { event: "sync" }, () => setHere(Object.values(ch.presenceState()).flat().map((p) => ({ id: p.id, name: p.name }))))
      .on("broadcast", { event: "seg" }, ({ payload }) => change("seg", payload, true))
      .on("broadcast", { event: "del" }, ({ payload }) => change("del", payload, true))
      .on("broadcast", { event: "cut" }, ({ payload }) => change("cut", payload, true))
      .on("broadcast", { event: "clear" }, () => change("clear", null, true))
      .on("broadcast", { event: "sync" }, ({ payload }) => change("sync", payload, true))
      .on("broadcast", { event: "hello" }, () => {
        // someone new: send them what is on the board, a few strokes at a time
        let batch = [], points = 0;
        const flush = () => { if (batch.length) ch.send({ type: "broadcast", event: "sync", payload: { strokes: batch } }); batch = []; points = 0; };
        for (const s of strokes.current) {
          if (points + s.pts.length > SYNC_POINTS) flush();
          batch.push(s); points += s.pts.length;
        }
        flush();
      })
      .on("broadcast", { event: "cur" }, ({ payload }) => {
        if (!payload || typeof payload.id !== "string") return;
        cursors.current.set(payload.id, { x: +payload.x || 0, y: +payload.y || 0, name: String(payload.name || "").slice(0, 20), at: Date.now() });
        dirty.current = true;
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") { await ch.track({ id: myId, name: myName }); ch.send({ type: "broadcast", event: "hello", payload: {} }); }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setErr("Could not reach the board. Check your connection and try again.");
      });
    chan.current = ch;
    setCode(room); setPhase("board");
  }
  function leave() {
    chan.current && supabase?.removeChannel(chan.current);
    chan.current = null; setPhase("menu"); setHere([]); setCode(""); setErr("");
  }
  function joinRoom() {
    const c = cleanCode(join);
    if (c.length !== 5) { setErr("A room code is five letters or numbers."); return; }
    open(c);
  }

  // redraw only when something changed
  useEffect(() => {
    if (phase !== "board") return;
    let raf = 0;
    const loop = () => {
      const cv = canvas.current;
      const now = Date.now();
      for (const [id, c] of cursors.current) if (now - c.at > 2500) { cursors.current.delete(id); dirty.current = true; }
      if (cv && dirty.current) {
        dirty.current = false;
        const list = [...cursors.current].map(([id, c]) => ({ ...c, colour: personColour(id) }));
        paint(cv.getContext("2d"), strokes.current, list);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const tick = setInterval(() => { dirty.current = dirty.current || cursors.current.size > 0; }, 1000);
    return () => { cancelAnimationFrame(raf); clearInterval(tick); };
  }, [phase]);

  // send new points in small batches while drawing
  useEffect(() => {
    if (phase !== "board") return;
    const t = setInterval(() => { flushDraw(); flushErase(); }, FLUSH_MS);
    return () => clearInterval(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function flushDraw() {
    const d = draw.current;
    if (!d) return;
    const s = strokes.current.find((x) => x.id === d.id);
    if (!s || s.pts.length <= d.sent) return;
    // the first point of the next batch repeats the last sent one, so the line joins up
    const from = Math.max(0, d.sent - 2);
    send("seg", { id: s.id, by: s.by, c: s.c, w: s.w, pts: s.pts.slice(from) });
    d.sent = s.pts.length;
  }
  function flushErase() {
    if (!erased.current.length) return;
    send("cut", { cuts: erased.current });
    erased.current = [];
  }

  function at(e) {
    const r = canvas.current.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * W), Math.round(((e.clientY - r.top) / r.height) * H)];
  }
  // Rub the eraser from where it last was to (x, y), cutting out only the part
  // of each line it passes over.
  function rub(x, y) {
    const from = draw.current?.at || [x, y];
    const n = Math.max(1, Math.ceil(Math.hypot(x - from[0], y - from[1]) / ERASE_STEP));
    for (let k = 1; k <= n; k++) {
      const px = from[0] + ((x - from[0]) * k) / n, py = from[1] + ((y - from[1]) * k) / n;
      const cuts = [];
      for (const s of strokes.current) {
        const pieces = cutOut(s, px, py, ERASE_REACH);
        if (pieces) cuts.push({ id: s.id, pieces });
      }
      if (!cuts.length) continue;
      const next = apply(strokes.current, "cut", { cuts });
      strokes.current = next; dirty.current = true; setCount(next.length);
      erased.current.push(...cuts);
    }
    if (draw.current) draw.current.at = [x, y];
  }
  function down(e) {
    if (e.button > 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const [x, y] = at(e);
    const t = toolRef.current;
    if (t.tool === "eraser") { draw.current = { eraser: true, at: [x, y] }; rub(x, y); return; }
    const id = newStrokeId(myId);
    draw.current = { id, sent: 0 };
    const s = { id, by: myId, c: t.colour, w: t.size, pts: [x, y, x, y] };
    strokes.current = apply(strokes.current, "seg", s); dirty.current = true; setCount(strokes.current.length);
  }
  function move(e) {
    const [x, y] = at(e);
    const now = Date.now();
    if (now - lastCursor.current > CURSOR_MS) { lastCursor.current = now; send("cur", { id: myId, name: myName, x, y }); }
    const d = draw.current;
    if (!d) return;
    if (d.eraser) { rub(x, y); return; }
    const i = strokes.current.findIndex((s) => s.id === d.id);
    if (i < 0) return;
    const s = strokes.current[i];
    if (Math.hypot(x - s.pts[s.pts.length - 2], y - s.pts[s.pts.length - 1]) < 2) return;
    const next = strokes.current.slice();
    next[i] = { ...s, pts: [...s.pts, x, y] };
    strokes.current = next; dirty.current = true;
  }
  function up() {
    const d = draw.current;
    draw.current = null;
    if (!d) return;
    if (d.eraser) { flushErase(); return; }
    // tidy the finished line before the last batch goes out
    const i = strokes.current.findIndex((s) => s.id === d.id);
    if (i >= 0) {
      const next = strokes.current.slice();
      next[i] = { ...next[i], pts: thin(next[i].pts) };
      strokes.current = next;
      if (next[i].pts.length < d.sent) d.sent = next[i].pts.length;
    }
    draw.current = d;
    flushDraw();
    draw.current = null;
  }

  function undo() {
    const last = [...strokes.current].reverse().find((s) => s.by === myId);
    if (!last) return;
    const base = baseId(last.id);
    change("del", { ids: strokes.current.filter((s) => baseId(s.id) === base).map((s) => s.id) });
  }
  function wipe() {
    if (!sure) { setSure(true); setTimeout(() => setSure(false), 3000); return; }
    setSure(false); change("clear", null);
  }
  function save() {
    paint(canvas.current.getContext("2d"), strokes.current, null);
    canvas.current.toBlob((b) => {
      dirty.current = true;
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = `dwiddle-board-${code}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }

  useEffect(() => {
    if (phase !== "board") return;
    const key = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !/input|textarea/i.test(e.target.tagName)) { e.preventDefault(); undo(); } };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }); // undo reads the live refs, so it is safe to rebind each render

  if (phase === "menu") {
    return (
      <div className="page fade wb">
        <PageHead title="Whiteboard" sub="Draw on the same board as a friend, live. Good for working a problem out together." />
        {err && <div className="dl-err">{err}</div>}
        <div className="dl-two">
          <div className="card card-pad dl-card">
            <h3>Start a board</h3>
            <p className="small muted">You get a five letter code. Send it to whoever should join.</p>
            <button className="btn cta" onClick={() => open(newCode())}>Make a board</button>
          </div>
          <div className="card card-pad dl-card">
            <h3>Join a friend</h3>
            <label className="small muted">Their board code</label>
            <input className="dl-code-in" value={join} maxLength={5} placeholder="ABC12" onChange={(e) => setJoin(cleanCode(e.target.value))} onKeyDown={(e) => e.key === "Enter" && joinRoom()} />
            <button className="btn cta" onClick={joinRoom}>Join</button>
          </div>
        </div>
      </div>
    );
  }

  const others = here.filter((p) => p.id !== myId);
  return (
    <div className="page fade wb">
      {err && <div className="dl-err">{err}</div>}
      <div className="wb-bar card">
        <div className="wb-group" role="group" aria-label="Tool">
          <button className={"wb-btn" + (tool === "pen" ? " on" : "")} onClick={() => setTool("pen")} title="Pen" aria-label="Pen"><Icon name="pen" size={18} /></button>
          <button className={"wb-btn" + (tool === "eraser" ? " on" : "")} onClick={() => setTool("eraser")} title="Rub out" aria-label="Eraser"><Icon name="close" size={18} /></button>
        </div>
        <div className="wb-group" role="group" aria-label="Colour">
          {COLOURS.map((c) => (
            <button key={c} className={"wb-dot" + (colour === c && tool === "pen" ? " on" : "")} style={{ background: c }} aria-label={"Colour " + c} onClick={() => { setColour(c); setTool("pen"); }} />
          ))}
        </div>
        <div className="wb-group" role="group" aria-label="Thickness">
          {SIZES.map((n) => (
            <button key={n} className={"wb-btn" + (size === n ? " on" : "")} onClick={() => { setSize(n); setTool("pen"); }} aria-label={"Thickness " + n}>
              <i className="wb-nib" style={{ width: Math.max(4, n * 0.7), height: Math.max(4, n * 0.7) }} />
            </button>
          ))}
        </div>
        <div className="wb-group">
          <button className="btn quiet small" onClick={undo} disabled={!strokes.current.some((s) => s.by === myId)}>Undo</button>
          <button className={"btn quiet small" + (sure ? " warn" : "")} onClick={wipe} disabled={!count}>{sure ? "Sure?" : "Clear"}</button>
          <button className="btn quiet small" onClick={save}>Save image</button>
        </div>
        <div className="wb-group wb-end">
          <button className="wb-code" title="Copy the code" onClick={() => navigator.clipboard?.writeText(code)}>{code}</button>
          <button className="btn ghost small" onClick={leave}>Leave</button>
        </div>
      </div>
      <div className="wb-who small muted">
        <span className="pill" style={{ borderColor: personColour(myId) }}>You</span>
        {others.map((p) => <span key={p.id} className="pill" style={{ borderColor: personColour(p.id) }}>{p.name}</span>)}
        {!others.length && <span>Waiting for someone to join with the code {code}.</span>}
      </div>
      <canvas
        ref={canvas} className={"wb-canvas" + (tool === "eraser" ? " erase" : "")} width={W} height={H}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={(e) => e.buttons === 0 && up()}
        aria-label="Shared whiteboard"
      />
    </div>
  );
}
