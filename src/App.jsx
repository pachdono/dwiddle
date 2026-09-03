import { useState } from "react";
import { MATERIALS, PLAN, QUIZ, SHEET, SAMPLE_NOTES } from "./mock.js";

/* ---------- icons ---------- */

const paths = {
  home: "M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1V9.5Z",
  plan: "M4 4h12v12H4zM7 2v3M13 2v3M4 8h12M8 11.5h4",
  quiz: "M7 7a3 3 0 1 1 3 3v2M10 15.5v.5",
  sheet: "M5 3h7l3 3v11H5zM12 3v3h3M7.5 10h5M7.5 13h5",
  library: "M4 4h4v12H4zM10 4h3v12h-3zM15 5l2 11",
  spark: "M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z",
  arrow: "M4 10h11M11 6l4 4-4 4",
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

const NAV = [
  { id: "home", label: "Dashboard", icon: "home" },
  { id: "plan", label: "Study plan", icon: "plan" },
  { id: "quiz", label: "Practice", icon: "quiz" },
  { id: "sheet", label: "Study sheet", icon: "sheet" },
];

export default function App() {
  const [page, setPage] = useState("home");

  const Page = { home: Dashboard, plan: StudyPlan, quiz: Practice, sheet: StudySheet }[page];
  const title = NAV.find((n) => n.id === page).label;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">D</span>
          Dwiddle
        </div>

        <nav className="nav">
          <div className="nav-label">Study</div>
          {NAV.map((n) => (
            <button key={n.id} className={"nav-item" + (page === n.id ? " on" : "")}
              onClick={() => setPage(n.id)}>
              <Icon name={n.icon} />
              {n.label}
            </button>
          ))}

          <div className="nav-label">Material</div>
          <button className="nav-item" onClick={() => setPage("home")}>
            <Icon name="library" />
            Library
          </button>
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
          <span className="crumb small">Cell Biology — Lecture 4</span>
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
            <h3>Today's plan</h3>
            <span className="pill accent">Day 2 of 3</span>
          </div>
          <div className="list">
            {PLAN[1].tasks.map((t) => (
              <div key={t.id} className="list-item" onClick={() => go("plan")}>
                <div style={{ flex: 1 }}>
                  <div className="list-title">{t.title}</div>
                  <div className="small muted">{t.sub}</div>
                </div>
                <span className="muted"><Icon name="arrow" /></span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid-2">
          <div className="card card-pad">
            <div className="spread" style={{ marginBottom: 12 }}>
              <b>Practice quiz</b>
              <span className="pill">5 questions</span>
            </div>
            <p className="muted small" style={{ marginTop: 0 }}>
              Pick up where you left off on membrane transport.
            </p>
            <button className="btn" onClick={() => go("quiz")}>Start practice</button>
          </div>

          <div className="card card-pad">
            <div className="spread" style={{ marginBottom: 12 }}>
              <b>Study sheet</b>
              <span className="pill">4 min read</span>
            </div>
            <p className="muted small" style={{ marginTop: 0 }}>
              A one-page condensation of the chapter, ready to review.
            </p>
            <button className="btn ghost" onClick={() => go("sheet")}>Open sheet</button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Your material</h3>
            <button className="btn quiet">Upload</button>
          </div>
          <div className="list">
            {MATERIALS.map((m) => (
              <div key={m.id} className="list-item">
                <div style={{ flex: 1 }}>
                  <div className="list-title">{m.title}</div>
                  <div className="small muted">{m.kind} · {m.pages} pages · added {m.added}</div>
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

/* ---------- study plan ---------- */

function StudyPlan() {
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState(3);
  const [state, run, reset] = useFakeRun(1000);
  const [done, setDone] = useState({});

  if (state === "done") {
    const plan = PLAN.slice(0, days);
    const total = plan.reduce((n, d) => n + d.tasks.length, 0);
    const finished = Object.values(done).filter(Boolean).length;

    return (
      <div className="page fade">
        <PageHead title="Your study plan" sub={`${days} days · ${total} tasks · generated from your notes`} />

        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="spread" style={{ marginBottom: 10 }}>
            <b className="small">Progress</b>
            <span className="small muted">{finished} of {total} done</span>
          </div>
          <div className="bar"><i style={{ width: `${(finished / total) * 100}%` }} /></div>
        </div>

        <div className="stack">
          {plan.map((d) => (
            <div key={d.day} className="day">
              <div className="day-head">
                <h4>Day {d.day} — {d.focus}</h4>
                <span className="pill">{d.minutes} min</span>
              </div>
              {d.tasks.map((t) => (
                <label key={t.id} className={"task" + (done[t.id] ? " done" : "")}>
                  <input type="checkbox" checked={!!done[t.id]}
                    onChange={() => setDone((p) => ({ ...p, [t.id]: !p[t.id] }))} />
                  <div>
                    <div className="task-title">{t.title}</div>
                    <div className="task-sub">{t.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 20 }}>
          <button className="btn ghost" onClick={reset}>Start over</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade">
      <PageHead title="Study plan" sub="Paste your notes and we'll split them into daily sessions." />

      <div className="card card-pad stack">
        <label className="field">
          <span>Your notes</span>
          <textarea placeholder="Paste lecture notes, a chapter, or a syllabus…"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="spread">
          <label className="field" style={{ width: 160 }}>
            <span>Days until the exam</span>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={1}>1 day</option>
              <option value={2}>2 days</option>
              <option value={3}>3 days</option>
            </select>
          </label>

          <div className="row">
            <button className="btn ghost" onClick={() => setNotes(SAMPLE_NOTES)}>Use sample</button>
            <button className="btn" disabled={!notes.trim() || state === "loading"} onClick={run}>
              {state === "loading" ? <Loading label="Building plan" /> : <><Icon name="spark" /> Generate plan</>}
            </button>
          </div>
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
        <PageHead title="Quiz complete" sub="Here's how that went." />
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
      <PageHead title="Practice" sub="Membrane transport · multiple choice" />

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
      <PageHead title={SHEET.title} sub={`Condensed from Cell Biology — Lecture 4 · ${SHEET.readTime}`} />

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
