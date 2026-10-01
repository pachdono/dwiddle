import { playCue, soundsOn, setSoundsOn } from "./voice.js";
import { DwiddleHero } from "./ChatRoom.jsx";
import ChatRoom from "./ChatRoom.jsx";
import { LevelCard } from "./LevelPicker.jsx";
import { Podcast, notesText } from "./Podcast.jsx";
import { PastPaperCard } from "./PastPaper.jsx";
import { ThemeScenery, ThemeDrift, hasScenery } from "./ThemeScenery.jsx";
import { ThemeBackdrop } from "./ThemeBackdrop.jsx";
import { LikeImFour } from "./LikeImFour.jsx";
import Decks from "./Decks.jsx";
import { StudyBanner, StudyTimerCard } from "./StudyTimer.jsx";
import { flatMarks, parseMarks, blockTexts } from "./marks.js";
import { usePracticeSession, useCheerSounds, PracticeSides, Cheer } from "./PracticeCheer.jsx";
import { useEffect, useRef, useState } from "react";
import { DECKS, EXAM_SIZES, EXAM_TIMES, SAMPLE_NOTES, HL_KINDS } from "./mock.js";
import { load, save, loadSession, saveSession, clearSession, KEYS } from "./store.js";
import { Icon, PageHead, Loading, Marked, toSegments, HighlightFilters, Portal, BusyScreen, Boundary } from "./ui.jsx";
import { phraseQuestion } from "./mathText.js";
import { rememberSource, sourcesFor } from "./lessons.js";
import { Notes } from "./Notes.jsx";
import { Learn } from "./Learn.jsx";
import { Videos, VideoJobChip } from "./Video.jsx";
import { generationsLeft, countGeneration } from "./limits.js";
import { useAuth, Account, SignInPage, ProfileGate } from "./Account.jsx";
import { useMyProfile, UserIcon } from "./Profile.jsx";
import { pushProgress, localSnapshot, configured, userCount, submitFeedback, myAccess } from "./supabase.js";
import { setEarlyAccess, moreQuestions, generateFromNotes, generateFromSyllabus, generateInParts, splitSource, gradeWriting, notifyFeedback, clarify, writeBrief, readYouTube, writeSyllabusNotes } from "./ai.js";
import { Clarify } from "./Clarify.jsx";
import { QuestionView, isDrill, derivedDrills } from "./Questions.jsx";
import { DwiddleChat, AskDwiddleButton, usePageContext, useDictation, PermissionPrompt } from "./Chat.jsx";
import { RecordingView } from "./Record.jsx";
import { XP, levelOf, announceXp } from "./xp.js";
import { AnnotatedText } from "./Annotate.jsx";
import { FullscreenButton } from "./ContextMenu.jsx";
import { loadSrs, recordReview, dueFrom, reviewOn, setReviewOn } from "./srs.js";
import { TooMuch } from "./TooMuch.jsx";
import { buildFresh, unseenCount, clearSeen, bankFor } from "./bank.js";
import { Duck, DuckMark, DuckSign } from "./Duck.jsx";
import { ThemeMark } from "./ThemeMark.jsx";
import { THEMES, loadLook, saveLook, applyLook } from "./themes.js";
import { readFile, MAX_FILE, IMAGE } from "./readfile.js";
import { Landing } from "./Landing.jsx";
import Legal from "./Legal.jsx";
import { EditBar, EditSlot, useDragOrder } from "./DashEdit.jsx";
import Install, { InstallAll, DownloadPage } from "./Install.jsx";
import DesktopWelcome from "./DesktopWelcome.jsx";
import UpdateBar, { useUpdate } from "./UpdateBar.jsx";
import { isDesktop, onMac, appVersion, uninstaller } from "./desktop.js";
import { UninstallDialog } from "./Uninstall.jsx";
import { FreeGate } from "./FreeGate.jsx";
import { Solve } from "./Solve.jsx";
import { isInstalled } from "./install.js";
import { loadCustom, saveCustom, loadBg, WIDGETS } from "./custom.js";
import { Player } from "./Listening.jsx";
import { loadHeavy, H } from "./heavy.js";
import { WebVideoNotice } from "./WebVideoNotice.jsx";

/* ---------- icons ---------- */


/* ---------- unknown addresses ---------- */

// The host rewrites every path to this app, so a mistyped or dead link arrives
// here looking like the home page. These are the addresses that mean something.
// Every page gets a real URL. Without this the back button leaves the site
// from wherever you happen to be, which is the one thing a browser user always
// expects to work.
const PAGE_PATH = {
  home: "/",
  topics: "/topics",
  quiz: "/practice",
  solve: "/solve",
  decks: "/decks",
  chat: "/chat",
  sheet: "/study-sheet",
  learn: "/learn",
  videos: "/videos",
  tests: "/test-prep",
  courses: "/courses",
  notebook: "/notebook",
  upload: "/add-material",
  library: "/library",
  feedback: "/feedback",
  settings: "/settings",
  reader: "/material",
  install: "/install",
  "install-all": "/install/all",
};

const PATH_PAGE = Object.fromEntries(
  Object.entries(PAGE_PATH).map(([id, path]) => [path, id])
);

// The desktop app is loaded from disk, where changing the path would make
// an address that cannot be reopened. It keeps the same pages, without the
// URL.
// A copy hosted as a preview (VITE_STATIC) lives at an address of its own
// and keeps the pages without changing it, like the desktop app.
const ROUTABLE = typeof location !== "undefined" && location.protocol.startsWith("http") && import.meta.env.VITE_STATIC !== "1";

const REAL_PATHS = new Set([
  "/", "/index.html", "", "/privacy", "/terms", "/download", "/homepage",
  ...Object.values(PAGE_PATH),
]);

// One place that turns a URL into what should be on screen, so the first load
// and a later back button cannot disagree about it.
function routeOf(pathname) {
  if (pathname === "/privacy") return { legal: "privacy", page: null };
  if (pathname === "/terms") return { legal: "terms", page: null };
  if (pathname === "/download") return { legal: "download", page: null };
  const page = PATH_PAGE[pathname];
  if (page) return { legal: null, page };
  return { legal: null, page: null };
}

// A banned account: nothing of the app, just why and what to do.
function Suspended({ reason, email, onSignOut }) {
  return (
    <div className="notfound">
      <DuckSign size={210} label="Nope" />
      <h1>This account is suspended</h1>
      <p>
        {email} can no longer use Dwiddle{reason ? ` (${String(reason).replace(/[.\s]+$/, "")}).` : "."} If you think this is a mistake,
        email <a href="mailto:dwiddle36@gmail.com">dwiddle36@gmail.com</a>.
      </p>
      <button className="btn" onClick={onSignOut}>Sign out</button>
    </div>
  );
}

function NotFound({ onHome }) {
  return (
    <div className="notfound">
      <DuckSign size={210} label="404" />
      <h1>This page does not exist</h1>
      <p>
        There is nothing at <code>{window.location.pathname}</code>. It may have been a typo, or a
        link that was never real.
      </p>
      <button className="btn" onClick={onHome}>Take me back</button>
    </div>
  );
}

/* ---------- who is using it ---------- */

// Everything shown about the person comes from their account. Signed out, the
// app stays anonymous rather than greeting somebody else's name.
function displayName(user) {
  if (!user) return "User";
  const name = user.user_metadata?.name || user.user_metadata?.full_name;
  if (name) return String(name).split(" ")[0];
  return String(user.email || "You").split("@")[0];
}

// The name the greeting uses: the account's first name, or the one typed in
// Settings before signing in, or none at all.
function nameFor(user) {
  if (user) return displayName(user);
  const typed = String(load(KEYS.name, "") || "").trim().split(/\s+/)[0];
  return typed || null;
}

function initialsOf(user) {
  const n = displayName(user);
  if (!user) return "?";
  const parts = n.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || n[0].toUpperCase();
}

// One of a few lines for the time of day, picked when the page opens, so the
// greeting is not the same sentence every visit but is never wrong about the
// hour. Before five counts as the night before: calling 2am "morning" reads as
// a machine that cannot tell. `n` is the first name, or null when signed out,
// in which case the line has to stand on its own.
// {n} is the name and {d} the day. A line may also say when it applies,
// so "Happy weekend" only turns up on a Saturday or Sunday.
const WEEKEND = (d) => d.getDay() === 0 || d.getDay() === 6;
const WEEKDAY = (d) => !WEEKEND(d);
const GREETINGS = [
  { from: 0, to: 5, lines: [
    "Burning the midnight oil, {n}?", "Still up, {n}?", "Late night studying, {n}?", "It's late, {n}",
    "The night owl returns, {n}", "Quiet hours, {n}", "Up past midnight, {n}?", "Just you and the notes, {n}",
    "One more topic, then bed, {n}?", "The world's asleep, {n}",
  ] },
  { from: 5, to: 9, lines: [
    "Rise and shine, {n}", "Early start, {n}", "Good morning, {n}", "Up with the sun, {n}", "Early bird, {n}",
    "Fresh start, {n}", "Morning, {n}. Coffee first?", "Beating the rush, {n}",
    { t: "Fresh week, {n}", when: (d) => d.getDay() === 1 },
  ] },
  { from: 9, to: 12, lines: [
    "Good morning, {n}", "Morning, {n}", "Happy {d}, {n}", "Ready for today, {n}?", "Let's get going, {n}",
    "Welcome back, {n}", "Hello again, {n}", "Nice to see you, {n}",
    { t: "Weekend study, {n}?", when: WEEKEND }, { t: "Happy weekend, {n}", when: WEEKEND },
  ] },
  { from: 12, to: 14, lines: [
    "Good afternoon, {n}", "Lunchtime revision, {n}?", "Midday check in, {n}", "Hi {n}, lunch break?",
    "Afternoon already, {n}", "Welcome back, {n}",
  ] },
  { from: 14, to: 18, lines: [
    "Good afternoon, {n}", "Afternoon, {n}", "Happy {d}, {n}", "Back at it, {n}", "Keep it going, {n}",
    "Welcome back, {n}", "Hey {n}, how's it going?",
    { t: "After school session, {n}?", when: WEEKDAY }, { t: "Almost the weekend, {n}", when: (d) => d.getDay() === 5 },
    { t: "Weekend study, {n}?", when: WEEKEND },
  ] },
  { from: 18, to: 22, lines: [
    "Good evening, {n}", "Evening, {n}", "An evening session, {n}?", "Winding down, {n}?", "Welcome back, {n}",
    "Hi {n}, good day?", "Evening revision, {n}?", "Settling in, {n}?",
  ] },
  { from: 22, to: 24, lines: [
    "Late night studying, {n}?", "One more session, {n}?", "Good evening, {n}", "Getting late, {n}",
    "Night owl mode, {n}?", "Quick review before bed, {n}?",
  ] },
];

// Fills in the name, or takes it out cleanly when there is none.
function fillGreeting(line, name, day) {
  const t = line.replace("{d}", day);
  return name ? t.replace("{n}", name) : t.replace(/,? \{n\}/, "").replace("{n}", "");
}

// `pick` is a random number chosen once when the page opens, so the line
// stays put while the name arrives: the account loads a moment after the
// page does, and choosing then would lock in the version with no name.
function greeting(name, pick, now = new Date()) {
  const h = now.getHours();
  const day = now.toLocaleDateString("en-GB", { weekday: "long" });
  const { lines } = GREETINGS.find((g) => h >= g.from && h < g.to);
  const fits = lines.filter((l) => typeof l === "string" || l.when(now)).map((l) => (typeof l === "string" ? l : l.t));
  return fillGreeting(fits[Math.floor(pick * fits.length)], name, day);
}

// What goes under the greeting when there is nothing better to say. Late at
// night it is a nudge towards bed, because that is the honest advice: memory
// is consolidated during sleep, and an hour of it is worth more than an hour
// of tired rereading.
function greetingSub(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "A short session, then sleep. Memory settles while you sleep, so it is part of revising.";
  if (h >= 22) return "Keep it short tonight. Sleep is when today's work actually sticks.";
  if (h < 9) return "Mornings are a good time for the hardest topic, before the day uses you up.";
  return "";
}

/* ---------- shell ---------- */

// The sidebar holds a handful of places, not a list of every page. It used to
// carry eleven entries under three headings and a card for a plan nobody could
// buy, which is a table of contents rather than a way round an app. Pages that
// belong together now share one entry and switch between each other with tabs
// along the top.
const GROUPS = [
  { id: "home", label: "Home", icon: "home", pages: ["home"] },
  { id: "chat", label: "Chat", icon: "chat", pages: ["chat"], early: true },
  {
    id: "study", label: "Study", icon: "cards", pages: ["sheet", "learn", "quiz", "topics", "videos"],
    tabs: { sheet: "Notes", learn: "Learn", quiz: "Practice", topics: "Topics", videos: "Videos" },
  },
  { id: "notebook", label: "Notebooks", icon: "pen", pages: ["notebook"] },
  { id: "solve", label: "Solve", icon: "bulb", pages: ["solve"] },
  { id: "decks", label: "My decks", icon: "deck", pages: ["decks"], early: true },
  {
    id: "exams", label: "Exams", icon: "target", pages: ["tests", "courses"],
    tabs: { tests: "Test prep", courses: "Courses" },
  },
  { id: "library", label: "Library", icon: "library", pages: ["library", "reader"] },
];

const groupOf = (page) => GROUPS.find((g) => g.pages.includes(page)) || null;

// Every page's own name, for the title bar when it is not part of a group.
const ALL_NAV = [
  { id: "home", label: "Home" }, { id: "chat", label: "Chat with Dwiddle" }, { id: "sheet", label: "Notes" }, { id: "learn", label: "Learn" },
  { id: "quiz", label: "Practice" }, { id: "topics", label: "Topics" }, { id: "videos", label: "Videos" }, { id: "solve", label: "Solve" }, { id: "decks", label: "My decks" },
  { id: "notebook", label: "Notebooks" },
  { id: "tests", label: "Test prep" }, { id: "courses", label: "Courses" },
  { id: "upload", label: "New material" }, { id: "library", label: "Library" },
  { id: "feedback", label: "Feedback" }, { id: "settings", label: "Settings" },
  { id: "reader", label: "Material" }, { id: "install", label: "Get the app" },
  { id: "install-all", label: "Every platform" },
];

const STAFF_URL = import.meta.env.VITE_STAFF_URL || "https://dwiddle-staff.vercel.app";

export default function App() {
  const [page, setPage] = useState(() => (ROUTABLE ? routeOf(window.location.pathname).page : null) || "home");
  const lastInGroup = useRef({});
  const [theme, setTheme] = useState(() => load(KEYS.theme, "system"));
  // The dashboard editor is retired in favour of themes. What someone set up
  // with it is left in storage but no longer applied.
  const [custom, setCustomRaw] = useState(() => ({ ...loadCustom(), on: false }));
  const [look, setLookRaw] = useState(() => loadLook());
  const [resolved, setResolved] = useState("light");
  function setLook(id) {
    setLookRaw(id);
    saveLook(id);
  }
  const [customBg, setCustomBg] = useState(() => loadBg());

  const [editing, setEditing] = useState(false);
  // The front page has its own address, /homepage, which always shows it,
  // signed in or not.
  const [atLanding, setAtLandingRaw] = useState(() => ROUTABLE && window.location.pathname === "/homepage");
  const setAtLanding = (on) => {
    setAtLandingRaw(on);
    if (!ROUTABLE) return;
    if (on && window.location.pathname !== "/homepage") window.history.pushState(null, "", "/homepage");
    if (!on && window.location.pathname === "/homepage") window.history.pushState(null, "", "/");
  };

  function setCustom(next) {
    setCustomRaw(next);
    saveCustom(next);
  }

  // From Settings: go to the dashboard and open the editor on arrival.
  function openEditor() {
    setEditing(true);
    go("home");
  }
  const [pMode, setPMode] = useState("quiz");
  const [missed, setMissed] = useState(() => load(KEYS.missed, []));
  const [srs, setSrs] = useState(() => loadSrs());
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
    setSrs(recordReview(id, correct));
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
      const first = !prev.days.includes(today);
      const gained = (correct ? XP.right : XP.tried) + (first ? XP.firstToday : 0);
      const next = {
        answered: prev.answered + 1,
        correct: prev.correct + (correct ? 1 : 0),
        days,
        byTopic,
        xp: (prev.xp || 0) + gained,
      };
      save(KEYS.stats, next);
      return next;
    });
    const firstToday = !stats.days.includes(new Date().toISOString().slice(0, 10));
    const gainedNow = (correct ? XP.right : XP.tried) + (firstToday ? XP.firstToday : 0);
    announceXp(gainedNow, firstToday ? "first study today" : "");
    if (levelOf((stats.xp || 0) + gainedNow).level > levelOf(stats.xp || 0).level) playCue("levelup");
  }

  // Clicking the nav item for the page you are already on resets it, which is
  // how you get out of an open practice set or test without hunting for a back
  // button. Bumping the seq remounts the page component.
  const [seq, setSeq] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lost, setLost] = useState(() => ROUTABLE && !REAL_PATHS.has(window.location.pathname));
  const [legal, setLegal] = useState(() => (ROUTABLE ? routeOf(window.location.pathname).legal : null));

  function openLegal(which) {
    if (ROUTABLE) window.history.pushState(null, "", "/" + which);
    setLegal(which);
    window.scrollTo(0, 0);
  }

  // Returning from a legal page goes back to the page you left, not to the
  // dashboard, so reading the terms does not lose your place.
  function closeLegal() {
    if (ROUTABLE) window.history.pushState(null, "", PAGE_PATH[page] || "/");
    setLegal(null);
  }
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
  // Staff role, tester and ban, from the database.
  const [access, setAccess] = useState({ role: null, tester: false, banned: false });
  useEffect(() => {
    if (!auth.user) { setAccess({ role: null, tester: false, banned: false }); return; }
    let live = true;
    myAccess().then((v) => live && setAccess(v));
    return () => { live = false; };
  }, [auth.user]);
  const staff = !!access.role;
  // Features still being tried out are for staff and testers only.
  // VITE_EARLY_ALL=1 turns them on for everyone, for local testing only.
  const early = staff || !!access.tester || import.meta.env.VITE_EARLY_ALL === "1";
  useEffect(() => { setEarlyAccess(early); }, [early]);
  const profile = useMyProfile(auth.user);

  // Session storage, so closing the tab brings the landing page back. Anyone
  // signed in skips it entirely, because their work is already safe.
  // Arriving straight at /topics means you want the app, so the landing page is
  // skipped. Plain "/" still shows it.
  const [entered, setEnteredRaw] = useState(() => {
    if (loadSession(KEYS.entered, false)) return true;
    const r = routeOf(window.location.pathname);
    return !!(r.page && r.page !== "home");
  });
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

  // Generated material accumulates. Doing one syllabus topic and then another
  // used to throw the first away, which made Courses close to useless: you
  // could only ever hold the last thing you generated.
  function setMade(data, { replace = false } = {}) {
    setMadeRaw((prev) => {
      let next = data;

      if (prev && data && !replace) {
        const ids = new Set(prev.questions.map((q) => q.id));
        const names = new Set(prev.topics.map((t) => t.name));
        next = {
          title: data.title,
          topics: [...prev.topics, ...data.topics.filter((t) => !names.has(t.name))],
          questions: [...prev.questions, ...data.questions.filter((q) => !ids.has(q.id))],
          // Keep the newest sheet, since the old one is still reachable by
          // regenerating, and two sheets on one page helps nobody.
          sheet: data.sheet || prev.sheet,
          sheets: [...(prev.sheets || (prev.sheet ? [{ title: prev.title, sheet: prev.sheet }] : [])),
                   ...(data.sheet ? [{ title: data.title, sheet: data.sheet }] : [])].slice(-12),
          lessons: { ...(prev.lessons || {}), ...(data.lessons || {}) },
          drills: [...(prev.drills || []), ...(data.drills || [])],
          notes: Object.entries(data.notes || {}).reduce(
            (acc, [name, blocks]) => ({ ...acc, [name]: [...(acc[name] || []), ...blocks] }),
            { ...(prev.notes || {}) },
          ),
        };
      }

      save(KEYS.made, next && { ...next, savedAt: Date.now() });
      return next;
    });
  }

  // Deleting material takes its lessons, notes and review schedule with it.
  // Your streak and totals stay: they are what you did, not what you added.
  function deleteMaterial() {
    setMadeRaw(null);
    save(KEYS.made, null);
    save(KEYS.madeCleared, Date.now());
    save(KEYS.sources, { list: [], topics: {} });
    save(KEYS.srs, {});
    setSrs({});
    setMissed([]); save(KEYS.missed, []);
    setHiddenRaw([]); save(KEYS.hidden, []);
    setTopicRaw(null); save(KEYS.topic, null);
  }

  // A lesson is kept once written, so it opens instantly the next time and
  // follows the account. Its two checks join the topic's practice questions,
  // which is how the question pool grows as someone studies.
  function saveLesson(name, lesson) {
    setMadeRaw((prev) => {
      if (!prev) return prev;
      const have = new Set(prev.questions.map((q) => q.id));
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      // Multiple choice ones join the questions every practice mode uses; the
      // other kinds join the drills, which Quiz and Review mix in.
      const extra = (lesson.checks || [])
        .map((c, i) => ({ id: `ls-${slug}-${i}`, topic: name, kind: "concept", ...c }))
        .filter((c) => !isDrill(c))
        .filter((q) => !have.has(q.id));
      const next = {
        ...prev,
        questions: [...prev.questions, ...extra],
        drills: [
          ...(prev.drills || []).filter((d) => d.topic !== name || !String(d.id).startsWith(`ld-${slug}-`)),
          ...(lesson.checks || []).map((c, i) => ({ id: `ld-${slug}-${i}`, topic: name, ...c })).filter(isDrill),
        ],
        topics: prev.topics.map((t) => t.name === name ? { ...t, questions: (t.questions || 0) + extra.length } : t),
        lessons: {
          ...(prev.lessons || {}),
          [name]: { cards: lesson.cards, checks: lesson.checks, done: prev.lessons?.[name]?.done || false },
        },
      };
      save(KEYS.made, next && { ...next, savedAt: Date.now() });
      return next;
    });
  }

  // Full notes written later, for material made before they existed or for a
  // topic whose notes failed the first time.
  function saveNotes(written) {
    setMadeRaw((prev) => {
      if (!prev) return prev;
      const next = { ...prev, notes: { ...(prev.notes || {}), ...written } };
      save(KEYS.made, next && { ...next, savedAt: Date.now() });
      return next;
    });
  }

  function finishLesson(name) {
    setStats((prev) => {
      const next = { ...prev, xp: (prev.xp || 0) + XP.lesson };
      save(KEYS.stats, next);
      return next;
    });
    announceXp(XP.lesson, "lesson finished");
    setMadeRaw((prev) => {
      if (!prev?.lessons?.[name]) return prev;
      const next = { ...prev, lessons: { ...prev.lessons, [name]: { ...prev.lessons[name], done: true } } };
      save(KEYS.made, next && { ...next, savedAt: Date.now() });
      return next;
    });
  }

  // Everything comes from the person's own notes. There is no built in content.
  // Phrased on the way out as well as on the way in, so material saved before
  // bare terms were turned into questions reads properly too.
  const bank = (made?.questions || []).map(phraseQuestion);
  // The other kinds: those written with lessons, and those built from the
  // vocabulary questions every set already has.
  const drills = made ? [...(made.drills || []), ...derivedDrills(made.questions || [])] : [];
  const topics = (made?.topics || []).map((t) => ({ ...t, material: "made", source: made.title }));
  const materials = made ? [{ id: "made", title: made.title, kind: "Yours" }] : [];

  // Push progress up whenever it changes, debounced so a run of answers does
  // not become a run of requests.
  useEffect(() => {
    if (!auth.user) return;
    const t = setTimeout(() => pushProgress(auth.user.id, localSnapshot()), 1200);
    return () => clearTimeout(t);
  }, [auth.user, missed, hidden, topic, theme, made]);

  const go = (p, mode) => {
    if (p !== "home") setEditing(false);
    if (mode) setPMode(mode);
    if (p === page) setSeq((n) => n + 1);
    setPage(p);
    setLegal(null);
    setMenuOpen(false);

    // Same page, same URL: pushing again would make the back button do nothing
    // visible, which feels more broken than not working at all.
    const path = PAGE_PATH[p] || "/";
    if (ROUTABLE && window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
  };

  // The browser back and forward buttons, and the swipe gesture that maps to
  // them, all arrive here. State is rebuilt from the URL rather than tracked
  // separately, so the two cannot drift apart.
  useEffect(() => {
    if (!ROUTABLE) return;
    const onPop = () => {
      const path = window.location.pathname;
      const r = routeOf(path);
      setLegal(r.legal);
      setLost(!REAL_PATHS.has(path));
      setAtLandingRaw(path === "/homepage");
      if (r.page) setPage(r.page);
      else if (!r.legal) setPage("home");
      setMenuOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // "system" means whatever the device is set to, and it keeps following it if
  // that changes while the app is open. Before this, a first time visitor was
  // always shown the light theme regardless of their device.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const resolved = theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      setResolved(resolved);
      // A theme has a light and a dark form, so it is reapplied whenever the
      // resolved mode changes rather than only when the theme does.
      applyLook(look, resolved);
    };

    apply();
    save(KEYS.theme, theme);

    if (theme !== "system") return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, look]);

  const Page = {
    home: Dashboard,
    topics: Topics,
    quiz: Practice,
    solve: Solve,
    decks: early ? Decks : Dashboard,
    sheet: StudySheet,
    learn: Learn,
    videos: Videos,
    upload: AddMaterial,
    library: Library,
    reader: Library,
    settings: Settings,
    tests: TestPrep,
    courses: Courses,
    notebook: NotebookLoader,
    chat: ChatRoom,
    feedback: FeedbackPage,
    install: Install,
    "install-all": InstallAll,
  }[page];

  const title = ALL_NAV.find((n) => n.id === page).label;
  const group = groupOf(page);
  if (group) lastInGroup.current[group.id] = page;

  if (legal === "download") {
    const leave = (toLanding) => {
      if (ROUTABLE) window.history.pushState(null, "", "/");
      setLegal(null);
      if (toLanding) setAtLanding(true);
      else { setAtLanding(false); enter(); go("home"); }
      window.scrollTo(0, 0);
    };
    return <DownloadPage onHome={() => leave(true)} onOpen={() => leave(false)} onLegal={openLegal} />;
  }

  if (legal) {
    return (
      <Legal
        which={legal}
        onHome={closeLegal}
        onOther={() => openLegal(legal === "privacy" ? "terms" : "privacy")}
      />
    );
  }

  if (lost) {
    return (
      <NotFound
        onHome={() => {
          if (ROUTABLE) window.history.replaceState(null, "", "/");
          setLost(false);
        }}
      />
    );
  }

  if (auth.user && access.banned) {
    return <Suspended reason={access.reason} email={auth.user.email} onSignOut={auth.signOut} />;
  }

  // Someone signed in, or who has been here before, goes straight to the app.
  if (signInOpen && !auth.user) {
    return <SignInPage onClose={() => { setSignInOpen(false); enter(); }} />;
  }

  if (atLanding || (!auth.user && !entered && auth.ready)) {
    // The update card shows here too: someone who is not signed in sees this
    // screen first, and would otherwise never hear about a new version.
    return isDesktop
      ? <><DesktopWelcome onSkip={() => { setAtLanding(false); enter(); }} /><UpdateBar /></>
      : <Landing people={people} signedIn={!!auth.user} onSignIn={() => setSignInOpen(true)}
          onSkip={() => { setAtLanding(false); enter(); }}
          onLegal={openLegal}
          onInstall={() => openLegal("download")} />;
  }

  // Someone already running it installed does not need to be sold it.
  const installed = isInstalled();
  const showPhoto = custom.on && customBg && custom.widgets.photo &&
    (custom.photo.place === "background" || custom.photo.place === "both");

  return (
    <div className={"app" + (isDesktop ? " is-desktop" : "") + (onMac ? " is-mac" : "")}>
      {showPhoto && (
        <div className="app-photo" aria-hidden="true">
          <img src={customBg} alt="" />
          <div style={{
            backdropFilter: custom.photo.blur ? `blur(${custom.photo.blur}px)` : undefined,
            background: `rgba(0,0,0,${custom.photo.dim / 200})`,
          }} />
        </div>
      )}
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
      <ProfileGate user={auth.user} />
      {/* A painted place behind every page, for testers for now; the old
          weather over the home screen for everyone else. */}
      {early && !showPhoto && <ThemeBackdrop theme={look} resolved={resolved} />}
      {early && <VideoJobChip go={go} page={page} />}
      {page === "home" && !early && <ThemeDrift theme={look} />}

      <aside className={"sidebar" + (menuOpen ? " open" : "")}>
        <button className="icon-btn drawer-close" aria-label="Close menu"
          onClick={() => setMenuOpen(false)}>
          <Icon name="close" size={16} />
        </button>
        <button
          className="brand brand-home"
          onClick={() => { setAtLanding(true); setMenuOpen(false); }}
          title="Back to the front page"
        >
          <ThemeMark theme={look} dark={resolved === "dark"} size={look === "classic" ? 26 : 28} className="brand-mark-duck" />
          Dwiddle
          <span className="brand-hint">Home</span>
        </button>

        <nav className="nav">
          {/* Making something is the first thing on the list and styled as one of
              it, rather than a heavy button that belongs to no other element. */}
          <button className={"nav-item nav-add" + (page === "upload" ? " on" : "")} onClick={() => go("upload")}>
            <span className="nav-add-icon"><Icon name="plus" size={14} /></span>
            New material
          </button>
          {GROUPS.filter((g) => !g.early || early).map((g) => (
            <button key={g.id} className={"nav-item" + (g.pages.includes(page) ? " on" : "")}
              onClick={() => go(lastInGroup.current[g.id] || g.pages[0])}>
              <Icon name={g.icon} />
              {g.label}
            </button>
          ))}
        </nav>

        {/* The places people go now and then, kept to the foot but drawn the
            same way as everything above them. */}
        {/* the theme's little scene, in the space between the pages and the foot */}
        {hasScenery(look) && <div className="side-scene"><ThemeScenery theme={look} /></div>}
        <nav className="nav nav-bottom">
          {!installed && !isDesktop && (
            <button className={"nav-item" + (page === "install" ? " on" : "")} onClick={() => go("install")}>
              <Icon name="download" />
              Get the app
            </button>
          )}
          <button className={"nav-item" + (page === "feedback" ? " on" : "")} onClick={() => go("feedback")}>
            <Icon name="chat" />
            Feedback
          </button>
          {/* Only staff accounts see this, and only the database decides who is staff. */}
          {staff && (
            <a className="nav-item nav-staff" href={STAFF_URL} target="_blank" rel="noreferrer">
              <Icon name="flag" />
              Staff
            </a>
          )}
        </nav>

        <div className="sidebar-foot">
          {auth.user ? (
            <div className="user">
              <UserIcon avatar={profile?.avatar} user={auth.user} size={26} />
              <div style={{ minWidth: 0 }}>
                <div className="user-name">{profile?.display_name || displayName(auth.user)}</div>
                <div className="user-sub">Synced{access.role ? ` · ${access.role === "admin" ? "Admin" : "Moderator"}` : access.tester ? " · Tester" : ""}</div>
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
        {early && <StudyBanner />}
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
          {group?.tabs ? (
            <nav className="tabs" aria-label={group.label}>
              {group.pages.filter((id) => group.tabs[id] && (id !== "videos" || early)).map((id) => (
                <button key={id} className={page === id ? "on" : ""} onClick={() => go(id)}>
                  {group.tabs[id]}
                </button>
              ))}
            </nav>
          ) : (
            <span className="topbar-title">{title}</span>
          )}
          <span className="crumb small">{made ? made.title : ""}</span>
          <FullscreenButton className="icon-btn topbar-fs" />
        </header>
        <Boundary resetKey={`${page}:${seq}`} onLeave={() => go("home")}>
        <Page
          key={`${page}:${seq}`}
          go={go}
          early={early}
          look={look}
          resolved={resolved}
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
          saveLesson={saveLesson}
          finishLesson={finishLesson}
          saveNotes={saveNotes}
          deleteMaterial={deleteMaterial}
          bank={bank}
          drills={drills}
          srs={srs}
          topics={topics}
          materials={materials}
          auth={auth}
          access={access}
          onSignIn={() => setSignInOpen(true)}
          custom={custom}
          setCustom={setCustom}
          customBg={customBg}
          setCustomBg={setCustomBg}
          editing={editing}
          setEditing={setEditing}
          openEditor={openEditor}
          look={look}
          setLook={setLook}
          resolved={resolved}
        />
        </Boundary>
      </main>

      {/* On a phone the sidebar gives way to a tab bar along the bottom, where
          a thumb can reach it, the way a phone app is laid out. The places
          visited less often stay in the drawer behind More. */}
      <nav className="tabbar" aria-label="Main">
        {[
          { id: "home", label: "Home", icon: "home", on: page === "home", to: "home" },
          { id: "study", label: "Study", icon: "cards", on: groupOf(page)?.id === "study",
            to: lastInGroup.current.study || "sheet" },
          { id: "add", label: "New", icon: "plus", on: page === "upload", to: "upload", add: true },
          { id: "solve", label: "Solve", icon: "bulb", on: page === "solve", to: "solve" },
        ].map((t) => (
          <button key={t.id} className={"tab" + (t.on ? " on" : "") + (t.add ? " tab-add" : "")}
            onClick={() => go(t.to)} aria-current={t.on ? "page" : undefined}>
            <span className="tab-icon"><Icon name={t.icon} size={t.add ? 22 : 21} /></span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
        <button className={"tab" + (["tests", "courses", "library", "reader", "settings", "feedback", "install", "install-all", "notebook"].includes(page) ? " on" : "")}
          onClick={() => setMenuOpen(true)}>
          <span className="tab-icon"><Icon name="menu" size={21} /></span>
          <span className="tab-label">More</span>
        </button>
      </nav>

      <UpdateBar />
      <DwiddleChat hidden={["settings", "install", "install-all", "feedback", "tests", "notebook", "chat"].includes(page)} />
      <PermissionPrompt />
      <XpToast />

      {editing && page === "home" && custom.on && (
        <EditBar
          cfg={custom}
          setCfg={setCustom}
          bg={customBg}
          setBg={setCustomBg}
          onDone={() => setEditing(false)}
        />
      )}
    </div>
  );
}

/* ---------- shared bits ---------- */

// Test prep and Courses need the heavy bundle. It arrives in well under a
// second on any normal connection, but the page has to cope with not having it.
function useHeavy() {
  const [ready, setReady] = useState(() => H() !== null);
  useEffect(() => {
    if (ready) return;
    let live = true;
    loadHeavy().then(() => live && setReady(true));
    return () => { live = false; };
  }, [ready]);
  return ready;
}

// The notebook's ink and fonts are only fetched when a notebook is opened, so
// the rest of the app does not carry them.
let NotebookPage = null;
function NotebookLoader(props) {
  const [, setReady] = useState(!!NotebookPage);
  useEffect(() => {
    if (NotebookPage) return;
    let live = true;
    import("./Notebook.jsx").then((m) => { NotebookPage = m.default; if (live) setReady(true); });
    return () => { live = false; };
  }, []);
  return NotebookPage ? <NotebookPage {...props} /> : <LoadingPage title="Notebooks" />;
}

function LoadingPage({ title }) {
  return (
    <div className="page fade">
      <PageHead title={title} sub="One moment." />
      <div className="card card-pad" style={{ textAlign: "center", padding: 44 }}>
        <Loading label="Loading" />
      </div>
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
//
// A sheet does not always arrive in the shape it should. A model can write a
// plain string where segments were asked for, and a reply cut off mid answer
// gets repaired, which can leave a line half written or missing. None of that
// is worth a blank page, so anything unexpected is coerced or dropped.


// The filter chips above any highlighted document.


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

// Renders the dashboard blocks in the saved order. While editing, every block
// is shown even if it is switched off, because you cannot bring back something
// you cannot see.
function DashWidgets({ custom, customBg, setCustom, editing, parts }) {
  const on = custom?.on;
  const order = on ? custom.order : WIDGETS.map((w) => w.id);
  const drag = useDragOrder(order, (next) => setCustom({ ...custom, order: next }));

  const asCard = custom?.photo?.place !== "background";
  const extra = {
    photo: on && customBg && asCard
      ? <div className="card dash-photo" style={{ backgroundImage: `url(${customBg})` }} />
      : on && editing
        ? <div className="card card-pad dash-empty">No photo yet. Open Photo in the bar below.</div>
        : null,
    quote: on && (custom.quote?.trim() || editing)
      ? <div className="card card-pad dash-quote">{custom.quote?.trim() || "Your words go here."}</div>
      : null,
  };

  return (
    <>
      {order.map((id, index) => {
        const hidden = on && !custom.widgets[id];
        if (hidden && !editing) return null;
        if (!on && (id === "photo" || id === "quote")) return null;
        const node = id in extra ? extra[id] : parts[id];
        if (!node) return null;
        return (
          <div key={id} className="dash-slot">
            <EditSlot
              id={id}
              index={index}
              editing={editing}
              hidden={hidden}
              drag={drag}
              onToggle={() => setCustom({ ...custom, widgets: { ...custom.widgets, [id]: hidden } })}
            >
              {node}
            </EditSlot>
          </div>
        );
      })}
    </>
  );
}

// A different one each day, the same all day. Every one is a finding from the
// research on how people learn, stated as advice rather than as a citation.
const TIPS = [
  { h: "Test yourself, do not reread", p: "Answering questions from memory strengthens it far more than reading the same page again, even though rereading feels more productive." },
  { h: "Space it out", p: "Three short sessions on a topic across a week beat one long one the night before. The forgetting in between is what makes the next recall count." },
  { h: "Mix your topics", p: "Practising different kinds of question in one sitting is harder than doing a block of one kind, and it is exactly why it works: you learn to spot which method a question needs." },
  { h: "Explain it in your own words", p: "If you cannot say why an answer is right without looking, you know the answer but not the idea. Try saying it out loud to nobody." },
  { h: "Wrong answers are useful", p: "A question you got wrong and then corrected is remembered better than one you got right first time. Go back to your mistakes rather than avoiding them." },
  { h: "Sleep is part of revising", p: "Memories are consolidated while you sleep. An all nighter before an exam trades the thing that makes revision stick for a few more tired hours." },
  { h: "Put the phone in another room", p: "A phone within reach costs attention even when it is face down and silent. Out of sight works better than on silent." },
  { h: "Start with the hardest topic", p: "Attention is highest early in a session. Spend it on the topic you are avoiding, and leave the comfortable ones for when you are tired." },
];

const tipOfDay = (now = new Date()) =>
  TIPS[Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000) % TIPS.length];

// The last seven days, oldest first, and whether each one had any practice.
function lastWeek(days) {
  const set = new Set(days || []);
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      label: d.toLocaleDateString("en-GB", { weekday: "narrow" }),
      name: d.toLocaleDateString("en-GB", { weekday: "long" }),
      on: set.has(d.toISOString().slice(0, 10)),
      today: i === 0,
    });
  }
  return out;
}

const SHORTCUTS = [
  { id: "learn", icon: "cards", name: "Learn", sub: "Short lessons, one topic at a time", needs: true },
  { id: "quiz", icon: "quiz", name: "Practice", sub: "Questions with an explanation for each", needs: true },
  { id: "sheet", icon: "sheet", name: "Notes", sub: "Everything in your material, organised", needs: true },
  { id: "solve", icon: "bulb", name: "Solve", sub: "A question you are stuck on, worked through" },
  { id: "tests", icon: "target", name: "Test prep", sub: "Timed SAT, ACT, IELTS and more" },
  { id: "courses", icon: "cap", name: "Courses", sub: "IGCSE, IB and A Level syllabuses" },
];

function Dashboard({ go, auth, stats, missed, topics, materials, made, custom, setCustom,
  customBg, setCustomBg, editing, setEditing, bank = [], setPMode, look, resolved, drills = [], srs = {}, early }) {
  const [pick] = useState(() => Math.random());
  const me = useMyProfile(auth?.user);
  const hello = greeting(me?.display_name?.trim().split(/\s+/)[0] || nameFor(auth?.user), pick);
  const tip = tipOfDay();
  const week = lastWeek(stats.days);
  const toFix = bank.filter((q) => missed.includes(q.id)).length;
  const lv = levelOf(stats.xp || 0);
  const due = reviewOn() ? dueFrom([...bank, ...drills], srs).length : 0;

  // Where to carry on: the first topic whose lesson is not finished.
  const lessons = made?.lessons || {};
  const doneCount = topics.filter((t) => lessons[t.name]?.done).length;
  const nextTopic = topics.find((t) => !lessons[t.name]?.done) || null;

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
      {hasScenery(look) && <div className="home-scene"><ThemeScenery theme={look} /></div>}

      <div className="dash-top">
        <PageHead
          title={hello}
          sub={greetingSub() || (started
            ? `${stats.answered} question${stats.answered === 1 ? "" : "s"} answered so far. Pick up where you left off.`
            : topics.length > 0
              ? "Ready when you are."
              : "Turn your notes into lessons and questions, and sit full length practice papers.")}
        />
        <div className="dash-level" title={`${lv.into} of ${lv.need} XP to level ${lv.level + 1}`}>
          <span className="dash-level-badge">{lv.level}</span>
          <div>
            <b>Level {lv.level}</b>
            <div className="dash-level-bar"><i style={{ width: `${(lv.into / lv.need) * 100}%` }} /></div>
            <span className="small muted">{(stats.xp || 0).toLocaleString()} XP</span>
          </div>
        </div>
        <button className="btn cta dash-add" onClick={() => go("upload")}>
          <Icon name="plus" size={15} /> Add material
        </button>
      </div>

      <div className="stack">
        {early && <StudyTimerCard />}
        {topics.length === 0 && (
          <div className="card card-pad welcome">
            <Duck size={84} className="welcome-duck" />
            <b>Start with something you are studying</b>
            <div className="small muted">
              A PDF, slides, a photo of a page or notes you paste in. Dwiddle reads all of it.
            </div>
            <ol className="welcome-steps">
              <li><i>1</i><span><b>Add material</b>Anything from one page to a whole chapter.</span></li>
              <li><i>2</i><span><b>Learn it</b>Full notes and short lessons, topic by topic.</span></li>
              <li><i>3</i><span><b>Practise</b>Real exam style questions, each one explained.</span></li>
            </ol>
            <button className="btn cta" onClick={() => go("upload")}>
              <Icon name="upload" size={14} /> Add material
            </button>
          </div>
        )}

        <DashWidgets custom={custom} customBg={customBg} setCustom={setCustom} editing={editing} parts={{
          continue: (made && topics.length > 0) ? (
        <div className="card dash-cont">
          <div className="dash-cont-main">
            <span className="dash-eyebrow">{nextTopic ? "Continue learning" : "All lessons finished"}</span>
            <b className="dash-cont-title">{nextTopic ? nextTopic.name : made.title}</b>
            <span className="small muted">
              {nextTopic ? `${made.title} · Lesson ${doneCount + 1} of ${topics.length}` : "Practice is what keeps it there."}
            </span>
          </div>
          <div className="dash-cont-progress" aria-label={`${doneCount} of ${topics.length} lessons finished`}>
            <div className="dash-progress">
              {topics.map((t) => <i key={t.id} className={lessons[t.name]?.done ? "on" : ""} title={t.name} />)}
            </div>
            <span className="small muted">{doneCount} of {topics.length} done</span>
          </div>
          <div className="dash-cont-actions">
            <button className="btn ghost small" onClick={() => go("sheet")}>Notes</button>
            {nextTopic
              ? <button className="btn cta small" onClick={() => go("learn")}>{doneCount ? "Continue" : "Start"} <Icon name="arrow" size={13} /></button>
              : <button className="btn cta small" onClick={() => go("quiz")}>Practise <Icon name="arrow" size={13} /></button>}
          </div>
        </div>
          ) : null,
          review: null,
          stats: (
        <div className="dash-overview">
          <div className="stat">
            <div className="k">Study streak</div>
            <div className="v">
              {(() => { const n = streakOf(stats.days); return n === 0 ? "0 days" : `${n} day${n === 1 ? "" : "s"}`; })()}
            </div>
            <div className="dash-week" aria-label="The last seven days">
              {week.map((d, i) => (
                <span key={i} className={(d.on ? "on" : "") + (d.today ? " today" : "")}
                  title={`${d.name}${d.on ? ", studied" : ""}`}>
                  <i />{d.label}
                </span>
              ))}
            </div>
          </div>
          <div className="stat">
            <div className="k"><span className="k-long">Questions answered</span><span className="k-short">Answered</span></div>
            <div className="v">{stats.answered}</div>
            <div className="small muted stat-sub">{stats.correct} right</div>
          </div>
          <div className="stat">
            <div className="k">Accuracy</div>
            <div className="v">{started ? `${accuracy}%` : "–"}</div>
            <div className="stat-bar"><i style={{ width: `${started ? accuracy : 0}%` }} /></div>
          </div>
          <button className="stat stat-link" onClick={() => { setPMode?.("review"); go("quiz"); }}
            disabled={!due} title={due ? "Review them now" : "Nothing due"}>
            <div className="k">Due for review</div>
            <div className="v">{due}</div>
            <div className="small muted stat-sub">{due ? <>Review now <Icon name="arrow" size={12} /></> : "All caught up"}</div>
          </button>
        </div>
          ),
          upnext: topics.length > 0 && (
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
          ),
          actions: (
        <div className="dash-tools">
          {SHORTCUTS.map((t) => {
            const off = t.needs && topics.length === 0;
            return (
              <button key={t.id} className="card dash-tool" disabled={off}
                onClick={() => go(t.id)} title={off ? "Add material first" : undefined}>
                <span className="dash-tool-icon"><Icon name={t.icon} size={18} /></span>
                <b>{t.name}</b>
                <span className="small muted">{t.sub}</span>
              </button>
            );
          })}
        </div>
          ),
          focus: (
        <div className="grid-2">
          <div className="card card-pad dash-fix">
            <span className="dash-eyebrow">Mistakes to fix</span>
            {toFix > 0 ? (
              <>
                <div className="dash-big">{toFix}</div>
                <p className="small muted">
                  Question{toFix === 1 ? "" : "s"} you got wrong. Each one leaves the list when you get it right.
                </p>
                <button className="btn ghost" onClick={() => { setPMode?.("missed"); go("quiz"); }}>
                  <Icon name="flag" size={14} /> Go through them
                </button>
              </>
            ) : (
              <>
                <div className="dash-big">{started ? "None" : "0"}</div>
                <p className="small muted">
                  {started
                    ? "Nothing wrong left to go back over. Anything you miss in practice lands here."
                    : "Anything you get wrong in practice lands here, to go back over."}
                </p>
              </>
            )}
          </div>
          <div className="card card-pad dash-tip">
            <span className="dash-eyebrow"><Icon name="bulb" size={13} /> Tip of the day</span>
            <b>{tip.h}</b>
            <p className="small muted">{tip.p}</p>
          </div>
        </div>
          ),
        }} />

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

// "+10 XP" drifting up from the bottom of the screen, stacked if several
// arrive together.
function XpToast() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const on = (e) => {
      const id = Math.random();
      setItems((l) => [...l.slice(-2), { id, ...e.detail }]);
      setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), 1600);
    };
    window.addEventListener("dwiddle:xp", on);
    return () => window.removeEventListener("dwiddle:xp", on);
  }, []);
  return (
    <div className="xp-toasts" aria-live="polite">
      {items.map((x) => <div key={x.id} className="xp-toast">+{x.amount} XP{x.label ? <span> · {x.label}</span> : null}</div>)}
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
    <div className="page wide fade">
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
            <Duck size={80} outfit="viking" />
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

const LIMIT = 24000; // characters the server takes in one call

const MAX_MATERIAL_FILES = 10;

// The opening of a transcript, a few sentences long, to recognise it by.
function firstSentences(text, n) {
  const parts = String(text || "").match(/[^.!?]+[.!?]+/g);
  if (!parts) return String(text || "").split(/\s+/).slice(0, 45).join(" ") + (String(text).split(/\s+/).length > 45 ? "..." : "");
  return parts.slice(0, n).map((p) => p.trim()).join(" ");
}
// Shorter than this, what someone typed may be a request to study something
// rather than notes, so it is looked at before anything is written.
const REQUEST_LIMIT = 1500;

function AddMaterial({ go, setMade, auth, early }) {
  const [pageOf, setPageOf] = useState(null); // { p, of } while a long PDF is read
  const [size, setSize] = useState(0); // words being built from, for the time estimate
  const [files, setFiles] = useState([]); // [{ file, url }] in the order added
  // A notebook page sent here arrives as its text, ready to build from.
  const [notes, setNotes] = useState(() => {
    const handed = sessionStorage.getItem("dwiddle-handoff-notes");
    if (handed) sessionStorage.removeItem("dwiddle-handoff-notes");
    return handed || "";
  });
  const [over, setOver] = useState(false);
  const [state, setState] = useState("idle"); // idle | reading | asking | clarify | brief | working | done | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [long, setLong] = useState("");
  const [reading, setReading] = useState(0);
  const [ask, setAsk] = useState(null); // { text, questions } while the clarifying questions are up
  const [link, setLink] = useState("");
  const [fetching, setFetching] = useState(false);
  const [videoError, setVideoError] = useState("");
  // On the website, reading a video goes through our server, which YouTube
  // often blocks. Say so once before the first try; the app reads it directly.
  const [videoNotice, setVideoNotice] = useState(false);
  const [videoWarned, setVideoWarned] = useState(false);
  const notesRef = useRef(null);
  const [recStart, setRecStart] = useState(0);
  const [recNow, setRecNow] = useState(0);
  // A recording's words go to their own transcript, not into the notes box,
  // where an hour of lecture would be a wall of text. When it stops, it is
  // offered back as a recording to listen to and use.
  const [heard, setHeard] = useState("");
  const [recording, setRecording] = useState(null); // { transcript, url, blob, seconds } after stopping
  const [fullText, setFullText] = useState(false);
  const dictation = useDictation((t) => setHeard(t));
  const audioRef = useRef(null);
  useEffect(() => {
    if (!dictation.on) {
      if (recStart && (heard.trim() || audioRef.current)) {
        const blob = audioRef.current;
        setRecording({ transcript: heard.trim(), seconds: (Date.now() - recStart) / 1000,
          blob, url: blob ? URL.createObjectURL(blob) : "" });
        setRecStart(0);
      }
      return;
    }
    const t = setInterval(() => setRecNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [dictation.on]);

  // A YouTube link joins the list like a file, as its transcript.
  async function addVideo(warned = videoWarned) {
    if (!link.trim() || fetching) return;
    if (files.length >= MAX_MATERIAL_FILES) {
      setVideoError(`Up to ${MAX_MATERIAL_FILES} files at a time. Remove one before adding a video.`);
      return;
    }
    if (!isDesktop && !warned) { setVideoNotice(true); return; }
    setFetching(true);
    setVideoError("");
    try {
      const v = await readYouTube(link.trim());
      setFiles((prev) => [...prev, { yt: v, file: { name: v.title, size: v.transcript.length } }]);
      setLink("");
      setState("idle");
    } catch (err) {
      setVideoError(err.message);
    } finally {
      setFetching(false);
    }
  }
  const [progress, setProgress] = useState(null); // { n, of } while working in parts
  const [waiting, setWaiting] = useState(null); // { seconds, why } between parts
  const [unfinished, setUnfinished] = useState(null); // { rest, done, error } if a long job stopped early

  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const ready = files.length > 0 || words > 0;
  const busy = ["reading", "asking", "brief", "working"].includes(state);

  function accept(list) {
    const incoming = [...(list || [])];
    if (!incoming.length) return;
    const big = incoming.find((f) => f.size > MAX_FILE);
    if (big) {
      setError(`${big.name} is ${(big.size / 1024 / 1024).toFixed(1)} MB, over the 20 MB limit.`);
      setState("error");
      return;
    }
    setFiles((prev) => {
      const room = MAX_MATERIAL_FILES - prev.length;
      if (incoming.length > room) {
        setError(`Up to ${MAX_MATERIAL_FILES} files at a time.${room > 0 ? ` The first ${room} were added.` : ""}`);
        setState("error");
      } else {
        setError("");
        setState("idle");
      }
      return [...prev, ...incoming.slice(0, Math.max(0, room)).map((file) => ({
        file, url: IMAGE.test(file.name) ? URL.createObjectURL(file) : "",
      }))];
    });
  }

  function remove(i) {
    setFiles((prev) => {
      if (prev[i]?.url) URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, n) => n !== i);
    });
  }

  // A screenshot on the clipboard goes straight in, unless the paste is into
  // the notes box, where it is text someone meant to paste.
  useEffect(() => {
    const onPaste = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest("textarea, input")) return;
      const pasted = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
      if (!pasted.length) return;
      e.preventDefault();
      accept(pasted.map((f, i) => new File([f], `Pasted ${Date.now()}${i ? `-${i}` : ""}.png`, { type: f.type })));
    };
    addEventListener("paste", onPaste);
    return () => removeEventListener("paste", onPaste);
  }, []);

  function onDrop(e) {
    e.preventDefault();
    setOver(false);
    accept(e.dataTransfer.files);
  }

  async function run() {
    if (generationsLeft(auth?.user) <= 0) {
      setState("locked");
      return;
    }
    dictation.stop();
    setError("");
    const parts = [];

    // In order, one at a time: each photo is a call to the reading model.
    for (let i = 0; i < files.length; i++) {
      setState("reading");
      setReading(i + 1);
      try {
        setPageOf(null);
        const read = (files[i].yt ? files[i].yt.transcript : await readFile(files[i].file, { onPage: (p, of) => { if (of > 1) setPageOf({ p, of }); } })).trim();
        if (read) parts.push(files.length > 1 ? `${files[i].file.name}\n\n${read}` : read);
      } catch (err) {
        setState("error");
        setError(files.length > 1 ? `${files[i].file.name}: ${err.message}` : err.message);
        return;
      }
    }
    if (notes.trim()) parts.push(notes.trim());
    const text = parts.join("\n\n");

    // Something short may be a request, "photosynthesis" say, rather than
    // notes. It is checked, and only asked about if it is genuinely unclear.
    if (!files.length && !dictation.on && text.trim().length < REQUEST_LIMIT) {
      setState("asking");
      let seen = null;
      try { seen = await clarify(text.trim()); } catch { seen = null; }
      if (seen?.kind === "request" || (!seen && text.trim().length < 200)) {
        if (seen?.questions?.length) {
          setAsk({ text: text.trim(), questions: seen.questions });
          setState("clarify");
        } else {
          fromRequest(text.trim(), []);
        }
        return;
      }
    }

    // Past what one go can take, the choice is theirs: all of it in parts, or
    // the first ten pages. The server would only have refused it anyway, after
    // the whole file had been read.
    if (text.trim().length > LIMIT) {
      setLong(text);
      setState("toomuch");
      return;
    }
    build(text, false);
  }

  // Writes the notes on a requested topic, then builds from them exactly as
  // from notes someone pasted.
  async function fromRequest(request, answers) {
    setAsk(null);
    setState("brief");
    try {
      const written = await writeBrief(request, answers);
      build(written, false);
    } catch (err) {
      setState("error");
      setError(err.message);
    }
  }

  // Carrying on adds to what is already there rather than replacing it, and
  // numbers its parts after the ones already done so nothing collides.
  async function build(text, inParts, carryOn = null) {
    setSize(text.trim().split(/\s+/).length);
    setState("working");
    setProgress(null);
    setWaiting(null);
    try {
      let data;
      if (inParts) {
        // Each part is remembered as the source for its own topics, so a lesson
        // is later taught from that part alone and stays inside the limit.
        const run = await generateInParts(text, {
          startAt: carryOn?.done || 0,
          onProgress: (n, of) => { setWaiting(null); setProgress({ n: n + (carryOn?.done || 0), of: of + (carryOn?.done || 0) }); },
          onWait: (seconds, why) => setWaiting({ seconds, why }),
          onPart: (material, partText) => rememberSource(material, { notes: partText }),
        });
        data = run.material;
        setUnfinished(run.rest ? { rest: run.rest, done: (carryOn?.done || 0) + run.done, error: run.error } : null);
      } else {
        data = await generateFromNotes(text);
        rememberSource(data, { notes: text });
        setUnfinished(null);
      }
      if (!carryOn) countGeneration(auth?.user);
      setResult(data);
      setMade(data, { replace: !carryOn });
      setState("done");
    } catch (err) {
      setState("error");
      setError(err.message);
    } finally {
      setProgress(null);
      setWaiting(null);
    }
  }

  return (
    <div className="page fade">
      <PageHead title="Add material" sub="Drop in PDFs, slides or photos of your notes, or just type a topic, and Dwiddle builds the notes, lessons and questions." />

      <div className="stack">
        <label
          className={"drop" + (over ? " over" : "") + (files.length ? " compact" : "")}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <input type="file" multiple accept=".pdf,.docx,.pptx,.txt,.md,image/*" hidden
            onChange={(e) => { accept(e.target.files); e.target.value = ""; }} />
          <span className="drop-icon"><Icon name={files.length ? "plus" : "upload"} size={20} /></span>
          {files.length ? (
            <>
              <b>{files.length === 1 ? "1 file added" : `${files.length} files added`}</b>
              <span className="small muted">
                {files.length < MAX_MATERIAL_FILES
                  ? "Add more, or paste a screenshot. They are read in this order."
                  : `That is the most at once (${MAX_MATERIAL_FILES})`}
              </span>
            </>
          ) : (
            <>
              <b>Drop files here, or click to browse</b>
              <span className="small muted">PDF, Word, PowerPoint, photos or plain text. Up to {MAX_MATERIAL_FILES} at once, 20 MB each</span>
            </>
          )}
        </label>

        {files.length > 0 && (
          <ul className="sv-files" aria-label="Files to use">
            {files.map((f, i) => (
              <li key={f.url || f.file.name + i} className={state === "reading" && reading === i + 1 ? "on" : ""}>
                <span className="sv-thumb">
                  {f.rec ? <span className="rec-card-icon" aria-label="Recording"><Icon name="mic" size={18} /></span>
                    : f.yt ? <span className="yt-badge" aria-label="YouTube video">▶</span>
                    : f.url ? <img src={f.url} alt="" /> : <Icon name="file" size={18} />}
                  <i>{i + 1}</i>
                </span>
                <span className="sv-fname">{f.file.name}</span>
                <button className="sv-x" onClick={() => remove(i)} disabled={busy} aria-label={`Remove ${f.file.name}`}>
                  <Icon name="close" size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="more-in">
          <form className="yt-in" onSubmit={(e) => { e.preventDefault(); addVideo(); }}>
            <span className="yt-badge small" aria-hidden="true">▶</span>
            <input type="url" inputMode="url" placeholder="Paste a YouTube link" value={link}
              onChange={(e) => { setLink(e.target.value); setVideoError(""); }} disabled={busy || fetching} aria-label="YouTube link"
              aria-invalid={!!videoError} aria-describedby={videoError ? "video-import-error" : undefined} />
            <button className="btn small" disabled={!link.trim() || busy || fetching}>
              {fetching ? <Loading label="Reading" /> : "Add video"}
            </button>
          </form>
          <button className={"btn rec-btn" + (dictation.on ? " on" : "")} disabled={busy}
            onClick={() => {
              if (dictation.on) { dictation.stop(); return; }
              if (recording?.url) URL.revokeObjectURL(recording.url);
              setRecording(null); setHeard(""); setFullText(false); audioRef.current = null;
              setRecStart(Date.now()); setRecNow(Date.now());
              dictation.start({ continuous: true, reason: "To turn the lecture into notes as it is spoken, and keep a recording you can play back." });
            }}>
            <span className="rec-dot" />
            {dictation.on ? `Stop, ${Math.floor((recNow - recStart) / 60000)}:${String(Math.floor(((recNow - recStart) / 1000) % 60)).padStart(2, "0")}` : "Record a lecture"}
          </button>
        </div>
        {videoError && (
          <div id="video-import-error" className="card card-pad fade" style={{ borderColor: "var(--warn-line)" }} role="alert">
            <div className="spread">
              <span className="pill warn">Could not add video</span>
              <button className="btn ghost" disabled={!link.trim() || busy || fetching} onClick={addVideo}>Try again</button>
            </div>
            <p className="small" style={{ margin: "10px 0", color: "var(--ink-2)" }}>{videoError}</p>
            <button className="btn small" disabled={busy} onClick={() => {
              notesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              notesRef.current?.focus({ preventScroll: true });
            }}>Paste transcript into notes</button>
          </div>
        )}
        {dictation.error && <p className="small" style={{ color: "var(--warn)", margin: "-4px 0 0" }}>{dictation.error}</p>}
        {dictation.on && (
          <RecordingView
            seconds={(recNow - recStart) / 1000}
            words={heard.trim() ? heard.trim().split(/\s+/).length : 0}
            lastLine={heard.trim().split(/\s+/).slice(-9).join(" ")}
            onStop={() => dictation.stop()}
            onAudio={(blob) => { audioRef.current = blob; setRecording((r) => r && { ...r, url: URL.createObjectURL(blob), blob }); }}
          />
        )}

        {recording && (
          <div className="card card-pad rec-card fade">
            <div className="rec-card-head">
              <span className="rec-card-icon"><Icon name="mic" size={18} /></span>
              <div>
                <b>Lecture recording</b>
                <span className="small muted">
                  {Math.floor(recording.seconds / 60)}:{String(Math.floor(recording.seconds % 60)).padStart(2, "0")}
                  {" · "}{recording.transcript.split(/\s+/).filter(Boolean).length.toLocaleString()} words heard
                </span>
              </div>
            </div>
            {recording.url
              ? <audio className="rec-audio" controls src={recording.url} preload="metadata" />
              : <p className="small muted" style={{ margin: 0 }}>The audio could not be kept on this device, but the words were.</p>}
            <div className="rec-preview">
              <span className="qv-label">{fullText ? "Everything heard" : "How it starts"}</span>
              <p>{fullText ? recording.transcript : firstSentences(recording.transcript, 3)}</p>
              {recording.transcript.length > firstSentences(recording.transcript, 3).length + 5 && (
                <button className="btn quiet small" onClick={() => setFullText((v) => !v)}>
                  {fullText ? "Show less" : "Show full transcript"}
                </button>
              )}
            </div>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button className="btn cta" disabled={!recording.transcript.trim()} onClick={() => {
                setFiles((prev) => [...prev, { rec: true, yt: { transcript: recording.transcript, title: "Lecture recording" },
                  file: { name: `Lecture recording, ${Math.max(1, Math.round(recording.seconds / 60))} min`, size: recording.transcript.length } }]);
                setRecording(null);
              }}>Use this recording</button>
              {recording.url && (
                <a className="btn ghost" href={recording.url} download={`lecture-${new Date().toISOString().slice(0, 10)}.${/mp4/.test(recording.blob?.type) ? "m4a" : "webm"}`}>
                  Download audio
                </a>
              )}
              <button className="btn ghost" onClick={() => { if (recording.url) URL.revokeObjectURL(recording.url); setRecording(null); }}>Discard</button>
            </div>
          </div>
        )}

        <div className="or"><span>or</span></div>

        <div className="glass-stage"><span className="blob b1" aria-hidden="true" /><span className="blob b2" aria-hidden="true" /><span className="blob b3" aria-hidden="true" />
            <div className="notes glass">
          {early && (
            <div className="am-hero">
              <DwiddleHero size={84}
                mood={["reading", "asking", "brief", "working"].includes(state) ? "thinking" : state === "error" ? "oops" : state === "done" ? "dance" : "idle"}
                say={state === "reading" ? "Reading your file..." : state === "asking" ? "Working out what you want..." : state === "brief" ? "Writing your notes..."
                  : state === "working" ? "Making your questions..." : state === "done" ? "All done! Let's study!"
                  : notes.trim() ? (notes.trim().split(/\s+/).length < 12 ? `Ooh, ${notes.trim().slice(0, 40)}! Press the button and I'll get going.` : "Nice notes! I'll turn them into lessons and questions.")
                  : "Paste your notes, or just tell me what you want to learn!"} />
            </div>
          )}
          <div className="notes-head">
            <div className="row">
              <span className="notes-icon"><Icon name="text" size={14} /></span>
              <b className="small">{files.length ? "Add anything else" : "Paste your notes, or say what to study"}</b>
            </div>
            <button className="btn quiet" onClick={() => setNotes(SAMPLE_NOTES)}>Use sample</button>
          </div>

          <textarea
            ref={notesRef}
            className="notes-area"
            placeholder={files.length ? "Anything the files miss." : "Paste lecture notes or a chapter. Or just type a topic, like \"photosynthesis\" or \"IGCSE chemistry bonding\"."}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {["reading", "asking", "brief", "working"].includes(state) && (
            <BusyScreen
              title={state === "reading" ? "Reading your material" : state === "asking" ? "Reading your request" : "Making your study material"}
              detail={state === "reading" ? (files.length > 1 ? `File ${reading} of ${files.length}` : "Pulling the text out of your file")
                : state === "asking" ? "Working out what you want to study"
                : state === "brief" ? "Writing full notes, topic by topic"
                : "Writing questions with an explanation for every answer"}
              progress={state === "reading" && files.length > 1 ? (reading - 1 + (pageOf ? pageOf.p / pageOf.of : 0)) / files.length
                : state === "reading" && pageOf ? pageOf.p / pageOf.of
                : state === "working" && progress ? (progress.n - 1) / progress.of : null}
              count={!early ? null
                : state === "reading" && pageOf ? `Page ${pageOf.p} of ${pageOf.of}${files.length > 1 ? ` · file ${reading} of ${files.length}` : ""}`
                : state === "reading" && files.length > 1 ? `File ${reading} of ${files.length}`
                : state === "working" && progress ? `Part ${progress.n} of ${progress.of}` : null}
              eta={!early ? null
                : state === "brief" ? 45
                : state === "working" && !progress ? Math.min(150, 25 + Math.round(size / 70)) : null}
              outfit={state === "reading" ? "detective" : state === "brief" ? "wizard" : "graduate"} />
          )}
          <div className="notes-foot">
            <span className="small muted">
              {state === "reading" ? `Reading ${files.length > 1 ? `file ${reading} of ${files.length}` : "the file"}`
                : words === 0 ? (files.length ? "Optional" : "Plain text works best")
                : `${words.toLocaleString()} words, about ${Math.max(1, Math.round(words / 120))} min to read`}
            </span>
            <button className="btn cta" disabled={!ready || busy || fetching}
              onClick={state === "done" ? () => go("quiz") : run}>
              {state === "reading" ? <Loading label={files.length > 1 ? `Reading ${reading} of ${files.length}` : "Reading file"} />
                : state === "asking" ? <Loading label="Reading your request" />
                : state === "brief" ? <Loading label="Writing notes" />
                : state === "working" ? <Loading label="Building questions" />
                : state === "done" ? <>Start practice <Icon name="arrow" /></>
                : "Generate questions"}
            </button>
          </div>
        </div>
            </div>

        {state === "working" && (
          <div className="card card-pad note-card fade">
            <b className="small">
              {waiting?.why === "busy" ? `The AI service is busy. Trying again in ${waiting.seconds} seconds.`
                : waiting?.why === "pace" ? `Part ${progress?.n || 1} done. Starting the next in ${waiting.seconds} seconds.`
                : progress ? `Part ${progress.n} of ${progress.of}. About a minute each.`
                : "This takes up to a minute"}
            </b>
            <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-2)" }}>
              The model is reading your notes and writing the topics, the questions, the explanation
              for each answer, and the study sheet in one pass.
            </p>
          </div>
        )}



        {state === "locked" && (
          <FreeGate onClose={() => setState("idle")} onSignIn={() => go("settings")} />
        )}

        {state === "brief" && (
          <div className="card card-pad note-card fade">
            <b className="small">Writing notes on that topic first</b>
            <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-2)" }}>
              Then the topics, lessons and questions are built from them, the same as from your own notes.
              About a minute and a half in all.
            </p>
          </div>
        )}

        {state === "clarify" && ask && (
          <Clarify asked={ask.text.length > 60 ? ask.text.slice(0, 57) + "..." : ask.text}
            questions={ask.questions}
            onDone={(answers) => fromRequest(ask.text, answers)}
            onSkip={() => { setAsk(null); setState("idle"); }} />
        )}

        {state === "done" && unfinished && (
          <div className="card card-pad spread fade" style={{ borderColor: "var(--warn-line)" }}>
            <div>
              <b className="small">The rest could not be done yet</b>
              <div className="small muted">
                The AI service was busy. Everything up to there is saved. Carry on to add the rest.
              </div>
            </div>
            <button className="btn" onClick={() => build(unfinished.rest, true, { done: unfinished.done })}>
              Carry on
            </button>
          </div>
        )}

        {videoNotice && (
          <WebVideoNotice
            onTry={() => { setVideoNotice(false); setVideoWarned(true); addVideo(true); }}
            onApp={() => { setVideoNotice(false); go("install"); }}
            onClose={() => setVideoNotice(false)}
          />
        )}

        {state === "toomuch" && (
          <TooMuch
            text={long}
            onAll={() => build(long, true)}
            onFirst={() => build(splitSource(long)[0], false)}
            onClose={() => setState("idle")}
          />
        )}

        {state === "error" && (
          <div className="card card-pad fade" style={{ borderColor: "var(--warn-line)" }}>
            <div className="spread">
              <span className="pill warn">Could not generate</span>
              <button className="btn ghost" onClick={run}>Try again</button>
            </div>
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

function Library({ go, made, materials, deleteMaterial }) {
  const [confirm, setConfirm] = useState(false);
  const counts = made ? {
    topics: made.topics.length,
    questions: made.questions.length,
    lessons: Object.keys(made.lessons || {}).length,
  } : null;
  return (
    <div className="page fade">
      <PageHead title="Library" sub="Everything you have added so far." />
      {materials.length === 0 ? (
        <div className="card card-pad" style={{ textAlign: "center", padding: 44 }}>
          <Duck size={84} outfit="detective" />
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
                  {m.id === "made" && deleteMaterial && (
                    <button className="icon-btn lib-del" title="Delete this material" aria-label={`Delete ${m.title}`}
                      onClick={(e) => { e.stopPropagation(); setConfirm(true); }}>
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {confirm && counts && (
        <Portal>
          <div className="gate-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirm(false); }}>
            <div className="gate lib-confirm" role="alertdialog" aria-modal="true" aria-labelledby="lib-del-title">
              <div className="lib-confirm-icon"><Icon name="trash" size={22} /></div>
              <h2 id="lib-del-title">Delete "{made.title}"?</h2>
              <p className="gate-sub">
                This removes its {counts.topics} topic{counts.topics === 1 ? "" : "s"}, {counts.questions} question{counts.questions === 1 ? "" : "s"}
                {counts.lessons ? `, ${counts.lessons} lesson${counts.lessons === 1 ? "" : "s"}` : ""} and notes, from this
                device and from your account. Your streak and totals stay. It cannot be undone.
              </p>
              <div className="gate-actions">
                <button className="btn lib-confirm-go" autoFocus onClick={() => { deleteMaterial(); setConfirm(false); }}>
                  Delete it
                </button>
                <button className="btn ghost" onClick={() => setConfirm(false)}>Keep it</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

/* ---------- practice: modes ---------- */

const MODES = [
  { id: "quiz", label: "Quiz", icon: "quiz", sub: "A mix of question kinds, with an explanation after each answer." },
  { id: "review", label: "Review", icon: "timer", sub: "Questions due for another look, spaced out so they stick. Entirely optional." },
  { id: "cards", label: "Flashcards", icon: "cards", sub: "Pick a deck. Cards you know are retired and stop appearing." },
  { id: "mock", label: "Mock exam", icon: "exam", sub: "A full length paper against the clock, marked at the end." },
  { id: "speed", label: "Speed round", icon: "bolt", sub: "Sixty seconds. Answer as many as you can." },
  { id: "missed", label: "Missed", icon: "flag", sub: "Only the questions you have got wrong." },
];

const QUIZ_LENGTHS = [5, 10, 20, 30, 50];

function Practice(props) {
  const { pMode, setPMode, missed, topic, setTopic, go, hidden, bank, topics } = props;
  const active = MODES.find((m) => m.id === pMode) || MODES[0];
  const Mode = { quiz: QuizMode, review: ReviewMode, cards: Flashcards, mock: MockExam, speed: SpeedRound, missed: MissedMode }[active.id];
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
  const drillPool = (props.drills || []).filter((q) => (topic ? q.topic === topic : liveTopics.includes(q.topic)));
  const dueCount = dueFrom([...pool, ...drillPool], props.srs).length;

  const [playing, setPlaying] = useState(false);
  const [pod, setPod] = useState(false);
  const open = (id) => { setPMode(id); setPlaying(true); };
  // Testers and above get company while they practise: how the sitting is
  // going either side of the question, and a cheer now and then.
  const { early } = props;
  const [session, record] = usePracticeSession();
  useCheerSounds(session);
  const modeProps = early
    ? { ...props, grade: (id, ok, t) => { props.grade(id, ok, t); record(ok, { quiet: active.id === "mock" }); } }
    : props;
  useEffect(() => {
    if (!playing) return;
    const onKey = (e) => { if (e.key === "Escape" && !e.target.closest?.("input, textarea")) setPlaying(false); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [playing]);

  const stat = {
    quiz: `${pool.length} question${pool.length === 1 ? "" : "s"}`,
    review: dueCount ? `${dueCount} due now` : "Nothing due",
    cards: (() => { const n = pool.length + (early ? notesCards(props.made, topic).length : 0); return `${n} card${n === 1 ? "" : "s"}`; })(),
    mock: `${Math.min(pool.length, 20)} questions, timed`,
    speed: "60 seconds",
    missed: missed.length ? `${missed.length} to fix` : "None yet",
  };
  const empty = pool.length === 0;

  return (
    <div className="page fade">
      <PageHead title="Practice" sub="Pick a way to study. Each one opens full screen, and you can switch between them at the top." />

      <div className="pz-topic">
        <div className="pz-topic-main">
          <span className="qv-label">Studying</span>
          <label className="pz-topic-pick">
            <select value={topic || ""} onChange={(e) => setTopic(e.target.value || null)} aria-label="Topic">
              <option value="">All topics</option>
              {choices.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <span className="small muted">{pool.length} question{pool.length === 1 ? "" : "s"}{topic ? "" : `, ${choices.length} topics`}</span>
        </div>
        <button className="btn ghost small" onClick={() => go("topics")}>Manage topics</button>
      </div>

      {empty ? (
        <div className="card card-pad" style={{ textAlign: "center", padding: 40 }}>
          <Duck size={80} outfit="ninja" />
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
        <div className="pz-grid">
          {MODES.map((m, n) => (
            <div key={m.id} role="button" tabIndex={0} className={"pz-card c" + n + (m.id === "missed" && !missed.length ? " quiet" : "")}
              onClick={() => open(m.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(m.id); } }}>
              <span className="pz-icon"><Icon name={m.icon} size={22} /></span>
              <b>{m.label}</b>
              <p>{m.sub}</p>
              <div className="pz-foot">
                <span className={"pz-stat" + ((m.id === "review" && dueCount) || (m.id === "missed" && missed.length) ? " hot" : "")}>{stat[m.id]}</span>
                {m.id === "quiz" && (
                  <div className="seg tight" onClick={(e) => e.stopPropagation()}>
                    {QUIZ_LENGTHS.filter((k) => early || k <= 20).map((k) => (
                      <button key={k} className={quizLen === k ? "on" : ""} disabled={!pool.length && k !== QUIZ_LENGTHS[0]}
                        title={k > pool.length ? "More questions are written in the same style for a run this long" : undefined} onClick={() => setQuizLen(k)}>{k}</button>
                    ))}
                  </div>
                )}
                <span className="pz-go">Start <Icon name="arrow" size={14} /></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* The podcast lives with the notes; this makes it easy to find. */}
      {notesText(props.made).trim() && (
        <div role="button" tabIndex={0} className="pz-pod" onClick={() => setPod(true)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPod(true); } }}>
          <span className="pz-icon"><Icon name="mic" size={22} /></span>
          <div><b>Podcast</b><p>Dwiddle and Puddle talk through your notes. Listen on a walk or on the bus.</p></div>
          <span className="pz-go">Listen <Icon name="arrow" size={14} /></span>
        </div>
      )}
      {pod && <Podcast made={props.made} onClose={() => setPod(false)} />}

      {playing && !empty && (
        <Portal>
          <div className="pz-full" role="dialog" aria-modal="true" aria-label={active.label}>
            <div className="pz-bar">
              <button className="icon-btn" onClick={() => setPlaying(false)} aria-label="Back to practice" title="Back to practice (Esc)"><Icon name="close" size={18} /></button>
              <div className="pz-tabs" role="tablist">
                {MODES.map((m) => (
                  <button key={m.id} role="tab" aria-selected={pMode === m.id} className={pMode === m.id ? "on" : ""} onClick={() => setPMode(m.id)}>
                    <Icon name={m.icon} size={16} /><span>{m.label}</span>
                    {m.id === "missed" && missed.length > 0 && <i className="pz-badge">{missed.length}</i>}
                    {m.id === "review" && dueCount > 0 && <i className="pz-badge">{dueCount}</i>}
                  </button>
                ))}
              </div>
              <span className="pz-where small muted">{topic || "All topics"}</span>
            </div>
            {early && <ThemeBackdrop theme={props.look} resolved={props.resolved} />}
            <div className={"pz-body" + (early ? " pc-on" : "")}>
              {early && <PracticeSides s={session} />}
              <div className="pz-inner">
                <p className="pz-sub muted">{active.sub}</p>
                <Mode key={active.id + ":" + (topic || "all") + ":" + quizLen} {...modeProps} pool={pool} drillPool={drillPool} len={quizLen} />
              </div>
            </div>
            {early && <Cheer cheer={session.cheer} />}
          </div>
        </Portal>
      )}
    </div>
  );
}

/* ---------- practice: quiz ---------- */

function QuizMode({ grade, pool, len, drillPool = [], ordered = false, early, made, setMade }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null); // the option chosen, or true/false for the other kinds
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  // A run longer than the questions there are gets new ones first, written in
  // the style of the ones it has, and they are kept for next time.
  const short = !ordered && !!setMade && pool.length > 0 && len > pool.length;
  const [more, setMore] = useState(short ? null : []);
  useEffect(() => {
    if (!short) return;
    let live = true;
    moreQuestions(made, [...new Set(pool.map((x) => x.topic))], len - pool.length).then((qs) => {
      if (qs.length) setMade({ title: made?.title, topics: [], questions: qs });
      if (live) setMore(qs.map(phraseQuestion));
    });
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // A run mixes kinds: about one question in three is another way of
  // recalling the same material, when the topic has any.
  const [QUIZ, setQUIZ] = useState(null);
  if (!QUIZ && more) {
    const build = () => {
      if (ordered) return pool.slice(0, len);
      const main = [...shuffle(pool), ...shuffle(more)].slice(0, len);
      const extra = shuffle(drillPool);
      return main.map((q, n) => (n % 3 === 2 && extra.length ? extra.pop() : q));
    };
    setQUIZ(build());
  }

  const q = QUIZ?.[i];
  const answeredNow = picked !== null;
  // Enter moves on once a question is answered, as the button does.
  useEffect(() => {
    if (!answeredNow || finished) return;
    const onKey = (e) => {
      if (e.key !== "Enter" || e.repeat || e.target.closest?.("input, textarea, button, select, [contenteditable]")) return;
      e.preventDefault();
      next();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  if (!QUIZ) {
    return (
      <div className="card card-pad quiz-more">
        <Duck size={90} outfit="wizard" />
        <b>Writing {len - pool.length} more questions</b>
        <p className="small muted">In the same style as yours, on the same topics, with different numbers and answers. They are kept for next time.</p>
        <div className="busy-bar sweep"><span /></div>
      </div>
    );
  }

  const drill = isDrill(q);
  const answered = picked !== null;

  function settle(ok) {
    if (ok) setScore((s) => s + 1);
    grade(q.id, ok, q.topic);
  }

  function pick(n) {
    if (answered) return;
    setPicked(n);
    settle(n === q.answer);
  }

  function next() {
    if (i + 1 >= QUIZ.length) {
      playCue(score / QUIZ.length >= 0.7 ? "done-great" : "done-okay");
      return setFinished(true);
    }
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
          <i style={{ width: `${((i + (answered ? 1 : 0)) / QUIZ.length) * 100}%` }} />
        </div>

        {drill ? (
          <QuestionView key={q.id + ":" + i} q={q} onDone={(ok) => { setPicked(ok); settle(ok); }} />
        ) : (
          <>
            <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {q.q}
            </h3>

            {q.choices.map((c, n) => {
              let cls = "choice";
              if (answered && n === q.answer) cls += " right";
              else if (picked === n) cls += " wrong";
              return (
                <button key={n} className={cls} onClick={() => pick(n)} disabled={answered}>
                  <span className="key">{"ABCD"[n]}</span>
                  {c}
                </button>
              );
            })}
          </>
        )}

        {answered && (
          <div className="fade" style={{ marginTop: 16 }}>
            {!drill && (
              <div className="card card-pad" style={{ background: "var(--panel)" }}>
                <span className={"pill " + (picked === q.answer ? "good" : "warn")}>
                  {picked === q.answer ? "Correct" : "Not quite"}
                </span>
                <p className="small" style={{ margin: "10px 0 0", color: "var(--ink-2)" }}>{q.why}</p>
                {early && <LikeImFour context={askContext(q, picked)} />}
              </div>
            )}
            <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
              <AskDwiddleButton context={askContext(q, picked)} />
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

// What Dwiddle is told about a question when asked about it.
function askContext(q, picked) {
  if (!q) return "";
  if (isDrill(q)) {
    return `A practice question (${q.type}) on "${q.topic}": ${q.q}\nThe expected answer: ${
      q.answer ?? (q.items ? q.items.join(" > ") : q.pairs ? q.pairs.map((p) => `${p.a} = ${p.b}`).join("; ") : "")
    }${q.correction ? `\nCorrection: ${q.correction}` : ""}${q.why ? `\nExplanation: ${q.why}` : ""}`;
  }
  return `A multiple choice practice question on "${q.topic}": ${q.q}\nOptions: ${q.choices.map((c, n) => `${"ABCD"[n]}) ${c}`).join("  ")}\nCorrect answer: ${q.choices[q.answer]}${
    typeof picked === "number" ? `\nThe student chose: ${q.choices[picked]}` : ""}\nExplanation given: ${q.why}`;
}

// Questions due for another look. Optional in every sense: it is one mode
// among six, and nothing is withheld from anyone who never opens it.
function ReviewMode({ grade, pool, drillPool = [], srs, early }) {
  const [due] = useState(() => dueFrom([...pool, ...drillPool], srs).slice(0, 20));
  if (!due.length) {
    return (
      <div className="card card-pad fade" style={{ textAlign: "center", padding: 36 }}>
        <Duck size={80} outfit="winter" />
        <b style={{ display: "block", marginTop: 10 }}>Nothing due today</b>
        <p className="muted small" style={{ margin: "6px auto 0", maxWidth: 420, lineHeight: 1.6 }}>
          Every question you answer comes back here just before you would forget it: tomorrow if you
          got it wrong, then in 2 days, 4, a week, two weeks and a month as you keep getting it right.
        </p>
      </div>
    );
  }
  return <QuizMode grade={grade} pool={due} len={due.length} ordered early={early} />;
}

/* ---------- study sheet ---------- */

function sheetParts(sheet) {
  return [
    ...(sheet.big || []),
    ...(sheet.watch || []),
    ...(sheet.terms || []).map((t) => t?.d),
  ].flatMap(toSegments);
}

function StudySheet({ made, go, saveNotes, early }) {
  const [on, setOn] = useState({ def: true, key: true, exam: true });

  // Full notes where they exist, or where they can be written from the
  // original notes still on this device. The one page sheet below is only for
  // material that has neither.
  const names = (made?.topics || []).map((t) => t.name);
  if (Object.keys(made?.notes || {}).length || sourcesFor(names).length) {
    return <Notes made={made} saveNotes={saveNotes} go={go} early={early} />;
  }

  // Every generation keeps its sheet, so the page grows as material is added
  // rather than only ever showing the most recent one.
  const sheets = (made?.sheets?.length
    ? made.sheets
    : made?.sheet ? [{ title: made.title, sheet: made.sheet }] : []
  ).filter((entry) => entry?.sheet);

  if (sheets.length === 0) {
    return (
      <div className="page fade">
        <PageHead title="Notes" sub="Everything in your material, topic by topic." />
        <div className="card card-pad" style={{ textAlign: "center", padding: 44 }}>
          <Duck size={84} outfit="wizard" />
          <b style={{ display: "block", marginTop: 10 }}>No notes yet</b>
          <p className="muted small" style={{ margin: "6px auto 18px", maxWidth: 400 }}>
            Add a PDF, a document or your own notes, and complete notes are written from it,
            alongside the lessons and the questions.
          </p>
          <button className="btn" onClick={() => go("upload")}>
            <Icon name="upload" size={14} /> Add material
          </button>
        </div>
      </div>
    );
  }

  const counts = { def: 0, key: 0, exam: 0 };
  sheets.forEach(({ sheet }) => {
    sheetParts(sheet).forEach((seg) => {
      if (seg?.mark && counts[seg.mark] !== undefined) counts[seg.mark] += 1;
    });
  });
  const total = counts.def + counts.key + counts.exam;

  return (
    <div className="page wide fade">
      <PageHead
        title={sheets.length === 1 ? sheets[0].sheet.title || "Study sheet" : "Study sheet"}
        sub={`${sheets.length === 1
          ? made?.title ? `From ${made.title}. ` : ""
          : `${sheets.length} sets of material. `}${total} highlight${total === 1 ? "" : "s"}.`}
      />

      <HighlightFilters on={on} setOn={setOn} counts={counts} />

      <div className="stack">
        {sheets.map((entry, n) => (
          <div className="card card-pad sheet" key={`${entry.title}-${n}`}>
            <div className="print-only print-head">
              <b>{entry.sheet.title || entry.title || "Study sheet"}</b>
              <span>Dwiddle</span>
            </div>

            {sheets.length > 1 && (
              <div className="sheet-source">{entry.sheet.title || entry.title}</div>
            )}

            {(entry.sheet.big || []).filter((l) => toSegments(l).length).length > 0 && (
              <>
                <h4>The big idea</h4>
                <ul>
                  {(entry.sheet.big || []).filter((l) => toSegments(l).length).map((line, i) => (
                    <li key={i}><Marked parts={line} on={on} /></li>
                  ))}
                </ul>
              </>
            )}

            {(entry.sheet.terms || []).filter((t) => t && t.t).length > 0 && (
              <>
                <h4>Key terms</h4>
                <div className="terms">
                  {(entry.sheet.terms || []).filter((t) => t && t.t).map((t, i) => (
                    <div key={`${t.t}-${i}`} className="term">
                      <b>{t.t}</b>
                      {toSegments(t.d).length > 0 && <span><Marked parts={t.d} on={on} /></span>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {(entry.sheet.watch || []).filter((l) => toSegments(l).length).length > 0 && (
              <>
                <h4>Where people lose marks</h4>
                <ul>
                  {(entry.sheet.watch || []).filter((l) => toSegments(l).length).map((line, i) => (
                    <li key={i}><Marked parts={line} on={on} /></li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="row no-print" style={{ marginTop: 16 }}>
        <button className="btn ghost" onClick={() => window.print()}>
          <Icon name="sheet" size={14} /> Export as PDF
        </button>
        <button className="btn ghost" onClick={() => go("upload")}>Add more material</button>
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

// Sounds the app makes.
function VoiceCard() {
  const [talks, setTalks] = useState(soundsOn);
  return (
    <div className="card">
      <div className="card-head"><h3>Sound</h3></div>
      <SetRow label="Sound effects" hint="A short sound when you finish a quiz or level up.">
        <Switch on={talks} onClick={() => { setSoundsOn(!talks); setTalks(!talks); if (!talks) setTimeout(() => playCue("done-great"), 50); }} />
      </SetRow>
    </div>
  );
}

function Settings({ theme, setTheme, auth, go, look, setLook, resolved }) {

  const [name, setNameRaw] = useState(() => auth?.user ? displayName(auth.user) : load(KEYS.name, ""));
  function setName(v) {
    setNameRaw(v);
    if (!auth?.user) save(KEYS.name, v);
  }
  const [goal, setGoal] = useState("20");
  const [style, setStyle] = useState("mixed");
  const [reminders, setReminders] = useState(true);
  const [sound, setSound] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [review, setReview] = useState(() => reviewOn());

  return (
    <div className="page fade">
      <PageHead title="Settings" sub="Preferences are saved to this browser." />

      <div className="stack">
        <Account user={auth?.user} syncedAt={auth?.syncedAt} signOut={auth?.signOut} />

        <LevelCard />

        <div className="card">
          <div className="card-head"><h3>Appearance</h3></div>
          <div className="th-grid" role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => {
              const m = t[resolved] || t.light;
              const [top, bottom] = m?.grad || t.preview[resolved];
              const card = m?.card || t.preview[resolved][1];
              const accent = m?.accent || t.preview[resolved][2];
              return (
                <button key={t.id} role="radio" aria-checked={look === t.id}
                  className={"th-card" + (look === t.id ? " on" : "")} onClick={() => setLook(t.id)}>
                  <span className="th-swatch" style={{ background: `linear-gradient(170deg, ${top}, ${bottom})` }}>
                    <span className="th-mini" style={{ background: card, fontFamily: t.font }}>
                      <i style={{ background: accent }} />
                      <span>Aa</span>
                    </span>
                    {t.id !== "classic" && <ThemeMark theme={t.id} dark={resolved === "dark"} size={40} className="th-mark" />}
                  </span>
                  <span className="th-name">
                    <b>{t.name}</b>
                    {look === t.id && <Icon name="check" size={14} />}
                  </span>
                  <span className="small muted">{t.blurb}</span>
                </button>
              );
            })}
          </div>
          <SetRow label="Mode" hint="Every theme has a light and a dark version. System follows your device.">
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
          <SetRow label="Display name" hint={auth?.user ? "From your account." : "What the home page calls you."}>
            <input type="text" value={name} placeholder="Your first name" onChange={(e) => setName(e.target.value)} />
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
          <SetRow label="Suggest reviews" hint="Show on the home page when questions are due for another look. Review stays in Practice either way.">
            <Switch on={review} onClick={() => { setReviewOn(!review); setReview(!review); }} />
          </SetRow>
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

        <VoiceCard />

        <div className="card">
          <div className="card-head"><h3>Notifications</h3></div>
          <SetRow label="Daily reminder" hint="A nudge if you have not studied by 8pm.">
            <Switch on={reminders} onClick={() => setReminders((v) => !v)} />
          </SetRow>
          <SetRow label="Sound effects" hint="A click on correct and incorrect answers.">
            <Switch on={sound} onClick={() => setSound((v) => !v)} />
          </SetRow>
        </div>

        {isDesktop && <UpdateSettings />}

        <div className="card">
          <div className="card-head"><h3>About</h3></div>
          <SetRow label="Privacy" hint="What is collected and who handles it.">
            <a className="btn ghost small" href="/privacy">Read</a>
          </SetRow>
          <SetRow label="Terms" hint="How the service may be used.">
            <a className="btn ghost small" href="/terms">Read</a>
          </SetRow>
          <SetRow label="Version" hint={isDesktop ? `Dwiddle for ${onMac ? "Mac" : "Windows"}.` : "Dwiddle for the web."}>
            <span className="small muted">{isDesktop && appVersion ? appVersion : "1.0"}</span>
          </SetRow>
        </div>

        {!isDesktop && <div className="card">
          <div className="card-head"><h3>Get the app</h3></div>
          <SetRow
            label="Install Dwiddle"
            hint="Run it full screen from your home screen, Dock or taskbar."
          >
            <button className="btn small" onClick={() => go("install")}>How</button>
          </SetRow>
        </div>}

        {/* Folded away at the very bottom, and only in the installed app. It is
            findable by anyone looking for it and passed over by anyone who is
            not. */}
        {isDesktop && uninstaller && (
          <details className="card un-advanced">
            <summary>Advanced</summary>
            <SetRow
              label="Remove Dwiddle from this computer"
              hint="Uninstalls the app and deletes what it saved here. Your account is not affected."
            >
              <button className="btn ghost small" onClick={() => setRemoving(true)}>Remove</button>
            </SetRow>
          </details>
        )}

        {removing && (
          <UninstallDialog signedIn={!!auth?.user} onClose={() => setRemoving(false)} />
        )}

      </div>
    </div>
  );
}

// Only in the installed app, which is the only place that updates itself.
function UpdateSettings() {
  const info = useUpdate();
  const [auto, setAuto] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => { if (info && auto === null) setAuto(info.auto !== false); }, [info, auto]);

  async function flip() {
    const next = !auto;
    setAuto(next);
    try { await window.DWIDDLE_UPDATE?.setAuto(next); } catch {}
  }

  async function check() {
    setChecking(true);
    try { await window.DWIDDLE_UPDATE?.check(); } catch {}
    setChecking(false);
    setChecked(true);
  }

  const status = !info ? "" :
    info.state === "available" ? `Version ${info.version} is out.` :
    info.state === "downloading" ? `Downloading ${info.version}${info.percent ? `, ${info.percent}%` : ""}.` :
    info.state === "ready" ? `Version ${info.version} goes in when you close Dwiddle.` :
    checked ? "You have the newest version." : "";

  return (
    <div className="card">
      <div className="card-head"><h3>Updates</h3></div>
      <SetRow
        label="Update automatically"
        hint={auto === false
          ? "New versions are announced when Dwiddle opens, and only installed if you say so."
          : "New versions download in the background and go in when you close Dwiddle."}
      >
        <Switch on={auto !== false} onClick={flip} />
      </SetRow>
      <SetRow label="Check for updates" hint={status || `You are on version ${appVersion || "unknown"}.`}>
        {info?.state === "available" || info?.state === "ready" ? (
          <button className="btn small" onClick={() => window.DWIDDLE_UPDATE?.install()}>
            {info.state === "ready" ? "Restart now" : "Update now"}
          </button>
        ) : (
          <button className="btn ghost small" onClick={check} disabled={checking || info?.state === "downloading"}>
            {checking ? "Checking" : "Check now"}
          </button>
        )}
      </SetRow>
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
    front: q.kind === "vocab" && q.term ? q.term : q.q,
    back: q.choices[q.answer],
    note: q.why,
  }));
}

// Cards from the notes themselves (testers): every term with its definition,
// and every hard word with the meaning it pops up with.
function notesCards(made, topic) {
  const out = [], seen = new Set();
  for (const [name, blocks] of Object.entries(made?.notes || {})) {
    if (topic && name !== topic) continue;
    for (const b of blocks || []) {
      const add = (front, back) => {
        const f = flatMarks(front).trim(), k = f.toLowerCase();
        if (!f || !back || seen.has(k) || f.length > 80) return;
        seen.add(k);
        out.push({ id: "n:" + name + ":" + k, kind: "notes", topic: name, front: f, back: flatMarks(back).trim(), note: "" });
      };
      if (b?.term) add(b.term, b.def);
      for (const t of blockTexts(b)) for (const seg of parseMarks(t)) if (seg.mark === "word") add(seg.t, seg.def);
    }
  }
  return out;
}

function Flashcards({ pool, made, early, topic }) {
  const [deck, setDeck] = useState("all");
  const [known, setKnown] = useState(() => load(KEYS.known, []));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [again, setAgain] = useState([]); // cards pushed to the back of the run

  const deckSource = [...cardsFrom(pool), ...(early ? notesCards(made, topic) : [])];
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
      {[...DECKS, ...(deckSource.some((c) => c.kind === "notes") ? [{ id: "notes", label: "From your notes", hint: "Every term and hard word in your notes" }] : [])].map((d) => {
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
          <Duck size={92} outfit="party" />
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
            <span className="flash-tag">{card.kind === "vocab" || card.kind === "notes" ? "Term" : "Question"}</span>
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
  const [list] = useState(() => [...bank, ...(H()?.TEST_QUESTIONS ?? [])].filter((q) => missed.includes(q.id)));

  function clearAll() {
    setMissed([]);
    save(KEYS.missed, []);
  }

  if (list.length === 0) {
    return (
      <div className="fade card card-pad" style={{ textAlign: "center", padding: 44 }}>
        <Duck size={92} outfit="king" />
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

/* ---------- answer formats ---------- */

// Real papers do not use one answer layout. IELTS mixes True/False/Not Given,
// Yes/No/Not Given, gap fill typed by hand and roman numbered heading lists.
// The format is derived from the skill so each question renders the way its
// own test presents it.
function formatOf(q) {
  const sk = (q.skill || "").toLowerCase();
  if (sk.includes("true, false")) return "tfng";
  if (sk.includes("yes, no")) return "ynng";
  if (sk.includes("completion")) return "gap";
  if (sk.includes("matching headings")) return "headings";
  return "mcq";
}

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];

// ACT alternates its answer letters between odd and even questions, TOEFL uses
// no letters at all, and everyone else runs A onwards.
function lettersFor(testId, index) {
  if (testId === "act") return index % 2 === 0 ? "ABCD" : "FGHJ";
  if (testId === "toefl") return null;
  return "ABCDE";
}

const norm = (v) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

function isRight(q, given) {
  if (formatOf(q) === "gap") return given !== undefined && norm(given) === norm(q.choices[q.answer]);
  return given === q.answer;
}

const isAnswered = (given) => given !== undefined && given !== "";

// One question's answer control, in whatever shape its test uses.
function AnswerInput({ q, testId, index, value, onChange, disabled }) {
  const format = formatOf(q);

  if (format === "gap") {
    return (
      <div className="gap-answer">
        <label className="field">
          <span>Type your answer</span>
          <input type="text" value={value ?? ""} disabled={disabled}
            placeholder="Your answer"
            onChange={(e) => onChange(e.target.value)} />
        </label>
        <div className="small muted" style={{ marginTop: 6 }}>
          Spelling counts, and answers over the stated word limit score zero.
        </div>
      </div>
    );
  }

  if (format === "tfng" || format === "ynng") {
    return (
      <div className="tf-row">
        {q.choices.map((c, n) => (
          <button key={n} className={"tf-btn" + (value === n ? " on" : "")}
            disabled={disabled} onClick={() => onChange(n)}>
            {c}
          </button>
        ))}
      </div>
    );
  }

  if (format === "headings") {
    return (
      <ol className="headings">
        {q.choices.map((c, n) => (
          <li key={n}>
            <button className={"heading-opt" + (value === n ? " on" : "")}
              disabled={disabled} onClick={() => onChange(n)}>
              <span className="key roman">{ROMAN[n]}</span>
              {c}
            </button>
          </li>
        ))}
      </ol>
    );
  }

  const letters = lettersFor(testId, index);
  return (
    <>
      {q.choices.map((c, n) => (
        <button key={n} className={"choice" + (value === n ? " picked" : "")}
          disabled={disabled} onClick={() => onChange(n)}>
          <span className={"key" + (letters ? "" : " blank")}>{letters ? letters[n] : ""}</span>
          {c}
        </button>
      ))}
    </>
  );
}

/* ---------- post test feedback ---------- */

// Breaks a finished paper down by skill and by section, works out what the
// pattern actually says, and points at the next thing to do about it.
function analyse(qs, answers, secondsAllowed, secondsLeft) {
  if (!qs || qs.length === 0) {
    return { rows: [], sections: [], right: 0, unanswered: 0, used: 0, notes: [], weakest: null };
  }
  const bySkill = {};
  const bySection = {};

  qs.forEach((q, n) => {
    const ok = isRight(q, answers[n]);
    const skill = q.skill || q.section || "General";
    const section = q.section || "General";
    (bySkill[skill] ||= { right: 0, total: 0 }).total += 1;
    (bySection[section] ||= { right: 0, total: 0 }).total += 1;
    if (ok) {
      bySkill[skill].right += 1;
      bySection[section].right += 1;
    }
  });

  const rows = Object.entries(bySkill)
    .map(([name, v]) => ({ name, ...v, pct: v.right / v.total }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total);

  const sections = Object.entries(bySection)
    .map(([name, v]) => ({ name, ...v, pct: v.right / v.total }))
    .sort((a, b) => a.pct - b.pct);

  const right = qs.filter((q, n) => isRight(q, answers[n])).length;
  const unanswered = qs.filter((q, n) => !isAnswered(answers[n])).length;
  const pct = right / qs.length;
  const used = secondsAllowed - secondsLeft;
  const notes = [];

  // Pace. Two failure modes, and they need opposite advice.
  if (unanswered > 0 && secondsLeft <= 0) {
    notes.push(`You ran out of time with ${unanswered} unanswered. On a real paper those are marks given away for nothing, so put something down for every question before the clock stops.`);
  } else if (unanswered > 0) {
    notes.push(`You left ${unanswered} blank with time still on the clock. There is no penalty for a wrong answer here, so a considered guess is always better than a gap.`);
  } else if (secondsLeft > secondsAllowed * 0.4 && pct < 0.7) {
    notes.push(`You finished with ${Math.round(secondsLeft / 60)} minutes spare but got ${qs.length - right} wrong. Speed is not your problem. Slow down and use the time you are being given.`);
  } else if (secondsAllowed > 0 && secondsLeft < secondsAllowed * 0.05) {
    notes.push("You used almost the whole clock. That is fine on this paper, but it leaves nothing for checking, so any careless error stands.");
  }

  // Where the marks actually went.
  const weak = rows.filter((r) => r.pct < 0.6 && r.total >= 2);
  if (weak.length > 0) {
    notes.push(`Most of your lost marks sit in ${weak.slice(0, 2).map((w) => w.name.toLowerCase()).join(" and ")}. That is a pattern rather than bad luck, so it is worth drilling on its own before you sit the section again.`);
  }

  const strong = rows.filter((r) => r.pct >= 0.8 && r.total >= 2);
  if (strong.length > 0) {
    notes.push(`${strong[strong.length - 1].name} is solid. Spend less time there and more on the rows above.`);
  }

  if (pct >= 0.9) notes.push("At this accuracy the useful next step is the full paper under time, not more practice on single sections.");
  else if (pct < 0.4) notes.push("Accuracy this low usually means a method problem rather than a knowledge one. Drill a section with the explanations on before timing yourself again.");

  return { rows, sections, right, unanswered, used, notes, weakest: sections[0] };
}

function Feedback({ qs, answers, secondsAllowed, secondsLeft, onDrill }) {
  const a = analyse(qs, answers, secondsAllowed, secondsLeft);

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h3>What to work on</h3>
          {secondsAllowed > 0 && (
            <span className="small muted">
              {fmt(a.used)} used of {fmt(secondsAllowed)}
            </span>
          )}
        </div>

        <div className="fb-notes">
          {a.notes.map((n, i) => (
            <p key={i} className="small">{n}</p>
          ))}
        </div>

        <div className="fb-rows">
          {a.rows.map((r) => (
            <div key={r.name} className="fb-row">
              <span className="fb-name">{r.name}</span>
              <div className="fb-bar">
                <i className={r.pct < 0.5 ? "low" : r.pct < 0.8 ? "mid" : "high"}
                  style={{ width: `${Math.max(r.pct * 100, 2)}%` }} />
              </div>
              <span className="fb-score small">{r.right}/{r.total}</span>
            </div>
          ))}
        </div>

        {onDrill && a.weakest && a.weakest.pct < 0.8 && (
          <div className="set-row">
            <div className="hint">
              {a.weakest.name} was your weakest section at {a.weakest.right} of {a.weakest.total}.
              A drill runs ten of them with no clock and the reasoning after each answer.
            </div>
            <button className="btn" onClick={() => onDrill(a.weakest.name)}>
              <Icon name="quiz" size={14} /> Drill {a.weakest.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- test prep ---------- */

// Builds one section's paper. Generated sections run at true full length.
// Pool backed sections are capped at however many authored items exist, and
// the caller shows that as a short form rather than repeating questions.
function buildPaper(test, sec) {
  if (sec.build) return { qs: H().BUILDERS[sec.build](sec.real), full: true };

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
  const ready = useHeavy();
  const [openId, setOpenId] = useState(null);
  const [paper, setPaper] = useState(null);
  const [building, setBuilding] = useState(null); // { sec, have, wanted }

  // Sitting a section assembles a paper you have not seen. Authored questions
  // come first, then anything written for you previously, then new ones.
  async function sit(sec) {
    const built = buildPaper(test, sec);
    setBuilding({ sec, have: 0, wanted: sec.real });

    const skills = [...new Set(built.qs.map((q) => q.skill).filter(Boolean))].slice(0, 8);
    const passage = Boolean(sec.pool) && built.qs.some((q) => q.passage);

    const { qs, wrote } = await buildFresh({
      test,
      sec,
      authored: built.qs,
      wanted: sec.real,
      passage,
      audio: Boolean(sec.audio),
      skills,
      onProgress: ({ have, wanted }) => setBuilding({ sec, have, wanted }),
    });

    setBuilding(null);
    if (qs.length === 0) return;
    setPaper({ sec, qs, full: qs.length >= sec.real, wrote });
  }

  if (!ready) return <LoadingPage title="Test prep" />;

  const test = H().TESTS.find((t) => t.id === openId);
  const secs = test ? H().SECTIONS[test.id] : [];

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
          <h1>{test.name}</h1>
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
              const cfg = sec.kind ? H().TASKS[test.id]?.[sec.kind] : null;
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
                          : <span className="pill good">Full length</span>}
                    </div>
                    <div className="small muted">
                      {sec.soon
                        ? "Being built now. It needs audio playback, which is the next thing on the list."
                        : `${sec.real} ${sec.kind ? (sec.real === 1 ? "task" : "tasks") : "questions"}, ${sec.minutes} min${sec.note ? `. ${sec.note}` : ""}`}
                    </div>
                    {!sec.soon && !sec.kind && (
                      <div className="small muted">
                        {(() => {
                          const unseen = unseenCount(built?.qs || [], test.id, sec.id);
                          const stored = bankFor(test.id, sec.id).length;
                          if (unseen >= sec.real) return `${unseen} unseen questions ready${stored ? `, ${stored} written for you so far` : ""}`;
                          return `${unseen} unseen left, more will be written when you sit it`;
                        })()}
                      </div>
                    )}
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
                    <button className="btn ghost" disabled={building !== null}
                      onClick={() => sit(sec)}>
                      {building?.sec?.id === sec.id ? <><Loading label="Building" /><BusyScreen title={`Building ${sec.name || "your section"}`} detail={building.wanted ? `${building.have} of ${building.wanted} questions written` : "Writing questions"} progress={building.wanted ? building.have / building.wanted : null} outfit="ninja" /></> : "Sit this section"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {building && (
            <div className="card card-pad fade">
              <div className="spread" style={{ marginBottom: 10 }}>
                <b className="small">Writing fresh questions for {building.sec.name}</b>
                <span className="small muted">{building.have} of {building.wanted}</span>
              </div>
              <div className="bar">
                <i style={{ width: `${Math.round((building.have / building.wanted) * 100)}%` }} />
              </div>
              <p className="small muted" style={{ margin: "10px 0 0" }}>
                You have seen the stored ones, so new material is being written. This takes a few
                seconds and only happens when the section runs low.
              </p>
            </div>
          )}

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

          <div className="card card-pad spread">
            <div>
              <b className="small">Papers never repeat</b>
              <div className="small muted">
                Questions you have been given are remembered and set aside, and new ones are written
                when a section runs low. If you would rather see the earlier ones again, clear the
                history.
              </div>
            </div>
            <button className="btn ghost" onClick={() => { clearSeen(); setOpenId(openId); }}>
              Clear history
            </button>
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
        {H().TESTS.map((t) => {
          const secs = H().SECTIONS[t.id].filter((x) => !x.essay);
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

function TestRun({ test, sec, qs, full, wrote = 0, grade, onExit, onDrill }) {
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
    const score = H().estimate(test.scoring, right, qs.length);
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
              {wrote > 0 ? `${wrote} of them were written fresh for you, so this paper has never been sat before. ` : ""}
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
            <h1>{test.name}, {sec.name}</h1>
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
              {sec.audio
                ? `Recording ${partNo}`
                : parts.length > 1 ? `Reading passage ${partNo}` : "Passage"}
            </div>
            {sec.audio
              ? <Player transcript={q.passage} playsAllowed={sec.plays || 1} />
              : <AnnotatedText className="passage-body" text={q.passage} />}
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
  const r = H().RUBRICS[rubric];
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
  const r = H().RUBRICS[rubric];
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
  const [scores, setScores] = useState(() => H().RUBRICS[cfg.rubric].criteria.map(() => null));

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
    setScores(H().RUBRICS[cfg.rubric].criteria.map(() => null));
  }

  return (
    <div className="page fade">
      <div className="page-head">
        <button className="btn quiet" style={{ marginBottom: 8 }} onClick={onExit}>Leave the section</button>
        <div className="spread">
          <div>
            <h1>{test.name}, {sec.name}</h1>
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
          <div className="glass-stage"><span className="blob b1" aria-hidden="true" /><span className="blob b2" aria-hidden="true" /><span className="blob b3" aria-hidden="true" />
            <div className="notes glass">
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
  const [scores, setScores] = useState(() => H().RUBRICS[cfg.rubric].criteria.map(() => null));

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
    setScores(H().RUBRICS[cfg.rubric].criteria.map(() => null));
  }

  return (
    <div className="page fade">
      <div className="page-head">
        <button className="btn quiet" style={{ marginBottom: 8 }} onClick={onExit}>Leave the section</button>
        <h1>{test.name}, {sec.name}</h1>
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
  // Enter checks the answer, then moves on, as the buttons do.
  useEffect(() => {
    if (done) return;
    const onKey = (e) => {
      if (e.key !== "Enter" || e.repeat || e.target.closest?.("input, textarea, button, select, [contenteditable]")) return;
      if (locked) { e.preventDefault(); next(); } else if (isAnswered(given)) { e.preventDefault(); check(); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

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
            <h1>{test.name}, {sec.name} drill</h1>
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
            <div className="prompt-label">{sec.audio ? "Recording" : "Passage"}</div>
            {sec.audio
              ? <Player transcript={q.passage} playsAllowed={sec.plays || 2} />
              : <AnnotatedText className="passage-body" text={q.passage} />}
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

  const r = H().RUBRICS[rubric];

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
        <button className="btn cta" onClick={run} disabled={answer.trim().length < 80}>
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

/* ---------- common courses ---------- */

// The school course equivalent of Test prep: what your course examines, how it is
// graded, and questions written for a specific syllabus topic without you
// having to paste anything.
function Courses({ go, setMade, auth }) {
  const ready = useHeavy();
  const [courseId, setCourseId] = useState(null);
  const [subjectId, setSubjectId] = useState(null);
  const [busy, setBusy] = useState(null); // the topic currently generating
  const [lastTopic, setLastTopic] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  if (!ready) return <LoadingPage title="Courses" />;

  const course = H().COURSES.find((c) => c.id === courseId);
  const subject = course?.subjects.find((s) => s.id === subjectId);

  async function build(topic) {
    if (generationsLeft(auth?.user) <= 0) {
      setError("locked");
      return;
    }
    setBusy(topic);
    setLastTopic(topic);
    setError("");
    setDone(null);
    try {
      // Syllabus notes first, then the same pipeline as your own notes, with
      // the questions written in this board's exam style.
      const syllabus = { course: course.name, subject: subject.name, code: subject.code || "", topic, level: course.ages || "" };
      const notes = await writeSyllabusNotes(syllabus);
      const data = await generateFromNotes(notes, {
        style: `${course.name} ${subject.name}${subject.code ? ` (${subject.code})` : ""}`,
      });
      countGeneration(auth?.user);
      rememberSource(data, { notes, syllabus });
      setMade(data);
      setDone({ topic, count: data.questions.length });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  // A subject: what it examines, and every topic ready to practise.
  if (subject) {
    return (
      <div className="page fade">
        <div className="page-head">
          <button className="btn quiet" style={{ marginBottom: 8 }} onClick={() => setSubjectId(null)}>
            Back to {course.name}
          </button>
          <h1>{subject.name}</h1>
          <p>{course.name}{subject.code ? `, ${subject.code}` : ""}</p>
        </div>

        <div className="stack">
          <div className="card card-pad note-card">
            <b className="small">How it is assessed</b>
            <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-2)" }}>{subject.assessment}</p>
          </div>

          <PastPaperCard key={subject.id} course={course} subject={subject}
            canGenerate={() => generationsLeft(auth?.user) > 0}
            onGenerated={() => countGeneration(auth?.user)}
            onLocked={() => setError("locked")} />

          {error === "locked" && (
            <FreeGate onClose={() => setError("")} onSignIn={() => go("settings")} />
          )}

          {error && error !== "locked" && (
            <div className="card card-pad" style={{ borderColor: "var(--warn-line)" }}>
              <div className="spread">
                <span className="pill warn">Could not generate</span>
                {lastTopic && <button className="btn ghost" onClick={() => build(lastTopic)}>Try again</button>}
              </div>
              <p className="small" style={{ margin: "10px 0 0", color: "var(--ink-2)" }}>{error}</p>
            </div>
          )}

          {done && (
            <div className="card card-pad spread fade">
              <div>
                <b className="small good-text">{done.count} questions ready on {done.topic}</b>
                <div className="small muted">
                  Added to your material, alongside anything generated before, so Practice, Topics
                  and the study sheet all use them. Generate as many topics as you like.
                </div>
              </div>
              <button className="btn" onClick={() => go("quiz")}>Start practising</button>
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <h3>Syllabus topics</h3>
              <span className="small muted">{subject.topics.length} topics</span>
            </div>
            <div className="drill-note small muted">
              Pick one and questions are written for it, at the level your course examines. No notes
              needed, though pasting your own always beats a generated set.
            </div>
            {subject.topics.map((t) => (
              <div key={t} className="sec-row">
                <div className="sec-main">
                  <span className="list-title">{t}</span>
                </div>
                <button className="btn ghost" disabled={busy !== null} onClick={() => build(t)}>
                  {busy === t ? <Loading label="Writing" /> : <><Icon name="spark" size={14} /> Questions</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // A course: its subjects, how it is graded, and what to watch for.
  if (course) {
    return (
      <div className="page fade">
        <div className="page-head">
          <button className="btn quiet" style={{ marginBottom: 8 }} onClick={() => setCourseId(null)}>
            Back to all courses
          </button>
          <h1>{course.name}</h1>
          <p>{course.board}</p>
        </div>

        <div className="stack">
          <div className="grid-2">
            <div className="stat"><div className="k">Grading</div><div className="v small-v">{course.grading}</div></div>
            <div className="stat"><div className="k">Ages</div><div className="v small-v">{course.ages}</div></div>
          </div>

          <div className="card card-pad note-card">
            <b className="small">Worth knowing</b>
            <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-2)" }}>{course.note}</p>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Subjects</h3>
              <span className="small muted">{course.subjects.length} available</span>
            </div>
            {course.subjects.map((sub) => (
              <div key={sub.id} className="sec-row">
                <div className="sec-main">
                  <span className="list-title">{sub.name}</span>
                  <div className="small muted">{sub.topics.length} syllabus topics</div>
                </div>
                <button className="btn ghost" onClick={() => setSubjectId(sub.id)}>Open</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page wide fade">
      <PageHead title="Courses" sub="Your school course: what it examines, how it is graded, and questions for any topic on it." />

      <div className="disclaimer">
        <Icon name="flag" size={14} />
        <span>
          Grading scales and assessment shapes are the published ones, and topic lists follow the
          subject content. Paper counts and timings change between subjects, tiers and series, so
          check the current specification before relying on the detail.
        </span>
      </div>

      <div className="test-grid">
        {H().COURSES.map((c) => (
          <button key={c.id} className="test-card" onClick={() => setCourseId(c.id)}>
            <div className="spread">
              <b className="test-name">{c.name}</b>
              <span className="pill accent">{c.subjects.length} subjects</span>
            </div>
            <span className="small muted">{c.board}</span>
            <div className="test-meta">
              <span><b>{c.ages}</b></span>
            </div>
            <span className="small muted">{c.grading}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- feedback and reviews ---------- */

function Stars({ value, onPick }) {
  return (
    <div className="stars" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className={"star" + (n <= value ? " on" : "")}
          onClick={() => onPick(n)}
        >
          <Icon name="star" size={22} />
        </button>
      ))}
    </div>
  );
}

function FeedbackPage({ auth, onSignIn }) {
  const [kind, setKind] = useState("feedback");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [title, setTitle] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done | error
  const [note, setNote] = useState("");

  const short = message.trim().length < 3;

  async function send(e) {
    e.preventDefault();
    if (short) return;
    setState("sending");

    // Stored first, because that is the copy that survives. The email is a
    // convenience on top and its failure must not lose the message.
    const stored = await submitFeedback({
      kind,
      rating: rating || null,
      message: message.trim(),
      contact: contact.trim(),
      title: kind === "review" ? title.trim().slice(0, 80) : "",
    });

    let emailed = false, thanked = false;
    try {
      const res = await notifyFeedback({
        id: stored.id,
        kind,
        rating: rating || null,
        message: message.trim(),
        contact: contact.trim(),
      });
      emailed = Boolean(res?.emailed);
      thanked = Boolean(res?.thanked);
    } catch {
      // the stored copy is what matters
    }

    if (!stored.stored && !emailed) {
      setState("error");
      setNote(stored.reason || "It could not be sent. Try again in a moment.");
      return;
    }

    setState("done");
    setNote(
      (kind === "review"
        ? "Thank you. Reviews are read before they appear, so it will not show up straight away."
        : kind === "bug"
          ? "Thank you. The bug goes straight to the people who build Dwiddle."
          : kind === "complaint"
            ? "Thank you for telling us. Your complaint has gone to the Dwiddle owners and the staff team."
          : "Thank you. This goes straight to the people who build Dwiddle.")
      + (thanked ? " We've emailed you a copy, and any reply will come to that email." : ""),
    );
  }

  // Feedback comes from accounts only, so every message has someone real
  // behind it who can be answered, and nobody can post as someone else.
  if (!auth?.user) {
    return (
      <div className="page fade">
        <PageHead title="Feedback" sub="Tell us what is broken, what is missing, or what you would want next." />
        <div className="card card-pad" style={{ textAlign: "center", padding: 44 }}>
          <Duck size={84} outfit="detective" />
          <b style={{ display: "block", marginTop: 10 }}>Sign in to send feedback</b>
          <p className="muted small" style={{ margin: "6px auto 18px", maxWidth: 420 }}>
            Feedback, bug reports, reviews and complaints need a free account, so we can reply to you by email and
            keep spam out. It takes a few seconds with Google or an email link.
          </p>
          <button className="btn cta" onClick={onSignIn}>Sign in or create an account</button>
        </div>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="page fade">
        <PageHead title="Thank you" sub="" />
        <div className="card card-pad" style={{ textAlign: "center", padding: 44 }}>
          <Duck size={84} outfit="cowboy" />
          <b style={{ display: "block", marginTop: 10 }}>Sent</b>
          <p className="muted small" style={{ margin: "6px auto 18px", maxWidth: 400 }}>{note}</p>
          <button className="btn ghost" onClick={() => { setState("idle"); setMessage(""); setRating(0); }}>
            Say something else
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade">
      <PageHead
        title="Feedback"
        sub="Tell me what is broken, what is missing, or what you would want next."
      />

      <form className="stack" onSubmit={send}>
        <div className="seg modes">
          <button type="button" className={kind === "feedback" ? "on" : ""} onClick={() => setKind("feedback")}>
            <Icon name="chat" size={14} /> Feedback
          </button>
          <button type="button" className={kind === "review" ? "on" : ""} onClick={() => setKind("review")}>
            <Icon name="star" size={14} /> Leave a review
          </button>
          <button type="button" className={kind === "bug" ? "on" : ""} onClick={() => setKind("bug")}>
            <Icon name="flag" size={14} /> Report a bug
          </button>
          <button type="button" className={kind === "complaint" ? "on" : ""} onClick={() => setKind("complaint")}>
            <Icon name="alert" size={14} /> Complaint
          </button>
        </div>

        {kind === "review" && (
          <div className="card card-pad">
            <b className="small">How is it?</b>
            <Stars value={rating} onPick={setRating} />
            <input type="text" className="fb-title" maxLength={80} value={title} placeholder="Sum it up in a few words (optional), like: Literally a life saver"
              onChange={(e) => setTitle(e.target.value)} />
            <p className="small muted" style={{ margin: "10px 0 0" }}>
              Reviews are read before they appear anywhere, so nothing goes public automatically. If yours
              is picked for the front page, your first name and profile picture show with it.
            </p>
          </div>
        )}

        <div className="glass-stage"><span className="blob b1" aria-hidden="true" /><span className="blob b2" aria-hidden="true" /><span className="blob b3" aria-hidden="true" />
            <div className="notes glass">
          <div className="notes-head">
            <div className="row">
              <span className="notes-icon"><Icon name={kind === "review" ? "star" : "chat"} size={14} /></span>
              <b className="small">{kind === "review" ? "Your review" : kind === "bug" ? "What went wrong?" : kind === "complaint" ? "Your complaint" : "What's on your mind?"}</b>
            </div>
          </div>
          <textarea
            className="notes-area"
            style={{ minHeight: 170 }}
            value={message}
            maxLength={4000}
            placeholder={
              kind === "review"
                ? "What is it good at, and what would make it better?"
                : kind === "bug"
                  ? "What were you doing, what did you expect, and what happened instead? Say which device too (iPhone, iPad, Mac, Windows)."
                  : kind === "complaint"
                    ? "What happened? If it's about an email from us, include the reference (like DW-1A2B3C4D) and the staff name or ID. This goes to the Dwiddle owners and the staff team."
                  : "What's missing, what you'd like next, or anything else."
            }
            onChange={(e) => setMessage(e.target.value)}
          />
          {!auth?.user && (
            <label className="fb-reply">
              <Icon name="chat" size={15} />
              <input
                type="email"
                value={contact}
                placeholder="Your email, if you want a reply"
                onChange={(e) => setContact(e.target.value)}
              />
              <span className="fb-optional">optional</span>
            </label>
          )}

          <div className="notes-foot">
            <span className="small muted">{message.length} of 4000</span>
            <button className="btn cta" type="submit" disabled={short || state === "sending"}>
              {state === "sending" ? <Loading label="Sending" /> : "Send"}
            </button>
          </div>
        </div>
            </div>

        {state === "error" && (
          <div className="card card-pad" style={{ borderColor: "var(--warn-line)" }}>
            <span className="pill warn">Not sent</span>
            <p className="small" style={{ margin: "10px 0 0", color: "var(--ink-2)" }}>{note}</p>
          </div>
        )}
      </form>
    </div>
  );
}
