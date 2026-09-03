import { useEffect, useState } from "react";
import { DECKS, EXAM_SIZES, EXAM_TIMES, SAMPLE_NOTES, HL_KINDS } from "./mock.js";
import { load, save, loadSession, saveSession, clearSession, KEYS } from "./store.js";
import { useAuth, Account, SignInPage, Avatar } from "./Account.jsx";
import { pushProgress, localSnapshot, configured, userCount } from "./supabase.js";
import { generateFromNotes, gradeWriting } from "./ai.js";
import { Duck, DuckMark } from "./Duck.jsx";
import { Landing } from "./Landing.jsx";
import { TESTS, TEST_QUESTIONS, SECTIONS } from "./tests.js";
import { BUILDERS } from "./generate.js";
import { TASKS, RUBRICS } from "./tasks.js";
import { estimate } from "./scoring.js";

/* ---------- icons ---------- */

const paths = {
  home: "M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1V9.5Z",
  topics: "M4 5.5h12M4 10h12M4 14.5h8",
  quiz: "M7 7a3 3 0 1 1 3 3v2M10 15.5v.5",
  sheet: "M5 3h7l3 3v11H5zM12 3v3h3M7.5 10h5M7.5 13h5",
  target: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM10 13.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z",
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
  trash: "M4.5 6h11M8 6V4.5h4V6M6 6l.7 10.5h6.6L14 6M8.5 9v5M11.5 9v5",
  menu: "M3.5 6h13M3.5 10h13M3.5 14h13",
  close: "M5 5l10 10M15 5L5 15",
  pen: "M4 16h3l8.5-8.5a2.1 2.1 0 0 0-3-3L4 13z",
  mic: "M10 12.5a2.5 2.5 0 0 0 2.5-2.5V5a2.5 2.5 0 0 0-5 0v5a2.5 2.5 0 0 0 2.5 2.5ZM5 9.5a5 5 0 0 0 10 0M10 15v2.5",
  build: "M3 16.5h14M5.5 16.5v-5h3v5M11.5 16.5V6h3v10.5",
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

/* ---------- who is using it ---------- */

// Everything shown about the person comes from their account. Signed out, the
// app stays anonymous rather than greeting somebody else's name.
function displayName(user) {
  if (!user) return "Guest";
  const name = user.user_metadata?.name || user.user_metadata?.full_name;
  if (name) return String(name).split(" ")[0];
  return String(user.email || "You").split("@")[0];
}

function initialsOf(user) {
  const n = displayName(user);
  if (n === "Guest") return "?";
  const parts = n.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || n[0].toUpperCase();
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ---------- shell ---------- */

const NAV_STUDY = [
  { id: "home", label: "Dashboard", icon: "home" },
  { id: "topics", label: "Topics", icon: "topics" },
  { id: "quiz", label: "Practice", icon: "quiz" },
  { id: "sheet", label: "Study sheet", icon: "sheet" },
  { id: "tests", label: "Test prep", icon: "target" },
];

const NAV_MATERIAL = [
  { id: "upload", label: "Add material", icon: "upload" },
  { id: "library", label: "Library", icon: "library" },
];

const ALL_NAV = [...NAV_STUDY, ...NAV_MATERIAL, { id: "settings", label: "Settings" }, { id: "reader", label: "Material" }];

export default function App() {
  const [page, setPage] = useState("home");
  const [theme, setTheme] = useState(() => load(KEYS.theme, "system"));
  const [pMode, setPMode] = useState("quiz");
  const [missed, setMissed] = useState(() => load(KEYS.missed, []));
  const [stats, setStats] = useState(() => load(KEYS.stats, { answered: 0, correct: 0, days: [], byTopic: {} }));
  const [topic, setTopicRaw] = useState(() => load(KEYS.topic, null));
  const [hidden, setHiddenRaw] = useState(() => load(KEYS.hidden, []));

  function setHidden(next) {
    setHiddenRaw(next);
    save(KEYS.hidden, next);
  }

  // null means every topic. The choice is remembered between visits.
  function setTopic(name) {
    setTopicRaw(name);
    save(KEYS.topic, name);
  }

  // A question joins the list when you get it wrong and leaves when you get it right.
  function grade(id, correct, topicName) {
    setMissed((prev) => {
      const next = correct ? prev.filter((x) => x !== id) : prev.includes(id) ? prev : [...prev, id];
      save(KEYS.missed, next);
      return next;
    });

    // The dashboard numbers come from here, so they are yours rather than a
    // decorative placeholder.
    setStats((prev) => {
      const today = new Date().toISOString().slice(0, 10);
      const days = prev.days.includes(today) ? prev.days : [...prev.days, today].slice(-400);
      const byTopic = { ...(prev.byTopic || {}) };
      if (topicName) {
        const t = byTopic[topicName] || { right: 0, total: 0 };
        byTopic[topicName] = { right: t.right + (correct ? 1 : 0), total: t.total + 1 };
      }
      const next = {
        answered: prev.answered + 1,
        correct: prev.correct + (correct ? 1 : 0),
        days,
        byTopic,
      };
      save(KEYS.stats, next);
      return next;
    });
  }

  // Clicking the nav item for the page you are already on resets it, which is
  // how you get out of an open practice set or test without hunting for a back
  // button. Bumping the seq remounts the page component.
  const [seq, setSeq] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [bannerOff, setBannerOffRaw] = useState(() => load(KEYS.bannerOff, false));

  function dismissBanner() {
    setBannerOffRaw(true);
    save(KEYS.bannerOff, true);
  }

  // Signing out returns you to the landing page rather than dropping you into
  // an empty app with no explanation.
  const auth = useAuth(() => {
    clearSession(KEYS.entered);
    setEnteredRaw(false);
  });

  // Session storage, so closing the tab brings the landing page back. Anyone
  // signed in skips it entirely, because their work is already safe.
  const [entered, setEnteredRaw] = useState(() => loadSession(KEYS.entered, false));
  const [people, setPeople] = useState(null);

  function enter() {
    setEnteredRaw(true);
    saveSession(KEYS.entered, true);
  }

  // Worth saying only when there is an account to be had and none in use.
  const warnUnsaved = configured && !auth.user && !bannerOff;

  // Read once for the landing page. The dashboard keeps its own copy current.
  useEffect(() => {
    let live = true;
    userCount().then((n) => live && setPeople(n));
    return () => { live = false; };
  }, []);
  const [made, setMadeRaw] = useState(() => load(KEYS.made, null));

  function setMade(data) {
    setMadeRaw(data);
    save(KEYS.made, data);
  }

  // Everything comes from the person's own notes. There is no built in content.
  const bank = made ? made.questions : [];
  const topics = made ? made.topics.map((t) => ({ ...t, material: "made", source: made.title })) : [];
  const materials = made ? [{ id: "made", title: made.title, kind: "Yours" }] : [];

  // Push progress up whenever it changes, debounced so a run of answers does
  // not become a run of requests.
  useEffect(() => {
    if (!auth.user) return;
    const t = setTimeout(() => pushProgress(auth.user.id, localSnapshot()), 1200);
    return () => clearTimeout(t);
  }, [auth.user, missed, hidden, topic, theme]);

  const go = (p, mode) => {
    if (mode) setPMode(mode);
    if (p === page) setSeq((n) => n + 1);
    setPage(p);
    setMenuOpen(false);
  };

  // "system" means whatever the device is set to, and it keeps following it if
  // that changes while the app is open. Before this, a first time visitor was
  // always shown the light theme regardless of their device.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const resolved = theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
    };

    apply();
    save(KEYS.theme, theme);

    if (theme !== "system") return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  const Page = {
    home: Dashboard,
    topics: Topics,
    quiz: Practice,
    sheet: StudySheet,
    upload: AddMaterial,
    library: Library,
    settings: Settings,
    tests: TestPrep,
  }[page];

  const title = ALL_NAV.find((n) => n.id === page).label;

  // Someone signed in, or who has been here before, goes straight to the app.
  if (signInOpen && !auth.user) {
    return <SignInPage onClose={() => { setSignInOpen(false); enter(); }} />;
  }

  if (!auth.user && !entered && auth.ready) {
    return <Landing people={people} onSignIn={() => setSignInOpen(true)} onSkip={enter} />;
  }

  return (
    <div className="app">
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}

      <aside className={"sidebar" + (menuOpen ? " open" : "")}>
        <button className="icon-btn drawer-close" aria-label="Close menu"
          onClick={() => setMenuOpen(false)}>
          <Icon name="close" size={16} />
        </button>
        <div className="brand">
          <DuckMark size={26} className="brand-mark-duck" />
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
          {auth.user ? (
            <div className="user">
              <Avatar user={auth.user} size={26} initials={initialsOf(auth.user)} />
              <div style={{ minWidth: 0 }}>
                <div className="user-name">{displayName(auth.user)}</div>
                <div className="user-sub">Synced</div>
              </div>
            </div>
          ) : (
            <button className="user user-button" onClick={() => setSignInOpen(true)}>
              <span className="avatar">{initialsOf(null)}</span>
              <div style={{ minWidth: 0 }}>
                <div className="user-name">Sign in</div>
                <div className="user-sub">{configured ? "To save your progress" : "Not available yet"}</div>
              </div>
            </button>
          )}
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
        {warnUnsaved && (
          <div className="notice">
            <span className="notice-dot" />
            <span className="notice-text">
              <b>Not signed in.</b> Progress is saved in this browser only, and clearing your
              browser data will erase it.
            </span>
            <button className="btn" onClick={() => setSignInOpen(true)}>Sign in</button>
            <button className="icon-btn" aria-label="Dismiss" onClick={dismissBanner}>
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label="Open menu"
            onClick={() => setMenuOpen(true)}>
            <Icon name="menu" size={18} />
          </button>
          <h1>{title}</h1>
          <span className="crumb small">{made ? made.title : ""}</span>
        </header>
        <Page
          key={`${page}:${seq}`}
          go={go}
          theme={theme}
          setTheme={setTheme}
          missed={missed}
          setMissed={setMissed}
          grade={grade}
          pMode={pMode}
          setPMode={setPMode}
          topic={topic}
          setTopic={setTopic}
          hidden={hidden}
          setHidden={setHidden}
          stats={stats}
          made={made}
          setMade={setMade}
          bank={bank}
          topics={topics}
          materials={materials}
          auth={auth}
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

// Consecutive days ending today or yesterday. Missing a day resets it, which
// is the only definition of a streak anybody finds convincing.
function streakOf(days) {
  if (!days || days.length === 0) return 0;
  const set = new Set(days);
  const day = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  if (!set.has(iso(day))) {
    day.setDate(day.getDate() - 1);
    if (!set.has(iso(day))) return 0;
  }
  let n = 0;
  while (set.has(iso(day))) {
    n += 1;
    day.setDate(day.getDate() - 1);
  }
  return n;
}

function Dashboard({ go, auth, stats, missed, topics, materials, made }) {
  // Only shown if the database actually answers. No number is better than an
  // invented one. It refreshes on its own so the figure stays current without
  // a reload: every 30 seconds while the tab is in front, and immediately when
  // you come back to it. Hidden tabs skip the call rather than polling in the
  // background for nothing.
  const [people, setPeople] = useState(null);

  useEffect(() => {
    let live = true;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      userCount().then((n) => { if (live) setPeople(n); });
    };

    tick();
    const timer = setInterval(tick, 30000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);

    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);
  // Weakest first, and only topics you have actually attempted.
  const attempted = topics
    .map((t) => ({ t, seen: stats.byTopic?.[t.name] }))
    .filter((x) => x.seen && x.seen.total > 0)
    .sort((a, b) => a.seen.right / a.seen.total - b.seen.right / b.seen.total)
    .slice(0, 3);
  const upNext = attempted.length > 0 ? attempted : topics.slice(0, 3).map((t) => ({ t, seen: null }));
  const started = stats.answered > 0;
  const accuracy = started ? Math.round((stats.correct / stats.answered) * 100) : 0;

  return (
    <div className="page wide fade">
      <PageHead
        title={`${greeting()}${auth?.user ? `, ${displayName(auth.user)}` : ""}`}
        sub={started
          ? `${stats.answered} question${stats.answered === 1 ? "" : "s"} answered so far. Pick up where you left off.`
          : topics.length > 0
            ? "Ready when you are."
            : "Turn your notes into questions, and sit full length practice papers."}
      />

      <div className="stack">
        <div className="grid-3">
          <div className="stat">
            <div className="k">Study streak</div>
            <div className="v">
              {(() => { const n = streakOf(stats.days); return n === 0 ? "None yet" : `${n} day${n === 1 ? "" : "s"}`; })()}
            </div>
          </div>
          <div className="stat">
            <div className="k">Questions answered</div>
            <div className="v">{stats.answered}</div>
          </div>
          <div className="stat">
            <div className="k">Accuracy</div>
            <div className="v">{started ? `${accuracy}%` : "Not yet"}</div>
          </div>
        </div>

        {topics.length === 0 && (
          <div className="card card-pad welcome">
            <Duck size={72} className="welcome-duck" />
            <div style={{ flex: 1 }}>
              <b>Nothing here yet</b>
              <div className="small muted">
                Paste your notes or drop a PDF, and it writes the topics, the questions and an
                explanation for every answer.
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => go("upload")}>
                  <Icon name="upload" size={14} /> Add material
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card card-pad pitch">
          <div className="pitch-main">
            {people !== null && people > 0 && (
              <b>
                {people.toLocaleString()} {people === 1 ? "person is" : "people are"} studying with Dwiddle
              </b>
            )}
            <p className="small muted">
              Turn your own notes into questions, and sit full length timed practice for the
              <b> SAT</b>, <b>ACT</b>, <b>SSAT</b>, <b>IELTS</b> and <b>TOEFL</b>, marked and
              converted to each test's own score scale.
            </p>
          </div>
          <button className="btn ghost" onClick={() => go("tests")}>
            <Icon name="target" size={14} /> Test prep
          </button>
        </div>

        {topics.length > 0 && (
          <div className="card">
            <div className="card-head">
              <h3>{attempted.length > 0 ? "Weakest topics" : "Your topics"}</h3>
              <button className="btn quiet" onClick={() => go("topics")}>See all</button>
            </div>
            <div className="list">
              {upNext.map(({ t, seen }) => (
                <div key={t.id} className="list-item" onClick={() => go("topics")}>
                  <div style={{ flex: 1 }}>
                    <div className="list-title">{t.name}</div>
                    <div className="small muted">{t.reason}</div>
                  </div>
                  <span className="small muted">
                    {seen ? `${Math.round((seen.right / seen.total) * 100)}%` : "Not started"}
                  </span>
                  <span className="muted"><Icon name="arrow" /></span>
                </div>
              ))}
            </div>
          </div>
        )}

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
              {made?.sheet && <span className="pill accent">Yours</span>}
            </div>
            <p className="muted small" style={{ marginTop: 0 }}>
              {made?.sheet
                ? "A one page condensation with the important bits marked."
                : "Add material and a study sheet is written along with the questions."}
            </p>
            <button className="btn ghost" disabled={!made?.sheet}
              onClick={() => go("sheet")}>Open sheet</button>
          </div>
        </div>

        {materials.length > 0 && (
          <div className="card">
            <div className="card-head">
              <h3>Your material</h3>
              <button className="btn quiet" onClick={() => go("upload")}>Add</button>
            </div>
            <div className="list">
              {materials.map((m) => (
                <div key={m.id} className="list-item" onClick={() => go(m.id === "made" ? "quiz" : "reader")}>
                  <div style={{ flex: 1 }}>
                    <div className="list-title">{m.title}</div>
                    <div className="small muted">
                      {m.pages ? `${m.pages} pages` : "Generated from your notes"}
                    </div>
                  </div>
                  <span className={"pill" + (m.kind === "Yours" ? " accent" : "")}>{m.kind}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- recommended topics ---------- */

function TopicRow({ t, go, topic, setTopic, onHide, stats }) {
  const current = topic === t.name;
  const seen = stats?.byTopic?.[t.name];
  const mastery = seen && seen.total > 0 ? Math.round((seen.right / seen.total) * 100) : null;
  return (
    <div className={"topic" + (current ? " current" : "")}>
      <div className="topic-main">
        <div className="spread">
          <div className="row">
            <div className="list-title">{t.name}</div>
            {current && <span className="pill accent">Currently learning</span>}
          </div>
          {mastery === null
            ? <span className="pill">Not started</span>
            : <span className={"pill " + (mastery < 50 ? "warn" : mastery < 75 ? "" : "good")}>
                {mastery}% of {seen.total} right
              </span>}
        </div>
        <div className="small muted" style={{ margin: "2px 0 10px" }}>{t.reason}</div>
        <div className="bar"><i style={{ width: `${mastery ?? 0}%` }} /></div>
        <div className="small muted" style={{ marginTop: 8 }}>
          {t.questions} questions available
        </div>
      </div>
      <div className="row">
        <button className="icon-btn" title={`Remove ${t.name}`} aria-label={`Remove ${t.name}`}
          onClick={() => onHide(t.id)}>
          <Icon name="trash" size={15} />
        </button>
        <button className={current ? "btn" : "btn ghost"}
          onClick={() => { setTopic(t.name); go("quiz"); }}>
          {current ? "Continue" : "Learn this"}
        </button>
      </div>
    </div>
  );
}

function Topics({ go, topic, setTopic, hidden, setHidden, topics: allTopics, materials, stats }) {
  const [justHidden, setJustHidden] = useState(null);

  function hide(id) {
    const t = allTopics.find((x) => x.id === id);
    setHidden([...hidden, id]);
    setJustHidden(t);
    // Removing the topic you were learning drops you back to everything.
    if (topic === t.name) setTopic(null);
  }

  const live = allTopics.filter((t) => !hidden.includes(t.id));

  // Grouped by the material they came from, so several courses can coexist.
  const groups = materials
    .map((m) => ({ material: m, topics: live.filter((t) => t.material === m.id) }))
    .filter((g) => g.topics.length > 0);

  return (
    <div className="page fade">
      <PageHead
        title="Topics"
        sub="Grouped by the material they came from. Your score on each appears once you have answered some."
      />

      <div className="spread learning-bar" style={{ marginBottom: 18 }}>
        <div>
          <span className="small muted">Currently learning</span>
          <div className="list-title">{topic || "All topics"}</div>
        </div>
        {topic && <button className="btn quiet" onClick={() => setTopic(null)}>Practise all topics instead</button>}
      </div>

      {justHidden && (
        <div className="undo-bar fade">
          <span className="small">Removed {justHidden.name}.</span>
          <button className="btn quiet" onClick={() => {
            setHidden(hidden.filter((id) => id !== justHidden.id));
            setJustHidden(null);
          }}>
            Undo
          </button>
        </div>
      )}

      <div className="stack">
        {groups.map((g) => (
          <div key={g.material.id}>
            <div className="group-head">
              <div className="row">
                <span className="muted"><Icon name="file" size={14} /></span>
                <b className="small">{g.material.title}</b>
              </div>
              <span className="small muted">{g.topics.length} topics</span>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {g.topics.map((t) => (
                <TopicRow key={t.id} t={t} go={go} topic={topic} setTopic={setTopic} onHide={hide} stats={stats} />
              ))}
            </div>
          </div>
        ))}

        {live.length === 0 && (
          <div className="card card-pad" style={{ textAlign: "center", padding: 40 }}>
            <Duck size={80} />
            <b style={{ display: "block", marginTop: 10 }}>
              {hidden.length > 0 ? "You have removed every topic" : "No topics yet"}
            </b>
            <p className="muted small" style={{ margin: "6px auto 18px", maxWidth: 380 }}>
              {hidden.length > 0
                ? "Restore them below to start again."
                : "Topics appear once you add your own notes."}
            </p>
            {hidden.length === 0 && (
              <button className="btn" onClick={() => go("upload")}>Add material</button>
            )}
          </div>
        )}

        {hidden.length > 0 && (
          <div className="card card-pad spread">
            <div>
              <b className="small">{hidden.length} topic{hidden.length === 1 ? "" : "s"} removed</b>
              <div className="small muted">
                {allTopics.filter((t) => hidden.includes(t.id)).map((t) => t.name).join(", ")}
              </div>
            </div>
            <button className="btn ghost" onClick={() => { setHidden([]); setJustHidden(null); }}>
              Restore all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- add material ---------- */

// Reads a PDF in the browser. pdf.js is larger than the rest of the app, so it
// is imported only at the moment someone actually picks a PDF.
async function readFile(file) {
  if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let text = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(" ") + "\n";
    }
    if (!text.trim()) {
      throw new Error("That PDF has no selectable text, so it is probably a scan. Reading those needs OCR, which this does not do yet.");
    }
    return text;
  }
  return file.text();
}

function AddMaterial({ go, setMade }) {
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [over, setOver] = useState(false);
  const [state, setState] = useState("idle"); // idle | reading | working | done | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const ready = !!file || words > 0;

  async function onDrop(e) {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  async function run() {
    setError("");
    let text = notes;

    if (file) {
      setState("reading");
      try {
        text = await readFile(file);
      } catch (err) {
        setState("error");
        setError(err.message);
        return;
      }
    }

    setState("working");
    try {
      const data = await generateFromNotes(text);
      setResult(data);
      setMade(data);
      setState("done");
    } catch (err) {
      setState("error");
      setError(err.message);
    }
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
              {state === "reading" ? "Reading the file"
                : words === 0 ? "Plain text works best"
                : `${words.toLocaleString()} words, about ${Math.max(1, Math.round(words / 120))} min to read`}
            </span>
            <button className="btn" disabled={!ready || state === "reading" || state === "working"}
              onClick={state === "done" ? () => go("quiz") : run}>
              {state === "reading" ? <Loading label="Reading file" />
                : state === "working" ? <Loading label="Building questions" />
                : state === "done" ? <>Start practice <Icon name="arrow" /></>
                : <><Icon name="spark" /> Generate questions</>}
            </button>
          </div>
        </div>

        {state === "working" && (
          <div className="card card-pad note-card fade">
            <b className="small">This takes a few seconds</b>
            <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-2)" }}>
              The model is reading your notes and writing the topics, the questions, the explanation
              for each answer, and the study sheet in one pass.
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="card card-pad fade" style={{ borderColor: "var(--warn-line)" }}>
            <span className="pill warn">Could not generate</span>
            <p className="small" style={{ margin: "10px 0 0", color: "var(--ink-2)" }}>{error}</p>
          </div>
        )}

        {state === "done" && result && (
          <div className="card fade">
            <div className="card-head">
              <h3>{result.title}</h3>
              <span className="pill good">Ready</span>
            </div>
            <div className="drill-note small muted">
              {result.questions.length} questions across {result.topics.length} topics, each with the
              answer explained. {result.sheet ? "A study sheet was written too." : ""}
            </div>
            {result.topics.map((t) => (
              <div key={t.id} className="sec-row">
                <div className="sec-main">
                  <span className="list-title">{t.name}</span>
                  <div className="small muted">{t.reason}</div>
                </div>
                <span className="pill">{t.questions} questions</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- library ---------- */

function Library({ go, made, materials }) {
  return (
    <div className="page fade">
      <PageHead title="Library" sub="Everything you have added so far." />
      {materials.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", padding: 44 }}>
          <Duck size={84} />
          <b style={{ display: "block", marginTop: 10 }}>Your library is empty</b>
          <p className="muted small" style={{ margin: "6px auto 18px", maxWidth: 400 }}>
            Anything you add shows up here, along with the topics and questions written from it.
          </p>
          <button className="btn" onClick={() => go("upload")}>Add material</button>
        </div>
      ) : (
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h3>{materials.length} item{materials.length === 1 ? "" : "s"}</h3>
              <button className="btn quiet" onClick={() => go("upload")}>Add material</button>
            </div>
            <div className="list">
              {materials.map((m) => (
                <div key={m.id} className="list-item"
                  onClick={() => go(m.id === "made" ? "quiz" : "reader")}>
                  <span className="muted"><Icon name={m.id === "made" ? "spark" : "file"} /></span>
                  <div style={{ flex: 1 }}>
                    <div className="list-title">{m.title}</div>
                    <div className="small muted">
                      {m.pages ? `${m.pages} pages` : "Generated from your notes"}
                    </div>
                  </div>
                  <span className={"pill" + (m.kind === "Yours" ? " accent" : "")}>{m.kind}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
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

const QUIZ_LENGTHS = [5, 10, 15, 20];

function Practice(props) {
  const { pMode, setPMode, missed, topic, setTopic, go, hidden, bank, topics } = props;
  const active = MODES.find((m) => m.id === pMode) || MODES[0];
  const Mode = { quiz: QuizMode, cards: Flashcards, mock: MockExam, speed: SpeedRound, missed: MissedMode }[active.id];
  const [quizLen, setQuizLenRaw] = useState(() => load(KEYS.quizLen, 5));

  function setQuizLen(n) {
    setQuizLenRaw(n);
    save(KEYS.quizLen, n);
  }

  // Removed topics drop out of practice too, otherwise removing one from the
  // list would not actually declutter anything.
  const liveTopics = topics.filter((t) => !hidden.includes(t.id)).map((t) => t.name);
  const choices = [...new Set(bank.map((q) => q.topic))].filter((t) => liveTopics.includes(t));

  // Every mode draws from here, so changing the topic changes the whole page.
  const pool = topic
    ? bank.filter((q) => q.topic === topic)
    : bank.filter((q) => liveTopics.includes(q.topic));

  return (
    <div className="page fade">
      <PageHead title="Practice" sub={active.sub} />

      <div className="learning-bar">
        <div className="learning-main">
          <span className="small muted">Currently learning</span>
          <div className="learning-name">{topic || "All topics"}</div>
          <div className="small muted">
            {pool.length} question{pool.length === 1 ? "" : "s"} in this set
            {topic ? "" : `, across ${choices.length} topics`}
          </div>
        </div>
        <div className="row">
          <label className="field topic-pick">
            <select value={topic || ""} onChange={(e) => setTopic(e.target.value || null)}>
              <option value="">All topics</option>
              {choices.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <button className="btn ghost" onClick={() => go("topics")}>Choose in Topics</button>
        </div>
      </div>

      <div className="spread mode-bar">
        <div className="seg modes">
          {MODES.map((m) => (
            <button key={m.id} className={pMode === m.id ? "on" : ""} onClick={() => setPMode(m.id)}>
              <Icon name={m.icon} size={14} /> {m.label}
              {m.id === "missed" && missed.length > 0 && <span className="badge">{missed.length}</span>}
            </button>
          ))}
        </div>

        {pMode === "quiz" && (
          <label className="len-pick">
            <span className="small muted">Questions</span>
            <div className="seg tight">
              {QUIZ_LENGTHS.map((n) => (
                <button key={n} className={quizLen === n ? "on" : ""}
                  disabled={n > pool.length}
                  onClick={() => setQuizLen(n)}>
                  {n}
                </button>
              ))}
            </div>
            {quizLen > pool.length && (
              <span className="small muted">using {pool.length}</span>
            )}
          </label>
        )}
      </div>

      {pool.length === 0 && active.id !== "missed" ? (
        <div className="card card-pad" style={{ textAlign: "center", padding: 40 }}>
          <Duck size={80} />
          <b style={{ display: "block", marginTop: 10 }}>Nothing to practise</b>
          <p className="muted small" style={{ margin: "6px 0 18px" }}>
            {topic
              ? "That topic has no questions left."
              : "You have removed every topic. Restore one, or add some material of your own."}
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn ghost" onClick={() => go("topics")}>Open Topics</button>
            <button className="btn" onClick={() => go("upload")}>Add material</button>
          </div>
        </div>
      ) : (
        <Mode key={active.id + ":" + (topic || "all") + ":" + quizLen} {...props} pool={pool} len={quizLen} />
      )}
    </div>
  );
}

/* ---------- practice: quiz ---------- */

function QuizMode({ grade, pool, len }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [QUIZ] = useState(() => shuffle(pool).slice(0, Math.min(len, pool.length)));

  const q = QUIZ[i];

  function pick(n) {
    if (picked !== null) return;
    setPicked(n);
    const ok = n === q.answer;
    if (ok) setScore((s) => s + 1);
    grade(q.id, ok, q.topic);
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

function sheetParts(sheet) {
  return [
    ...(sheet.big || []),
    ...(sheet.watch || []),
    ...(sheet.terms || []).map((t) => t.d),
  ].flat().filter(Boolean);
}

function StudySheet({ made, go }) {
  const [on, setOn] = useState({ def: true, key: true, exam: true });
  const sheet = made?.sheet?.big ? made.sheet : null;

  if (!sheet) {
    return (
      <div className="page fade">
        <PageHead title="Study sheet" sub="A one page condensation, with the important bits marked." />
        <div className="card card-pad" style={{ textAlign: "center", padding: 44 }}>
          <Duck size={84} />
          <b style={{ display: "block", marginTop: 10 }}>No study sheet yet</b>
          <p className="muted small" style={{ margin: "6px auto 18px", maxWidth: 400 }}>
            One is written automatically when you add your own notes, alongside the questions.
          </p>
          <button className="btn" onClick={() => go("upload")}>
            <Icon name="upload" size={14} /> Add material
          </button>
        </div>
      </div>
    );
  }

  const counts = { def: 0, key: 0, exam: 0 };
  sheetParts(sheet).forEach((seg) => { if (seg?.mark && counts[seg.mark] !== undefined) counts[seg.mark] += 1; });
  const total = counts.def + counts.key + counts.exam;

  return (
    <div className="page fade">
      <PageHead
        title={sheet.title || "Study sheet"}
        sub={`Written from your own notes. ${total} highlight${total === 1 ? "" : "s"}.`}
      />

      <HighlightFilters on={on} setOn={setOn} counts={counts} />

      <div className="card card-pad sheet">
        <h4>The big idea</h4>
        <ul>
          {(sheet.big || []).map((line, n) => <li key={n}><Marked parts={line} on={on} /></li>)}
        </ul>

        <h4>Key terms</h4>
        <div className="terms">
          {(sheet.terms || []).map((t) => (
            <div key={t.t} className="term">
              <b>{t.t}</b>
              <span><Marked parts={t.d} on={on} /></span>
            </div>
          ))}
        </div>

        <h4>Where people lose marks</h4>
        <ul>
          {(sheet.watch || []).map((line, n) => <li key={n}><Marked parts={line} on={on} /></li>)}
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

function Settings({ theme, setTheme, auth }) {
  const [name, setName] = useState(() => displayName(auth?.user));
  const [goal, setGoal] = useState("20");
  const [style, setStyle] = useState("mixed");
  const [reminders, setReminders] = useState(true);
  const [sound, setSound] = useState(false);

  return (
    <div className="page fade">
      <PageHead title="Settings" sub="Preferences are saved to this browser." />

      <div className="stack">
        <Account user={auth?.user} syncedAt={auth?.syncedAt} signOut={auth?.signOut} />

        <div className="card">
          <div className="card-head"><h3>Appearance</h3></div>
          <SetRow label="Theme" hint="System follows whatever your device is set to.">
            <div className="seg">
              <button className={theme === "system" ? "on" : ""} onClick={() => setTheme("system")}>
                System
              </button>
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
          <SetRow label="Display name" hint={auth?.user ? undefined : "Sign in to save this."}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </SetRow>
          <SetRow label="Plan" hint="Pro is coming soon.">
            <span className="pill">Free</span>
          </SetRow>
          <SetRow label="Sync" hint={configured ? "Signed in accounts sync automatically." : "Not configured on this deployment."}>
            <span className={"pill " + (auth?.user ? "good" : "")}>
              {auth?.user ? "On" : configured ? "Sign in to enable" : "Off"}
            </span>
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


      </div>
    </div>
  );
}

/* ---------- practice: flashcards ---------- */

// A card per bank question. The front asks, the back answers and explains.
function cardsFrom(questions) {
  return questions.map((q) => ({
    id: q.id,
    kind: q.kind,
    topic: q.topic,
    front: q.kind === "vocab" ? `Define: ${q.q}` : q.q,
    back: q.choices[q.answer],
    note: q.why,
  }));
}

function Flashcards({ pool }) {
  const [deck, setDeck] = useState("all");
  const [known, setKnown] = useState(() => load(KEYS.known, []));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [again, setAgain] = useState([]); // cards pushed to the back of the run

  const deckSource = cardsFrom(pool);
  const inDeck = deckSource.filter((c) => deck === "all" || c.kind === deck);
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
        const all = deckSource.filter((c) => d.id === "all" || c.kind === d.id);
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
          <Duck size={92} />
          <h3 style={{ margin: "10px 0 4px", fontSize: 17 }}>Deck clear</h3>
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

function MockExam({ grade, pool }) {
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
    setPaper(shuffle(pool).slice(0, Math.min(count, pool.length)));
    setAnswers({});
    setI(0);
    setLeft(minutes * 60);
    setStage("sitting");
  }

  function submit() {
    paper.forEach((q, n) => grade(q.id, answers[n] === q.answer, q.topic));
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
            {pool.length < count ? (
              <>
                Only {pool.length} questions exist for the topic you are learning, so the paper will
                run to {pool.length}. Switch to all topics for a full {count} question paper.
              </>
            ) : (
              <>
                {count} questions in {minutes >= 60 ? `${minutes / 60} hour` : `${minutes} minutes`}, about{" "}
                {Math.round((minutes * 60) / count)} seconds each. No feedback until you submit.
              </>
            )}
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

function MissedMode({ missed, setMissed, grade, setPMode, bank }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [list] = useState(() => [...bank, ...TEST_QUESTIONS].filter((q) => missed.includes(q.id)));

  function clearAll() {
    setMissed([]);
    save(KEYS.missed, []);
  }

  if (list.length === 0) {
    return (
      <div className="fade card card-pad" style={{ textAlign: "center", padding: 44 }}>
        <Duck size={92} />
        <h3 style={{ margin: "10px 0 4px", fontSize: 17 }}>Nothing missed yet</h3>
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
    grade(q.id, n === q.answer, q.topic);
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

function SpeedRound({ grade, pool }) {
  const [stage, setStage] = useState("ready"); // ready | running | over
  const [left, setLeft] = useState(ROUND);
  const [n, setN] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [flash, setFlash] = useState(null); // "hit" | "miss"

  const q = pool[n % pool.length];

  useEffect(() => {
    if (stage !== "running") return;
    if (left <= 0) { setStage("over"); return; }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, left]);

  function answer(pick) {
    const ok = pick === q.answer;
    grade(q.id, ok, q.topic);
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

/* ---------- test prep ---------- */

// Builds one section's paper. Generated sections run at true full length.
// Pool backed sections are capped at however many authored items exist, and
// the caller shows that as a short form rather than repeating questions.
function buildPaper(test, sec) {
  if (sec.build) return { qs: BUILDERS[sec.build](sec.real), full: true };

  // Passage based sections must keep each passage's questions together and in
  // order, the way a real paper does. Only the order of the passages varies.
  const pool = test.questions.filter((q) => q.section === sec.pool);
  const blocks = [];
  pool.forEach((q) => {
    const last = blocks[blocks.length - 1];
    if (last && last.passage === q.passage) last.items.push(q);
    else blocks.push({ passage: q.passage, items: [q] });
  });

  const qs = [];
  for (const b of shuffle(blocks)) {
    if (qs.length + b.items.length > sec.real) continue; // never split a passage
    qs.push(...b.items);
  }
  // Every section under 50 questions is authored to its real length, so a short
  // form should only ever be possible on a very long paper. If one appears
  // below that, the pool is missing questions and the row should say so.
  return { qs, full: qs.length >= sec.real, short: qs.length < sec.real };
}

function TestPrep({ grade }) {
  const [openId, setOpenId] = useState(null);
  const [paper, setPaper] = useState(null);

  const test = TESTS.find((t) => t.id === openId);
  const secs = test ? SECTIONS[test.id] : [];

  if (test && paper) {
    if (paper.drill) {
      return <TestDrill test={test} sec={paper.sec} qs={paper.qs} grade={grade} onExit={() => setPaper(null)} />;
    }
    if (paper.sec.kind === "writing") {
      return <WritingRun test={test} sec={paper.sec} cfg={paper.cfg} onExit={() => setPaper(null)} />;
    }
    if (paper.sec.kind === "speaking") {
      return <SpeakingRun test={test} sec={paper.sec} cfg={paper.cfg} onExit={() => setPaper(null)} />;
    }
    return (
      <TestRun
        {...paper}
        test={test}
        grade={grade}
        onExit={() => setPaper(null)}
        onDrill={(sectionName) => {
          const target = secs.find((x) => x.name === sectionName)
            || secs.find((x) => !x.essay && !x.soon && !x.kind);
          if (target) setPaper({ drill: true, sec: target, qs: buildPaper(test, target).qs.slice(0, 10) });
        }}
      />
    );
  }

  if (test) {
    const sittable = secs.filter((x) => !x.soon && !x.kind);
    return (
      <div className="page fade">
        <div className="page-head">
          <button className="btn quiet" style={{ marginBottom: 8 }} onClick={() => setOpenId(null)}>
            Back to all tests
          </button>
          <h2>{test.name}</h2>
          <p>{test.full}</p>
        </div>

        <div className="stack">
          <div className="grid-3">
            <div className="stat"><div className="k">Score scale</div><div className="v small-v">{test.scaleLabel}</div></div>
            <div className="stat"><div className="k">Total time</div><div className="v small-v">{test.length}</div></div>
            <div className="stat"><div className="k">Used for</div><div className="v small-v">{test.who}</div></div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Choose a section</h3>
              <span className="small muted">Real length and real timing</span>
            </div>

            {secs.map((sec) => {
              const cfg = sec.kind ? TASKS[test.id]?.[sec.kind] : null;
              const ready = cfg ? cfg.tasks.filter((t) => !t.soon).length : 0;
              const built = sec.kind || sec.soon ? null : buildPaper(test, sec);
              const have = built ? built.qs.length : 0;

              return (
                <div key={sec.id} className="sec-row">
                  <div className="sec-main">
                    <div className="row">
                      <span className="list-title">{sec.name}</span>
                      {sec.soon
                        ? <span className="pill soon">In development</span>
                        : sec.kind
                          ? <span className="pill accent">{ready} task{ready === 1 ? "" : "s"} ready</span>
                          : built.full
                            ? <span className="pill good">Full length</span>
                            : <span className="pill warn">Short form, {have} of {sec.real}</span>}
                    </div>
                    <div className="small muted">
                      {sec.soon
                        ? "Being built now. It needs audio playback, which is the next thing on the list."
                        : `${sec.real} ${sec.kind ? (sec.real === 1 ? "task" : "tasks") : "questions"}, ${sec.minutes} min${sec.note ? `. ${sec.note}` : ""}`}
                    </div>
                  </div>

                  {sec.soon ? (
                    <button className="btn ghost" disabled>
                      <Icon name="build" size={14} /> Coming soon
                    </button>
                  ) : sec.kind ? (
                    <button className="btn ghost" disabled={ready === 0}
                      onClick={() => setPaper({ sec, cfg })}>
                      <Icon name={sec.kind === "speaking" ? "mic" : "pen"} size={14} />
                      {sec.kind === "speaking" ? "Practise speaking" : "Practise writing"}
                    </button>
                  ) : (
                    <button className="btn ghost" disabled={have === 0}
                      onClick={() => setPaper({ sec, qs: built.qs, full: built.full })}>
                      {have === 0 ? "No questions yet" : "Sit this section"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Practice, {test.name} only</h3>
              <span className="small muted">Untimed, with the answer explained each time</span>
            </div>
            <div className="drill-note small muted">
              Sitting a section is the real thing: full length, on the clock, no feedback until the
              end. A drill is the opposite. Ten questions, no clock, and the reasoning after each one.
            </div>
            {sittable.map((sec) => {
              const built = buildPaper(test, sec);
              const ten = built.qs.slice(0, 10);
              return (
                <div key={sec.id} className="sec-row">
                  <div className="sec-main">
                    <span className="list-title">{sec.name}</span>
                    <div className="small muted">
                      {ten.length} questions, no time limit
                    </div>
                  </div>
                  <button className="btn ghost" disabled={ten.length === 0}
                    onClick={() => setPaper({ drill: true, sec, qs: ten })}>
                    <Icon name="quiz" size={14} /> Drill
                  </button>
                </div>
              );
            })}
          </div>

          {sittable.length > 1 && (
            <div className="card card-pad spread">
              <div>
                <b className="small">Sit the whole test</b>
                <div className="small muted">
                  Every scorable section back to back, {sittable.reduce((n, x) => n + x.minutes, 0)} minutes.
                </div>
              </div>
              <button className="btn" onClick={() => {
                const all = sittable.flatMap((sec) => buildPaper(test, sec).qs);
                setPaper({ sec: { name: "Full test", minutes: sittable.reduce((n, x) => n + x.minutes, 0) }, qs: all, full: true });
              }}>
                Start full test
              </button>
            </div>
          )}

          <div className="card card-pad note-card">
            <b className="small">Worth knowing</b>
            <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-2)" }}>{test.note}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page wide fade">
      <PageHead title="Test prep" sub="Pick a test, then sit a whole section at its real length and timing." />

      <div className="disclaimer">
        <Icon name="flag" size={14} />
        <span>
          Structure, timings and score scales are the real published ones. Questions are original and
          generated fresh each sitting, so no two papers are the same. They are not from any past paper.
        </span>
      </div>

      <div className="test-grid">
        {TESTS.map((t) => {
          const secs = SECTIONS[t.id].filter((x) => !x.essay);
          return (
            <button key={t.id} className="test-card" onClick={() => setOpenId(t.id)}>
              <div className="spread">
                <b className="test-name">{t.name}</b>
                <span className="pill accent">{secs.length} sections</span>
              </div>
              <span className="small muted">{t.full}</span>
              <div className="test-meta">
                <span><b>{t.scaleLabel}</b></span>
                <span className="muted">{t.length}</span>
              </div>
              <span className="small muted">{t.who}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TestRun({ test, sec, qs, full, grade, onExit, onDrill }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(sec.minutes * 60);
  const [done, setDone] = useState(false);

  // Real tests give no feedback while you sit them, so neither does this.
  useEffect(() => {
    if (done) return;
    if (left <= 0) { finish(); return; }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, done]);

  function finish() {
    qs.forEach((q, n) => grade(q.id, isRight(q, answers[n])));
    setDone(true);
  }

  const right = qs.filter((q, n) => isRight(q, answers[n])).length;

  if (done) {
    const score = estimate(test.scoring, right, qs.length);
    const wrong = qs.map((q, n) => ({ q, n })).filter(({ q, n }) => !isRight(q, answers[n]));
    return (
      <div className="page fade">
        <PageHead title={`${test.name}, ${sec.name}`} sub={`${right} of ${qs.length} correct`} />

        <div className="stack">
          <div className="card card-pad score-card">
            <div className="score-main">
              <span className="score-value">{score.scaled}</span>
              <span className="score-unit">{score.unit}</span>
            </div>
            <div className="score-side">
              <div className="spread small">
                <span className="muted">Estimated percentile</span>
                <b>{Math.round(score.percentile)}th</b>
              </div>
              <div className="bar" style={{ marginTop: 6 }}>
                <i style={{ width: `${score.percentile}%` }} />
              </div>
              <p className="small muted" style={{ margin: "10px 0 0" }}>
                Ahead of about {Math.round(score.percentile)} percent of test takers. {score.detail}
              </p>
            </div>
          </div>

          <Feedback qs={qs} answers={answers} secondsAllowed={sec.minutes * 60}
            secondsLeft={left} onDrill={onDrill} />

          <div className="card card-pad note-card">
            <b className="small">How to read this</b>
            <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-2)" }}>
              {full
                ? `This section ran at its real length of ${qs.length} questions.`
                : `This was a short form of ${qs.length} questions against a real ${sec.real}.`}{" "}
              Scaled scores are still an estimate: real tests are equated between sittings, so the same
              raw score can move a little either way. Use the band, not the exact number.
            </p>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Review</h3>
              <span className="small muted">{wrong.length} to look at</span>
            </div>
            {wrong.length === 0 && <div className="empty small">Nothing wrong. Every question correct.</div>}
            {wrong.map(({ q, n }) => (
              <div key={q.id} className="review">
                <span className="pill warn">{q.skill}</span>
                <div>
                  {q.passage && <div className="small muted" style={{ marginBottom: 4 }}>{q.passage}</div>}
                  <div className="list-title">{q.q}</div>
                  <div className="small muted">
                    You put {!isAnswered(answers[n])
                      ? "nothing"
                      : formatOf(q) === "gap" ? `"${answers[n]}"` : q.choices[answers[n]]}.
                    Answer: {q.choices[q.answer]}.
                  </div>
                  <div className="small" style={{ marginTop: 4, color: "var(--ink-2)" }}>{q.why}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="row">
            <button className="btn ghost" onClick={onExit}>Back to {test.name}</button>
          </div>
        </div>
      </div>
    );
  }

  const q = qs[i];
  if (!q) {
    return (
      <div className="page fade">
        <PageHead title={`${test.name}, ${sec.name}`} sub="This section has no questions yet." />
        <button className="btn ghost" onClick={onExit}>Back to {test.name}</button>
      </div>
    );
  }
  const answered = Object.values(answers).filter(isAnswered).length;

  // Consecutive questions on the same passage form one part, the way a real
  // reading paper does. The passage stays on screen while you work through them.
  const parts = [];
  qs.forEach((item, n) => {
    const last = parts[parts.length - 1];
    if (last && last.passage === item.passage) last.idx.push(n);
    else parts.push({ passage: item.passage, idx: [n] });
  });
  const part = parts.find((pt) => pt.idx.includes(i));
  const partNo = parts.indexOf(part) + 1;
  const inPart = part.idx.indexOf(i) + 1;

  const questionPane = (
    <>
      {q.passage && parts.length > 1 && (
        <div className="part-tag">
          Part {partNo}, question {inPart} of {part.idx.length}
        </div>
      )}

      <h3 className="q-text">{q.q}</h3>

      <AnswerInput q={q} testId={test.id} index={i} value={answers[i]}
        onChange={(v) => setAnswers((a) => ({ ...a, [i]: v }))} />

      <div className="spread" style={{ marginTop: 16 }}>
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
        <span className="small muted">{qs.length - answered} unanswered</span>
        {i + 1 < qs.length
          ? <button className="btn ghost" onClick={() => setI(i + 1)}>Next</button>
          : <button className="btn" onClick={finish}>Submit section</button>}
      </div>
    </>
  );

  return (
    <div className="page wide fade paper">
      <div className="page-head">
        <button className="btn quiet" style={{ marginBottom: 8 }} onClick={onExit}>Leave the section</button>
        <div className="spread">
          <div>
            <h2>{test.name}, {sec.name}</h2>
            <p>{q.section}{q.skill ? `, ${q.skill}` : ""}</p>
          </div>
          <span className={"clock big" + (left <= 300 ? " low" : "")}>
            <Icon name="timer" size={15} /> {fmt(left)}
          </span>
        </div>
      </div>

      <div className="spread" style={{ marginBottom: 8 }}>
        <span className="small muted">Question {i + 1} of {qs.length}</span>
        <span className="small muted">{answered} answered</span>
      </div>
      <div className="bar" style={{ marginBottom: 16 }}>
        <i style={{ width: `${(answered / qs.length) * 100}%` }} />
      </div>

      {q.passage ? (
        <div className="paper-split">
          <div className="paper-passage">
            <div className="prompt-label">
              {parts.length > 1 ? `Reading passage ${partNo}` : "Passage"}
            </div>
            <div className="passage-body">{q.passage}</div>
          </div>
          <div className="card card-pad paper-questions">{questionPane}</div>
        </div>
      ) : (
        <div className="card card-pad">{questionPane}</div>
      )}

      <QuestionNav qs={qs} parts={parts} answers={answers} current={i} onGo={setI} />
    </div>
  );
}

// The strip of numbered buttons along the bottom. Filled means answered, the
// ring is where you are, and a gap marks the start of a new passage.
function QuestionNav({ qs, parts, answers, current, onGo }) {
  return (
    <div className="qnav">
      <div className="qnav-head">
        <b className="small">Questions</b>
        <span className="small muted">
          {Object.values(answers).filter(isAnswered).length} of {qs.length} answered
        </span>
      </div>
      <div className="qnav-grid">
        {qs.map((_, n) => {
          const startsPart = parts.length > 1 && parts.some((pt) => pt.idx[0] === n && pt.idx[0] !== 0);
          return (
            <button
              key={n}
              className={
                "qnav-btn" +
                (n === current ? " now" : "") +
                (isAnswered(answers[n]) ? " done" : "") +
                (startsPart ? " part" : "")
              }
              onClick={() => onGo(n)}
              title={`Question ${n + 1}${isAnswered(answers[n]) ? ", answered" : ""}`}
            >
              {n + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}


/* ---------- task charts ---------- */

// IELTS Task 1 gives you a real figure to describe, so the app draws one.
// Plain SVG, sized by viewBox and themed from the same tokens as everything else.
function TaskChart({ chart }) {
  const W = 640, H = 300;
  const pad = { l: 44, r: 16, t: 16, b: 46 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const all = chart.series.flatMap((s) => s.values);
  const top = Math.ceil(Math.max(...all) / 20) * 20;
  const ticks = [0, top / 4, top / 2, (top * 3) / 4, top];

  const y = (v) => pad.t + plotH - (v / top) * plotH;
  const colours = ["var(--chart-1)", "var(--chart-2)"];

  return (
    <figure className="chart">
      <figcaption>{chart.title}</figcaption>
      <div className="chart-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={chart.title}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
              <text x={pad.l - 8} y={y(t) + 4} className="axis" textAnchor="end">{t}</text>
            </g>
          ))}

          {chart.kind === "line"
            ? chart.series.map((s, si) => {
                const step = plotW / (chart.x.length - 1);
                const pts = s.values.map((v, i) => [pad.l + i * step, y(v)]);
                return (
                  <g key={s.name}>
                    <polyline
                      points={pts.map((p) => p.join(",")).join(" ")}
                      fill="none" stroke={colours[si]} strokeWidth="2.5"
                      strokeLinejoin="round" strokeLinecap="round"
                    />
                    {pts.map(([px, py], i) => (
                      <circle key={i} cx={px} cy={py} r="3.5" fill="var(--surface)"
                        stroke={colours[si]} strokeWidth="2" />
                    ))}
                  </g>
                );
              })
            : chart.x.map((label, i) => {
                const group = plotW / chart.x.length;
                const barW = (group * 0.62) / chart.series.length;
                const gx = pad.l + i * group + group * 0.19;
                return (
                  <g key={label}>
                    {chart.series.map((s, si) => (
                      <rect key={s.name} x={gx + si * barW} y={y(s.values[i])}
                        width={barW - 2} height={pad.t + plotH - y(s.values[i])}
                        fill={colours[si]} rx="2" />
                    ))}
                  </g>
                );
              })}

          <line x1={pad.l} x2={W - pad.r} y1={pad.t + plotH} y2={pad.t + plotH} className="axis-line" />

          {chart.x.map((label, i) => {
            const cx = chart.kind === "line"
              ? pad.l + i * (plotW / (chart.x.length - 1))
              : pad.l + i * (plotW / chart.x.length) + (plotW / chart.x.length) / 2;
            return (
              <text key={label} x={cx} y={pad.t + plotH + 18} className="axis" textAnchor="middle">
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="chart-legend">
        <span className="chart-unit">{chart.unit}</span>
        {chart.series.map((s, si) => (
          <span key={s.name} className="chart-key">
            <i style={{ background: colours[si] }} />
            {s.name}
          </span>
        ))}
      </div>
    </figure>
  );
}

/* ---------- writing and speaking ---------- */

// Shared: rate your own answer against the test's published criteria.
function Rubric({ rubric, scores, setScores }) {
  const r = RUBRICS[rubric];
  return (
    <div className="card">
      <div className="card-head">
        <h3>Score it against the {r.name}</h3>
        <span className="small muted">You are the marker</span>
      </div>
      {r.criteria.map((c, i) => (
        <div key={c.n} className="crit-row">
          <div className="sec-main">
            <div className="list-title">{c.n}</div>
            <div className="small muted">{c.hint}</div>
          </div>
          <div className="seg tight">
            {r.scale.map((v) => (
              <button key={v} className={scores[i] === v ? "on" : ""}
                onClick={() => setScores((p) => p.map((x, n) => (n === i ? v : x)))}>
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RubricResult({ rubric, scores }) {
  const r = RUBRICS[rubric];
  const filled = scores.every((s) => s !== null);
  if (!filled) {
    return (
      <div className="card card-pad note-card">
        <b className="small">Rate every criterion to see the score</b>
        <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-2)" }}>
          {scores.filter((s) => s !== null).length} of {scores.length} rated. Be honest rather than
          kind, since the point is to find where the marks are going.
        </p>
      </div>
    );
  }
  const value = r.combine(scores);
  return (
    <div className="card card-pad score-card">
      <div className="score-main">
        <span className="score-value">{String(r.format(value)).split(" ")[0]}</span>
        <span className="score-unit">{r.unit}</span>
      </div>
      <div className="score-side">
        <b className="small">{r.format(value)}</b>
        <p className="small muted" style={{ margin: "8px 0 0" }}>
          This is your own assessment against the published criteria, not a machine score. It is worth
          rating the same piece again a day later, since first marking is usually generous.
        </p>
      </div>
    </div>
  );
}

function WritingRun({ test, sec, cfg, onExit }) {
  const ready = cfg.tasks.filter((t) => !t.soon);
  const [task, setTask] = useState(ready[0]);
  const [text, setText] = useState("");
  const [left, setLeft] = useState(ready[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [scores, setScores] = useState(() => RUBRICS[cfg.rubric].criteria.map(() => null));

  useEffect(() => {
    if (!running || done) return;
    if (left <= 0) { setDone(true); return; }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left, done]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const short = words < task.minWords;

  function choose(t) {
    setTask(t); setText(""); setLeft(t.minutes * 60); setRunning(false); setDone(false);
    setScores(RUBRICS[cfg.rubric].criteria.map(() => null));
  }

  return (
    <div className="page fade">
      <div className="page-head">
        <button className="btn quiet" style={{ marginBottom: 8 }} onClick={onExit}>Leave the section</button>
        <div className="spread">
          <div>
            <h2>{test.name}, {sec.name}</h2>
            <p>{task.name}, {task.minutes} minutes, at least {task.minWords} words</p>
          </div>
          {running && !done && (
            <span className={"clock big" + (left <= 120 ? " low" : "")}>
              <Icon name="timer" size={15} /> {fmt(left)}
            </span>
          )}
        </div>
      </div>

      <div className="stack">
        {ready.length > 1 && (
          <div className="seg modes">
            {ready.map((t) => (
              <button key={t.id} className={task.id === t.id ? "on" : ""} onClick={() => choose(t)}>
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className="card card-pad">
          <div className="prompt-label">Prompt</div>
          <div className="prompt">{task.prompt}</div>
          {task.chart && <TaskChart chart={task.chart} />}
        </div>

        {!running && !done && (
          <div className="card card-pad spread">
            <div>
              <b className="small">Ready?</b>
              <div className="small muted">
                The clock starts when you begin and does not pause, the same as the real thing.
              </div>
            </div>
            <button className="btn" onClick={() => setRunning(true)}>Start writing</button>
          </div>
        )}

        {running && (
          <div className="notes">
            <div className="notes-head">
              <div className="row">
                <span className="notes-icon"><Icon name="pen" size={14} /></span>
                <b className="small">{task.name}</b>
              </div>
              <span className={"small " + (short ? "muted" : "good-text")}>
                {words} words, {short ? `${task.minWords - words} short of the minimum` : "over the minimum"}
              </span>
            </div>
            <textarea className="notes-area" style={{ minHeight: 260 }} value={text} disabled={done}
              placeholder="Write your answer here." onChange={(e) => setText(e.target.value)} />
            <div className="notes-foot">
              <span className="small muted">
                {done ? "Time is up." : "The word count is live. Under the minimum is penalised."}
              </span>
              {!done && <button className="btn" onClick={() => setDone(true)}>Finish and mark it</button>}
            </div>
          </div>
        )}

        {done && (
          <>
            <div className="card card-pad note-card">
              <b className="small">What the examiner is looking for</b>
              <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-2)" }}>{task.tip}</p>
            </div>
            <AiMark task={task} rubric={cfg.rubric} answer={text} onScores={setScores} />
            <Rubric rubric={cfg.rubric} scores={scores} setScores={setScores} />
            <RubricResult rubric={cfg.rubric} scores={scores} />
            <div className="row">
              <button className="btn ghost" onClick={() => choose(task)}>Write it again</button>
              <button className="btn ghost" onClick={onExit}>Back to {test.name}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SpeakingRun({ test, sec, cfg, onExit }) {
  const ready = cfg.tasks.filter((t) => !t.soon);
  const [task, setTask] = useState(ready[0]);
  const [stage, setStage] = useState("idle"); // idle | prep | speaking | done
  const [left, setLeft] = useState(0);
  const [scores, setScores] = useState(() => RUBRICS[cfg.rubric].criteria.map(() => null));

  useEffect(() => {
    if (stage !== "prep" && stage !== "speaking") return;
    if (left <= 0) {
      if (stage === "prep") { setStage("speaking"); setLeft(task.respond); }
      else setStage("done");
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, left, task]);

  function begin() {
    if (task.prep > 0) { setStage("prep"); setLeft(task.prep); }
    else { setStage("speaking"); setLeft(task.respond); }
  }

  function choose(t) {
    setTask(t); setStage("idle"); setLeft(0);
    setScores(RUBRICS[cfg.rubric].criteria.map(() => null));
  }

  return (
    <div className="page fade">
      <div className="page-head">
        <button className="btn quiet" style={{ marginBottom: 8 }} onClick={onExit}>Leave the section</button>
        <h2>{test.name}, {sec.name}</h2>
        <p>
          {task.name}
          {task.prep > 0 ? `, ${task.prep} seconds to prepare` : ""}
          {`, ${task.respond >= 60 ? `${Math.round(task.respond / 60)} minute` : `${task.respond} second`} response`}
        </p>
      </div>

      <div className="stack">
        {ready.length > 1 && (
          <div className="seg modes">
            {ready.map((t) => (
              <button key={t.id} className={task.id === t.id ? "on" : ""} onClick={() => choose(t)}>
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className="card card-pad">
          <div className="prompt-label">Prompt</div>
          <div className="prompt">{task.prompt}</div>
        </div>

        {stage === "idle" && (
          <div className="card card-pad spread">
            <div>
              <b className="small">Speak out loud, properly</b>
              <div className="small muted">
                Nothing is recorded. The value is in doing it against the real clock rather than in your head.
              </div>
            </div>
            <button className="btn" onClick={begin}>
              <Icon name="mic" size={14} /> {task.prep > 0 ? "Start preparation" : "Start speaking"}
            </button>
          </div>
        )}

        {(stage === "prep" || stage === "speaking") && (
          <div className={"card card-pad speak-stage " + stage}>
            <span className={"pill " + (stage === "prep" ? "accent" : "good")}>
              {stage === "prep" ? "Preparing" : "Speak now"}
            </span>
            <div className="speak-clock">{fmt(left)}</div>
            <p className="small muted" style={{ margin: 0 }}>
              {stage === "prep"
                ? "Make notes. You cannot write a script in this time, so note the structure only."
                : "Keep going until the clock stops. Stopping early is the most common way to lose marks."}
            </p>
            <button className="btn ghost" style={{ marginTop: 14 }}
              onClick={() => (stage === "prep" ? (setStage("speaking"), setLeft(task.respond)) : setStage("done"))}>
              {stage === "prep" ? "Skip to speaking" : "I have finished"}
            </button>
          </div>
        )}

        {stage === "done" && (
          <>
            <div className="card card-pad note-card">
              <b className="small">What the examiner is looking for</b>
              <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-2)" }}>{task.tip}</p>
            </div>
            <Rubric rubric={cfg.rubric} scores={scores} setScores={setScores} />
            <RubricResult rubric={cfg.rubric} scores={scores} />
            <div className="row">
              <button className="btn ghost" onClick={() => choose(task)}>Try it again</button>
              <button className="btn ghost" onClick={onExit}>Back to {test.name}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- per test drill ---------- */

// The opposite of sitting a section: no clock, and the answer explained after
// every question. This is where you learn a test's habits before timing yourself.
function TestDrill({ test, sec, qs, grade, onExit }) {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState({});
  const [given, setGiven] = useState(undefined);
  const [locked, setLocked] = useState(false);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);

  const q = qs[i];

  // Defensive: a drill should never start empty, but rendering undefined would
  // take the whole page down rather than showing a message.
  if (!q && !done) {
    return (
      <div className="page fade">
        <PageHead title={`${test.name}, ${sec.name}`} sub="No questions available for this section yet." />
        <button className="btn ghost" onClick={onExit}>Back to {test.name}</button>
      </div>
    );
  }

  function check() {
    if (locked || !isAnswered(given)) return;
    const ok = isRight(q, given);
    if (ok) setRight((v) => v + 1);
    setPicks((p) => ({ ...p, [i]: given }));
    grade(q.id, ok);
    setLocked(true);
  }

  function next() {
    if (i + 1 >= qs.length) return setDone(true);
    setI(i + 1);
    setGiven(undefined);
    setLocked(false);
  }

  if (done) {
    return (
      <div className="page fade">
        <PageHead title={`${test.name}, ${sec.name} drill`} sub={`${right} of ${qs.length} correct`} />
        <div className="stack">
          <div className="card card-pad" style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em" }}>
              {Math.round((right / qs.length) * 100)}%
            </div>
            <div className="muted">
              Drills are not scored on the real scale, since ten questions cannot place you on it.
            </div>
          </div>

          <Feedback qs={qs} answers={picks} secondsAllowed={0} secondsLeft={0} />

          <div className="row">
            <button className="btn ghost" onClick={onExit}>Back to {test.name}</button>
          </div>
        </div>
      </div>
    );
  }

  const ok = locked && isRight(q, given);

  return (
    <div className="page fade">
      <div className="page-head">
        <button className="btn quiet" style={{ marginBottom: 8 }} onClick={onExit}>Leave the drill</button>
        <div className="spread">
          <div>
            <h2>{test.name}, {sec.name} drill</h2>
            <p>{q.skill || q.section}, no time limit</p>
          </div>
          <span className="pill">{right} of {i + (locked ? 1 : 0)} correct</span>
        </div>
      </div>

      <div className="spread" style={{ marginBottom: 8 }}>
        <span className="small muted">Question {i + 1} of {qs.length}</span>
      </div>
      <div className="bar" style={{ marginBottom: 16 }}>
        <i style={{ width: `${((i + (locked ? 1 : 0)) / qs.length) * 100}%` }} />
      </div>

      <div className={q.passage ? "paper-split" : ""}>
        {q.passage && (
          <div className="paper-passage">
            <div className="prompt-label">Passage</div>
            <div className="passage-body">{q.passage}</div>
          </div>
        )}

        <div className="card card-pad">
          <h3 className="q-text">{q.q}</h3>

          <AnswerInput q={q} testId={test.id} index={i} value={given}
            onChange={setGiven} disabled={locked} />

          {locked && (
            <div className="fade" style={{ marginTop: 16 }}>
              <div className="card card-pad" style={{ background: "var(--panel)" }}>
                <div className="row" style={{ marginBottom: 10 }}>
                  <span className={"pill " + (ok ? "good" : "warn")}>
                    {ok ? "Correct" : "Not quite"}
                  </span>
                  {!ok && <span className="small muted">Answer: {q.choices[q.answer]}</span>}
                </div>
                <p className="small" style={{ margin: 0, color: "var(--ink-2)" }}>{q.why}</p>
              </div>
            </div>
          )}

          <div className="spread" style={{ marginTop: 16 }}>
            <span className="small muted">{q.section}</span>
            {locked
              ? <button className="btn" onClick={next}>
                  {i + 1 >= qs.length ? "See how you did" : "Next question"} <Icon name="arrow" />
                </button>
              : <button className="btn" disabled={!isAnswered(given)} onClick={check}>Check answer</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- ai marking ---------- */

// Asks the model to mark a writing task against the same published criteria
// the self assessment uses, then offers to fill those scores in.
function AiMark({ task, rubric, answer, onScores }) {
  const [state, setState] = useState("idle"); // idle | working | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const r = RUBRICS[rubric];

  async function run() {
    setState("working");
    setError("");
    try {
      const data = await gradeWriting({
        answer,
        prompt: task.prompt,
        rubric: r.name,
        criteria: r.criteria.map((c) => c.n),
        scale: r.scale,
      });
      setResult(data);
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  if (state === "idle") {
    return (
      <div className="card card-pad spread">
        <div>
          <b className="small">Get it marked</b>
          <div className="small muted">
            An examiner's read against the {r.name}, before you mark it yourself.
          </div>
        </div>
        <button className="btn" onClick={run} disabled={answer.trim().length < 80}>
          <Icon name="spark" size={14} /> Mark my answer
        </button>
      </div>
    );
  }

  if (state === "working") {
    return (
      <div className="card card-pad">
        <Loading label="Reading your answer" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="card card-pad" style={{ borderColor: "var(--warn-line)" }}>
        <div className="spread">
          <span className="pill warn">Could not mark it</span>
          <button className="btn ghost" onClick={run}>Try again</button>
        </div>
        <p className="small" style={{ margin: "10px 0 0", color: "var(--ink-2)" }}>{error}</p>
        <p className="small muted" style={{ margin: "6px 0 0" }}>
          You can still mark it yourself below.
        </p>
      </div>
    );
  }

  const value = r.combine(result.scores);

  return (
    <div className="card fade">
      <div className="card-head">
        <h3>Marked against the {r.name}</h3>
        <span className="pill accent">{r.format(value)}</span>
      </div>

      {r.criteria.map((c, i) => (
        <div key={c.n} className="crit-row">
          <div className="sec-main">
            <div className="list-title">{c.n}</div>
            <div className="small muted">{result.comments[i] || ""}</div>
          </div>
          <span className="pill">{result.scores[i]}</span>
        </div>
      ))}

      {(result.strength || result.fix) && (
        <div className="fb-notes">
          {result.strength && <p className="small"><b>Keep:</b> {result.strength}</p>}
          {result.fix && <p className="small"><b>Change:</b> {result.fix}</p>}
        </div>
      )}

      <div className="set-row">
        <div className="hint">
          A model's mark, not an examiner's. Treat it as a second opinion against your own reading.
        </div>
        <button className="btn ghost" onClick={() => onScores(result.scores)}>
          Use these scores
        </button>
      </div>
    </div>
  );
}
