import { useState } from "react";
import { Icon, PageHead, Portal } from "./ui.jsx";
import Decks from "./Decks.jsx";
import { Duck } from "./Duck.jsx";
import { HeroDuck } from "./HeroDuck.jsx";

// Home for testers and above: one calm page. Each thing you have added is a
// folder, and the way back to where you were is the biggest thing on it.
// Counts are worked out here from the one store, so nothing new is saved.
export function HomeFolders({ go, hello, sub, streak, due, level = 1, xp = 0, prefill, fullMade, materials, focus, setFocus, setTopic, deleteItem, deleteMaterial, picking, home }) {
  const [view, setView] = useState("folders");
  const [find, setFind] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [idea, setIdea] = useState("");
  const made = fullMade;
  const lessons = made?.lessons || {};

  const folders = [...(materials || [])].reverse().map((m) => {
    const names = new Set(m.topics);
    const done = m.topics.filter((t) => lessons[t]?.done).length;
    return {
      ...m,
      done,
      questions: (made?.questions || []).filter((q) => names.has(q.topic)).length,
    };
  });

  // Carry on with the newest folder that still has an unfinished lesson.
  const next = (() => {
    const last = (focus && folders.find((f) => f.id === focus)) || null;
    const order = last ? [last, ...folders.filter((f) => f !== last)] : folders;
    for (const f of order) {
      const t = f.topics.find((n) => !lessons[n]?.done);
      if (t) return { folder: f, topic: t };
    }
    return null;
  })();

  const open = (f, to = "sheet") => { setFocus(f.id); go(to); };
  const carryOn = () => { setFocus(next.folder.id); setTopic?.(next.topic); go("learn"); };

  const shown = folders.filter((f) => {
    const q = find.trim().toLowerCase();
    return !q || f.title.toLowerCase().includes(q) || f.topics.some((t) => t.toLowerCase().includes(q));
  });
  const when = (t) => (t ? new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");

  return (
    <div className="page wide fade hf">
      {home ? (
        <div className="hf-hero">
          <HeroDuck size={230} className="hf-duck" />
          <div className="hf-words">
            <div className="hf-hello">{hello}</div>
            <h1 className="hf-ask">What are we <em>cracking</em> today?</h1>
          </div>
        </div>
      ) : (
        <PageHead title={picking ? "What are you studying?" : "Library"} sub={picking ? "Pick a folder to open its notes, lessons and practice." : "Everything you have added, as folders."} />
      )}

      {home && (
        <>
          <div className="hf-actions">
            <button onClick={() => go("upload")}><span className="hf-act-ico"><Icon name="upload" size={22} /></span><b>Upload file</b><span className="small muted">PDF, slides, a photo</span></button>
            <button onClick={() => go("upload")}><span className="hf-act-ico hf-pink"><Icon name="sheet" size={22} /></span><b>Paste notes</b><span className="small muted">Paste any text</span></button>
            <button onClick={() => go("upload")}><span className="hf-act-ico hf-green"><Icon name="exam" size={22} /></span><b>YouTube</b><span className="small muted">Paste a link</span></button>
          </div>
          <form className="hf-prompt" onSubmit={(e) => { e.preventDefault(); const t = idea.trim(); if (t) prefill?.(t); else go("upload"); }}>
            <input value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Or type a topic you want to learn..." aria-label="A topic to learn" />
            <button className="btn cta" type="submit">Make it</button>
          </form>
        </>
      )}

      {!home && (<>
      {view === "folders" && next && !picking && (
        <button className="hf-continue" onClick={carryOn}>
          <span className="hf-continue-k">Continue</span>
          <b>{next.topic}</b>
          <span className="small">{next.folder.title}</span>
          {due > 0 && <span className="pill accent hf-due">{due} to review</span>}
          <span className="hf-go">Open <Icon name="arrow" size={14} /></span>
        </button>
      )}

      <h2 className="hf-sec">{view === "folders" ? "Your folders" : "Your decks"}</h2>
      <div className="hf-bar">
        <div className="hf-switch" role="tablist" aria-label="Home view">
          <button role="tab" aria-selected={view === "folders"} className={view === "folders" ? "on" : ""} onClick={() => setView("folders")}>Folders</button>
          <button role="tab" aria-selected={view === "decks"} className={view === "decks" ? "on" : ""} onClick={() => setView("decks")}>My decks</button>
        </div>
        {view === "folders" && folders.length > 0 && (
          <input className="hf-find" type="search" placeholder="Search your folders" value={find}
            onChange={(e) => setFind(e.target.value)} aria-label="Search your folders" />
        )}
      </div>

      {view === "decks" ? <div className="hf-decks"><Decks /></div> : (
        <div className="hf-grid">
          <button className="hf-new" onClick={() => go("upload")}>
            <span className="hf-new-plus"><Icon name="plus" size={20} /></span>
            <b>New material</b>
            <span className="small muted">Notes, a PDF, a photo or a topic</span>
          </button>
          {shown.map((f) => (
            <div key={f.id} className={"hf-folder" + (focus === f.id ? " on" : "")}>
              <button className="hf-open" onClick={() => open(f)}>
                <span className="hf-tab" aria-hidden="true" />
                <b className="hf-title">{f.title}</b>
                <span className="small muted">
                  {f.topics.length} topic{f.topics.length === 1 ? "" : "s"} · {f.questions} question{f.questions === 1 ? "" : "s"}
                </span>
                <span className="hf-prog" aria-label={`${f.done} of ${f.topics.length} lessons done`}>
                  <i style={{ width: `${f.topics.length ? (f.done / f.topics.length) * 100 : 0}%` }} />
                </span>
                <span className="small muted">{f.done} of {f.topics.length} learned{when(f.at) ? ` · added ${when(f.at)}` : ""}</span>
              </button>
              <button className="icon-btn hf-del" title="Delete this folder" aria-label={`Delete ${f.title}`} onClick={() => setConfirm(f)}>
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
          {folders.length === 0 && (
            <div className="hf-empty">
              <Duck size={72} />
              <b>Nothing here yet</b>
              <span className="small muted">Add something you are studying and it appears as a folder.</span>
            </div>
          )}
          {folders.length > 0 && shown.length === 0 && <div className="hf-empty small muted">No folder matches that.</div>}
        </div>
      )}

      </>)}

      {confirm && (
        <Portal>
          <div className="gate-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}>
            <div className="gate lib-confirm" role="alertdialog" aria-modal="true" aria-labelledby="hf-del-title">
              <div className="lib-confirm-icon"><Icon name="trash" size={22} /></div>
              <h2 id="hf-del-title">Delete "{confirm.title}"?</h2>
              <p className="gate-sub">
                This removes its topics, questions, lessons and notes from this device and your account. Your streak and totals stay. It cannot be undone.
              </p>
              <div className="gate-actions">
                <button className="btn lib-confirm-go" autoFocus onClick={() => { if (materials.length === 1) deleteMaterial(); else deleteItem(confirm.id); setConfirm(null); }}>
                  Delete it
                </button>
                <button className="btn ghost" onClick={() => setConfirm(null)}>Keep it</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
