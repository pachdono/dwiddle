import { useState } from "react";
import { MATERIALS, TOPICS, QUIZ, SHEET, SAMPLE_NOTES } from "./mock.js";

/* ---------- icons ---------- */

const paths = {
  home: "M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1V9.5Z",
  topics: "M4 5.5h12M4 10h12M4 14.5h8",
  quiz: "M7 7a3 3 0 1 1 3 3v2M10 15.5v.5",
  sheet: "M5 3h7l3 3v11H5zM12 3v3h3M7.5 10h5M7.5 13h5",
  library: "M4 4h4v12H4zM10 4h3v12h-3zM15 5l2 11",
  upload: "M10 13V4M6.5 7.5 10 4l3.5 3.5M4 13v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2",
  spark: "M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z",
  arrow: "M4 10h11M11 6l4 4-4 4",
  file: "M5 3h7l3 3v11H5zM12 3v3h3",
};

function Icon({ name, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

/* ---------- shell ---------- */

const NAV_STUDY = [
  { id: "home", label: "Dashboard", icon: "home" },
  { id: "topics", label: "Topics", icon: "topics" },
  { id: "quiz", label: "Practice", icon: "quiz" },
  { id: "sheet", label: "Study sheet", icon: "sheet" },
];

const NAV_MATERIAL = [
  { id: "upload", label: "Add material", icon: "upload" },
  { id: "library", label: "Library", icon: "library" },
];

const ALL_NAV = [...NAV_STUDY, ...NAV_MATERIAL];

export default function App() {
  const [page, setPage] = useState("home");

  const Page = {
    home: Dashboard,
    topics: Topics,
    quiz: Practice,
    sheet: StudySheet,
    upload: AddMaterial,
    library: Library,
  }[page];

  const title = ALL_NAV.find((n) => n.id === page).label;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">D</span>
          Dwiddle
        </div>

        <div className="upgrade">
          <span className="pill soon">Coming soon</span>
          <b className="small">Upgrade to Pro</b>
          <p className="small muted">Unlimited materials, longer PDFs, and exam mode.</p>
          <button className="btn ghost full" disabled>Notify me</button>
        </div>

        <nav className="nav">
          <div className="nav-label">Study</div>
          {NAV_STUDY.map((n) => (
            <button key={n.id} className={"nav-item" + (page === n.id ? " on" : "")}
              onClick={() => setPage(n.id)}>
              <Icon name={n.icon} />
              {n.label}
            </button>
          ))}

          <div className="nav-label">Material</div>
          {NAV_MATERIAL.map((n) => (
            <button key={n.id} className={"nav-item" + (page === n.id ? " on" : "")}
              onClick={() => setPage(n.id)}>
              <Icon name={n.icon} />
              {n.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user">
            <span className="avatar">PC</span>
            <div>
              <div className="user-name">Pacharapol</div>
              <div className="user-sub">Free plan</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <span className="crumb small">Cell Biology, Lecture 4</span>
        </header>
        <Page key={page} go={setPage} />
      </main>
    </div>
  );
}

/* ---------- shared bits ---------- */

function PageHead({ title, sub }) {
  return (
    <div className="page-head">
      <h2>{title}</h2>
      <p>{sub}</p>
    </div>
  );
}

// Stand-in for a network call. Replace with fetch() when the backend is wired up.
function useFakeRun(ms = 900) {
  const [state, setState] = useState("idle"); // idle | loading | done
  const run = () => {
    setState("loading");
    setTimeout(() => setState("done"), ms);
  };
  return [state, run, () => setState("idle")];
}

function Loading({ label }) {
  return (
    <span className="row">
      <span className="spinner" />
      {label}
    </span>
  );
}

/* ---------- dashboard ---------- */

function Dashboard({ go }) {
  const focus = TOPICS.filter((t) => t.priority === "focus").slice(0, 3);

  return (
    <div className="page wide fade">
      <PageHead title="Good afternoon, Pacharapol" sub="Three days until your Cell Biology midterm." />

      <div className="stack">
        <div className="grid-3">
          <div className="stat">
            <div className="k">Study streak</div>
            <div className="v">6 days</div>
          </div>
          <div className="stat">
            <div className="k">Questions answered</div>
            <div className="v">184</div>
          </div>
          <div className="stat">
            <div className="k">Accuracy</div>
            <div className="v">78%</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Recommended topics</h3>
            <button className="btn quiet" onClick={() => go("topics")}>See all</button>
          </div>
          <div className="list">
            {focus.map((t) => (
              <div key={t.id} className="list-item" onClick={() => go("topics")}>
                <div style={{ flex: 1 }}>
                  <div className="list-title">{t.name}</div>
                  <div className="small muted">{t.reason}</div>
                </div>
                <span className="small muted">{t.mastery}%</span>
                <span className="muted"><Icon name="arrow" /></span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid-2">
          <div className="card card-pad">
            <div className="spread" style={{ marginBottom: 12 }}>
              <b>Practice quiz</b>
              <span className="pill">From your material</span>
            </div>
            <p className="muted small" style={{ marginTop: 0 }}>
              Add a PDF or paste your notes, and we turn them into questions.
            </p>
            <button className="btn" onClick={() => go("upload")}>
              <Icon name="upload" /> Add material
            </button>
          </div>

          <div className="card card-pad">
            <div className="spread" style={{ marginBottom: 12 }}>
              <b>Study sheet</b>
              <span className="pill">4 min read</span>
            </div>
            <p className="muted small" style={{ marginTop: 0 }}>
              A one page condensation of the chapter, ready to review.
            </p>
            <button className="btn ghost" onClick={() => go("sheet")}>Open sheet</button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Your material</h3>
            <button className="btn quiet" onClick={() => go("upload")}>Upload</button>
          </div>
          <div className="list">
            {MATERIALS.map((m) => (
              <div key={m.id} className="list-item" onClick={() => go("library")}>
                <div style={{ flex: 1 }}>
                  <div className="list-title">{m.title}</div>
                  <div className="small muted">{m.kind}, {m.pages} pages, added {m.added}</div>
                </div>
                <span className="pill">{m.kind}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- recommended topics ---------- */

function TopicRow({ t, go }) {
  return (
    <div className="topic">
      <div className="topic-main">
        <div className="spread">
          <div className="list-title">{t.name}</div>
          <span className={"pill " + (t.mastery < 50 ? "warn" : t.mastery < 75 ? "" : "good")}>
            {t.mastery}% mastered
          </span>
        </div>
        <div className="small muted" style={{ margin: "2px 0 10px" }}>{t.reason}</div>
        <div className="bar"><i style={{ width: `${t.mastery}%` }} /></div>
        <div className="small muted" style={{ marginTop: 8 }}>
          {t.source}, {t.questions} questions available
        </div>
      </div>
      <button className="btn ghost" onClick={() => go("quiz")}>Practice</button>
    </div>
  );
}

function Topics({ go }) {
  const focus = TOPICS.filter((t) => t.priority === "focus");
  const warm = TOPICS.filter((t) => t.priority === "warm");

  return (
    <div className="page fade">
      <PageHead
        title="Recommended topics"
        sub="Ranked by what you have been getting wrong, and what you have not seen in a while."
      />

      <div className="stack">
        <div>
          <div className="section-label">Focus first</div>
          <div className="stack" style={{ gap: 10 }}>
            {focus.map((t) => <TopicRow key={t.id} t={t} go={go} />)}
          </div>
        </div>

        <div>
          <div className="section-label">Keep warm</div>
          <div className="stack" style={{ gap: 10 }}>
            {warm.map((t) => <TopicRow key={t.id} t={t} go={go} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- add material ---------- */

function AddMaterial({ go }) {
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [over, setOver] = useState(false);
  const [state, run] = useFakeRun(1100);

  const ready = !!file || notes.trim().length > 0;

  function onDrop(e) {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  return (
    <div className="page fade">
      <PageHead title="Add material" sub="Drop in a PDF or paste your notes, and we build the questions." />

      <div className="stack">
        <label
          className={"drop" + (over ? " over" : "") + (file ? " has" : "")}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <input type="file" accept=".pdf,.txt,.md" hidden
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <span className="drop-icon"><Icon name={file ? "file" : "upload"} size={20} /></span>
          {file ? (
            <>
              <b>{file.name}</b>
              <span className="small muted">{(file.size / 1024).toFixed(0)} KB, ready to process</span>
            </>
          ) : (
            <>
              <b>Drop a PDF here, or click to browse</b>
              <span className="small muted">PDF, TXT or Markdown, up to 20 MB</span>
            </>
          )}
        </label>

        <div className="or"><span>or</span></div>

        <div className="card card-pad">
          <label className="field">
            <span>Paste your notes</span>
            <textarea placeholder="Paste lecture notes, a chapter, or a syllabus..."
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={() => setNotes(SAMPLE_NOTES)}>Use sample</button>
            <button className="btn" disabled={!ready || state === "loading"}
              onClick={state === "done" ? () => go("quiz") : run}>
              {state === "loading"
                ? <Loading label="Reading material" />
                : state === "done"
                  ? <>Start practice <Icon name="arrow" /></>
                  : <><Icon name="spark" /> Generate questions</>}
            </button>
          </div>
          {state === "done" && (
            <p className="small good-text fade" style={{ margin: "10px 0 0", textAlign: "right" }}>
              Ready. 12 questions across 5 topics.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- library ---------- */

function Library({ go }) {
  return (
    <div className="page fade">
      <PageHead title="Library" sub="Everything you have added so far." />
      <div className="card">
        <div className="card-head">
          <h3>{MATERIALS.length} items</h3>
          <button className="btn quiet" onClick={() => go("upload")}>Add material</button>
        </div>
        <div className="list">
          {MATERIALS.map((m) => (
            <div key={m.id} className="list-item">
              <span className="muted"><Icon name="file" /></span>
              <div style={{ flex: 1 }}>
                <div className="list-title">{m.title}</div>
                <div className="small muted">{m.kind}, {m.pages} pages, added {m.added}</div>
              </div>
              <button className="btn ghost" onClick={() => go("quiz")}>Practice</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- practice ---------- */

function Practice() {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = QUIZ[i];

  function pick(n) {
    if (picked !== null) return;
    setPicked(n);
    if (n === q.answer) setScore((s) => s + 1);
  }

  function next() {
    if (i + 1 >= QUIZ.length) return setFinished(true);
    setI(i + 1);
    setPicked(null);
  }

  function restart() {
    setI(0); setPicked(null); setScore(0); setFinished(false);
  }

  if (finished) {
    const pct = Math.round((score / QUIZ.length) * 100);
    return (
      <div className="page fade">
        <PageHead title="Quiz complete" sub="Here is how that went." />
        <div className="card card-pad" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em" }}>{pct}%</div>
          <div className="muted" style={{ marginBottom: 20 }}>{score} of {QUIZ.length} correct</div>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={restart}>Try again</button>
            <button className="btn ghost">Review mistakes</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade">
      <PageHead title="Practice" sub="Membrane transport, multiple choice" />

      <div className="card card-pad">
        <div className="spread" style={{ marginBottom: 8 }}>
          <span className="small muted">Question {i + 1} of {QUIZ.length}</span>
          <span className="small muted">{score} correct</span>
        </div>
        <div className="bar" style={{ marginBottom: 22 }}>
          <i style={{ width: `${((i + (picked !== null ? 1 : 0)) / QUIZ.length) * 100}%` }} />
        </div>

        <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {q.q}
        </h3>

        {q.choices.map((c, n) => {
          let cls = "choice";
          if (picked !== null && n === q.answer) cls += " right";
          else if (picked === n) cls += " wrong";
          return (
            <button key={n} className={cls} onClick={() => pick(n)} disabled={picked !== null}>
              <span className="key">{"ABCD"[n]}</span>
              {c}
            </button>
          );
        })}

        {picked !== null && (
          <div className="fade" style={{ marginTop: 16 }}>
            <div className="card card-pad" style={{ background: "#fbfbfa" }}>
              <span className={"pill " + (picked === q.answer ? "good" : "warn")}>
                {picked === q.answer ? "Correct" : "Not quite"}
              </span>
              <p className="small" style={{ margin: "10px 0 0", color: "var(--ink-2)" }}>{q.why}</p>
            </div>
            <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
              <button className="btn" onClick={next}>
                {i + 1 >= QUIZ.length ? "See results" : "Next question"} <Icon name="arrow" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- study sheet ---------- */

function StudySheet() {
  return (
    <div className="page fade">
      <PageHead title={SHEET.title} sub={`Condensed from Cell Biology, Lecture 4. ${SHEET.readTime}.`} />

      <div className="card card-pad sheet">
        <h4>The big idea</h4>
        <ul>{SHEET.big.map((b, n) => <li key={n}>{b}</li>)}</ul>

        <h4>Key terms</h4>
        <div className="terms">
          {SHEET.terms.map((t) => (
            <div key={t.t} className="term">
              <b>{t.t}</b>
              <span>{t.d}</span>
            </div>
          ))}
        </div>

        <h4>Where people lose marks</h4>
        <ul>{SHEET.watch.map((w, n) => <li key={n}>{w}</li>)}</ul>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn ghost">Export as PDF</button>
        <button className="btn ghost">Regenerate</button>
      </div>
    </div>
  );
}
