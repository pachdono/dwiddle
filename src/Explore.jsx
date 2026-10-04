import { useEffect, useState } from "react";
import { Icon, PageHead } from "./ui.jsx";
import { viewOf } from "./materials.js";
import { listBooks, getBook, putBook, uid } from "./notebookStore.js";
import { explore, openShare, publish, myShares, removeShare, countSave, reportShare, packMaterial, unpackMaterial } from "./social.js";

// The online library: material and notebooks other people have shared, and
// somewhere to share your own. Saving one makes your own copy; nothing you
// change afterwards touches theirs.

const linkOf = (id) => `${location.origin}/?share=${id}`;
const when = (t) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const SUBJECTS = ["Maths", "Science", "English", "History", "Geography", "Business", "Languages", "Computing", "Other"];

function Setup() {
  return (
    <div className="card card-pad sc-note">
      <b>The online library is not switched on yet</b>
      <p className="small muted">The database half has not been set up. Staff: run <code>supabase/social.sql</code> in the Supabase SQL editor, once.</p>
    </div>
  );
}

export default function Explore({ auth, fullMade, materials = [], setMade, go, onSignIn }) {
  const [tab, setTab] = useState("browse");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [miss, setMiss] = useState(false);
  const [open, setOpen] = useState(null); // a share being looked at
  const [note, setNote] = useState("");

  const search = (text = q) => explore(text).then((r) => { if (r.ok) { setRows(r.data || []); setMiss(false); } else { setMiss(!!r.missing); setRows([]); setNote(r.error || ""); } });
  useEffect(() => { if (auth?.user) search(""); }, [auth?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // a link someone sent
  useEffect(() => {
    let id = null;
    try { id = sessionStorage.getItem("dwiddle-open-share"); sessionStorage.removeItem("dwiddle-open-share"); } catch {}
    if (id && auth?.user) look(id);
  }, [auth?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function look(id) {
    setNote("");
    const r = await openShare(id.trim());
    if (!r.ok) { setNote(r.error); return; }
    if (!r.data?.length) { setNote("That share was not found. It may have been removed."); return; }
    setOpen(r.data[0]);
  }

  async function save(s) {
    if (s.kind === "material") {
      const data = unpackMaterial(s.payload);
      if (!data) { setNote("That one could not be read."); return; }
      setMade({ ...data, title: s.title }, { material: "new" });
      countSave(s.id);
      setNote(`Saved "${s.title}" to your library.`);
      setTimeout(() => go("library"), 700);
    } else {
      const b = s.payload;
      if (!b || !Array.isArray(b.pages)) { setNote("That notebook could not be read."); return; }
      await putBook({ ...b, id: uid(), title: s.title, created: Date.now() });
      countSave(s.id);
      setNote(`Saved "${s.title}" to your notebooks.`);
      setTimeout(() => go("notebook"), 700);
    }
  }

  if (!auth?.user) {
    return (
      <div className="page fade sc"><PageHead title="Explore" sub="Material and notebooks shared by other students." />
        <div className="card card-pad sc-note"><b>Sign in to explore and share</b>
          <button className="btn cta" onClick={onSignIn}>Sign in</button></div></div>
    );
  }

  return (
    <div className="page fade sc">
      <PageHead title="Explore" sub="Material and notebooks shared by other students. Save a copy of anything you like." />
      <div className="hf-switch sc-tabs" role="tablist">
        {[["browse", "Browse"], ["share", "Share yours"], ["mine", "My shares"]].map(([id, l]) => <button key={id} role="tab" className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{l}</button>)}
      </div>
      {note && <div className="sc-banner">{note}</div>}

      {open && <Preview s={open} onClose={() => setOpen(null)} onSave={() => save(open)} />}

      {tab === "browse" && (miss ? <Setup /> : (
        <>
          <form className="hf-prompt xp-search" onSubmit={(e) => { e.preventDefault(); const t = q.trim(); if (/^[a-f0-9]{10}$/.test(t)) look(t); else search(t); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, or paste a share code" aria-label="Search the online library" />
            <button className="btn cta" type="submit">Search</button>
          </form>
          {rows === null && <p className="small muted">Loading...</p>}
          {rows?.length === 0 && <p className="small muted">Nothing here yet. Be the first to share something.</p>}
          <div className="xp-grid">
            {rows?.map((s) => (
              <button key={s.id} className="xp-card" onClick={() => look(s.id)}>
                <span className={"xp-kind " + s.kind}>{s.kind === "notebook" ? "Notebook" : "Material"}</span>
                <b>{s.title}</b>
                {s.about && <span className="small muted xp-about">{s.about}</span>}
                <span className="small muted">{s.subject ? s.subject + " · " : ""}by {s.author} · {s.saves} save{s.saves === 1 ? "" : "s"}</span>
              </button>
            ))}
          </div>
        </>
      ))}

      {tab === "share" && <ShareForm materials={materials} fullMade={fullMade} onDone={() => { setTab("mine"); search(""); }} setNote={setNote} />}
      {tab === "mine" && <Mine setNote={setNote} />}
    </div>
  );
}

function Preview({ s, onClose, onSave }) {
  const p = s.payload;
  const stats = s.kind === "material"
    ? `${p?.topics?.length || 0} topics · ${p?.questions?.length || 0} questions`
    : `${p?.pages?.length || 0} page${p?.pages?.length === 1 ? "" : "s"}`;
  return (
    <div className="card card-pad xp-open">
      <div className="sc-row"><span className={"xp-kind " + s.kind}>{s.kind === "notebook" ? "Notebook" : "Material"}</span>
        <button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="close" size={14} /></button></div>
      <h2 style={{ margin: "6px 0" }}>{s.title}</h2>
      {s.about && <p>{s.about}</p>}
      <p className="small muted">by {s.author} · {stats} · {s.saves} save{s.saves === 1 ? "" : "s"}</p>
      <div className="dl-row" style={{ justifyContent: "flex-start" }}>
        <button className="btn cta" onClick={onSave}>Save a copy</button>
        <button className="btn ghost" onClick={() => { navigator.clipboard?.writeText(linkOf(s.id)); }}>Copy link</button>
        {!s.mine && <button className="btn ghost" onClick={() => { const w = prompt("What is wrong with it?") ; if (w !== null) { reportShare(s.id, w); onClose(); } }}>Report</button>}
      </div>
    </div>
  );
}

function ShareForm({ materials, fullMade, onDone, setNote }) {
  const [kind, setKind] = useState("material");
  const [books, setBooks] = useState([]);
  const [pick, setPick] = useState("");
  const [about, setAbout] = useState("");
  const [subject, setSubject] = useState("");
  const [listed, setListed] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => { listBooks().then((b) => setBooks(b || [])).catch(() => {}); }, []);
  const options = kind === "material" ? [...materials].reverse().map((m) => ({ id: m.id, title: m.title })) : books.map((b) => ({ id: b.id, title: b.title }));
  useEffect(() => { setPick(options[0]?.id || ""); }, [kind, materials.length, books.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function go() {
    setBusy(true); setNote("");
    let title, payload;
    if (kind === "material") {
      const v = viewOf(fullMade, pick);
      title = v?.title; payload = v && packMaterial(v);
    } else {
      const b = await getBook(pick);
      title = b?.title; payload = b;
    }
    if (!payload) { setNote("Pick something to share."); setBusy(false); return; }
    const r = await publish({ kind, title, about, subject, payload, listed });
    setBusy(false);
    if (!r.ok) { setNote(r.missing ? "Sharing is not switched on yet." : r.error); return; }
    try { await navigator.clipboard?.writeText(linkOf(r.id)); } catch {}
    setNote(listed ? "Shared to the online library. The link is copied." : "Shared by link only. The link is copied.");
    onDone();
  }

  return (
    <div className="card card-pad stack">
      <div className="dl-lens">
        <button className={kind === "material" ? "on" : ""} onClick={() => setKind("material")}>A folder</button>
        <button className={kind === "notebook" ? "on" : ""} onClick={() => setKind("notebook")}>A notebook</button>
      </div>
      {options.length === 0 ? <p className="small muted">You have no {kind === "material" ? "folders" : "notebooks"} to share yet.</p> : (
        <>
          <label className="small muted">What to share</label>
          <select className="sc-select" value={pick} onChange={(e) => setPick(e.target.value)}>{options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</select>
          <label className="small muted">A line about it (optional)</label>
          <input className="sc-select" value={about} maxLength={300} onChange={(e) => setAbout(e.target.value)} placeholder="e.g. Covers the whole of unit 2" />
          <label className="small muted">Subject</label>
          <select className="sc-select" value={subject} onChange={(e) => setSubject(e.target.value)}><option value="">Not set</option>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
          <label className="sc-check"><input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} /> List it in the online library so anyone can find it</label>
          <p className="small muted">{listed ? "Anyone signed in can see and save it." : "Only people you send the link to can open it."} It is a copy: your own stays private and untouched. Nothing about your progress is shared.</p>
          <button className="btn cta" disabled={busy || !pick} onClick={go}>{busy ? "Sharing..." : "Share"}</button>
        </>
      )}
    </div>
  );
}

function Mine({ setNote }) {
  const [rows, setRows] = useState(null);
  const load = () => myShares().then((r) => setRows(r.ok ? r.data : []));
  useEffect(() => { load(); }, []);
  return (
    <div className="card">
      {rows === null && <div className="card-pad small muted">Loading...</div>}
      {rows?.length === 0 && <div className="card-pad small muted">You have not shared anything.</div>}
      {rows?.map((s) => (
        <div key={s.id} className="sc-person">
          <span className={"xp-kind " + s.kind}>{s.kind === "notebook" ? "Notebook" : "Material"}</span>
          <span className="sc-who"><b>{s.title}</b><span className="small muted">{s.hidden ? "Hidden after reports · " : s.listed ? "Listed · " : "Link only · "}{s.saves} save{s.saves === 1 ? "" : "s"} · {when(s.created_at)}</span></span>
          <button className="btn small" onClick={() => { navigator.clipboard?.writeText(linkOf(s.id)); setNote("Link copied."); }}>Copy link</button>
          <button className="icon-btn" aria-label={`Stop sharing ${s.title}`} title="Stop sharing" onClick={() => confirm("Stop sharing this? People who saved it keep their copy.") && removeShare(s.id).then(load)}><Icon name="trash" size={15} /></button>
        </div>
      ))}
    </div>
  );
}
