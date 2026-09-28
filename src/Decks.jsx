// My decks: flashcards the student makes themselves.
//
// A deck is written the quickest way there is: one card a line, the word, a
// semicolon, then what it means. Press Enter and the next line is the next
// card; the cards appear beside the writing as it is typed. A photo of a word
// list, or saying the words out loud, fills the same box, and Dwiddle can
// write the meanings for a list of words on its own.
//
// Then study it: flip through the cards, or a quiz of four choices made from
// the deck's own meanings. Decks are kept on this device.

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, PageHead, Loading } from "./ui.jsx";
import { Duck } from "./Duck.jsx";
import { useDictation } from "./Chat.jsx";

const KEY = "dwiddle-decks";
const COLORS = ["#3B5BFD", "#D1497A", "#16a34a", "#9333ea", "#f97316", "#0891b2", "#e5484d", "#7c4a2d"];

const loadDecks = () => { try { const d = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(d) ? d : []; } catch { return []; } };
const saveDecks = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* storage full or private */ } };
const uid = () => Math.random().toString(36).slice(2, 10);
// The same word keeps the same card, so editing a deck keeps what is known.
const cardId = (front) => { let h = 5381; for (const ch of front.toLowerCase()) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return "c" + h.toString(36); };

// One card a line: "word ; meaning". A tab, " = " or " - " also split it,
// since that is how lists copied from elsewhere tend to come.
export function parseCards(text) {
  const cards = [], loose = [];
  const seen = new Set();
  String(text || "").split(/\n/).forEach((raw, line) => {
    const t = raw.trim();
    if (!t) return;
    const m = t.match(/^(.+?)\s*(?:;|\t| = | - | – | — )\s*(.+)$/);
    if (!m) { loose.push({ line, text: t }); return; }
    const front = m[1].trim(), back = m[2].trim();
    const id = cardId(front);
    if (seen.has(id)) return;
    seen.add(id);
    cards.push({ id, front, back, line });
  });
  return { cards, loose };
}
const textOf = (cards) => cards.map((c) => `${c.front} ; ${c.back}`).join("\n");

export default function Decks() {
  const [decks, setDecksRaw] = useState(loadDecks);
  const setDecks = (fn) => setDecksRaw((d) => { const next = typeof fn === "function" ? fn(d) : fn; saveDecks(next); return next; });
  const [editing, setEditing] = useState(null); // deck id, or "new"
  const [studying, setStudying] = useState(null); // { id, mode }

  if (editing) {
    const deck = editing === "new" ? null : decks.find((d) => d.id === editing);
    return (
      <DeckEditor deck={deck} count={decks.length} onCancel={() => setEditing(null)}
        onSave={(d) => { setDecks((all) => (all.some((x) => x.id === d.id) ? all.map((x) => (x.id === d.id ? d : x)) : [d, ...all])); setEditing(null); }}
        onDelete={deck ? () => { if (confirm(`Delete "${deck.name}" and its ${deck.cards.length} cards?`)) { setDecks((all) => all.filter((x) => x.id !== deck.id)); setEditing(null); } } : null} />
    );
  }
  if (studying) {
    const deck = decks.find((d) => d.id === studying.id);
    if (deck) {
      return <DeckStudy deck={deck} mode={studying.mode} setMode={(mode) => setStudying({ ...studying, mode })} onBack={() => setStudying(null)}
        onKnown={(known) => setDecks((all) => all.map((x) => (x.id === deck.id ? { ...x, known, studied: Date.now() } : x)))} />;
    }
  }

  return (
    <div className="page fade dk">
      <PageHead title="My decks" sub="Your own flashcards. Type them, snap a photo of a word list, or say them, then study them your way." />
      <div className="dk-grid">
        <button className="dk-new" onClick={() => setEditing("new")}>
          <span className="dk-new-plus"><Icon name="plus" size={22} /></span>
          <b>New deck</b>
          <span className="small muted">word ; meaning, one a line</span>
        </button>
        {decks.map((d) => {
          const known = (d.known || []).filter((id) => d.cards.some((c) => c.id === id)).length;
          return (
            <div key={d.id} className="dk-deck" style={{ "--dk": d.color }}>
              <div className="dk-stack" aria-hidden="true"><i /><i /><i><span>{d.cards[0]?.front || "Empty"}</span></i></div>
              <b className="dk-name">{d.name}</b>
              <span className="small muted">{d.cards.length} card{d.cards.length === 1 ? "" : "s"} · {known} known</span>
              <div className="dk-bar"><i style={{ width: `${d.cards.length ? (known / d.cards.length) * 100 : 0}%` }} /></div>
              <div className="dk-actions">
                <button className="btn small" disabled={d.cards.length < 2} onClick={() => setStudying({ id: d.id, mode: "learn" })}>Learn</button>
                <button className="btn ghost small" disabled={!d.cards.length} onClick={() => setStudying({ id: d.id, mode: "cards" })}>Flashcards</button>
                <button className="btn ghost small" disabled={d.cards.length < 4} title={d.cards.length < 4 ? "A quiz needs at least four cards" : ""} onClick={() => setStudying({ id: d.id, mode: "quiz" })}>Quiz</button>
                <button className="icon-btn" onClick={() => setEditing(d.id)} aria-label="Edit deck" title="Edit"><Icon name="pen" size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>
      {!decks.length && (
        <div className="dk-empty">
          <Duck size={84} outfit="graduate" />
          <p className="muted small">No decks yet. Make one for vocabulary, a language, key terms, anything you need to know by heart.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- making a deck ---------- */

function DeckEditor({ deck, count, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(deck?.name || "");
  const [text, setText] = useState(deck ? textOf(deck.cards) : "");
  const [color, setColor] = useState(deck?.color || COLORS[count % COLORS.length]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const area = useRef(null);
  const photo = useRef(null);
  const { cards, loose } = useMemo(() => parseCards(text), [text]);

  // Saying cards: "photosynthesis means how plants make food, next card, ..."
  // "means" or "semicolon" splits a card; "next" or "new card" starts another.
  const said = useRef("");
  const dictation = useDictation((t) => {
    const spoken = t.replace(/\s*\b(semicolon|means|meaning)\b\s*/gi, " ; ").replace(/\s*\b(next card|new card|next)\b[.,]?\s*/gi, "\n").replace(/ ;\s*;/g, " ;");
    setText(said.current + spoken);
  });
  function listen() {
    if (dictation.on) { dictation.stop(); return; }
    said.current = text && !text.endsWith("\n") ? text + "\n" : text;
    dictation.start({ continuous: true, reason: "To turn the words you say into flashcards." });
  }

  // A photo of a word list: read, then put in "word ; meaning" lines. A list
  // that is only words is given its meanings.
  async function fromPhoto(file) {
    setErr(""); setBusy("Reading the photo");
    try {
      const [{ readFile }, { chatWithDwiddle }] = await Promise.all([import("./readfile.js"), import("./ai.js")]);
      const read = (await readFile(file)).trim();
      if (!read) throw new Error("No words could be read in that photo.");
      let lines = read;
      if (parseCards(read).cards.length < read.split("\n").filter((l) => l.trim()).length * 0.6) {
        setBusy("Making cards from it");
        lines = await chatWithDwiddle(`A word list the student photographed:\n${read.slice(0, 6000)}`, [{ role: "user", content: CARD_ASK }]);
      }
      setText((t) => (t.trim() ? t.replace(/\n*$/, "\n") : "") + cleanLines(lines));
    } catch (e) { setErr(e.message || "That photo could not be read."); }
    setBusy("");
  }

  // Lines with a word but no meaning yet: Dwiddle writes the meanings.
  async function fillMeanings() {
    setErr(""); setBusy("Writing the meanings");
    try {
      const { chatWithDwiddle } = await import("./ai.js");
      const words = loose.map((l) => l.text).join("\n");
      const out = await chatWithDwiddle(`Words the student wants flashcards for${name ? ` (deck: ${name})` : ""}:\n${words.slice(0, 6000)}`, [{ role: "user", content: CARD_ASK }]);
      const made = parseCards(cleanLines(out)).cards;
      if (!made.length) throw new Error("No meanings came back. Try again.");
      const byWord = new Map(made.map((c) => [c.front.toLowerCase(), c]));
      setText(text.split("\n").map((raw) => { const c = byWord.get(raw.trim().toLowerCase()); return c ? `${c.front} ; ${c.back}` : raw; }).join("\n"));
    } catch (e) { setErr(e.message || "The meanings could not be written."); }
    setBusy("");
  }

  function save() {
    if (!cards.length) { setErr("Add at least one card: a word, a semicolon, then what it means."); return; }
    const prev = new Set(deck?.known || []);
    onSave({ id: deck?.id || uid(), name: name.trim() || "Untitled deck", color, created: deck?.created || Date.now(), updated: Date.now(),
      cards: cards.map(({ id, front, back }) => ({ id, front, back })), known: [...prev].filter((id) => cards.some((c) => c.id === id)) });
  }

  return (
    <div className="page fade dk">
      <div className="dk-edit-top">
        <button className="btn ghost small" onClick={onCancel}><Icon name="back" size={14} /> My decks</button>
        <div className="row">
          {onDelete && <button className="btn ghost small danger" onClick={onDelete}><Icon name="trash" size={14} /> Delete</button>}
          <button className="btn cta" onClick={save}>Save deck</button>
        </div>
      </div>
      <input className="dk-title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Deck name, like Spanish food or Biology key words" autoFocus={!deck} />
      <div className="dk-colors">
        {COLORS.map((c) => <button key={c} className={"dk-color" + (color === c ? " on" : "")} style={{ background: c }} onClick={() => setColor(c)} aria-label="Deck colour" />)}
      </div>

      <div className="dk-tools">
        <button className="btn ghost small" onClick={() => photo.current?.click()} disabled={!!busy}><Icon name="image" size={14} /> Photo of a list</button>
        <input ref={photo} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) fromPhoto(f); }} />
        <button className={"btn ghost small" + (dictation.on ? " rec-on" : "")} onClick={listen} disabled={!!busy && !dictation.on}>
          <Icon name="mic" size={14} /> {dictation.on ? "Stop listening" : "Say them"}
        </button>
        {loose.length > 0 && <button className="btn ghost small" onClick={fillMeanings} disabled={!!busy}><Icon name="spark" size={14} /> Write the meanings for {loose.length} word{loose.length === 1 ? "" : "s"}</button>}
        {busy && <Loading label={busy} />}
      </div>
      {dictation.on && <p className="small dk-hint">Say a word, then "means" and what it means. Say "next" for the next card.</p>}
      {(err || dictation.error) && <p className="small dk-err">{err || dictation.error}</p>}

      <div className="dk-edit">
        <div className="dk-write">
          <div className="dk-write-head"><b className="small">Write</b><span className="small muted">word <kbd>;</kbd> meaning, then <kbd>Enter</kbd> for the next card</span></div>
          <textarea ref={area} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
            placeholder={"photosynthesis ; how plants make food from light\nmitochondria ; where respiration happens\nhola ; hello"} />
        </div>
        <div className="dk-preview" aria-live="polite">
          <div className="dk-write-head"><b className="small">{cards.length} card{cards.length === 1 ? "" : "s"}</b>{loose.length > 0 && <span className="small dk-warn">{loose.length} without a meaning yet</span>}</div>
          <div className="dk-cards">
            {cards.map((c) => (
              <div key={c.id} className="dk-card" style={{ "--dk": color }}><b>{c.front}</b><span>{c.back}</span></div>
            ))}
            {loose.map((l) => <div key={"l" + l.line} className="dk-card loose"><b>{l.text}</b><span>needs ; and a meaning</span></div>)}
            {!cards.length && !loose.length && <p className="small muted" style={{ margin: 8 }}>Cards appear here as you type.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const CARD_ASK = `Turn this into flashcards. Reply with one card a line and nothing else: the word or term, then " ; ", then a short clear meaning or translation (under 15 words). Keep the student's words exactly as written and in their order. If a line already has its meaning, keep that meaning. No numbering, no bullet points, no headings.`;
const cleanLines = (t) => String(t || "").split("\n").map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/\*\*/g, "").trim()).filter(Boolean).join("\n");

/* ---------- studying a deck ---------- */

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

function DeckStudy({ deck, mode, setMode, onBack, onKnown }) {
  const [reverse, setReverse] = useState(false);
  return (
    <div className="page fade dk" style={{ "--dk": deck.color }}>
      <div className="dk-edit-top">
        <button className="btn ghost small" onClick={onBack}><Icon name="back" size={14} /> My decks</button>
        <b className="dk-study-name">{deck.name}</b>
        <div className="row">
          <div className="seg tight">
            <button className={mode === "learn" ? "on" : ""} onClick={() => setMode("learn")} disabled={deck.cards.length < 2}>Learn</button>
            <button className={mode === "cards" ? "on" : ""} onClick={() => setMode("cards")}>Flashcards</button>
            <button className={mode === "quiz" ? "on" : ""} onClick={() => setMode("quiz")} disabled={deck.cards.length < 4}>Quiz</button>
          </div>
          <button className={"btn ghost small" + (reverse ? " on" : "")} onClick={() => setReverse((r) => !r)} title="Show the meaning first">⇄ {reverse ? "Meaning first" : "Word first"}</button>
        </div>
      </div>
      {mode === "learn" ? <DeckLearn key={"l" + reverse} deck={deck} reverse={reverse} onKnown={onKnown} />
        : mode === "quiz" ? <DeckQuiz key={"q" + reverse} deck={deck} reverse={reverse} />
        : <DeckCards key={"c" + reverse} deck={deck} reverse={reverse} onKnown={onKnown} />}
    </div>
  );
}

function DeckCards({ deck, reverse, onKnown }) {
  const [known, setKnown] = useState(() => new Set(deck.known || []));
  const [queue, setQueue] = useState(() => shuffle(deck.cards.filter((c) => !(deck.known || []).includes(c.id))));
  const [flipped, setFlipped] = useState(false);
  const [gone, setGone] = useState(""); // "know" | "again", the way the last card went
  const card = queue[0];

  function next(knew) {
    setGone(knew ? "know" : "again");
    setFlipped(false);
    setTimeout(() => {
      setGone("");
      setQueue((q) => (knew ? q.slice(1) : [...q.slice(1), q[0]]));
    }, 220);
    if (knew) { const k = new Set(known); k.add(card.id); setKnown(k); onKnown([...k]); }
  }
  useEffect(() => {
    if (!card) return;
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea")) return;
      if (e.code === "Space") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "1" || e.key === "ArrowLeft") next(false);
      if (e.key === "2" || e.key === "ArrowRight") next(true);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  if (!card) {
    return (
      <div className="card card-pad dk-done">
        <Duck size={92} outfit="party" />
        <h3>You know every card</h3>
        <p className="muted small">All {deck.cards.length} cards in this deck.</p>
        <button className="btn" onClick={() => { setKnown(new Set()); onKnown([]); setQueue(shuffle(deck.cards)); }}>Go through them again</button>
      </div>
    );
  }
  const front = reverse ? card.back : card.front, back = reverse ? card.front : card.back;
  return (
    <div className="dk-study">
      <div className="dk-progress"><span className="small muted">{queue.length} to go</span><div className="dk-bar"><i style={{ width: `${(known.size / deck.cards.length) * 100}%` }} /></div><span className="small muted">{known.size} known</span></div>
      <div className={"flip-scene dk-flip" + (gone ? " gone-" + gone : "")} onClick={() => setFlipped((f) => !f)}>
        <div className={"flip-card" + (flipped ? " flipped" : "")}>
          <div className="flip-face front"><span className="flash-tag">{reverse ? "Meaning" : "Word"}</span><p className="flash-body">{front}</p><span className="flash-foot"><span className="kbd-hint"><kbd>Space</kbd> to flip</span></span></div>
          <div className="flip-face back"><span className="flash-tag">{reverse ? "Word" : "Meaning"}</span><p className="flash-body answer">{back}</p></div>
        </div>
      </div>
      <div className="dk-grade">
        <button className="btn ghost" onClick={() => next(false)}><kbd>1</kbd> Still learning</button>
        <button className="btn cta" onClick={() => next(true)}><kbd>2</kbd> I know it</button>
      </div>
    </div>
  );
}

function DeckQuiz({ deck, reverse }) {
  const make = () => shuffle(deck.cards).slice(0, Math.min(15, deck.cards.length)).map((c) => {
    const others = shuffle(deck.cards.filter((x) => x.id !== c.id)).slice(0, 3);
    return { c, options: shuffle([c, ...others]) };
  });
  const [qs, setQs] = useState(make);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const q = qs[i];
  if (!q) {
    return (
      <div className="card card-pad dk-done">
        <Duck size={92} outfit={score / qs.length >= 0.7 ? "party" : "graduate"} />
        <h3>{score} of {qs.length}</h3>
        <p className="muted small">{score === qs.length ? "Every one right." : "Run it again: the ones you missed come round differently."}</p>
        <button className="btn" onClick={() => { setQs(make()); setI(0); setScore(0); setPicked(null); }}>Another quiz</button>
      </div>
    );
  }
  const ask = reverse ? q.c.back : q.c.front;
  const show = (o) => (reverse ? o.front : o.back);
  return (
    <div className="dk-study">
      <div className="dk-progress"><span className="small muted">Question {i + 1} of {qs.length}</span><div className="dk-bar"><i style={{ width: `${(i / qs.length) * 100}%` }} /></div><span className="small muted">{score} right</span></div>
      <div className="card card-pad dk-q">
        <span className="flash-tag">{reverse ? "Which word means" : "What does this mean?"}</span>
        <h2>{ask}</h2>
        {q.options.map((o, n) => {
          const right = o.id === q.c.id;
          const cls = picked === null ? "" : right ? " right" : picked === o.id ? " wrong" : "";
          return (
            <button key={o.id} className={"choice" + cls} disabled={picked !== null}
              onClick={() => { setPicked(o.id); if (right) setScore((s) => s + 1); }}>
              <span className="key">{"ABCD"[n]}</span>{show(o)}
            </button>
          );
        })}
        {picked !== null && (
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
            <button className="btn" onClick={() => { setI(i + 1); setPicked(null); }}>{i + 1 >= qs.length ? "See how you did" : "Next"} <Icon name="arrow" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Learn, as Quizlet does it ---------- */

// Two ways to learn a deck:
//   Learn it all: every card is asked twice before it counts as known, first
//   picking the answer from four, then typing it, so it is recalled and not
//   just recognised.
//   Cram for a test: quick rounds of four choices, the cards you miss most
//   first, until each has been right once.
// Rounds of seven, with how far along you are between rounds. A card missed
// stays in play and comes back.
const ROUND = 7;
const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
function near(a, b) {
  a = norm(a); b = norm(b);
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  // one letter wrong, missing or extra: a slip, not a wrong answer
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function DeckLearn({ deck, reverse, onKnown }) {
  const [goal, setGoal] = useState(null); // "all" | "cram"
  const [level, setLevel] = useState(() => Object.fromEntries(deck.cards.map((c) => [c.id, 0]))); // 0 new, 1 halfway, 2 known
  const [misses, setMisses] = useState({});
  const [round, setRound] = useState([]);
  const [at, setAt] = useState(0);
  const [answer, setAnswer] = useState(null); // { ok, chose, typed, near }
  const [between, setBetween] = useState(false);
  const [typed, setTyped] = useState("");
  const input = useRef(null);
  const need = goal === "cram" ? 1 : 2;
  const done = (id) => (level[id] || 0) >= need;
  const left = deck.cards.filter((c) => !done(c.id));

  function newRound(lv = level, ms = misses) {
    let pool = deck.cards.filter((c) => (lv[c.id] || 0) < need);
    pool = goal === "cram" ? shuffle(pool).sort((a, b) => (ms[b.id] || 0) - (ms[a.id] || 0)) : pool;
    setRound(shuffle(pool.slice(0, ROUND)));
    setAt(0); setAnswer(null); setTyped(""); setBetween(false);
  }
  useEffect(() => { if (goal) newRound(); }, [goal]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = round[at];
  const writing = card && goal === "all" && (level[card.id] || 0) === 1;
  const prompt = card && (writing ? (reverse ? card.front : card.back) : reverse ? card.back : card.front);
  const want = card && (writing ? (reverse ? card.back : card.front) : reverse ? card.front : card.back);
  const options = useMemo(() => {
    if (!card || writing) return [];
    const others = shuffle(deck.cards.filter((x) => x.id !== card.id)).slice(0, 3);
    return shuffle([card, ...others]);
  }, [card?.id, writing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (writing && !answer) input.current?.focus(); }, [writing, answer, at]);

  function mark(ok, extra = {}) {
    setAnswer({ ok, ...extra });
    if (ok) {
      const lv = { ...level, [card.id]: (level[card.id] || 0) + 1 };
      setLevel(lv);
      if (lv[card.id] >= need) onKnown([...new Set([...(deck.known || []), ...deck.cards.filter((c) => lv[c.id] >= need).map((c) => c.id)])]);
    } else {
      setMisses((m) => ({ ...m, [card.id]: (m[card.id] || 0) + 1 }));
    }
  }
  function next() {
    // A missed card goes to the back of this round to be tried again.
    if (answer && !answer.ok) setRound((r) => [...r, r[at]]);
    setAnswer(null); setTyped("");
    if (at + 1 < round.length + (answer && !answer.ok ? 1 : 0)) { setAt(at + 1); return; }
    setBetween(true);
  }
  useEffect(() => {
    if (!answer) return;
    const onKey = (e) => { if (e.key === "Enter" && !e.target.closest?.("textarea")) { e.preventDefault(); next(); } };
    const t = setTimeout(() => addEventListener("keydown", onKey), 50);
    return () => { clearTimeout(t); removeEventListener("keydown", onKey); };
  });

  if (!goal) {
    return (
      <div className="dk-learn-pick">
        <h2>How do you want to study?</h2>
        <p className="muted">{deck.cards.length} cards in {deck.name}</p>
        <div className="dk-goals">
          <button className="dk-goal" onClick={() => setGoal("all")}>
            <span className="dk-goal-art" aria-hidden="true">🧠</span>
            <b>Learn it all</b>
            <span>Know every card for good. Each one is asked twice: pick the answer, then type it from memory.</span>
          </button>
          <button className="dk-goal" onClick={() => setGoal("cram")}>
            <span className="dk-goal-art" aria-hidden="true">⚡</span>
            <b>Cram for a test</b>
            <span>Short on time. Quick rounds of four choices, the ones you miss most first, until each is right once.</span>
          </button>
        </div>
      </div>
    );
  }

  const counts = { fresh: 0, learning: 0, known: 0 };
  for (const c of deck.cards) { const l = level[c.id] || 0; if (l >= need) counts.known++; else if (l > 0 || misses[c.id]) counts.learning++; else counts.fresh++; }
  const bar = (
    <div className="dk-learn-bar" aria-label={`${counts.known} of ${deck.cards.length} known`}>
      <i className="known" style={{ flex: counts.known }} /><i className="learning" style={{ flex: counts.learning }} /><i className="fresh" style={{ flex: counts.fresh }} />
    </div>
  );
  const legend = (
    <div className="dk-legend small">
      <span><i className="known" />Known {counts.known}</span><span><i className="learning" />Learning {counts.learning}</span><span><i className="fresh" />Not studied {counts.fresh}</span>
    </div>
  );

  if (!left.length && !answer) {
    return (
      <div className="card card-pad dk-done">
        <Duck size={96} outfit="party" />
        <h3>{goal === "cram" ? "Ready for the test" : "You learned every card"}</h3>
        <p className="muted small">All {deck.cards.length} cards{Object.keys(misses).length ? `. The trickiest: ${Object.entries(misses).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => deck.cards.find((c) => c.id === id)?.front).filter(Boolean).join(", ")}` : ", first time"}.</p>
        <div className="row"><button className="btn" onClick={() => { setLevel(Object.fromEntries(deck.cards.map((c) => [c.id, 0]))); setMisses({}); setGoal(null); }}>Study again</button></div>
      </div>
    );
  }

  if (between || !card) {
    const seen = [...new Map(round.map((c) => [c.id, c])).values()];
    return (
      <div className="dk-study">
        {bar}{legend}
        <div className="card card-pad dk-round">
          <h3>Round done. Keep going!</h3>
          <p className="muted small">{counts.known} of {deck.cards.length} known. {left.length} to go.</p>
          <ul>
            {seen.map((c) => <li key={c.id}><b>{c.front}</b><span>{c.back}</span><i className={(level[c.id] || 0) >= need ? "known" : "learning"}>{(level[c.id] || 0) >= need ? "Known" : "Learning"}</i></li>)}
          </ul>
          <button className="btn cta" onClick={() => newRound()}>Next round <Icon name="arrow" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="dk-study">
      {bar}{legend}
      <div className={"card card-pad dk-q" + (answer ? (answer.ok ? " is-right" : " is-wrong") : "")}>
        <span className="flash-tag">{writing ? `Type the ${reverse ? "meaning" : "word"}` : reverse ? "Which word means" : "What does this mean?"}</span>
        <h2>{prompt}</h2>
        {writing ? (
          <form onSubmit={(e) => { e.preventDefault(); if (answer || !typed.trim()) return; const ok = near(typed, want); mark(ok, { typed, near: ok && norm(typed) !== norm(want) }); }}>
            <input ref={input} className="dk-type" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!answer} placeholder="Type your answer" autoComplete="off" autoCapitalize="off" spellCheck={false} />
            {!answer && (
              <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
                <button type="button" className="btn ghost small" onClick={() => mark(false, { typed: "" })}>I don't know</button>
                <button className="btn" disabled={!typed.trim()}>Check</button>
              </div>
            )}
          </form>
        ) : (
          options.map((o, n) => {
            const right = o.id === card.id;
            const cls = !answer ? "" : right ? " right" : answer.chose === o.id ? " wrong" : "";
            return (
              <button key={o.id} className={"choice" + cls} disabled={!!answer} onClick={() => mark(right, { chose: o.id })}>
                <span className="key">{n + 1}</span>{reverse ? o.front : o.back}
              </button>
            );
          })
        )}
        {answer && (
          <div className={"dk-feedback " + (answer.ok ? "ok" : "no")}>
            <b>{answer.ok ? (answer.near ? "Almost exactly. Counted as right." : ["Nice!", "Spot on!", "You've got it!", "Great memory!"][at % 4]) : "Not quite, you're still learning this one."}</b>
            {!answer.ok && <span>The answer: <strong>{want}</strong>{answer.typed ? <> · you wrote <em>{answer.typed}</em></> : null}</span>}
            {answer.ok && answer.near && <span>Exactly: <strong>{want}</strong></span>}
            <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
              {!answer.ok && writing && answer.typed && <button className="btn ghost small" onClick={() => { setMisses((m) => ({ ...m, [card.id]: Math.max(0, (m[card.id] || 1) - 1) })); setAnswer(null); mark(true, { typed: answer.typed }); }}>I was right</button>}
              <button className="btn" onClick={next}>Continue <Icon name="arrow" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
