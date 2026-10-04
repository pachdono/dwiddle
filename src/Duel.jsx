import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase.js";
import { Icon, PageHead } from "./ui.jsx";
import { M } from "./MathText.jsx";
import { useMyProfile } from "./Profile.jsx";
import { viewOf } from "./materials.js";
import { rank, tally, newCode, cleanCode, duelQuestions } from "./duel.js";

// Race a friend on the same questions, in the same time. Nothing is stored:
// the two screens talk over a realtime channel named after the room code, and
// the host's questions travel with the start signal, so a friend needs no
// material of their own to join.

const LEADIN = 4; // seconds of countdown after the host presses start
const LENGTHS = [60, 90, 120];
const blank = (id, name) => ({ id, name, score: 0, right: 0, answered: 0, ms: 0, done: false });

export default function Duel({ auth, fullMade, materials = [], focus, go }) {
  const me = useMyProfile(auth?.user);
  const guest = useRef("g" + Math.random().toString(36).slice(2, 8));
  const myId = auth?.user?.id || guest.current;
  const myName = me?.display_name?.trim().split(/\s+/)[0] || auth?.user?.email?.split("@")[0] || "Guest";

  const [phase, setPhase] = useState("menu"); // menu | lobby | count | play | over
  const [code, setCode] = useState("");
  const [join, setJoin] = useState("");
  const [host, setHost] = useState(false);
  const [from, setFrom] = useState(() => (materials.some((m) => m.id === focus) ? focus : materials[materials.length - 1]?.id || ""));
  const [secs, setSecs] = useState(90);
  const [err, setErr] = useState("");
  const [here, setHere] = useState([]);
  const [board, setBoard] = useState({});
  const [round, setRound] = useState(null); // { questions, secs }
  const [left, setLeft] = useState(0);
  const [count, setCount] = useState(LEADIN);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const chan = useRef(null);
  const mine = useRef(blank(myId, myName));
  const shown = useRef(0);
  const ended = useRef(false);

  useEffect(() => () => { chan.current && supabase?.removeChannel(chan.current); }, []);

  function open(room, asHost) {
    if (!supabase) { setErr("Duels need an online connection, which this copy does not have."); return; }
    setErr("");
    chan.current && supabase.removeChannel(chan.current);
    const ch = supabase.channel("duel:" + room, { config: { broadcast: { self: false }, presence: { key: myId } } });
    ch.on("presence", { event: "sync" }, () => setHere(Object.values(ch.presenceState()).flat().map((p) => ({ id: p.id, name: p.name, host: p.host }))))
      .on("broadcast", { event: "start" }, ({ payload }) => begin(payload))
      .on("broadcast", { event: "score" }, ({ payload }) => setBoard((b) => ({ ...b, [payload.id]: payload })))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await ch.track({ id: myId, name: myName, host: asHost });
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setErr("Could not reach the room. Check your connection and try again.");
      });
    chan.current = ch;
    setCode(room); setHost(asHost); setPhase("lobby");
  }

  function create() {
    const m = from && viewOf(fullMade, from);
    const questions = duelQuestions(m?.questions || fullMade?.questions || [], 20);
    if (questions.length < 3) { setErr("Pick a folder with at least three multiple choice questions."); return; }
    setRound({ questions, secs });
    open(newCode(), true);
  }
  function joinRoom() {
    const c = cleanCode(join);
    if (c.length !== 5) { setErr("A room code is five letters or numbers."); return; }
    open(c, false);
  }
  function start() {
    const payload = { questions: round.questions, secs: round.secs };
    chan.current.send({ type: "broadcast", event: "start", payload });
    begin(payload);
  }
  function begin(payload) {
    mine.current = blank(myId, myName);
    ended.current = false;
    setRound(payload); setI(0); setPicked(null); setBoard({}); setLeft(payload.secs); setCount(LEADIN); setPhase("count");
  }

  // countdown, then the clock
  useEffect(() => {
    if (phase !== "count") return;
    if (count <= 0) { shown.current = Date.now(); setPhase("play"); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]);
  useEffect(() => {
    if (phase !== "play") return;
    const t0 = Date.now();
    const tick = setInterval(() => {
      const l = Math.max(0, round.secs - Math.round((Date.now() - t0) / 1000));
      setLeft(l);
      if (l === 0) finish();
    }, 250);
    return () => clearInterval(tick);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function share(p) { chan.current?.send({ type: "broadcast", event: "score", payload: p }); setBoard((b) => ({ ...b, [p.id]: p })); }
  function finish() {
    if (ended.current) return;
    ended.current = true;
    share({ ...mine.current, done: true });
    setPhase("over");
  }
  function answer(n) {
    if (picked !== null || phase !== "play") return;
    const q = round.questions[i];
    const right = n === q.answer;
    setPicked(n);
    mine.current = tally(mine.current, right, Date.now() - shown.current);
    share(mine.current);
    setTimeout(() => {
      if (i + 1 >= round.questions.length) { finish(); return; }
      setI(i + 1); setPicked(null); shown.current = Date.now();
    }, right ? 450 : 1200);
  }
  function leave() {
    chan.current && supabase?.removeChannel(chan.current);
    chan.current = null; setPhase("menu"); setBoard({}); setHere([]); setCode("");
  }

  const players = rank(Object.values({ ...Object.fromEntries(here.map((p) => [p.id, blank(p.id, p.name)])), ...board, [myId]: board[myId] || mine.current }));
  const top = Math.max(150, ...players.map((p) => p.score));

  if (phase === "menu") {
    return (
      <div className="page fade dl">
        <PageHead title="Duel" sub="Race a friend on the same questions in the same time. Right and fast wins." />
        {err && <div className="dl-err">{err}</div>}
        <div className="dl-two">
          <div className="card card-pad dl-card">
            <h3>Start a room</h3>
            {materials.length === 0 ? <p className="small muted">Add some material first, so there is something to ask.</p> : (
              <>
                <label className="small muted">Questions from</label>
                <select value={from} onChange={(e) => setFrom(e.target.value)}>
                  {[...materials].reverse().map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
                <label className="small muted">Time</label>
                <div className="dl-lens">{LENGTHS.map((l) => <button key={l} className={secs === l ? "on" : ""} onClick={() => setSecs(l)}>{l >= 120 ? "2 min" : l === 90 ? "90 sec" : "1 min"}</button>)}</div>
                <button className="btn cta" onClick={create}>Make a room</button>
              </>
            )}
          </div>
          <div className="card card-pad dl-card">
            <h3>Join a friend</h3>
            <label className="small muted">Their room code</label>
            <input className="dl-code-in" value={join} maxLength={5} placeholder="ABC12" onChange={(e) => setJoin(cleanCode(e.target.value))} onKeyDown={(e) => e.key === "Enter" && joinRoom()} />
            <button className="btn cta" onClick={joinRoom}>Join</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="page fade dl">
        <PageHead title="Waiting room" sub={host ? "Send your friend this code, then start when they appear." : "Waiting for the host to start."} />
        <div className="card card-pad dl-lobby">
          <div className="small muted">Room code</div>
          <div className="dl-code">{code}</div>
          <button className="btn quiet small" onClick={() => navigator.clipboard?.writeText(code)}>Copy code</button>
          <div className="dl-who">{here.map((p) => <span key={p.id} className="pill">{p.name}{p.host ? " (host)" : ""}</span>)}</div>
          {host && round && <div className="small muted">{round.questions.length} questions · {round.secs} seconds</div>}
          <div className="dl-row">
            {host && <button className="btn cta" disabled={here.length < 1} onClick={start}>{here.length < 2 ? "Start on my own" : "Start"}</button>}
            <button className="btn ghost" onClick={leave}>Leave</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "count") {
    return <div className="page fade dl"><div className="dl-count"><div className="small muted">Get ready</div><div className="dl-big">{count > 0 ? count : "Go"}</div></div></div>;
  }

  const Board = () => (
    <div className="dl-board">
      {players.map((p) => (
        <div key={p.id} className={"dl-lane" + (p.id === myId ? " me" : "")}>
          <span className="dl-name">{p.id === myId ? "You" : p.name}</span>
          <span className="dl-track"><i style={{ width: `${Math.min(100, (p.score / top) * 100)}%` }} /></span>
          <b>{p.score}</b>
        </div>
      ))}
    </div>
  );

  if (phase === "play") {
    const q = round.questions[i];
    return (
      <div className="page fade dl">
        <div className="dl-top"><span className={"dl-clock" + (left <= 10 ? " low" : "")}><Icon name="timer" size={16} /> {left}s</span><span className="small muted">Question {i + 1} of {round.questions.length}</span></div>
        <Board />
        <div className="card card-pad dl-q">
          <h2><M t={q.q} /></h2>
          <div className="dl-choices">
            {q.choices.map((c, n) => (
              <button key={n} disabled={picked !== null}
                className={"dl-choice" + (picked !== null && n === q.answer ? " right" : "") + (picked === n && n !== q.answer ? " wrong" : "")}
                onClick={() => answer(n)}>
                <span className="dl-key">{"ABCD"[n]}</span><M t={c} />
              </button>
            ))}
          </div>
          {picked !== null && picked !== q.answer && q.why && <p className="small muted dl-why"><M t={q.why} /></p>}
        </div>
      </div>
    );
  }

  const winner = players[0];
  const waiting = players.some((p) => !p.done && p.id !== myId) && players.length > 1;
  return (
    <div className="page fade dl">
      <PageHead title={players.length > 1 ? (winner.id === myId ? "You won" : `${winner.name} won`) : "Time"} sub={waiting ? "Waiting for the others to finish..." : "Final scores"} />
      <div className="card card-pad">
        {players.map((p, n) => (
          <div key={p.id} className={"dl-res" + (p.id === myId ? " me" : "")}>
            <span className="dl-pos">{n + 1}</span>
            <span className="dl-name">{p.id === myId ? "You" : p.name}</span>
            <span className="small muted">{p.right} of {p.answered} right{p.answered ? ` · ${(p.ms / p.answered / 1000).toFixed(1)}s each` : ""}</span>
            <b>{p.score}</b>
          </div>
        ))}
      </div>
      <div className="dl-row">
        {host && <button className="btn cta" onClick={() => { const r = { questions: duelQuestions(viewOf(fullMade, from)?.questions || [], 20), secs: round.secs }; setRound(r); chan.current.send({ type: "broadcast", event: "start", payload: r }); begin(r); }}>Rematch</button>}
        <button className="btn ghost" onClick={leave}>Done</button>
        <button className="btn ghost" onClick={() => go("library")}>Back to library</button>
      </div>
    </div>
  );
}
