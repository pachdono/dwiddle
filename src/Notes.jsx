// Complete notes, topic by topic.
//
// The study sheet this replaces condensed a whole chapter onto one page, so
// most of what went in never came out: a twenty page PDF became a dozen
// lines. These are the opposite. Every definition, figure, list and example in
// the source is kept, reorganised under the topics it belongs to, with the
// parts to learn word for word, the facts to memorise and the places marks are
// lost picked out in colour.

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FONTS, readyFont } from "./nbFonts.js";
import { LikeImFour } from "./LikeImFour.jsx";
import { Icon, PageHead, Loading, Marked, HighlightFilters, BusyScreen, Portal } from "./ui.jsx";
import { writeNotes } from "./ai.js";
import { sourcesFor } from "./lessons.js";
import { usePageContext } from "./Chat.jsx";
import { MindMap } from "./MindMap.jsx";
import { flatMarks, parseMarks, blockPlain, blockTexts } from "./marks.js";
import { Podcast } from "./Podcast.jsx";

const flatText = flatMarks;
function notesContext(made) {
  const out = [`The student is reading their notes on "${made?.title || "their material"}".`];
  for (const t of made?.topics || []) {
    const blocks = made?.notes?.[t.name] || [];
    out.push(`\n## ${t.name}`);
    blocks.forEach((b) => { const text = blockPlain(b); if (text) out.push(text); });
  }
  return out.join("\n").slice(0, 8500);
}

// "{def|the wording}" becomes a marked segment; everything else is plain text.
const parse = parseMarks;

// The hard words of a topic and what they mean: the ones the notes mark, and
// the terms they define. Notes written before words were marked still get
// their defined terms linked this way.
function glossaryOf(blocks) {
  const words = new Map();
  for (const b of blocks || []) {
    if (b.term && b.def) words.set(b.term.toLowerCase(), { w: b.term, d: flatMarks(b.def) });
    for (const t of blockText(b)) {
      for (const seg of parse(t)) {
        if (seg.mark === "word" && seg.def && !words.has(seg.t.toLowerCase())) words.set(seg.t.toLowerCase(), { w: seg.t, d: seg.def });
      }
    }
  }
  return words;
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Links the first plain mention of each known word in a block, so a term
// defined once can be looked up wherever it is used.
function linkWords(parts, glossary, used) {
  if (!glossary.size) return parts;
  const names = [...glossary.keys()].filter((k) => k.length >= 4 && !used.has(k)).sort((a, b) => b.length - a.length);
  if (!names.length) return parts;
  const find = new RegExp(`\\b(${names.map(escape).join("|")})\\b`, "i");
  const out = [];
  for (const seg of parts) {
    if (seg.mark) { if (seg.mark === "word") used.add(seg.t.toLowerCase()); out.push(seg); continue; }
    let rest = seg.t;
    for (let m = rest.match(find); m; m = rest.match(find)) {
      const key = m[1].toLowerCase();
      if (used.has(key)) break;
      used.add(key);
      if (m.index) out.push({ t: rest.slice(0, m.index) });
      out.push({ t: m[1], mark: "word", def: glossary.get(key).d });
      rest = rest.slice(m.index + m[1].length);
    }
    if (rest) out.push({ t: rest });
  }
  return out;
}

const Words = createContext({ glossary: new Map(), open: () => {}, early: false });

// Notes text: the coloured highlights, and hard words that show their meaning
// when tapped.
function Text({ text, on, skip }) {
  const { glossary, open, early } = useContext(Words);
  // Tapping a word for its meaning is for staff and testers for now; for
  // everyone else the word is plain text.
  const parts = early ? linkWords(parse(text), glossary, new Set(skip ? [skip.toLowerCase()] : []))
    : parse(text).map((seg) => (seg.mark === "word" ? { t: seg.t } : seg));
  return parts.map((seg, i) => {
    if (seg.mark === "word") {
      return (
        <button key={i} type="button" className="nt-word" aria-haspopup="dialog"
          onClick={(e) => open({ w: seg.t, d: seg.def || glossary.get(seg.t.toLowerCase())?.d || "" }, e.currentTarget)}>
          {seg.t}
        </button>
      );
    }
    return <Marked key={i} parts={[seg]} on={on} />;
  });
}

// The meaning of a tapped word, in a small card beside it.
function WordCard({ word, at, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const away = (e) => { if (!ref.current?.contains(e.target) && e.target !== at) onClose(); };
    const key = (e) => { if (e.key === "Escape") { onClose(); at?.focus(); } };
    addEventListener("pointerdown", away);
    addEventListener("keydown", key);
    addEventListener("scroll", onClose, true);
    addEventListener("resize", onClose);
    return () => {
      removeEventListener("pointerdown", away);
      removeEventListener("keydown", key);
      removeEventListener("scroll", onClose, true);
      removeEventListener("resize", onClose);
    };
  }, [at, onClose]);
  const r = at.getBoundingClientRect();
  const width = Math.min(300, innerWidth - 24);
  const left = Math.max(12, Math.min(r.left + r.width / 2 - width / 2, innerWidth - width - 12));
  const below = r.bottom + 180 < innerHeight;
  const style = below ? { left, width, top: r.bottom + 8 } : { left, width, bottom: innerHeight - r.top + 8 };
  return (
    <Portal>
      <div ref={ref} className="nt-wordcard" role="dialog" aria-label={`Meaning of ${word.w}`} style={style}>
        <b>{word.w}</b>
        <p>{word.d || "No meaning was written for this word."}</p>
      </div>
    </Portal>
  );
}

const blockText = blockTexts;

const slug = (s) => "nt-" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function Notes({ made, saveNotes, go, early = false }) {
  const [on, setOn] = useState({ def: true, key: true, exam: true });
  usePageContext(useMemo(() => notesContext(made), [made]));
  const [writing, setWriting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showPod, setShowPod] = useState(false);
  const [toBook, setToBook] = useState(false);
  const [error, setError] = useState("");
  const [word, setWord] = useState(null); // { w, d, at } while a meaning is showing

  const topics = made?.topics || [];
  const notes = made?.notes || {};
  const missing = topics.filter((t) => !notes[t.name]?.length).map((t) => t.name);
  const writable = sourcesFor(missing);
  const canWrite = writable.some((g) => g.topics.length);

  const counts = useMemo(() => {
    const c = { def: 0, key: 0, exam: 0 };
    Object.values(notes).flat().forEach((b) => blockText(b).forEach((t) =>
      parse(t).forEach((seg) => { if (seg.mark in c) c[seg.mark] += 1; })));
    return c;
  }, [notes]);

  const [wrote, setWrote] = useState(null); // { n, of } topics written so far
  async function writeMissing() {
    setWriting(true);
    setError("");
    const of = writable.reduce((n, g) => n + g.topics.length, 0);
    setWrote({ n: 0, of });
    try {
      const written = {};
      for (const g of writable) {
        Object.assign(written, await writeNotes(g.notes, g.topics.map((name) => ({ name })),
          { onTopics: (k) => setWrote((w) => w && { ...w, n: Math.min(w.of, w.n + k) }) }));
      }
      if (!Object.keys(written).length) throw new Error("The notes did not come back. Try again in a moment.");
      saveNotes(written);
    } catch (err) {
      setError(err.message || "The notes could not be written.");
    } finally {
      setWriting(false);
      setWrote(null);
    }
  }

  const jump = (name) => document.getElementById(slug(name))?.scrollIntoView({ behavior: "smooth", block: "start" });
  const total = counts.def + counts.key + counts.exam;
  const written = topics.filter((t) => notes[t.name]?.length);

  return (
    <div className={"page fade nt" + (early ? " nt-early" : "")}>
      <PageHead
        title={made?.title || "Notes"}
        sub={`Everything in your material, topic by topic.${total ? ` ${total} highlights.` : ""}`}
      />

      {written.length > 0 && (
        <div className="nt-bar">
          <HighlightFilters on={on} setOn={setOn} counts={counts} />
          <div className="row nt-tools">
            <button className="btn ghost small" onClick={() => setShowMap(true)}><Icon name="topics" size={14} /> Mind map</button>
            <button className="btn ghost small" onClick={() => setShowPod(true)}><Icon name="mic" size={14} /> Podcast</button>
            <button className="btn ghost small" onClick={() => setToBook(true)}><Icon name="pen" size={14} /> Turn into notebook</button>
            <button className="btn ghost small nt-print" onClick={() => window.print()}>
              <Icon name="sheet" size={14} /> Print
            </button>
          </div>
        </div>
      )}
      {showMap && <MindMap made={made} onClose={() => setShowMap(false)} />}
      {showPod && <Podcast made={made} onClose={() => setShowPod(false)} />}
      {toBook && <Portal><ToNotebook made={made} go={go} early={early} onClose={() => setToBook(false)} /></Portal>}

      {topics.length > 1 && (
        <nav className="nt-toc" aria-label="Topics in these notes">
          {topics.map((t, i) => (
            <button key={t.name} onClick={() => jump(t.name)} className={notes[t.name]?.length ? "" : "empty"}>
              <i>{i + 1}</i>{t.name}
            </button>
          ))}
        </nav>
      )}

      {missing.length > 0 && (
        <div className="card card-pad nt-missing">
          <div>
            <b className="small">
              {missing.length === topics.length
                ? "These notes were made before full notes existed"
                : `${missing.length} topic${missing.length === 1 ? " has" : "s have"} no notes yet`}
            </b>
            <p className="small muted">
              {canWrite
                ? "They can be written now from your original notes, with everything in them."
                : "Full notes are written from your original notes, and those are not on this device. Add the material again to get them."}
            </p>
            {error && <p className="small" style={{ color: "var(--warn)", margin: "6px 0 0" }}>{error}</p>}
          </div>
          {canWrite && (
            <button className="btn" onClick={writeMissing} disabled={writing}>
              {writing ? <Loading label="Writing notes" /> : "Write full notes"}
            </button>
          )}
        </div>
      )}

      {writing && <BusyScreen title="Writing your notes" detail="Every definition, list and example from your material, topic by topic. Long material can take a minute." outfit="wizard"
        count={early && wrote?.of > 1 ? `${wrote.n} of ${wrote.of} topics` : null} progress={wrote?.of > 1 ? wrote.n / wrote.of : null} />}
      <div className="nt-body sheet">
        {topics.map((t, i) => {
          const blocks = notes[t.name];
          if (!blocks?.length) return null;
          return (
            <section key={t.name} id={slug(t.name)} className="nt-sec">
              <h2><span>{i + 1}</span>{t.name}</h2>
              <Topic blocks={blocks} on={on} early={early} open={(w, at) => setWord((cur) => cur?.at === at ? null : { ...w, at })} />
              {early && <LikeImFour className="nt-l4" context={`The student's notes on "${t.name}":\n${blocks.map(blockPlain).filter(Boolean).join("\n")}`} />}
            </section>
          );
        })}
      </div>
      {word && <WordCard word={word} at={word.at} onClose={() => setWord(null)} />}
    </div>
  );
}

function Topic({ blocks, on, open, early }) {
  const glossary = useMemo(() => glossaryOf(blocks), [blocks]);
  const value = useMemo(() => ({ glossary, open, early }), [glossary, open, early]);
  // Tables, diagrams and pictures are for staff and testers for now.
  const shown = early ? blocks : blocks.filter((b) => !b.table && !b.flow && !b.pic);
  return <Words.Provider value={value}>{shown.map((b, n) => <Block key={n} b={b} on={on} />)}</Words.Provider>;
}

function Block({ b, on }) {
  if (b.h) return <h3>{flatText(b.h)}</h3>;
  if (b.p) return <p><Text text={b.p} on={on} /></p>;
  if (b.list) {
    return (
      <ul>{b.list.map((item, i) => <li key={i}><Text text={item} on={on} /></li>)}</ul>
    );
  }
  if (b.term) {
    return (
      <div className="nt-term">
        <b>{b.term}</b>
        <span><Text text={b.def} on={on} skip={b.term} /></span>
      </div>
    );
  }
  if (b.eg) {
    return (
      <div className="nt-aside eg">
        <span className="nt-label">Example</span>
        <p><Text text={b.eg} on={on} /></p>
      </div>
    );
  }
  if (b.table) {
    const [head, ...rest] = [b.table.head, ...b.table.rows];
    return (
      <div className="nt-table">
        <table>
          <thead><tr>{head.map((c, i) => <th key={i} scope="col"><Text text={c} on={on} /></th>)}</tr></thead>
          <tbody>
            {rest.map((r, i) => (
              <tr key={i}>{r.map((c, k) => k === 0
                ? <th key={k} scope="row"><Text text={c} on={on} /></th>
                : <td key={k}><Text text={c} on={on} /></td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (b.flow) {
    return (
      <figure className={"nt-flow" + (b.flow.cycle ? " cycle" : "")}>
        {b.flow.title && <figcaption className="nt-label">{flatText(b.flow.title)}</figcaption>}
        <ol>
          {b.flow.steps.map((step, i) => (
            <li key={i}><span className="nt-flow-n">{i + 1}</span><span><Text text={step} on={on} /></span></li>
          ))}
        </ol>
        {b.flow.cycle && <p className="nt-flow-back">↻ and back to step 1</p>}
      </figure>
    );
  }
  if (b.pic) return <Picture query={b.pic} />;
  if (b.watch) {
    return (
      <div className="nt-aside watch">
        <span className="nt-label">Watch out</span>
        <p><Text text={b.watch} on={on} /></p>
      </div>
    );
  }
  return null;
}

// A picture from Wikipedia, when one clearly matches. Nothing shows until it
// has loaded, and nothing at all when there is no good match.
function Picture({ query }) {
  const [pic, setPic] = useState(null);
  useEffect(() => {
    let live = true;
    import("./wikiPic.js").then(({ findPicture }) => findPicture(query)).then((p) => { if (live) setPic(p); }).catch(() => {});
    return () => { live = false; };
  }, [query]);
  if (!pic) return null;
  return (
    <figure className="nt-pic">
      <img src={pic.src} alt={pic.title} loading="lazy" referrerPolicy="no-referrer"
        style={{ aspectRatio: pic.w && pic.h ? `${pic.w} / ${pic.h}` : undefined }} onError={() => setPic(null)} />
      <figcaption>
        {pic.title} · <a href={pic.page} target="_blank" rel="noreferrer">Wikipedia</a>
      </figcaption>
    </figure>
  );
}

// Turning the notes into a notebook: pick a font and a paper, choose whether
// to add pictures, and the notebook opens when it is ready.
function ToNotebook({ made, go, onClose, early }) {
  // Testers get handwriting on squared paper by default, like a page of good
  // notes; everyone else the plain look it had before.
  const [font, setFont] = useState(() => { const d = early ? "patrick" : "arial"; try { return localStorage.getItem("dwiddle-nb-font") || d; } catch { return d; } });
  const [paper, setPaper] = useState(early ? "grid" : "lined");
  const [pictures, setPictures] = useState(true);
  const [spacing, setSpacing] = useState(() => { try { return localStorage.getItem("dwiddle-nb-spacing") || "normal"; } catch { return "normal"; } });
  const pickSpacing = (v) => { setSpacing(v); try { localStorage.setItem("dwiddle-nb-spacing", v); } catch { /* private mode */ } };
  const [busy, setBusy] = useState("");
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState("");
  useEffect(() => { FONTS.forEach((f) => readyFont(f)); }, []);

  async function make() {
    setErr(""); setBusy("Getting ready"); setProg(0.02);
    try {
      // The hand drawn, two column pages are for testers for now.
      const { notesToNotebook } = early ? await import("./notesToNotebook.js") : await import("./notesToNotebookClassic.js");
      const id = await notesToNotebook(made, { fontId: font, template: paper, pictures, rich: early, spacing, onProgress: (t, p) => { setBusy(t); setProg(p); } });
      try { sessionStorage.setItem("dwiddle-open-notebook", id); localStorage.setItem("dwiddle-nb-font", font); } catch { /* fine */ }
      go?.("notebook");
    } catch (e) {
      setBusy(""); setErr(e?.message || "The notebook could not be made.");
    }
  }

  return (
    <div className="gate-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      {busy && <BusyScreen title="Making your notebook" detail={busy} progress={prog} outfit="chef" />}
      <div className="gate tonb" role="dialog" aria-modal="true" aria-labelledby="tonb-title">
        <h2 id="tonb-title">Turn these notes into a notebook</h2>
        <p className="gate-sub">Every topic on its own pages, with your highlights drawn in, ready to write on.</p>
        <span className="qv-label">Font</span>
        <div className="tonb-fonts">
          {FONTS.map((f) => (
            <button key={f.id} type="button" className={"tonb-font" + (font === f.id ? " on" : "")} onClick={() => setFont(f.id)}>
              <span style={{ fontFamily: f.css, fontSize: 20 * f.scale }}>Photosynthesis</span>
              <small>{f.name}</small>
            </button>
          ))}
        </div>
        <div className="tonb-row">
          <label className="field"><span>Paper</span>
            <select value={paper} onChange={(e) => setPaper(e.target.value)}>
              <option value="grid">Squared</option><option value="lined">Lined</option><option value="dots">Dotted</option><option value="blank">Plain</option>
              {early && <><option value="pastel">Pastel lined</option><option value="journal">Journal</option></>}
            </select>
          </label>
          {early && (
            <div className="tonb-spacing">
              <span className="qv-label">Spacing</span>
              <div className="seg tight" role="radiogroup" aria-label="Spacing">
                {[["compact", "Compact"], ["normal", "Normal"], ["huge", "Lots of room"]].map(([v, n]) => (
                  <button key={v} role="radio" aria-checked={spacing === v} className={spacing === v ? "on" : ""} onClick={() => pickSpacing(v)}>{n}</button>
                ))}
              </div>
              <span className="small muted">{spacing === "compact" ? "Smaller writing, more on each page." : spacing === "huge" ? "A free line under every line, room for your own notes." : "Written on every line, a little space between points."}</span>
            </div>
          )}
          <label className="tonb-check"><input type="checkbox" checked={pictures} onChange={(e) => setPictures(e.target.checked)} /> Add a picture to topics where a good one exists</label>
        </div>
        {err && <p className="small" style={{ color: "var(--warn)" }}>{err}</p>}
        <div className="profile-actions">
          <button className="btn ghost" onClick={onClose} disabled={!!busy}>Cancel</button>
          <button className="btn cta" onClick={make} disabled={!!busy}>{busy ? <Loading label={busy} /> : "Make the notebook"}</button>
        </div>
      </div>
    </div>
  );
}
