import { useState } from "react";
import { Icon, PageHead, Portal } from "./ui.jsx";
import Decks from "./Decks.jsx";
import Explore from "./Explore.jsx";
import { StudyTimerCard } from "./StudyTimer.jsx";
import { Duck } from "./Duck.jsx";
import { HeroDuck } from "./HeroDuck.jsx";
import { startGuide } from "./Guide.jsx";

// Home for testers and above: one calm page. Each thing you have added is a
// folder, and the way back to where you were is the biggest thing on it.
// Counts are worked out here from the one store, so nothing new is saved.
// A manila folder drawn flat: a back with a tab, a sheet of paper showing, and
// a front. Colours go round so a shelf of them is easy to tell apart.
const TONES = [
  ["#E9B949", "#F6CF66"], ["#E8789A", "#F29AB5"], ["#5B8DEF", "#7FA8F5"],
  ["#4FB87A", "#72CC95"], ["#9A74E0", "#B496EC"], ["#EE8E4A", "#F5A96F"],
];
const tone = (id, n) => TONES[n % TONES.length];
function FolderArt({ tone: [back, front] }) {
  return (
    <svg className="hf-art" viewBox="0 0 240 170" preserveAspectRatio="none" aria-hidden="true">
      <path d="M8 22a12 12 0 0 1 12-12h62l16 16h122a12 12 0 0 1 12 12v118a12 12 0 0 1-12 12H20a12 12 0 0 1-12-12z" fill={back} />
      <rect x="22" y="34" width="196" height="90" rx="7" fill="#fff" opacity=".92" transform="rotate(-1.5 120 80)" />
      <rect x="34" y="48" width="90" height="5" rx="2.5" fill={back} opacity=".35" transform="rotate(-1.5 120 80)" />
      <rect x="34" y="62" width="130" height="5" rx="2.5" fill={back} opacity=".22" transform="rotate(-1.5 120 80)" />
      <path d="M8 66a12 12 0 0 1 12-12h200a12 12 0 0 1 12 12v90a12 12 0 0 1-12 12H20a12 12 0 0 1-12-12z" fill={front} />
    </svg>
  );
}

export function HomeFolders({ go, hello, sub, streak, due, level = 1, xp = 0, prefill, fullMade, materials, focus, setFocus, setTopic, deleteItem, deleteMaterial, renameItem, picking, home, startView, auth, setMade, onSignIn }) {
  const [view, setView] = useState(startView || "folders");
  const [find, setFind] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [renaming, setRenaming] = useState(null); // { id, value }
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
            <h1 className="hf-ask">What are we studying today?</h1>
            <button className="btn quiet small hf-guide" onClick={() => startGuide()}>New here? Take the guide</button>
          </div>
        </div>
      ) : (
        <PageHead title={picking ? "What are you studying?" : "Library"} sub={picking ? "Pick a folder to open its notes, lessons and practice." : ""} />
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
          <div className="hf-timer"><StudyTimerCard /></div>
        </>
      )}

      {!home && (<>
      <div className="hf-bar">
        <div className="hf-switch" role="tablist" aria-label="Library view">
          <button role="tab" aria-selected={view === "folders"} className={view === "folders" ? "on" : ""} onClick={() => setView("folders")}>Folders</button>
          <button role="tab" aria-selected={view === "decks"} className={view === "decks" ? "on" : ""} onClick={() => setView("decks")}>My decks</button>
          {!picking && <button role="tab" aria-selected={view === "explore"} className={view === "explore" ? "on" : ""} onClick={() => setView("explore")}>Explore</button>}
        </div>
        {view === "folders" && next && !picking && (
          <button className="btn cta small hf-resume" onClick={carryOn} title={`${next.topic}, in ${next.folder.title}`}>
            Continue: {next.topic}{due > 0 ? ` · ${due} to review` : ""}
          </button>
        )}
        {view === "folders" && folders.length > 2 && (
          <input className="hf-find" type="search" placeholder="Search" value={find}
            onChange={(e) => setFind(e.target.value)} aria-label="Search your folders" />
        )}
      </div>

      {view === "decks" && <div className="hf-decks"><Decks /></div>}
      {view === "explore" && <div className="hf-decks"><Explore auth={auth} fullMade={fullMade} materials={materials} setMade={setMade} go={go} onSignIn={onSignIn} /></div>}
      {view === "folders" && (
        <div className="hf-grid">
          <button className="hf-new" onClick={() => go("upload")}>
            <span className="hf-new-plus"><Icon name="plus" size={22} /></span>
            <b>New folder</b>
            <span className="small muted">Add notes, a PDF or a topic</span>
          </button>
          {shown.map((f, n) => (
            <div key={f.id} className={"hf-folder" + (focus === f.id ? " on" : "")}>
              <div className="hf-open" role="button" tabIndex={0} onClick={() => (renaming?.id === f.id ? null : open(f))}
                onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(f); } }}>
                <FolderArt tone={tone(f.id, n)} />
                <span className="hf-fbody">
                  {renaming?.id === f.id ? (
                    <input className="hf-rename" autoFocus value={renaming.value} maxLength={120} aria-label="Folder name"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenaming({ id: f.id, value: e.target.value })}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") { renameItem?.(f.id, renaming.value); setRenaming(null); }
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      onBlur={() => { renameItem?.(f.id, renaming.value); setRenaming(null); }} />
                  ) : <b className={"hf-title" + (f.title.length > 70 ? " xs" : f.title.length > 38 ? " sm" : "")}>{f.title}</b>}
                  <span className="hf-meta">{f.topics.length} topic{f.topics.length === 1 ? "" : "s"} · {f.questions} question{f.questions === 1 ? "" : "s"}</span>
                  <span className="hf-prog" aria-label={`${f.done} of ${f.topics.length} lessons done`}>
                    <i style={{ width: `${f.topics.length ? (f.done / f.topics.length) * 100 : 0}%` }} />
                  </span>
                </span>
              </div>
              <button className="icon-btn hf-edit" title="Rename this folder" aria-label={`Rename ${f.title}`} onClick={() => setRenaming({ id: f.id, value: f.title })}>
                <Icon name="pen" size={14} />
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
