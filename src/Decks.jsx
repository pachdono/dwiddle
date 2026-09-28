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
// "theme" follows the theme's own accent colour; the rest are fixed.
const COLORS = ["theme", "#D1497A", "#16a34a", "#9333ea", "#f97316", "#0891b2", "#e5484d", "#7c4a2d"];
// Decks made before "theme" existed started blue; they follow the theme too.
const colorOf = (c) => (!c || c === "theme" || c === "#3B5BFD" ? "var(--accent)" : c);

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
        onKnown={(known) => setDecks((all) => all.map((x) => (x.id === deck.id ? { ...x, known, studied: Date.now() } : x)))}
        onSrs={(srs) => setDecks((all) => all.map((x) => (x.id === deck.id ? { ...x, srs, studied: Date.now() } : x)))} />;
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
          const known = knownCards(d).length, due = dueCards(d).length;
          return (
            <div key={d.id} className="dk-deck" style={{ "--dk": colorOf(d.color) }}>
              <div className="dk-stack" aria-hidden="true"><i /><i /><i><span>{d.cards[0]?.front || "Empty"}</span></i></div>
              <b className="dk-name">{d.name}</b>
              <span className="small muted">{d.cards.length} card{d.cards.length === 1 ? "" : "s"} · {known} known{due ? "" : nextDue(d) ? ` · ${nextDue(d)}` : ""}</span>
              {due > 0 && <span className="dk-due">{due} due for review</span>}
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
  const [color, setColor] = useState(deck?.color || (count ? COLORS[count % COLORS.length] : "theme"));
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
        {COLORS.map((c) => <button key={c} className={"dk-color" + (colorOf(color) === colorOf(c) ? " on" : "") + (c === "theme" ? " theme" : "")} style={{ background: colorOf(c) }} onClick={() => setColor(c)} aria-label={c === "theme" ? "Theme colour" : "Deck colour"} title={c === "theme" ? "Follows your theme" : undefined} />)}
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
              <div key={c.id} className="dk-card" style={{ "--dk": colorOf(color) }}><b>{c.front}</b><span>{c.back}</span></div>
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

function DeckStudy({ deck, mode, setMode, onBack, onKnown, onSrs }) {
  const [reverse, setReverse] = useState(false);
  return (
    <div className="page fade dk" style={{ "--dk": colorOf(deck.color) }}>
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
      {mode === "learn" ? <DeckLearn key={"l" + reverse} deck={deck} reverse={reverse} onSrs={onSrs} />
        : mode === "quiz" ? <DeckQuiz key={"q" + reverse} deck={deck} reverse={reverse} />
        : <DeckCards key={"c" + reverse} deck={deck} reverse={reverse} onKnown={onKnown} onSrs={onSrs} />}
    </div>
  );
}

function DeckCards({ deck, reverse, onKnown, onSrs }) {
  const srsRef = useRef(deck.srs || {});
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
    // Flashcards feed spaced repetition too: known goes up a box, not yet comes back tomorrow.
    srsRef.current = schedule(srsRef.current, card.id, !knew);
    onSrs(srsRef.current);
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

/* ---------- spaced repetition ---------- */

// Each card has a box: the better it is known, the higher the box and the
// longer until it is asked again, as Quizlet's spaced repetition does it.
// Right: up a box. Missed along the way: back to box 1, due tomorrow.
const DAY = 86400000;
const STEPS = [0, 1, 3, 7, 14, 30, 60, 120]; // days until the next review, by box
export function schedule(srs, id, missed, { cram = false } = {}) {
  const s = srs?.[id] || { box: 0, due: 0 };
  const box = missed ? 1 : cram ? Math.max(1, s.box) : Math.min(STEPS.length - 1, s.box + 1);
  return { ...srs, [id]: { box, due: Date.now() + STEPS[box] * DAY, seen: Date.now() } };
}
export const dueCards = (deck, now = Date.now()) => deck.cards.filter((c) => deck.srs?.[c.id] && deck.srs[c.id].due <= now);
export const newCards = (deck) => deck.cards.filter((c) => !deck.srs?.[c.id]);
export const knownCards = (deck) => deck.cards.filter((c) => (deck.srs?.[c.id]?.box || 0) >= 2 || (!deck.srs?.[c.id] && (deck.known || []).includes(c.id)));
function nextDue(deck) {
  const t = Math.min(...deck.cards.map((c) => deck.srs?.[c.id]?.due ?? Infinity));
  if (!isFinite(t)) return "";
  const d = Math.ceil((t - Date.now()) / DAY);
  return d <= 0 ? "due now" : d === 1 ? "next review tomorrow" : `next review in ${d} days`;
}

/* ---------- Learn, as Quizlet does it ---------- */

// Three ways in:
//   Review: the cards spaced repetition says are due today.
//   Learn it all: every card twice before it counts, first picking the answer
//     from four, then typing it, so it is recalled and not just recognised.
//   Cram for a test: quick rounds of four choices, the ones missed most
//     first, until each has been right once.
// Rounds of seven. Each question's kind is fixed when it is asked, and a
// missed card goes to the back of the round to come round again.
const ROUND = 7;
const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
function near(a, b) {
  a = norm(a); b = norm(b);
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function DeckLearn({ deck, reverse, onSrs }) {
  const due = dueCards(deck);
  const [goal, setGoal] = useState(null); // "review" | "all" | "cram"
  const [pool, setPool] = useState([]); // the cards this session covers
  const [state, setState] = useState({}); // id -> "learning" | "done"
  const [misses, setMisses] = useState({});
  const [queue, setQueue] = useState([]); // [{ c, w }] w: type it rather than pick it
  const [roundIds, setRoundIds] = useState([]);
  const [answer, setAnswer] = useState(null);
  const [between, setBetween] = useState(false);
  const [typed, setTyped] = useState("");
  const input = useRef(null);
  const srsRef = useRef(deck.srs || {});

  function begin(g) {
    const p = g === "review" ? due : g === "all" ? [...due, ...deck.cards.filter((c) => !due.includes(c))] : deck.cards;
    setGoal(g); setPool(p); setState({}); setMisses({});
    startRound(g, p, {}, {});
  }
  function startRound(g, p, st, ms) {
    let left = p.filter((c) => st[c.id] !== "done");
    if (g === "cram") left = shuffle(left).sort((a, b) => (ms[b.id] || 0) - (ms[a.id] || 0));
    const pick = left.slice(0, ROUND);
    const w = (c) => g === "review" && (deck.srs?.[c.id]?.box || 0) >= 2;
    setQueue(shuffle(pick).map((c) => ({ c, w: w(c) })));
    setRoundIds(pick.map((c) => c.id));
    setAnswer(null); setTyped(""); setBetween(false);
  }

  const item = queue[0];
  const card = item?.c;
  const writing = !!item?.w;
  const prompt = card && (writing ? (reverse ? card.front : card.back) : reverse ? card.back : card.front);
  const want = card && (writing ? (reverse ? card.back : card.front) : reverse ? card.front : card.back);
  const options = useMemo(() => {
    if (!card || writing) return [];
    return shuffle([card, ...shuffle(deck.cards.filter((x) => x.id !== card.id)).slice(0, 3)]);
  }, [queue]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (writing && !answer) setTimeout(() => input.current?.focus(), 30); }, [queue, answer, writing]);

  function mark(ok, extra = {}) {
    setAnswer({ ok, ...extra });
    if (!ok) { setMisses((m) => ({ ...m, [card.id]: (m[card.id] || 0) + 1 })); setState((s) => ({ ...s, [card.id]: "learning" })); }
  }
  // After the answer: what comes next for this card, decided now.
  function next() {
    const ok = answer?.ok;
    let rest = queue.slice(1);
    let st = state;
    if (!ok) rest = [...rest, item]; // try again later this round
    else if (goal === "all" && !writing) { rest = [...rest, { c: card, w: true }]; st = { ...st, [card.id]: "learning" }; } // now type it
    else {
      st = { ...st, [card.id]: "done" };
      srsRef.current = schedule(srsRef.current, card.id, !!misses[card.id], { cram: goal === "cram" });
      onSrs(srsRef.current);
    }
    setState(st);
    setAnswer(null); setTyped("");
    setQueue(rest);
    if (!rest.length) setBetween(true);
  }
  useEffect(() => {
    if (!answer) return;
    const onKey = (e) => { if (e.key === "Enter") { e.preventDefault(); next(); } };
    const t = setTimeout(() => addEventListener("keydown", onKey), 60);
    return () => { clearTimeout(t); removeEventListener("keydown", onKey); };
  });
  useEffect(() => {
    if (answer || writing || !options.length) return;
    const onKey = (e) => { const n = Number(e.key); if (n >= 1 && n <= options.length && !e.target.closest?.("input")) mark(options[n - 1].id === card.id, { chose: options[n - 1].id }); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  if (!goal) {
    const fresh = newCards(deck).length, known = knownCards(deck).length;
    return (
      <div className="dk-learn-pick">
        <h2>How do you want to study?</h2>
        <p className="muted">{deck.cards.length} cards · {known} known · {fresh} new{due.length ? ` · ${due.length} due today` : ` · ${nextDue(deck) || "no reviews scheduled yet"}`}</p>
        <div className={"dk-goals" + (due.length ? " three" : "")}>
          {due.length > 0 && (
            <button className="dk-goal due" onClick={() => begin("review")}>
              <span className="dk-goal-art" aria-hidden="true">🔁</span>
              <b>Review {due.length} due</b>
              <span>Spaced repetition: the cards your memory is about to lose, asked just in time. Each right answer pushes the next review further away.</span>
            </button>
          )}
          <button className="dk-goal" onClick={() => begin("all")}>
            <span className="dk-goal-art" aria-hidden="true">🧠</span>
            <b>Learn it all</b>
            <span>Know every card for good. Each one is asked twice: pick the answer, then type it from memory.</span>
          </button>
          <button className="dk-goal" onClick={() => begin("cram")}>
            <span className="dk-goal-art" aria-hidden="true">⚡</span>
            <b>Cram for a test</b>
            <span>Short on time. Quick rounds of four choices, the ones you miss most first, until each is right once.</span>
          </button>
        </div>
      </div>
    );
  }

  const doneN = pool.filter((c) => state[c.id] === "done").length;
  const learningN = pool.filter((c) => state[c.id] === "learning").length;
  const freshN = pool.length - doneN - learningN;
  const bar = (
    <>
      <div className="dk-learn-bar" aria-label={`${doneN} of ${pool.length} done`}>
        <i className="known" style={{ flex: doneN }} /><i className="learning" style={{ flex: learningN }} /><i className="fresh" style={{ flex: freshN }} />
      </div>
      <div className="dk-legend small">
        <span><i className="known" />{goal === "review" ? "Reviewed" : "Known"} {doneN}</span><span><i className="learning" />Learning {learningN}</span><span><i className="fresh" />{goal === "review" ? "To review" : "Not studied"} {freshN}</span>
      </div>
    </>
  );

  if (doneN === pool.length && !answer) {
    const tricky = Object.entries(misses).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => deck.cards.find((c) => c.id === id)?.front).filter(Boolean);
    return (
      <div className="card card-pad dk-done">
        <Duck size={96} outfit="party" />
        <h3>{goal === "review" ? "Reviews done for today" : goal === "cram" ? "Ready for the test" : "You learned every card"}</h3>
        <p className="muted small">{pool.length} card{pool.length === 1 ? "" : "s"}{tricky.length ? `. The trickiest: ${tricky.join(", ")}, back tomorrow` : ", every one right first time"}. {(() => { const n = nextDue({ ...deck, srs: srsRef.current }); return n ? n[0].toUpperCase() + n.slice(1) + "." : ""; })()}</p>
        <div className="row"><button className="btn" onClick={() => setGoal(null)}>Done</button></div>
      </div>
    );
  }

  if (between) {
    const seen = roundIds.map((id) => deck.cards.find((c) => c.id === id)).filter(Boolean);
    return (
      <div className="dk-study">
        {bar}
        <div className="card card-pad dk-round">
          <h3>Round done. Keep going!</h3>
          <p className="muted small">{doneN} of {pool.length} done.</p>
          <ul>
            {seen.map((c) => <li key={c.id}><b>{c.front}</b><span>{c.back}</span><i className={state[c.id] === "done" ? "known" : "learning"}>{state[c.id] === "done" ? "Done" : "Learning"}</i></li>)}
          </ul>
          <button className="btn cta" onClick={() => startRound(goal, pool, state, misses)}>Next round <Icon name="arrow" /></button>
        </div>
      </div>
    );
  }

  if (!card) return null;
  return (
    <div className="dk-study">
      {bar}
      <div className={"card card-pad dk-q" + (answer ? (answer.ok ? " is-right" : " is-wrong") : "")} key={queue.length + ":" + card.id + ":" + writing}>
        <span className="flash-tag">{writing ? `Type the ${reverse ? "meaning" : "word"}` : reverse ? "Which word means" : "What does this mean?"}</span>
        <h2>{prompt}</h2>
        {writing ? (
          <form onSubmit={(e) => { e.preventDefault(); if (answer || !typed.trim()) return; const ok = near(typed, want); mark(ok, { typed, near: ok && norm(typed) !== norm(want) }); }}>
            <input ref={input} className="dk-type" value={typed} onChange={(e) => setTyped(e.target.value)} readOnly={!!answer} placeholder="Type your answer" autoComplete="off" autoCapitalize="off" spellCheck={false} />
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
            <b>{answer.ok ? (answer.near ? "Almost exactly. Counted as right." : ["Nice!", "Spot on!", "You've got it!", "Great memory!"][queue.length % 4]) : "Not quite, you're still learning this one."}</b>
            {answer.ok && !writing && goal === "all" && <span>Next time round, you'll type it.</span>}
            {!answer.ok && <span>The answer: <strong>{want}</strong>{answer.typed ? <> · you wrote <em>{answer.typed}</em></> : null}</span>}
            {answer.ok && answer.near && <span>Exactly: <strong>{want}</strong></span>}
            <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
              {!answer.ok && writing && answer.typed && <button className="btn ghost small" onClick={() => { setMisses((m) => { const n = { ...m }; if (n[card.id] > 1) n[card.id] -= 1; else delete n[card.id]; return n; }); setAnswer({ ok: true, typed: answer.typed }); }}>I was right</button>}
              <button className="btn" onClick={next}>Continue <Icon name="arrow" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
