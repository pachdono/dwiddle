// Complete notes, topic by topic.
//
// The study sheet this replaces condensed a whole chapter onto one page, so
// most of what went in never came out: a twenty page PDF became a dozen
// lines. These are the opposite. Every definition, figure, list and example in
// the source is kept, reorganised under the topics it belongs to, with the
// parts to learn word for word, the facts to memorise and the places marks are
// lost picked out in colour.

import { useMemo, useState } from "react";
import { Icon, PageHead, Loading, Marked, HighlightFilters } from "./ui.jsx";
import { writeNotes } from "./ai.js";
import { sourcesFor } from "./lessons.js";
import { usePageContext } from "./Chat.jsx";
import { MindMap } from "./MindMap.jsx";
import { Podcast } from "./Podcast.jsx";

const flatText = (t) => String(t || "").replace(/\{(?:def|key|exam)\|([^{}]*)\}/g, "$1");
function notesContext(made) {
  const out = [`The student is reading their notes on "${made?.title || "their material"}".`];
  for (const t of made?.topics || []) {
    const blocks = made?.notes?.[t.name] || [];
    out.push(`\n## ${t.name}`);
    blocks.forEach((b) => {
      if (b.h) out.push(b.h);
      else if (b.term) out.push(`${b.term}: ${flatText(b.def)}`);
      else if (b.list) out.push(b.list.map((x) => "- " + flatText(x)).join("\n"));
      else out.push(flatText(Object.values(b)[0]));
    });
  }
  return out.join("\n").slice(0, 8500);
}

// "{def|the wording}" becomes a marked segment; everything else is plain text.
const MARK = /\{(def|key|exam)\|([^{}]*)\}/g;
function parse(text) {
  const out = [];
  let last = 0;
  String(text || "").replace(MARK, (whole, mark, t, at) => {
    if (at > last) out.push({ t: text.slice(last, at) });
    out.push({ t, mark });
    last = at + whole.length;
    return whole;
  });
  if (last < String(text || "").length) out.push({ t: String(text).slice(last) });
  return out;
}

function blockText(b) {
  if (b.term) return [b.def];
  if (b.list) return b.list;
  return [Object.values(b)[0]];
}

const slug = (s) => "nt-" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function Notes({ made, saveNotes }) {
  const [on, setOn] = useState({ def: true, key: true, exam: true });
  usePageContext(useMemo(() => notesContext(made), [made]));
  const [writing, setWriting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showPod, setShowPod] = useState(false);
  const [error, setError] = useState("");

  const topics = made?.topics || [];
  const notes = made?.notes || {};
  const missing = topics.filter((t) => !notes[t.name]?.length).map((t) => t.name);
  const writable = sourcesFor(missing);
  const canWrite = writable.some((g) => g.topics.length);

  const counts = useMemo(() => {
    const c = { def: 0, key: 0, exam: 0 };
    Object.values(notes).flat().forEach((b) => blockText(b).forEach((t) =>
      parse(t).forEach((seg) => { if (seg.mark) c[seg.mark] += 1; })));
    return c;
  }, [notes]);

  async function writeMissing() {
    setWriting(true);
    setError("");
    try {
      const written = {};
      for (const g of writable) {
        Object.assign(written, await writeNotes(g.notes, g.topics.map((name) => ({ name }))));
      }
      if (!Object.keys(written).length) throw new Error("The notes did not come back. Try again in a moment.");
      saveNotes(written);
    } catch (err) {
      setError(err.message || "The notes could not be written.");
    } finally {
      setWriting(false);
    }
  }

  const jump = (name) => document.getElementById(slug(name))?.scrollIntoView({ behavior: "smooth", block: "start" });
  const total = counts.def + counts.key + counts.exam;
  const written = topics.filter((t) => notes[t.name]?.length);

  return (
    <div className="page fade nt">
      <PageHead
        title={made?.title || "Notes"}
        sub={`Everything in your material, topic by topic.${total ? ` ${total} highlights.` : ""}`}
      />

      {written.length > 0 && (
        <div className="nt-bar">
          <HighlightFilters on={on} setOn={setOn} counts={counts} />
          <div className="row nt-tools">
            <button className="btn ghost small" onClick={() => setShowMap(true)}><Icon name="topics" size={14} /> Mind map</button>
            <button className="btn ghost small" onClick={() => setShowPod(true)}><Icon name="mic" size={14} /> Audio overview</button>
            <button className="btn ghost small nt-print" onClick={() => window.print()}>
              <Icon name="sheet" size={14} /> Print
            </button>
          </div>
        </div>
      )}
      {showMap && <MindMap made={made} onClose={() => setShowMap(false)} />}
      {showPod && <Podcast made={made} onClose={() => setShowPod(false)} />}

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

      <div className="nt-body sheet">
        {topics.map((t, i) => {
          const blocks = notes[t.name];
          if (!blocks?.length) return null;
          return (
            <section key={t.name} id={slug(t.name)} className="nt-sec">
              <h2><span>{i + 1}</span>{t.name}</h2>
              {blocks.map((b, n) => <Block key={n} b={b} on={on} />)}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Block({ b, on }) {
  if (b.h) return <h3>{b.h}</h3>;
  if (b.p) return <p><Marked parts={parse(b.p)} on={on} /></p>;
  if (b.list) {
    return (
      <ul>{b.list.map((item, i) => <li key={i}><Marked parts={parse(item)} on={on} /></li>)}</ul>
    );
  }
  if (b.term) {
    return (
      <div className="nt-term">
        <b>{b.term}</b>
        <span><Marked parts={parse(b.def)} on={on} /></span>
      </div>
    );
  }
  if (b.eg) {
    return (
      <div className="nt-aside eg">
        <span className="nt-label">Example</span>
        <p><Marked parts={parse(b.eg)} on={on} /></p>
      </div>
    );
  }
  if (b.watch) {
    return (
      <div className="nt-aside watch">
        <span className="nt-label">Watch out</span>
        <p><Marked parts={parse(b.watch)} on={on} /></p>
      </div>
    );
  }
  return null;
}
