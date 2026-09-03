import { useEffect, useState } from "react";
import {
  MATERIALS, TOPICS, QUIZ, BANK, DECKS, EXAM_SIZES, EXAM_TIMES,
  SHEET, SAMPLE_NOTES, DOC, HL_KINDS,
} from "./mock.js";
import { load, save, KEYS } from "./store.js";

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
  sun: "M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM10 2.5v1.6M10 15.9v1.6M17.5 10h-1.6M4.1 10H2.5M15.3 4.7l-1.1 1.1M5.8 14.2l-1.1 1.1M15.3 15.3l-1.1-1.1M5.8 5.8 4.7 4.7",
  moon: "M16 11.7A6.5 6.5 0 0 1 8.3 4a6.5 6.5 0 1 0 7.7 7.7Z",
  text: "M4 5.5h12M4 10h12M4 14.5h7",
  cards: "M6.5 6.5h9v9h-9zM4.5 13V4.5h8.5",
  exam: "M5 3h7l3 3v11H5zM12 3v3h3M7.5 11l1.5 1.5L12.5 9",
  bolt: "M11 2.5 4.5 11.5H9l-1 6 6.5-9H10z",
  timer: "M10 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM10 8v3l2 1.2M8 2.5h4",
  flag: "M5 17V3.5h9l-1.6 3 1.6 3H5",
  check: "M4.5 10.5 8 14l7.5-8",
};

// The gear needs a 24 grid, so it carries its own viewBox.
const GEAR = {
  viewBox: "0 0 24 24",
  d: [
    "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
    "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  ],
};

function Icon({ name, size = 16 }) {
  const gear = name === "gear";
  const d = gear ? GEAR.d : [paths[name]];
  return (
    <svg width={size} height={size} viewBox={gear ? GEAR.viewBox : "0 0 20 20"} fill="none"
      stroke="currentColor" strokeWidth={gear ? 1.8 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      {d.map((p, i) => <path key={i} d={p} />)}
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

const ALL_NAV = [...NAV_STUDY, ...NAV_MATERIAL, { id: "settings", label: "Settings" }, { id: "reader", label: "Material" }];

export default function App() {
  const [page, setPage] = useState("home");
  const [theme, setTheme] = useState(() => load(KEYS.theme, "light"));
  const [pMode, setPMode] = useState("quiz");
  const [missed, setMissed] = useState(() => load(KEYS.missed, []));

  // A question joins the list when you get it wrong and leaves when you get it right.
  function grade(id, correct) {
    setMissed((prev) => {
      const next = correct ? prev.filter((x) => x !== id) : prev.includes(id) ? prev : [...prev, id];
      save(KEYS.missed, next);
      return next;
    });
  }

  const go = (p, mode) => {
    if (mode) setPMode(mode);
    setPage(p);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    save(KEYS.theme, theme);
  }, [theme]);

  const Page = {
    home: Dashboard,
    topics: Topics,
    quiz: Practice,
    sheet: StudySheet,
    upload: AddMaterial,
    library: Library,
    settings: Settings,
    reader: Reader,
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
              onClick={() => go(n.id)}>
              <Icon name={n.icon} />
              {n.label}
            </button>
          ))}

          <div className="nav-label">Material</div>
          {NAV_MATERIAL.map((n) => (
            <button key={n.id} className={"nav-item" + (page === n.id ? " on" : "")}
              onClick={() => go(n.id)}>
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
          <button
            className={"icon-btn" + (page === "settings" ? " on" : "")}
            onClick={() => go("settings")}
            title="Settings"
            aria-label="Settings"
          >
            <Icon name="gear" size={17} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <span className="crumb small">Cell Biology, Lecture 4</span>
        </header>
        <Page
          key={page}
          go={go}
          theme={theme}
          setTheme={setTheme}
          missed={missed}
          setMissed={setMissed}
          grade={grade}
          pMode={pMode}
          setPMode={setPMode}
        />
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

// Fisher-Yates, so a paper is a different draw each time.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Renders a line of segments, highlighting the marked ones that are switched on.
function Marked({ parts, on }) {
  return parts.map((seg, i) =>
    !seg.mark || !on[seg.mark]
      ? <span key={i}>{seg.t}</span>
      : <mark key={i} className={"hl " + seg.mark}>{seg.t}</mark>,
  );
}

// The filter chips above any highlighted document.
function HighlightFilters({ on, setOn, counts }) {
  return (
    <div className="filters">
      {Object.entries(HL_KINDS).map(([k, v]) => (
        <button key={k} className={"filter " + k + (on[k] ? " on" : "")}
          onClick={() => setOn((p) => ({ ...p, [k]: !p[k] }))} title={v.hint}>
          <span className="swatch" />
          {v.label}
          <span className="count">{counts[k]}</span>
        </button>
      ))}
    </div>
  );
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
              <div key={m.id} className="list-item" onClick={() => go("reader")}>
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

  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const ready = !!file || words > 0;

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

        <div className="notes">
          <div className="notes-head">
            <div className="row">
              <span className="notes-icon"><Icon name="text" size={14} /></span>
              <b className="small">Paste your notes</b>
            </div>
            <button className="btn quiet" onClick={() => setNotes(SAMPLE_NOTES)}>Use sample</button>
          </div>

          <textarea
            className="notes-area"
            placeholder="Paste lecture notes, a chapter, or a syllabus."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="notes-foot">
            <span className="small muted">
              {state === "done"
                ? <span className="good-text">Ready. 12 questions across 5 topics.</span>
                : words === 0
                  ? "Plain text works best"
                  : `${words.toLocaleString()} words, about ${Math.max(1, Math.round(words / 120))} min to read`}
            </span>
            <button className="btn" disabled={!ready || state === "loading"}
              onClick={state === "done" ? () => go("quiz") : run}>
              {state === "loading"
                ? <Loading label="Reading material" />
                : state === "done"
                  ? <>Start practice <Icon name="arrow" /></>
                  : <><Icon name="spark" /> Generate questions</>}
            </button>
          </div>
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
            <div key={m.id} className="list-item" onClick={() => go("reader")}>
              <span className="muted"><Icon name="file" /></span>
              <div style={{ flex: 1 }}>
                <div className="list-title">{m.title}</div>
                <div className="small muted">{m.kind}, {m.pages} pages, added {m.added}</div>
              </div>
              <button className="btn ghost" onClick={(e) => { e.stopPropagation(); go("reader"); }}>Read</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- practice: modes ---------- */

const MODES = [
  { id: "quiz", label: "Quiz", icon: "quiz", sub: "Multiple choice, with an explanation after each answer." },
  { id: "cards", label: "Flashcards", icon: "cards", sub: "Pick a deck. Cards you know are retired and stop appearing." },
  { id: "mock", label: "Mock exam", icon: "exam", sub: "A full length paper against the clock, marked at the end." },
  { id: "speed", label: "Speed round", icon: "bolt", sub: "Sixty seconds. Answer as many as you can." },
  { id: "missed", label: "Missed", icon: "flag", sub: "Only the questions you have got wrong." },
];

function Practice(props) {
  const { pMode, setPMode, missed } = props;
  const active = MODES.find((m) => m.id === pMode) || MODES[0];
  const Mode = { quiz: QuizMode, cards: Flashcards, mock: MockExam, speed: SpeedRound, missed: MissedMode }[active.id];

  return (
    <div className="page fade">
      <PageHead title="Practice" sub={active.sub} />

      <div className="seg modes">
        {MODES.map((m) => (
          <button key={m.id} className={pMode === m.id ? "on" : ""} onClick={() => setPMode(m.id)}>
            <Icon name={m.icon} size={14} /> {m.label}
            {m.id === "missed" && missed.length > 0 && <span className="badge">{missed.length}</span>}
          </button>
        ))}
      </div>

      <Mode key={active.id} {...props} />
    </div>
  );
}

/* ---------- practice: quiz ---------- */

function QuizMode({ grade }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = QUIZ[i];

  function pick(n) {
    if (picked !== null) return;
    setPicked(n);
    const ok = n === q.answer;
    if (ok) setScore((s) => s + 1);
    grade(q.id, ok);
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
      <div className="fade">
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
    <div className="fade">
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
            <div className="card card-pad" style={{ background: "var(--panel)" }}>
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

const SHEET_PARTS = [
  ...SHEET.big,
  ...SHEET.watch,
  ...SHEET.terms.map((t) => t.d),
].flat();

function StudySheet() {
  const [on, setOn] = useState({ def: true, key: true, exam: true });

  const counts = { def: 0, key: 0, exam: 0 };
  SHEET_PARTS.forEach((seg) => { if (seg.mark) counts[seg.mark] += 1; });
  const total = counts.def + counts.key + counts.exam;

  return (
    <div className="page fade">
      <PageHead
        title={SHEET.title}
        sub={`Condensed from Cell Biology, Lecture 4. ${SHEET.readTime}, ${total} highlights.`}
      />

      <HighlightFilters on={on} setOn={setOn} counts={counts} />

      <div className="card card-pad sheet">
        <h4>The big idea</h4>
        <ul>
          {SHEET.big.map((line, n) => <li key={n}><Marked parts={line} on={on} /></li>)}
        </ul>

        <h4>Key terms</h4>
        <div className="terms">
          {SHEET.terms.map((t) => (
            <div key={t.t} className="term">
              <b>{t.t}</b>
              <span><Marked parts={t.d} on={on} /></span>
            </div>
          ))}
        </div>

        <h4>Where people lose marks</h4>
        <ul>
          {SHEET.watch.map((line, n) => <li key={n}><Marked parts={line} on={on} /></li>)}
        </ul>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn ghost">Export as PDF</button>
        <button className="btn ghost">Regenerate</button>
      </div>
    </div>
  );
}

/* ---------- settings ---------- */

function Switch({ on, onClick }) {
  return (
    <button className={"switch" + (on ? " on" : "")} onClick={onClick}
      role="switch" aria-checked={on}>
      <i />
    </button>
  );
}

function SetRow({ label, hint, children }) {
  return (
    <div className="set-row">
      <div>
        <div className="label">{label}</div>
        {hint && <div className="hint">{hint}</div>}
      </div>
      <div className="control">{children}</div>
    </div>
  );
}

function Settings({ theme, setTheme }) {
  const [name, setName] = useState("Pacharapol");
  const [goal, setGoal] = useState("20");
  const [style, setStyle] = useState("mixed");
  const [reminders, setReminders] = useState(true);
  const [sound, setSound] = useState(false);

  return (
    <div className="page fade">
      <PageHead title="Settings" sub="Preferences are saved to this browser." />

      <div className="stack">
        <div className="card">
          <div className="card-head"><h3>Appearance</h3></div>
          <SetRow label="Theme" hint="Dark mode applies across every page.">
            <div className="seg">
              <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}>
                <Icon name="sun" size={14} /> Light
              </button>
              <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}>
                <Icon name="moon" size={14} /> Dark
              </button>
            </div>
          </SetRow>
        </div>

        <div className="card">
          <div className="card-head"><h3>Profile</h3></div>
          <SetRow label="Display name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </SetRow>
          <SetRow label="Plan" hint="Pro is coming soon.">
            <span className="pill">Free</span>
          </SetRow>
        </div>

        <div className="card">
          <div className="card-head"><h3>Study</h3></div>
          <SetRow label="Daily goal" hint="How many questions counts as a day done.">
            <select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="10">10 questions</option>
              <option value="20">20 questions</option>
              <option value="40">40 questions</option>
            </select>
          </SetRow>
          <SetRow label="Question style">
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="mixed">Mixed</option>
              <option value="mcq">Multiple choice only</option>
              <option value="recall">Recall only</option>
            </select>
          </SetRow>
        </div>

        <div className="card">
          <div className="card-head"><h3>Notifications</h3></div>
          <SetRow label="Daily reminder" hint="A nudge if you have not studied by 8pm.">
            <Switch on={reminders} onClick={() => setReminders((v) => !v)} />
          </SetRow>
          <SetRow label="Sound effects" hint="A click on correct and incorrect answers.">
            <Switch on={sound} onClick={() => setSound((v) => !v)} />
          </SetRow>
        </div>

        <div className="row">
          <button className="btn ghost">Sign out</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- practice: flashcards ---------- */

// A card per bank question. The front asks, the back answers and explains.
const CARDS = BANK.map((q) => ({
  id: q.id,
  kind: q.kind,
  topic: q.topic,
  front: q.kind === "vocab" ? `Define: ${q.q}` : q.q,
  back: q.choices[q.answer],
  note: q.why,
}));

function Flashcards() {
  const [deck, setDeck] = useState("all");
  const [known, setKnown] = useState(() => load(KEYS.known, []));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [again, setAgain] = useState([]); // cards pushed to the back of the run

  const inDeck = CARDS.filter((c) => deck === "all" || c.kind === deck);
  const live = inDeck.filter((c) => !known.includes(c.id));
  const queue = [...live.filter((c) => !again.includes(c.id)), ...live.filter((c) => again.includes(c.id))];
  const card = queue[i];

  function retire(id) {
    const next = [...known, id];
    setKnown(next);
    save(KEYS.known, next);
    setFlipped(false);
    setI(0);
    setAgain((a) => a.filter((x) => x !== id));
  }

  function later(id) {
    setAgain((a) => (a.includes(id) ? a : [...a, id]));
    setFlipped(false);
    setI((n) => (n + 1 >= queue.length ? 0 : n + 1));
  }

  function reset() {
    const kept = known.filter((id) => !inDeck.some((c) => c.id === id));
    setKnown(kept);
    save(KEYS.known, kept);
    setAgain([]);
    setI(0);
    setFlipped(false);
  }

  function switchDeck(id) {
    setDeck(id);
    setI(0);
    setFlipped(false);
    setAgain([]);
  }

  // Space flips, 1 and 2 grade. Keeps a run of cards fast to get through.
  useEffect(() => {
    if (!card) return;
    function onKey(e) {
      const t = e.target;
      if (t && t.closest && t.closest("input, textarea, select")) return;
      if (e.code === "Space") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "1") later(card.id);
      if (e.key === "2") retire(card.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const retired = inDeck.length - live.length;

  const decks = (
    <div className="deck-picker">
      {DECKS.map((d) => {
        const all = CARDS.filter((c) => d.id === "all" || c.kind === d.id);
        const left = all.filter((c) => !known.includes(c.id)).length;
        return (
          <button key={d.id} className={"deck-chip" + (deck === d.id ? " on" : "")}
            onClick={() => switchDeck(d.id)} title={d.hint}>
            <b>{d.label}</b>
            <span>{left === 0 ? "all done" : `${left} left`}</span>
          </button>
        );
      })}
    </div>
  );

  if (!card) {
    return (
      <div className="fade">
        {decks}
        <div className="card card-pad" style={{ textAlign: "center", padding: 44 }}>
          <span className="speed-mark good-mark"><Icon name="check" size={22} /></span>
          <h3 style={{ margin: "12px 0 4px", fontSize: 17 }}>Deck clear</h3>
          <p className="muted small" style={{ margin: "0 0 20px" }}>
            You retired all {inDeck.length} cards in this deck. They will not come back until you reset it.
          </p>
          <button className="btn" onClick={reset}>Bring them back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade">
      {decks}

      <div className="deck-bar">
        <span className="small muted">Card {i + 1} of {queue.length}</span>
        <div className="pips">
          {queue.slice(0, 20).map((c, n) => (
            <span key={c.id} className={"pip" + (n < i ? " past" : n === i ? " now" : "")} />
          ))}
        </div>
        <span className="small muted">{retired} retired</span>
      </div>

      <div className="flip-scene" onClick={() => setFlipped((f) => !f)}>
        <div className={"flip-card" + (flipped ? " flipped" : "")}>
          <div className="flip-face front">
            <span className="flash-tag">{card.kind === "vocab" ? "Term" : "Question"}</span>
            <p className="flash-body">{card.front}</p>
            <span className="flash-foot">
              <span className="pill">{card.topic}</span>
              <span className="kbd-hint"><kbd>Space</kbd> to flip</span>
            </span>
          </div>

          <div className="flip-face back">
            <span className="flash-tag">Answer</span>
            <p className="flash-body answer">{card.back}</p>
            <p className="flash-note">{card.note}</p>
            <span className="flash-foot">
              <span className="pill">{card.topic}</span>
              <span className="kbd-hint"><kbd>Space</kbd> to flip back</span>
            </span>
          </div>
        </div>
      </div>

      <div className="deck-actions">
        <button className="btn ghost" onClick={() => later(card.id)}>
          Show again <kbd>1</kbd>
        </button>
        <button className="btn" onClick={() => retire(card.id)}>
          I know this <kbd>2</kbd>
        </button>
      </div>

      {retired > 0 && (
        <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
          <button className="btn quiet" onClick={reset}>Reset this deck</button>
        </div>
      )}
    </div>
  );
}

/* ---------- practice: mock exam ---------- */

function fmt(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function MockExam({ grade }) {
  const [stage, setStage] = useState("setup"); // setup | sitting | marked
  const [count, setCount] = useState(25);
  const [minutes, setMinutes] = useState(60);
  const [paper, setPaper] = useState([]);
  const [left, setLeft] = useState(0);
  const [answers, setAnswers] = useState({});
  const [i, setI] = useState(0);

  useEffect(() => {
    if (stage !== "sitting") return;
    if (left <= 0) { submit(); return; }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, left]);

  function start() {
    setPaper(shuffle(BANK).slice(0, count));
    setAnswers({});
    setI(0);
    setLeft(minutes * 60);
    setStage("sitting");
  }

  function submit() {
    paper.forEach((q, n) => grade(q.id, answers[n] === q.answer));
    setStage("marked");
  }

  if (stage === "setup") {
    return (
      <div className="fade card">
        <div className="card-head"><h3>Set the paper</h3></div>
        <SetRow label="Questions" hint="A full paper is 40. Shorter runs are for a single topic.">
          <div className="seg">
            {EXAM_SIZES.map((n) => (
              <button key={n} className={count === n ? "on" : ""} onClick={() => setCount(n)}>{n}</button>
            ))}
          </div>
        </SetRow>
        <SetRow label="Time limit" hint="The paper submits itself when the clock runs out.">
          <div className="seg">
            {EXAM_TIMES.map((m) => (
              <button key={m} className={minutes === m ? "on" : ""} onClick={() => setMinutes(m)}>
                {m >= 60 ? `${m / 60} hr` : `${m} min`}
              </button>
            ))}
          </div>
        </SetRow>
        <div className="set-row">
          <div className="hint">
            {count} questions in {minutes >= 60 ? `${minutes / 60} hour` : `${minutes} minutes`}, about{" "}
            {Math.round((minutes * 60) / count)} seconds each. No feedback until you submit.
          </div>
          <button className="btn" onClick={start}>Start exam</button>
        </div>
      </div>
    );
  }

  if (stage === "marked") {
    const right = paper.filter((q, n) => answers[n] === q.answer).length;
    const wrong = paper.filter((q, n) => answers[n] !== q.answer);
    return (
      <div className="fade stack">
        <div className="card card-pad" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em" }}>
            {Math.round((right / paper.length) * 100)}%
          </div>
          <div className="muted">{right} of {paper.length} correct</div>
          {wrong.length > 0 && (
            <div className="small muted" style={{ marginTop: 8 }}>
              {wrong.length} added to your missed questions.
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h3>Paper review</h3></div>
          {paper.map((q, n) => {
            const got = answers[n];
            const ok = got === q.answer;
            return (
              <div key={q.id} className="review">
                <span className={"pill " + (ok ? "good" : "warn")}>{ok ? "Correct" : "Wrong"}</span>
                <div>
                  <div className="list-title">{q.q}</div>
                  <div className="small muted">
                    You put {got === undefined ? "nothing" : q.choices[got]}. Answer: {q.choices[q.answer]}.
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="row">
          <button className="btn ghost" onClick={() => setStage("setup")}>New paper</button>
        </div>
      </div>
    );
  }

  const q = paper[i];
  const answered = Object.keys(answers).length;

  return (
    <div className="fade card card-pad">
      <div className="spread" style={{ marginBottom: 8 }}>
        <span className="small muted">Question {i + 1} of {paper.length}, {answered} answered</span>
        <span className={"clock" + (left <= 60 ? " low" : "")}>
          <Icon name="timer" size={14} /> {fmt(left)}
        </span>
      </div>
      <div className="bar" style={{ marginBottom: 22 }}>
        <i style={{ width: `${(answered / paper.length) * 100}%` }} />
      </div>

      <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {q.q}
      </h3>

      {q.choices.map((c, n) => (
        <button key={n}
          className={"choice" + (answers[i] === n ? " picked" : "")}
          onClick={() => setAnswers((a) => ({ ...a, [i]: n }))}>
          <span className="key">{"ABCD"[n]}</span>
          {c}
        </button>
      ))}

      <div className="spread" style={{ marginTop: 16 }}>
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
        <span className="small muted">{paper.length - answered} unanswered</span>
        {i + 1 < paper.length
          ? <button className="btn ghost" onClick={() => setI(i + 1)}>Next</button>
          : <button className="btn" onClick={submit}>Submit paper</button>}
      </div>
    </div>
  );
}

/* ---------- practice: missed questions ---------- */

function MissedMode({ missed, setMissed, grade, setPMode }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [list] = useState(() => BANK.filter((q) => missed.includes(q.id)));

  function clearAll() {
    setMissed([]);
    save(KEYS.missed, []);
  }

  if (list.length === 0) {
    return (
      <div className="fade card card-pad" style={{ textAlign: "center", padding: 44 }}>
        <span className="speed-mark good-mark"><Icon name="check" size={22} /></span>
        <h3 style={{ margin: "12px 0 4px", fontSize: 17 }}>Nothing missed yet</h3>
        <p className="muted small" style={{ margin: "0 0 20px" }}>
          Questions you get wrong in any mode are saved here, and leave the list once you get them right.
        </p>
        <button className="btn" onClick={() => setPMode("quiz")}>Take a quiz</button>
      </div>
    );
  }

  const q = list[i];
  const cleared = list.filter((x) => !missed.includes(x.id)).length;

  function pick(n) {
    if (picked !== null) return;
    setPicked(n);
    grade(q.id, n === q.answer);
  }

  function next() {
    setPicked(null);
    setI((n) => (n + 1 >= list.length ? 0 : n + 1));
  }

  return (
    <div className="fade">
      <div className="spread" style={{ marginBottom: 12 }}>
        <span className="small muted">
          {missed.length} still on the list, {cleared} cleared this run
        </span>
        <button className="btn quiet" onClick={clearAll}>Clear the list</button>
      </div>

      <div className="card card-pad">
        <div className="spread" style={{ marginBottom: 16 }}>
          <span className="small muted">Question {i + 1} of {list.length}</span>
          <span className="pill">{q.topic}</span>
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
            <div className="card card-pad" style={{ background: "var(--panel)" }}>
              <span className={"pill " + (picked === q.answer ? "good" : "warn")}>
                {picked === q.answer ? "Cleared from your list" : "Still on the list"}
              </span>
              <p className="small" style={{ margin: "10px 0 0", color: "var(--ink-2)" }}>{q.why}</p>
            </div>
            <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
              <button className="btn" onClick={next}>Next <Icon name="arrow" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- practice: speed round ---------- */

const ROUND = 60;

function SpeedRound({ grade }) {
  const [stage, setStage] = useState("ready"); // ready | running | over
  const [left, setLeft] = useState(ROUND);
  const [n, setN] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [flash, setFlash] = useState(null); // "hit" | "miss"

  const q = BANK[n % BANK.length];

  useEffect(() => {
    if (stage !== "running") return;
    if (left <= 0) { setStage("over"); return; }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, left]);

  function answer(pick) {
    const ok = pick === q.answer;
    grade(q.id, ok);
    setFlash(ok ? "hit" : "miss");
    setTimeout(() => setFlash(null), 180);
    if (ok) {
      setScore((v) => v + 1);
      setStreak((v) => {
        const next = v + 1;
        setBest((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
    setN((v) => v + 1);
  }

  function start() {
    setLeft(ROUND); setN(0); setScore(0); setStreak(0); setBest(0); setStage("running");
  }

  if (stage === "ready") {
    return (
      <div className="fade card card-pad" style={{ textAlign: "center", padding: 40 }}>
        <span className="speed-mark"><Icon name="bolt" size={22} /></span>
        <h3 style={{ margin: "12px 0 4px", fontSize: 17 }}>Sixty seconds on the clock</h3>
        <p className="muted small" style={{ margin: "0 0 20px" }}>
          No explanations, no going back. Answer as many as you can.
        </p>
        <button className="btn" onClick={start}>Start the round</button>
      </div>
    );
  }

  if (stage === "over") {
    return (
      <div className="fade card card-pad" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em" }}>{score}</div>
        <div className="muted" style={{ marginBottom: 4 }}>correct in {ROUND} seconds</div>
        <div className="small muted" style={{ marginBottom: 20 }}>Best streak: {best}</div>
        <button className="btn" onClick={start}>Run it again</button>
      </div>
    );
  }

  return (
    <div className={"fade card card-pad speed" + (flash ? " " + flash : "")}>
      <div className="spread" style={{ marginBottom: 8 }}>
        <span className="small muted">{score} correct, streak {streak}</span>
        <span className={"clock" + (left <= 10 ? " low" : "")}>
          <Icon name="timer" size={14} /> {fmt(left)}
        </span>
      </div>
      <div className="bar" style={{ marginBottom: 22 }}>
        <i style={{ width: `${(left / ROUND) * 100}%` }} />
      </div>

      <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
        {q.q}
      </h3>

      {q.choices.map((c, k) => (
        <button key={`${n}-${k}`} className="choice" onClick={() => answer(k)}>
          <span className="key">{"ABCD"[k]}</span>
          {c}
        </button>
      ))}
    </div>
  );
}

/* ---------- material reader ---------- */

// Flatten the document into a numbered list of highlights, so the rail and
// the body can point at the same thing.
const HIGHLIGHTS = DOC.blocks.flatMap((b, bi) =>
  b.p.flatMap((seg, si) => (seg.mark ? [{ id: `h${bi}-${si}`, ...seg, section: b.h }] : [])),
);

function Reader() {
  const [on, setOn] = useState({ def: true, key: true, exam: true });
  const [active, setActive] = useState(null);

  const shown = HIGHLIGHTS.filter((h) => on[h.mark]);

  function jump(id) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="page wide fade">
      <div className="page-head">
        <div className="spread">
          <div>
            <h2>{DOC.title}</h2>
            <p>{DOC.subtitle}, {DOC.pages} pages, {HIGHLIGHTS.length} highlights</p>
          </div>
          <button className="btn ghost">Export highlights</button>
        </div>
      </div>

      <HighlightFilters on={on} setOn={setOn} counts={{
        def: HIGHLIGHTS.filter((h) => h.mark === "def").length,
        key: HIGHLIGHTS.filter((h) => h.mark === "key").length,
        exam: HIGHLIGHTS.filter((h) => h.mark === "exam").length,
      }} />

      <div className="reader">
        <article className="doc">
          {DOC.blocks.map((b, bi) => (
            <section key={bi}>
              <h3>{b.h}</h3>
              <p>
                {b.p.map((seg, si) => {
                  const id = `h${bi}-${si}`;
                  if (!seg.mark || !on[seg.mark]) return <span key={si}>{seg.t}</span>;
                  return (
                    <mark key={si} id={id}
                      className={"hl " + seg.mark + (active === id ? " active" : "")}
                      onClick={() => setActive(id)}>
                      {seg.t}
                    </mark>
                  );
                })}
              </p>
            </section>
          ))}
        </article>

        <aside className="rail">
          <div className="rail-head">
            <b className="small">Highlights</b>
            <span className="small muted">{shown.length}</span>
          </div>

          {shown.length === 0 && <div className="empty small">Every type is switched off.</div>}

          {shown.map((h) => (
            <button key={h.id} className={"rail-item" + (active === h.id ? " on" : "")}
              onClick={() => jump(h.id)}>
              <span className={"tag " + h.mark}>{HL_KINDS[h.mark].label}</span>
              <span className="rail-text">{h.t}</span>
              {h.note && <span className="rail-note">{h.note}</span>}
              <span className="rail-src">{h.section}</span>
            </button>
          ))}
        </aside>
      </div>
    </div>
  );
}
