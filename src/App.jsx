import { playCue, soundsOn, setSoundsOn } from "./voice.js";
import { M } from "./MathText.jsx";
import { withMaterials, noteMaterial, viewOf, withoutMaterial, renameMaterial } from "./materials.js";
import { NotifyCard } from "./NotifyCard.jsx";
import { ready as notifyReady, askOnce as askNotify, startDesktopReminder } from "./notify.js";
import { DwiddleHero } from "./ChatRoom.jsx";
import ChatRoom from "./ChatRoom.jsx";
import { Tour, tourDone, resetTour, FOLDER_STEPS } from "./Tour.jsx";
import { LevelCard } from "./LevelPicker.jsx";
import { Podcast, notesText } from "./Podcast.jsx";
import { PastPaperCard } from "./PastPaper.jsx";
import { ThemeScenery, ThemeDrift, hasScenery } from "./ThemeScenery.jsx";
import { ThemeBackdrop } from "./ThemeBackdrop.jsx";
import { LikeImFour } from "./LikeImFour.jsx";
import Decks from "./Decks.jsx";
import { HomeFolders } from "./HomeFolders.jsx";
import Social, { LeaderboardPage, FriendsPopup } from "./Social.jsx";
import Duel from "./Duel.jsx";
import { NavIcon, Flame } from "./NavIcons.jsx";
import { useClean, setClean } from "./clean.js";
import { logAnswer, readLog, freshFirst } from "./studylog.js";
import { skillMeta } from "./weakspots.js";
import Progress from "./Progress.jsx";
import { GuideHost, startGuide } from "./Guide.jsx";
import { masteryOf } from "./insights.js";
import { reportXp } from "./social.js";
import { startSocial, stopSocial, useSocial, onIncoming, peopleNow, activeNow } from "./socialState.js";
import { StudyBanner, StudyTimerCard } from "./StudyTimer.jsx";
import { flatMarks, parseMarks, blockTexts } from "./marks.js";
import { usePracticeSession, useCheerSounds, PracticeSides, Cheer, AnswerFlash } from "./PracticeCheer.jsx";
import { useEffect, useRef, useState } from "react";
import { DECKS, EXAM_SIZES, EXAM_TIMES, SAMPLE_NOTES } from "./mock.js";
import { load, save, loadSession, saveSession, clearSession, KEYS } from "./store.js";
import { Icon, PageHead, Loading, Marked, toSegments, HighlightFilters, Portal, BusyScreen, Boundary, useCover } from "./ui.jsx";
import { phraseQuestion, answerable, uniqueQuestions, practiceBank, unseenVisual, missingData } from "./mathText.js";
import { rememberSource, sourcesFor } from "./lessons.js";
import { Notes } from "./Notes.jsx";
import { Learn } from "./Learn.jsx";
import { Videos, VideoJobChip, NarrationAsk } from "./Video.jsx";
import { generationsLeft, countGeneration } from "./limits.js";
import { useAuth, Account, SignInPage, ProfileGate } from "./Account.jsx";
import { useMyProfile, UserIcon, HandleGate } from "./Profile.jsx";
import { syncNow, configured, userCount, submitFeedback, myAccess } from "./supabase.js";
import { setEarlyAccess, browse, moreQuestions, longQuestions, questionsFor, generateFromNotes, generateInParts, splitSource, condenseSource, notifyFeedback, clarify, writeBrief, readYouTube, writeSyllabusNotes } from "./ai.js";
import { Clarify } from "./Clarify.jsx";
import { QuestionView, isDrill, derivedDrills, typedFrom, trueFalseFrom, matchFrom } from "./Questions.jsx";
import { setAgentHandlers } from "./agent.js";
import { DwiddleChat, AskDwiddleButton, useDictation, PermissionPrompt } from "./Chat.jsx";
import { RecordingView } from "./Record.jsx";
import { XP, levelOf, announceXp } from "./xp.js";
import { FullscreenButton } from "./ContextMenu.jsx";
import { loadSrs, recordReview, dueFrom, reviewOn, setReviewOn } from "./srs.js";
import { TooMuch } from "./TooMuch.jsx";
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
import { isInstalled } from "./install.js";
import { loadCustom, saveCustom, loadBg, WIDGETS } from "./custom.js";
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
  report: "/report",
  planner: "/planner",
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
// A collaboration link (/notebook?live=CODE) is read the moment the app loads,
// before anything rewrites the address, and kept for the notebook page to use.
try {
  const invite = typeof location !== "undefined" ? new URLSearchParams(location.search).get("live") : null;
  if (invite) sessionStorage.setItem("dwiddle-live-invite", invite);
} catch { /* storage blocked */ }

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

// Something finished while you were on another page: a pop-up to go to it.
function ReadyToast({ go }) {
  const [n, setN] = useState(null);
  useEffect(() => {
    let t = 0;
    const on = (e) => { setN(e.detail); clearTimeout(t); t = setTimeout(() => setN(null), 7000); };
    addEventListener("dwiddle:ready", on);
    return () => { removeEventListener("dwiddle:ready", on); clearTimeout(t); };
  }, []);
  if (!n) return null;
  return (
    <div className="ready-toast" role="status">
      <DuckMark size={30} />
      <div><b>{n.title}</b>{n.body && <span>{n.body}</span>}</div>
      {n.url && <button className="btn small cta" onClick={() => { go(n.url); setN(null); }}>Open</button>}
      <button className="icon-btn" onClick={() => setN(null)} aria-label="Dismiss"><Icon name="close" size={14} /></button>
    </div>
  );
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
  { id: "home", label: "Home", icon: "home", pic: "home", pages: ["home"] },
  { id: "chat", label: "Chat", icon: "chat", pic: "chat", pages: ["chat", "solve"], early: true },
  {
    id: "study", label: "Study", icon: "cards", pages: ["sheet", "learn", "quiz", "topics", "videos"],
    tabs: { sheet: "Notes", learn: "Learn", quiz: "Practice", topics: "Topics", videos: "Videos" },
    old: true,
  },
  { id: "folders", label: "Library", icon: "folder", pic: "folders", pages: ["library", "reader", "explore"], fresh: true },
  { id: "notebook", label: "Notebooks", icon: "pen", pic: "notebook", pages: ["notebook"] },
  { id: "progress", label: "Progress", icon: "target", pic: "report", pages: ["report", "planner"], fresh: true },
  { id: "social", label: "Friends", icon: "chat", pic: "social", pages: ["social"], fresh: true },
  { id: "decks", label: "My decks", icon: "deck", pages: ["decks"], early: true, old: true },
  {
    id: "exams", label: "Exams", icon: "target", pic: "exams", pages: ["tests", "courses"],
    tabs: { tests: "Test prep", courses: "Courses" },
  },
  { id: "library", label: "Library", icon: "library", pages: ["library", "reader"], old: true },
];

const groupOf = (page) => GROUPS.find((g) => g.pages.includes(page)) || null;

// Every page's own name, for the title bar when it is not part of a group.
const ALL_NAV = [
  { id: "home", label: "Home" }, { id: "chat", label: "Chat with Dwiddle" }, { id: "sheet", label: "Notes" }, { id: "learn", label: "Learn" },
  { id: "quiz", label: "Practice" }, { id: "topics", label: "Topics" }, { id: "videos", label: "Videos" }, { id: "solve", label: "Chat with Dwiddle" }, { id: "decks", label: "My decks" },
  { id: "notebook", label: "Notebooks" }, { id: "duel", label: "Duel" }, { id: "leaderboard", label: "Leaderboard" }, { id: "social", label: "Friends" }, { id: "explore", label: "Explore" },
  { id: "tests", label: "Test prep" }, { id: "courses", label: "Courses" }, { id: "report", label: "Report" }, { id: "planner", label: "Planner" },
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
  const [pickedLook, setLookRaw] = useState(() => loadLook());
  const [resolved, setResolved] = useState("light");
  const newLayout = useClean();
  // the New layout has its own single look, so no theme scenery shows in it
  const look = newLayout ? "classic" : pickedLook;
  function setLook(id) {
    setLookRaw(id);
    saveLook(id);
  }
  const [customBg, setCustomBg] = useState(() => loadBg());

  const [editing, setEditing] = useState(false);
  // The first look round the app, once, a moment after arriving in it.
  const [touring, setTouring] = useState(false);
  useEffect(() => {
    const start = () => setTouring(true);
    addEventListener("dwiddle:tour", start);
    return () => removeEventListener("dwiddle:tour", start);
  }, []);
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
  function grade(id, correct, topicName, kind, meta) {
    logAnswer({ id, topic: topicName, ok: correct, kind: kind || "mc", ...(meta || {}) });
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
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [tipGone, setTipGone] = useState(() => { try { return localStorage.getItem("dwiddle-topic-tip") === "1"; } catch { return true; } });
  // true while someone is working inside a folder, including when they step
  // into a notebook from it, so opening the notebook does not drop them out
  const [inFolder, setInFolder] = useState(false);
  const inFolderNow = useRef(false);
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
  // Everything testers were trying out is now out for everyone. For the next
  // feature to be tried by staff and testers first, gate it on
  // staff || !!access.tester || import.meta.env.VITE_EARLY_ALL === "1" again.
  // The report is out for everyone; the planner is still being tried by staff and testers.
  const beta = staff || !!access.tester || import.meta.env.VITE_EARLY_ALL === "1";
  const early = true;
  useEffect(() => { setEarlyAccess(early); }, [early]);
  // The folder based Home, Friends, Duel, leaderboard and Explore are out for
  // everyone now. To try the next big change on staff and testers first, gate it
  // on staff || !!access.tester || import.meta.env.VITE_EARLY_ALL === "1" again.
  const preview = true;
  useEffect(() => startDesktopReminder(), []);
  const profile = useMyProfile(auth.user);
  // new messages and friend requests, for the badges and the little notification
  const social = useSocial();
  const [pop, setPop] = useState(null); // { from, name, avatar, body }
  useEffect(() => {
    if (!auth.user) { stopSocial(); return; }
    startSocial(auth.user.id);
    let hide = null;
    const off = onIncoming((m) => {
      if (activeNow() === m.from_id) return; // they are looking at that chat
      const who = peopleNow()[m.from_id];
      setPop({ from: m.from_id, name: who?.name || "A friend", avatar: who?.avatar || null, body: m.body });
      clearTimeout(hide);
      hide = setTimeout(() => setPop(null), 7000);
    });
    return () => { off(); clearTimeout(hide); };
  }, [auth.user?.id]);
  // everyone signed in tells the board their running total, a moment after it
  // changes, so it is already full when the board opens to everyone. Only people
  // who have picked a username are ever shown on it.
  const totalXp = stats?.xp || 0;
  useEffect(() => {
    if (!auth.user) return;
    const t = setTimeout(() => { reportXp(totalXp); }, 4000);
    return () => clearTimeout(t);
  }, [auth.user?.id, totalXp]); // eslint-disable-line react-hooks/exhaustive-deps
  // a share link opens the online library on that share
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("share");
    if (!id || !/^[a-f0-9]{10}$/.test(id)) return;
    try { sessionStorage.setItem("dwiddle-open-share", id); } catch {}
    history.replaceState(null, "", window.location.pathname);
    go("explore");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [made, setMadeRaw] = useState(() => withMaterials(load(KEYS.made, null)));
  // The library item Study is focused on, or null for everything.
  const [focus, setFocusRaw] = useState(() => load(KEYS.focus, null));
  const setFocus = (id) => { setFocusRaw(id); save(KEYS.focus, id); };

  // Generated material accumulates. Doing one syllabus topic and then another
  // used to throw the first away, which made Courses close to useless: you
  // could only ever hold the last thing you generated.
  // material: "new" when this is a new library item, "same" when it is more
  // of the one being made (a long source in parts), "none" for extra
  // questions on topics already there.
  //
  // Whatever was just made becomes what Study shows, on its own: a new item
  // gets its id here so Study can focus on it straight away.
  function setMade(data, { replace = false, material = "new" } = {}) {
    let id = null;
    if (data && material === "new") {
      id = data.materialId || "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      data = { ...data, materialId: id };
    } else if (data && material === "same") {
      id = withMaterials(made)?.materials?.at(-1)?.id || null;
    }
    if (id) setFocus(id);
    setMadeRaw((prev0) => {
      const prev = withMaterials(prev0);
      let next = data && { ...data, materials: noteMaterial(replace ? null : prev, data, material) };

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
          materials: noteMaterial(prev, data, material),
          // What was deleted stays remembered, so syncing cannot bring it back.
          ...(prev.removed ? { removed: prev.removed } : {}),
          ...(prev.gone ? { gone: prev.gone } : {}),
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
    setFocus(null);
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
        // Practice has no drawn diagrams, so a check that leans on one stays in the lesson
        .filter((c) => !unseenVisual(c) && !missingData(c))
        .filter((q) => !have.has(q.id));
      const next = {
        ...prev,
        questions: [...prev.questions, ...extra],
        drills: [
          ...(prev.drills || []).filter((d) => d.topic !== name || !String(d.id).startsWith(`ld-${slug}-`)),
          ...(lesson.checks || []).map((c, i) => ({ id: `ld-${slug}-${i}`, topic: name, ...c })).filter(isDrill).filter((c) => c.figure ? false : !unseenVisual(c) && !missingData(c)),
        ],
        topics: prev.topics.map((t) => t.name === name ? { ...t, questions: (t.questions || 0) + extra.length } : t),
        lessons: {
          ...(prev.lessons || {}),
          [name]: { cards: lesson.cards, checks: lesson.checks, figures: lesson.figures || [], done: prev.lessons?.[name]?.done || false },
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
  // Study shows the focused library item only; everything else (saving,
  // syncing) works on the whole store.
  const study = focus ? viewOf(made, focus) : made;
  // Questions a student has flagged as having a wrong answer stay out of practice.
  const [badQs, setBadQs] = useState(() => load("dwiddle-bad-questions", []));
  const flagBad = (id) => setBadQs((prev) => { const next = [...new Set([...prev, id])].slice(-500); save("dwiddle-bad-questions", next); return next; });
  const bank = practiceBank((study?.questions || []).filter((q) => !badQs.includes(q.id)).map((q) => phraseQuestion(q)));

  // Topics left with no questions (their batch failed while the material was
  // being made) get them written from their saved notes, once per visit.
  const bare = (study?.topics || []).filter((t) => !(study?.questions || []).some((q) => q.topic === t.name) && (study?.notes?.[t.name] || []).length).map((t) => t.name);
  const bareKey = bare.join("|");
  useEffect(() => {
    if (!bare.length) return;
    const key = "dwiddle-backfill:" + bareKey;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* fine */ }
    questionsFor(study, bare).then((qs) => {
      if (qs.length) setMade({ title: study.title, topics: [], questions: qs }, { material: "none" });
    });
  }, [bareKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Keeps a deep bank of questions. While Dwiddle is open, a topic with fewer
  // than BANK_TARGET questions gets a few more written every so often in the
  // background, so a quiz is made from questions that already exist and rarely
  // has to wait for new ones. It stops by itself when nothing new can be written
  // and tries again later.
  const fillBusy = useRef(false);
  const [fillTick, setFillTick] = useState(0);
  useEffect(() => {
    const wake = () => { if (document.visibilityState === "visible") setFillTick((n) => n + 1); };
    document.addEventListener("visibilitychange", wake);
    return () => document.removeEventListener("visibilitychange", wake);
  }, []);
  const bankCount = (study?.questions || []).length;
  useEffect(() => {
    if (!study?.topics?.length || fillBusy.current) return;
    const coolKey = "dwiddle-bankfill-cool:" + study.title;
    try { if (Date.now() - Number(localStorage.getItem(coolKey) || 0) < 30 * 60e3) return; } catch { /* fine */ }
    const counts = {};
    (study.questions || []).forEach((q) => { counts[q.topic] = (counts[q.topic] || 0) + 1; });
    const need = study.topics.map((t) => t.name).filter((n) => counts[n] >= 1 && counts[n] < BANK_TARGET).sort((a, b) => counts[a] - counts[b])[0];
    if (!need) return;
    const timer = setTimeout(async () => {
      if (document.visibilityState !== "visible" || fillBusy.current) return;
      fillBusy.current = true;
      let ok = false;
      try {
        const have = (study.questions || []).map((q) => phraseQuestion(q));
        const phrased = (await moreQuestions(study, [need], 4, [], "")).map((q) => phraseQuestion(q));
        const merged = uniqueQuestions([...have, ...phrased]);
        const fresh = phrased.filter((x) => merged.includes(x)).filter(answerable);
        if (fresh.length) { ok = true; setMade({ title: study.title, topics: [], questions: fresh }, { material: "none" }); }
      } catch { /* the next try is after the cooldown */ }
      if (!ok) { try { localStorage.setItem(coolKey, String(Date.now())); } catch { /* fine */ } }
      fillBusy.current = false;
      if (ok) setFillTick((n) => n + 1);
    }, 9000);
    return () => clearTimeout(timer);
  }, [study?.title, bankCount, fillTick]); // eslint-disable-line react-hooks/exhaustive-deps
  // The other kinds: those written with lessons, and those built from the
  // vocabulary questions every set already has.
  const drills = study ? [...(study.drills || []), ...derivedDrills(study.questions || [])] : [];
  const topics = (study?.topics || []).map((t) => ({ ...t, material: "made", source: study.title }));
  const materials = (made?.materials || []).map((m) => ({ ...m, kind: "Yours" }));

  // Push progress up whenever it changes, debounced so a run of answers does
  // not become a run of requests.
  useEffect(() => {
    if (!auth.user) return;
    const t = setTimeout(() => syncNow(auth.user.id), 1200);
    return () => clearTimeout(t);
  }, [auth.user, missed, hidden, topic, theme, made, look, stats]);

  // What another device changed: fetched once a minute and whenever Dwiddle
  // comes back into view, then shown without a reload.
  useEffect(() => {
    if (!auth.user) return;
    const id = auth.user.id;
    const tick = () => { if (document.visibilityState === "visible") syncNow(id); };
    const t = setInterval(tick, 60000);
    addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, [auth.user]);
  useEffect(() => {
    const reload = () => {
      setMadeRaw(withMaterials(load(KEYS.made, null)));
      setFocusRaw(load(KEYS.focus, null));
      setMissed(load(KEYS.missed, []));
      setSrs(loadSrs());
      setStats(load(KEYS.stats, { answered: 0, correct: 0, days: [], byTopic: {} }));
      setTopicRaw(load(KEYS.topic, null));
      setHiddenRaw(load(KEYS.hidden, []));
      setLookRaw(loadLook());
    };
    addEventListener("dwiddle:synced", reload);
    return () => removeEventListener("dwiddle:synced", reload);
  }, []);

  const go = (p, mode) => {
    // Solve is part of Chat now: the same tutor, in one place.
    if (p === "solve") p = "chat";
    if (p !== "home") setEditing(false);
    if (mode) setPMode(mode);
    if (p === page) setSeq((n) => n + 1);
    setPage(p);
    setLegal(null);
    setMenuOpen(false);
    {
      const keep = groupOf(p)?.id === "study" || (p === "notebook" && inFolderNow.current);
      inFolderNow.current = keep;
      setInFolder(keep);
    }

    // Same page, same URL: pushing again would make the back button do nothing
    // visible, which feels more broken than not working at all.
    const path = PAGE_PATH[p] || "/";
    if (ROUTABLE && window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
  };

  // What Dwiddle's chat is allowed to do for the student. Each handler is a
  // plain app action; agent.js checks every request before calling one.
  const agentNow = useRef({});
  // What is on screen is what Dwiddle sees and edits: the focused item.
  agentNow.current = { page, theme, look, made: focus ? viewOf(made, focus) : made };
  useEffect(() => {
    setAgentHandlers({
      state: () => agentNow.current,
      go: (p) => go(p),
      setTheme,
      setLook,
      prefill: (text) => { try { sessionStorage.setItem("dwiddle-handoff-notes", text); } catch {} go("upload"); },
      // The topic a request is about: the name the model gave if it matches,
      // otherwise the topic whose name and notes share the most words with
      // what was asked. Null when nothing fits.
      bestTopic: (given, about) => {
        const cur = agentNow.current.made;
        const topics = cur?.topics || [];
        const lower = String(given || "").toLowerCase().trim();
        const exact = topics.find((t) => t.name.toLowerCase() === lower)
          || (lower && topics.find((t) => t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase())));
        if (exact) return exact.name;
        const stem = (x) => String(x).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2).map((w) => w.slice(0, 5));
        const want = new Set(stem(`${given} ${about}`));
        let best = null, score = 0;
        for (const t of topics) {
          const name = stem(t.name), body = new Set(stem((cur.notes?.[t.name] || []).map((b) => JSON.stringify(b)).join(" ")));
          const sc = name.filter((w) => want.has(w)).length * 3 + [...want].filter((w) => body.has(w)).length * 0.2;
          if (sc > score) { best = t.name; score = sc; }
        }
        // Nothing matched: the last topic on screen that has notes, rather than nowhere.
        return best || [...topics].reverse().find((t) => cur.notes?.[t.name]?.length)?.name || topics.at(-1)?.name || null;
      },
      // Returns the topic's name when the change was made.
      editNotes: ({ op, topic, at, block }) => {
        const cur = agentNow.current.made;
        const name = (cur?.topics || []).map((t) => t.name).find((n) => n.toLowerCase() === String(topic).toLowerCase());
        if (!name) return null;
        const blocks = [...(cur.notes?.[name] || [])];
        if (op === "insert") blocks.splice(Math.min(at, blocks.length), 0, block);
        else if (at >= blocks.length) return null;
        else if (op === "replace") blocks[at] = block;
        else blocks.splice(at, 1);
        saveNotes({ [name]: blocks });
        const landed = op === "insert" ? Math.min(at, (cur.notes?.[name] || []).length) : at;
        agentNow.current = { ...agentNow.current, made: { ...cur, notes: { ...cur.notes, [name]: blocks } } };
        return { name, at: landed };
      },
    });
  });

  // "View in notes": open Notes, find the block Dwiddle just made or changed,
  // scroll to it and flash it. Notes may need a moment to appear first.
  useEffect(() => {
    const show = (e) => {
      const { name: topic, at } = e.detail || {};
      go("sheet");
      let tries = 0;
      const find = () => {
        const el = [...document.querySelectorAll("[data-blk]")].find((x) => x.dataset.blk === `${topic}#${at}`);
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("nt-flash"); setTimeout(() => el.classList.remove("nt-flash"), 2600); }
        else if (++tries < 20) setTimeout(find, 150);
      };
      setTimeout(find, 200);
    };
    window.addEventListener("dwiddle:show", show);
    return () => window.removeEventListener("dwiddle:show", show);
  });

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
  }, [theme, look, newLayout]);

  const Page = {
    home: preview ? HomeBridge : Dashboard,
    topics: Topics,
    quiz: Practice,
    solve: ChatRoom,
    decks: early ? (preview ? FoldersBridge : Decks) : Dashboard,
    sheet: StudySheet,
    learn: Learn,
    videos: Videos,
    upload: AddMaterial,
    library: preview ? FoldersBridge : Library,
    duel: preview ? Duel : Dashboard,
    leaderboard: preview ? LeaderboardPage : Dashboard,
    social: preview ? Social : Dashboard,
    explore: preview ? ExploreBridge : Dashboard,
    reader: Library,
    settings: Settings,
    tests: TestsMoved,
    courses: Courses,
    notebook: NotebookLoader,
    report: Progress,
    planner: beta ? Progress : Dashboard,
    chat: ChatRoom,
    feedback: FeedbackPage,
    install: Install,
    "install-all": InstallAll,
  }[page];

  const title = ALL_NAV.find((n) => n.id === page).label;
  const group = groupOf(page);
  // With more than one item in the library, Study shows one at a time, and
  // asks which until one is picked. Nothing is ever merged together.
  const items = made?.materials || [];
  const mustPick = group?.id === "study" && items.length > 1 && !items.some((m) => m.id === focus);
  const Pick = preview ? FoldersBridge : StudyPicker;
  // Inside a folder, testers get a smaller menu: the study pages first, then
  // Friends, Notebooks and Chat. It stays tucked away until the button at the
  // top left is pressed, so the page itself gets the room.
  const studyMode = preview && !mustPick && !!focus && (group?.id === "study" || (page === "notebook" && inFolder));
  useEffect(() => { if (!studyMode) setFriendsOpen(false); }, [studyMode]);
  // the study tabs sit in the top bar, so Notes, Learn, Practice, Topics and Videos are always in sight
  const tabGroup = studyMode ? GROUPS.find((g) => g.id === "study") : group;
  // Friends and the Dwiddle chat share one corner: opening one replaces the other.
  useEffect(() => {
    const onAsk = () => setFriendsOpen(false);
    window.addEventListener("dwiddle:ask", onAsk);
    return () => window.removeEventListener("dwiddle:ask", onAsk);
  }, []);
  const openStudy = (to) => { if (items.length > 1) setFocus(null); go(to); };
  const inApp = !atLanding && !legal && (!!auth.user || entered) && auth.ready;
  useEffect(() => {
    if (!inApp || tourDone() || page === "notebook") return;
    const t = setTimeout(() => setTouring(true), 900);
    return () => clearTimeout(t);
  }, [inApp]); // eslint-disable-line react-hooks/exhaustive-deps
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
    <div className={"app" + (studyMode ? " study-mode" : "") + (isDesktop ? " is-desktop" : "") + (onMac ? " is-mac" : "")}>
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
      <HandleGate user={auth.user} />
      <GuideHost go={go} beta={beta} />
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

        {studyMode ? (
          <nav className="nav nav-big nav-study">
            <button className="nav-item nav-back" onClick={() => { setFocus(null); go("library"); }}>
              <span className="hf-back-ico"><Icon name="arrow" size={16} /></span>
              Library
            </button>
            <div className="nav-topic" title={study?.title}>{study?.title}</div>
            {[["sheet", "Notes", "notes"], ["learn", "Learn", "learn"], ["quiz", "Practice", "practice"], ["topics", "Topics", "topics"], ["videos", "Videos", "videos"]].map(([id, label, pic]) => (
              <button key={id} className={"nav-item" + (page === id ? " on" : "")} onClick={() => go(id)}>
                <NavIcon id={pic} size={34} />
                {label}
              </button>
            ))}
            <div className="nav-sep" />
            {/* Chat and Friends open over the page, so you can keep studying while you use them. */}
            {GROUPS.filter((g) => ["social", "notebook", "chat"].includes(g.id)).map((g) => (
              <button key={g.id} className={"nav-item" + (g.id === "notebook" && page === "notebook" ? " on" : "")}
                onClick={() => {
                  if (g.id === "chat") { setMenuOpen(false); window.dispatchEvent(new CustomEvent("dwiddle:ask", { detail: {} })); }
                  else if (g.id === "social") { setMenuOpen(false); window.dispatchEvent(new Event("dwiddle:close-chat")); setFriendsOpen((v) => !v); }
                  else go(lastInGroup.current[g.id] || g.pages[0]);
                }}>
                <NavIcon id={g.pic} size={34} />
                {g.label}
                {g.id === "social" && social.badge > 0 && <i className="badge nav-badge" aria-label={`${social.badge} new`}>{social.badge > 99 ? "99+" : social.badge}</i>}
              </button>
            ))}
          </nav>
        ) : (
        <nav className={"nav" + (preview ? " nav-big" : "")}>
          {/* Making something is the first thing on the list and styled as one of
              it, rather than a heavy button that belongs to no other element. */}
          <button data-tour="new" className={"nav-item nav-add" + (page === "upload" ? " on" : "")} onClick={() => go("upload")}>
            <span className="nav-add-icon"><Icon name="plus" size={14} /></span>
            New material
          </button>
          {GROUPS.filter((g) => (!g.early || early) && (!g.beta || beta) && !(preview && g.old) && (!g.fresh || preview)).map((g) => (
            <button key={g.id} data-tour={g.id} className={"nav-item" + (g.pages.includes(page) ? " on" : "")}
              onClick={() => (g.id === "study" ? openStudy(lastInGroup.current.study || "sheet") : go(lastInGroup.current[g.id] || g.pages[0]))}>
              {preview && g.pic ? <NavIcon id={g.pic} size={34} /> : <Icon name={g.icon} />}
              {g.label}
              {g.id === "social" && social.badge > 0 && <i className="badge nav-badge" aria-label={`${social.badge} new`}>{social.badge > 99 ? "99+" : social.badge}</i>}
            </button>
          ))}
        </nav>
        )}

        {/* The places people go now and then, kept to the foot but drawn the
            same way as everything above them. */}
        {/* the theme's little scene, in the space between the pages and the foot */}
        {hasScenery(look) && <div className="side-scene"><ThemeScenery theme={look} /></div>}
        <nav className={"nav nav-bottom" + (studyMode ? " nav-hide" : "")}>
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
            data-tour="settings"
            className={"icon-btn" + (page === "settings" ? " on" : "")}
            onClick={() => go("settings")}
            title="Settings"
            aria-label="Settings"
          >
            <Icon name="gear" size={17} />
          </button>
        </div>
      </aside>

      {studyMode && (
        <nav className="study-rail" aria-label="This folder">
          <button className="sr-item sr-back sr-menu" onClick={() => setMenuOpen(true)} title="Menu: back to Library, Home and the rest" aria-label="Open menu">
            <span className="sr-ico"><Icon name="menu" size={22} />{social.badge > 0 && <i className="badge dot" aria-hidden="true" />}</span>
          </button>
          {[["sheet", "Notes", "notes"], ["learn", "Learn", "learn"], ["quiz", "Practice", "practice"], ["topics", "Topics", "topics"], ["videos", "Videos", "videos"]].map(([id, label, pic]) => (
            <button key={id} className={"sr-item" + (page === id ? " on" : "")} onClick={() => go(id)} aria-current={page === id ? "page" : undefined}>
              <span className="sr-ico"><NavIcon id={pic} size={30} rail /></span>
              <span className="sr-label">{label}</span>
            </button>
          ))}
          <span className="sr-sep" />
          <button className="sr-item" onClick={() => { window.dispatchEvent(new CustomEvent("dwiddle:ask", { detail: {} })); }} title="Chat with Dwiddle">
            <span className="sr-ico"><NavIcon id="chat" size={30} rail /></span><span className="sr-label">Chat</span>
          </button>
          <button className="sr-item" onClick={() => { window.dispatchEvent(new Event("dwiddle:close-chat")); setFriendsOpen((v) => !v); }} title="Friends">
            <span className="sr-ico"><NavIcon id="social" size={30} rail />{social.badge > 0 && <i className="badge dot" aria-hidden="true" />}</span><span className="sr-label">Friends</span>
          </button>
          <button className={"sr-item" + (page === "notebook" ? " on" : "")} onClick={() => go("notebook")} title="Notebooks">
            <span className="sr-ico"><NavIcon id="notebook" size={30} rail /></span><span className="sr-label">Notebooks</span>
          </button>
        </nav>
      )}

      <main className="main">
        {early && <StudyBanner />}
        {studyMode && page !== "notebook" && !tipGone && (
          <div className="notice topic-tip">
            <span className="notice-dot" />
            <span className="notice-text"><b>There is more here than notes.</b> Use the icons down the left to switch between Notes, Learn, Practice, Topics and Videos.</span>
            <button className="btn" onClick={() => { setTipGone(true); try { localStorage.setItem("dwiddle-topic-tip", "1"); } catch {} }}>Got it</button>
            <button className="icon-btn" aria-label="Dismiss" onClick={() => { setTipGone(true); try { localStorage.setItem("dwiddle-topic-tip", "1"); } catch {} }}>
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
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
          <button className="icon-btn menu-btn menu-badge-host" aria-label="Open menu"
            onClick={() => setMenuOpen(true)}>
            <Icon name="menu" size={18} />
            {social.badge > 0 && <i className="badge dot" aria-hidden="true" />}
          </button>
          {studyMode && (
            <button className="btn quiet small hf-back" onClick={() => { setFocus(null); go("library"); }}>
              <span className="hf-back-ico"><Icon name="arrow" size={13} /></span> Library
            </button>
          )}
          {tabGroup?.tabs ? (
            <nav className="tabs" aria-label={tabGroup.label}>
              {tabGroup.pages.filter((id) => tabGroup.tabs[id] && (id !== "videos" || early)).map((id) => (
                <button key={id} className={page === id ? "on" : ""} onClick={() => go(id)}>
                  {tabGroup.tabs[id]}
                </button>
              ))}
            </nav>
          ) : (
            <span className="topbar-title">{title}</span>
          )}
          <span className="crumb small">{study && !mustPick ? study.title : ""}</span>
          {preview && (
            <span className="top-chips">
              <button className="top-chip" title="Days in a row you have studied" onClick={() => go("leaderboard")}><Flame size={24} lit={streakOf(stats.days) > 0} />{streakOf(stats.days)}</button>
              <button data-tour="duel" className="top-chip" title="Race a friend on the same questions" onClick={() => go("duel")}><NavIcon id="duel" size={24} />Duel</button>
              <button className="top-chip" title="Leaderboard" onClick={() => go("leaderboard")}><NavIcon id="trophy" size={24} />Leaderboard</button>
            </span>
          )}
          <FullscreenButton className="icon-btn topbar-fs" />
        </header>
        <Boundary resetKey={`${page}:${seq}`} onLeave={() => go("home")}>
        {mustPick ? <Pick materials={made.materials} made={made} fullMade={made} pick={setFocus} setFocus={setFocus} go={go} picking auth={auth} stats={stats} bank={bank} drills={drills} srs={srs} focus={focus} setTopic={setTopic} deleteItem={(id) => { setMadeRaw((prev) => { const next = withoutMaterial(prev, id); save(KEYS.made, next && { ...next, savedAt: Date.now() }); return next; }); if (focus === id) setFocus(null); }} deleteMaterial={deleteMaterial} /> : <Page
          key={`${page}:${seq}`}
          go={go}
          page={page}
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
          made={study}
          fullMade={made}
          flagBad={flagBad}
          beta={beta}
          setMade={setMade}
          focus={focus}
          setFocus={setFocus}
          deleteItem={(id) => { setMadeRaw((prev) => { const next = withoutMaterial(prev, id); save(KEYS.made, next && { ...next, savedAt: Date.now() }); return next; }); if (focus === id) setFocus(null); }}
          renameItem={(id, title) => setMadeRaw((prev) => { const next = renameMaterial(prev, id, title); if (next !== prev) save(KEYS.made, next && { ...next, savedAt: Date.now() }); return next; })}
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
        />}
        </Boundary>
      </main>

      {/* On a phone the sidebar gives way to a tab bar along the bottom, where
          a thumb can reach it, the way a phone app is laid out. The places
          visited less often stay in the drawer behind More. */}
      <nav className="tabbar" aria-label="Main">
        {[
          { id: "home", label: "Home", icon: "home", on: page === "home", to: "home" },
          preview
            ? { id: "library", label: "Library", icon: "folder", on: ["library", "reader", "decks"].includes(page) || groupOf(page)?.id === "study", to: "library" }
            : { id: "study", label: "Study", icon: "cards", on: groupOf(page)?.id === "study", to: lastInGroup.current.study || "sheet" },
          { id: "add", label: "New", icon: "plus", on: page === "upload", to: "upload", add: true },
          { id: "chat", label: "Chat", icon: "chat", on: page === "chat" || page === "solve", to: "chat" },
        ].map((t) => (
          <button key={t.id} data-tour={t.add ? "new" : t.id} className={"tab" + (t.on ? " on" : "") + (t.add ? " tab-add" : "")}
            onClick={() => (t.id === "study" ? openStudy(t.to) : go(t.to))} aria-current={t.on ? "page" : undefined}>
            <span className="tab-icon"><Icon name={t.icon} size={t.add ? 22 : 21} /></span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
        <button data-tour="more" className={"tab" + (["tests", "courses", "library", "reader", "settings", "feedback", "install", "install-all", "notebook"].includes(page) ? " on" : "")}
          onClick={() => setMenuOpen(true)}>
          <span className="tab-icon"><Icon name="menu" size={21} />{social.badge > 0 && <i className="badge dot" aria-hidden="true" />}</span>
          <span className="tab-label">More</span>
        </button>
      </nav>

      <ReadyToast go={(path) => { const id = PATH_PAGE[path]; if (id) go(id); }} />
      {touring && <Tour steps={preview ? FOLDER_STEPS : undefined} onClose={() => setTouring(false)} />}
      <UpdateBar />
      {pop && (
        <button className="msg-toast" onClick={() => {
          try { sessionStorage.setItem("dwiddle-social-tab", "chat"); sessionStorage.setItem("dwiddle-chat-with", pop.from); } catch {}
          setPop(null);
          if (studyMode) { window.dispatchEvent(new Event("dwiddle:close-chat")); setFriendsOpen(true); } else go("social");
        }}>
          <UserIcon avatar={pop.avatar} user={null} size={38} />
          <span className="msg-toast-text"><b>{pop.name}</b><span>{pop.body.length > 80 ? pop.body.slice(0, 79) + "…" : pop.body}</span></span>
        </button>
      )}
      {studyMode && friendsOpen && <FriendsPopup beta={beta} auth={auth} onSignIn={() => setSignInOpen(true)} onClose={() => setFriendsOpen(false)} />}
      <DwiddleChat hidden={["settings", "install", "install-all", "feedback", "tests", "notebook", "chat"].includes(page)} />
      <PermissionPrompt />
      <NarrationAsk />
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
  { id: "chat", icon: "chat", name: "Chat", sub: "Ask anything, or a question you are stuck on, worked through" },
  { id: "tests", icon: "target", name: "Test prep", sub: "SAT, ACT, IELTS and more, on Testiddle" },
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
  // A topic belongs to the library item that lists it by name; anything no
  // item lists (material from before items existed) still shows, on its own.
  const groups = materials
    .map((m) => ({ material: m, topics: live.filter((t) => (m.topics || []).includes(t.name)) }))
    .filter((g) => g.topics.length > 0);
  const placed = new Set(groups.flatMap((g) => g.topics.map((t) => t.id)));
  const loose = live.filter((t) => !placed.has(t.id));
  if (loose.length) groups.push({ material: { id: "loose", title: loose[0].source || "Your material" }, topics: loose });

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

const MAX_MATERIAL_FILES = 25;

// The opening of a transcript, a few sentences long, to recognise it by.
function firstSentences(text, n) {
  const parts = String(text || "").match(/[^.!?]+[.!?]+/g);
  if (!parts) return String(text || "").split(/\s+/).slice(0, 45).join(" ") + (String(text).split(/\s+/).length > 45 ? "..." : "");
  return parts.slice(0, n).map((p) => p.trim()).join(" ");
}
// Shorter than this, what someone typed may be a request to study something
// rather than notes, so it is looked at before anything is written.
const REQUEST_LIMIT = 1500;

function AddMaterial({ go, setMade, auth, early, setFocus = () => {} }) {
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
  const [pct, setPct] = useState(null); // 0 to 1 while building, across summarising and writing
  const baseRef = useRef(0);
  const [condense, setCondense] = useState(null); // { done, of } while a big source is summarised first
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
    askNotify();
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
    // Past that, it is summarised first (side by side, keeping every fact) and
    // everything is built from the summary, like handing a pile of files to a
    // person who reads them all and writes you the study notes.
    if (text.trim().length > LIMIT) {
      setState("working");
      setCondense({ done: 0, of: 0 });
      setSize(text.trim().split(/\s+/).length);
      let digest = "";
      baseRef.current = 0.5; setPct(0.15);
      try {
        digest = await condenseSource(text, { onProgress: (done, of) => { setCondense({ done, of }); setPct(0.15 + 0.35 * done / of); } });
      } catch (err) {
        setCondense(null);
        setState("error");
        setError(err.message);
        return;
      }
      setCondense(null);
      build(digest, false);
      return;
    }
    baseRef.current = 0.15; setPct(0.15);
    build(text, false);
  }

  // Writes the notes on a requested topic, then builds from them exactly as
  // from notes someone pasted.
  async function fromRequest(request, answers) {
    setAsk(null);
    setState("brief");
    try {
      const written = await writeBrief(request, answers);
      baseRef.current = 0.12; setPct(0.12);
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
    if (inParts) setPct(null);
    setWaiting(null);
    let unfinishedLeft = false;
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
        unfinishedLeft = !!run.rest;
      } else {
        data = await generateFromNotes(text, { onProgress: (f) => setPct(baseRef.current + (1 - baseRef.current) * f) });
        rememberSource(data, { notes: text });
        setUnfinished(null);
      }
      if (!carryOn) countGeneration(auth?.user);
      setResult(data);
      // A new item in the library; earlier ones are kept. More parts of the
      // same long source join the item they belong to.
      setMade(data, { material: carryOn ? "same" : "new" });
      setState("done");
      notifyReady("Your study material is ready", `${data?.title || "Your notes"}: notes, lessons and questions are waiting.`, "/study-sheet");
      // Straight to Study, showing just this. A long source that stopped part
      // way stays here, where carrying on is offered.
      if (!(inParts && unfinishedLeft)) go("sheet");
    } catch (err) {
      setState("error");
      setError(err.message);
    } finally {
      setProgress(null);
      setPct(null);
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
              title={condense ? "Summarising your material" : state === "reading" ? "Reading your material" : state === "asking" ? "Reading your request" : "Making your study material"}
              detail={condense ? (condense.of ? `Boiling ${condense.of} chunks down to what you can be tested on, ${condense.done} done. Questions come next.` : "Splitting it into chunks") : state === "reading" ? (files.length > 1 ? `File ${reading} of ${files.length}` : "Pulling the text out of your file")
                : state === "asking" ? "Working out what you want to study"
                : state === "brief" ? "Writing full notes, topic by topic"
                : "Writing questions with an explanation for every answer"}
              progress={state === "working" && pct != null ? pct : condense ? (condense.of ? condense.done / condense.of : null) : state === "reading" && files.length > 1 ? 0.15 * (reading - 1 + (pageOf ? pageOf.p / pageOf.of : 0)) / files.length
                : state === "reading" && pageOf ? 0.15 * pageOf.p / pageOf.of
                : state === "working" && progress ? (progress.n - 1) / progress.of : null}
              count={!early ? null
                : state === "reading" && pageOf ? `Page ${pageOf.p} of ${pageOf.of}${files.length > 1 ? ` · file ${reading} of ${files.length}` : ""}`
                : state === "reading" && files.length > 1 ? `File ${reading} of ${files.length}`
                : state === "working" && progress ? `Part ${progress.n} of ${progress.of}` : null}
              eta={!early ? null
                : state === "brief" ? null
                : state === "working" && !progress && pct == null ? Math.min(150, 25 + Math.round(size / 70)) : null}
              cap={state === "working" ? 0.95 : 0.12} outfit={state === "reading" ? "detective" : state === "brief" ? "wizard" : "graduate"} />
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

// More than one item in the library: Study asks which one, and shows only
// that one until another is picked.
function StudyPicker({ materials, made, pick }) {
  const count = (m) => {
    const names = new Set(m.topics);
    return { topics: m.topics.length, questions: (made?.questions || []).filter((q) => names.has(q.topic)).length };
  };
  const when = (t) => (t ? new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");
  return (
    <div className="page fade">
      <PageHead title="What are you studying?" sub="Pick one. Notes, Learn, Practice, Topics and Videos then show only that." />
      <div className="card">
        <div className="list">
          {[...materials].reverse().map((m) => {
            const c = count(m);
            return (
              <button key={m.id} className="list-item lib-item study-pick" onClick={() => pick(m.id)}>
                                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div className="list-title">{m.title}</div>
                  <div className="small muted">
                    {c.topics} topic{c.topics === 1 ? "" : "s"} · {c.questions} question{c.questions === 1 ? "" : "s"}{when(m.at) ? ` · added ${when(m.at)}` : ""}
                  </div>
                </div>
                <span className="btn small cta">Study</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Home as folders, with the numbers it needs worked out here.
function CleanPicker() {
  const on = useClean();
  return (
    <div className="hf-switch" role="radiogroup" aria-label="Layout">
      {[[false, "Classic"], [true, "New"]].map(([v, l]) => (
        <button key={l} role="radio" aria-checked={on === v} className={on === v ? "on" : ""} onClick={() => setClean(v)}>{l}</button>
      ))}
    </div>
  );
}
function FoldersBridge(props) { return <HomeBridge {...props} home={false} />; }
function ExploreBridge(props) { return <HomeBridge {...props} home={false} startView="explore" />; }
function HomeBridge({ home = true, ...props }) {
  const { auth, stats, bank = [], drills = [], srs = {} } = props;
  const [pick] = useState(() => Math.random());
  const me = useMyProfile(auth?.user);
  const hello = greeting(me?.display_name?.trim().split(/\s+/)[0] || nameFor(auth?.user), pick);
  const due = reviewOn() ? dueFrom([...bank, ...drills], srs).length : 0;
  return <HomeFolders {...props} home={home} hello={hello} sub={greetingSub() || "Pick up where you left off."} streak={streakOf(stats?.days)} due={due} level={levelOf(stats?.xp || 0).level} xp={stats?.xp || 0} prefill={(t) => { try { sessionStorage.setItem("dwiddle-handoff-notes", t); } catch {} props.go("upload"); }} />;
}

function Library({ go, fullMade, materials, deleteMaterial, deleteItem, focus, setFocus }) {
  const [confirm, setConfirm] = useState(null); // the item about to be deleted
  const made = fullMade;
  const countsOf = (m) => {
    const names = new Set(m.topics);
    return {
      topics: m.topics.length,
      questions: (made?.questions || []).filter((q) => names.has(q.topic)).length,
      lessons: Object.keys(made?.lessons || {}).filter((k) => names.has(k)).length,
    };
  };
  const learn = (m) => { setFocus(m.id); go("sheet"); };
  const when = (t) => (t ? new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");
  return (
    <div className="page fade">
      <PageHead title="Library" sub="Everything you have added, each with its own topics. Press Learn to study just that one." />
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
              <div className="row">
                <button className="btn quiet" onClick={() => go("upload")}>Add material</button>
              </div>
            </div>
            <div className="list">
              {[...materials].reverse().map((m) => {
                const c = countsOf(m);
                return (
                  <div key={m.id} className={"list-item lib-item" + (focus === m.id ? " on" : "")} onClick={() => learn(m)}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="list-title">{m.title}</div>
                      <div className="small muted">
                        {c.topics} topic{c.topics === 1 ? "" : "s"} · {c.questions} question{c.questions === 1 ? "" : "s"}{when(m.at) ? ` · added ${when(m.at)}` : ""}
                      </div>
                    </div>
                    {focus === m.id && <span className="pill accent">Studying</span>}
                    <button className="btn small cta" onClick={(e) => { e.stopPropagation(); learn(m); }}>Learn</button>
                    <button className="icon-btn lib-del" title="Delete this item" aria-label={`Delete ${m.title}`}
                      onClick={(e) => { e.stopPropagation(); setConfirm(m); }}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <Portal>
          <div className="gate-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}>
            <div className="gate lib-confirm" role="alertdialog" aria-modal="true" aria-labelledby="lib-del-title">
              <div className="lib-confirm-icon"><Icon name="trash" size={22} /></div>
              <h2 id="lib-del-title">Delete "{confirm.title}"?</h2>
              <p className="gate-sub">
                This removes its {countsOf(confirm).topics} topic{countsOf(confirm).topics === 1 ? "" : "s"}, {countsOf(confirm).questions} questions, lessons and notes,
                from this device and from your account. Your other items, your streak and your totals stay. It cannot be undone.
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

/* ---------- practice: modes ---------- */

const MODES = [
  { id: "quiz", label: "Quiz", icon: "quiz", sub: "A mix of question kinds, with an explanation after each answer." },
  { id: "review", label: "Review", icon: "timer", sub: "Questions due for another look, spaced out so they stick. Entirely optional." },
  { id: "cards", label: "Flashcards", icon: "cards", sub: "Pick a deck. Cards you know are retired and stop appearing." },
  { id: "mock", label: "Mock exam", icon: "exam", sub: "A full length paper against the clock, marked at the end." },
  { id: "long", label: "Long answer", icon: "pen", sub: "Written questions worth 3 to 6 marks. Write your answer and it is marked against a mark scheme, like a real paper." },
  { id: "speed", label: "Speed round", icon: "bolt", sub: "Sixty seconds. Answer as many as you can." },
  { id: "missed", label: "Missed", icon: "flag", sub: "Only the questions you have got wrong." },
];

const QUIZ_LENGTHS = [5, 10, 20, 30, 50];
// How many questions each topic is kept topped up to in the background.
const BANK_TARGET = 14;

function Practice(props) {
  const { pMode, setPMode, missed, topic: pickedTopic, setTopic, go, hidden, bank, topics } = props;
  const active = MODES.find((m) => m.id === pMode) || MODES[0];
  const Mode = { quiz: QuizMode, review: ReviewMode, cards: Flashcards, mock: MockExam, long: LongMode, speed: SpeedRound, missed: MissedMode }[active.id];
  const [quizLen, setQuizLenRaw] = useState(() => load(KEYS.quizLen, 5));
  const [quizLevel, setQuizLevelRaw] = useState(() => load("dwiddle-quizlevel", "auto"));
  const [runKey, setRunKey] = useState(0); // a new number starts a fresh run of the same mode
  const setQuizLevel = (v) => { setQuizLevelRaw(v); save("dwiddle-quizlevel", v); };

  function setQuizLen(n) {
    setQuizLenRaw(n);
    save(KEYS.quizLen, n);
  }

  // Removed topics drop out of practice too, otherwise removing one from the
  // list would not actually declutter anything.
  const liveTopics = topics.filter((t) => !hidden.includes(t.id)).map((t) => t.name);
  const choices = [...new Set(bank.map((q) => q.topic))].filter((t) => liveTopics.includes(t));
  // A topic picked earlier that has no questions here (another material, or
  // removed) must not leave Practice empty under an "All topics" label.
  const topic = pickedTopic && choices.includes(pickedTopic) ? pickedTopic : null;

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
    ? { ...props, topic, grade: (id, ok, t, kind, meta) => { props.grade(id, ok, t, kind, meta); record(ok, { quiet: active.id === "mock" }); } }
    : { ...props, topic };
  useEffect(() => {
    if (!playing) return;
    const onKey = (e) => { if (e.key === "Escape" && !e.target.closest?.("input, textarea")) setPlaying(false); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [playing]);

  const stat = {
    quiz: `${pool.length} question${pool.length === 1 ? "" : "s"}`,
    review: dueCount ? `${dueCount} due now` : "Nothing due",
    cards: (() => { const n = flashDeck(pool, props.made, topic).length; return `${n} card${n === 1 ? "" : "s"}`; })(),
    mock: `${Math.min(pool.length, 20)} questions, timed`,
    long: "3 to 6 marks each",
    speed: "60 seconds",
    missed: missed.length ? `${missed.length} to fix` : "None yet",
  };
  const empty = pool.length === 0;
  useCover(playing && !empty);

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
              {m.id === "quiz" && (
                <div className="seg tight pz-level" onClick={(e) => e.stopPropagation()} role="radiogroup" aria-label="How hard">
                  {[["auto", "Adaptive"], ["recall", "Recall"], ["hard", "Harder"]].map(([id, l]) => (
                    <button key={id} role="radio" aria-checked={quizLevel === id} className={quizLevel === id ? "on" : ""}
                      title={id === "hard" ? "Indirect questions: a situation to explain instead of a term to recognise" : id === "auto" ? "Gets harder on topics you know well" : "Straight questions on the facts"}
                      onClick={() => setQuizLevel(id)}>{l}</button>
                  ))}
                </div>
              )}
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
            {early && <ThemeBackdrop theme={props.look} resolved={props.resolved} inOverlay />}
            <div className={"pz-body" + (early ? " pc-on" : "")}>
              {early && <PracticeSides s={session} />}
              <div className="pz-inner">
                <p className="pz-sub muted">{active.sub}</p>
                <Mode key={active.id + ":" + (topic || "all") + ":" + quizLen + ":" + quizLevel + ":" + runKey} {...modeProps} onRestart={() => setRunKey((k) => k + 1)} pool={pool} drillPool={drillPool} len={quizLen} level={quizLevel} />
              </div>
            </div>
            {early && <Cheer cheer={session.cheer} />}
            {early && active.id !== "mock" && <AnswerFlash ok={session.last} seq={session.seq} />}
          </div>
        </Portal>
      )}
    </div>
  );
}

/* ---------- practice: quiz ---------- */

// A run is a mix, not a row of the same thing: picked, typed, true or false and
// matching, in turn, with the drill kinds the topic has mixed in as well. Each
// kind falls back to a plain pick where the question does not suit it. startAt
// keeps the pattern going when more questions are added to a run under way.
function mixRun(main, drills, startAt = 0, spare = []) {
  const extra = [...drills];
  const used = new Set();
  // matching rounds are made from questions this run would not ask anyway (the
  // spares), so they never use up slots: a run of 20 stays 20 questions long
  return main.map((q, k) => {
    const n = k + startAt;
    if (n % 3 === 2 && extra.length) return extra.pop();
    if (n % 5 === 4 && spare.length) { const m = matchFrom(spare, used); if (m) { m.from.forEach((id) => used.add(id)); return m; } }
    if (n % 4 === 1) return typedFrom(q) || trueFalseFrom(q) || q;
    if (n % 4 === 3) return trueFalseFrom(q) || typedFrom(q) || q;
    return q;
  });
}

function QuizMode({ grade, pool, len, drillPool = [], ordered = false, early, made, setMade, level = "auto", flagBad, go, onRestart }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null); // the option chosen, or true/false for the other kinds
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [flagged, setFlagged] = useState(null);
  // How hard this run is. Harder means indirect questions: a situation to
  // explain instead of a term to recognise. Automatic turns that up for topics
  // the last few answers show are well known, and down for ones that are not.
  const [hardShare] = useState(() => {
    if (ordered || level === "recall") return 0;
    if (level === "hard") return 0.7;
    return masteryOf(readLog(), [...new Set(pool.map((x) => x.topic))]) === "high" ? 0.4 : 0;
  });
  // Only questions never asked before go in a run. Ones already answered are
  // left out, and new ones are written to make up the number, so a quiz is never
  // the same questions again. (A run of the questions due for review is the
  // exception: those are meant to come back.)
  const [fresh0] = useState(() => (ordered ? null : freshFirst(pool)));
  const unseenPool = fresh0 ? fresh0.ordered.slice(0, fresh0.unseen) : pool;
  const wantHard = Math.round(len * hardShare);
  const hardHave = unseenPool.filter((x) => x.level === "apply").length;
  const needHard = Math.max(0, wantHard - hardHave);
  const needPlain = Math.max(0, len - unseenPool.length);
  const iRef = useRef(0);
  iRef.current = i;
  // The run starts straight away with the new questions there are, while more
  // are written in the style of those in the background, kept for next time,
  // and added on to the end as they arrive. If there are none at all, or the
  // student reaches the end first, it waits for them.
  const short = !ordered && !!setMade && pool.length > 0 && (needPlain > 0 || needHard > 0);
  const [loadingMore, setLoadingMore] = useState(short);
  const [hold, setHold] = useState(false);
  const [note, setNote] = useState(""); // said when fewer new questions came back than asked for
  // A run mixes kinds: picked, typed, true or false and matching.
  const [QUIZ, setQUIZ] = useState(() => {
    if (ordered) return pool.slice(0, len);
    let main;
    if (wantHard && hardHave) {
      const hardQs = unseenPool.filter((x) => x.level === "apply").slice(0, wantHard);
      main = [...hardQs, ...unseenPool.filter((x) => !hardQs.includes(x))];
    } else main = unseenPool;
    // nothing new and nothing can be written: the oldest are better than an empty run
    if (!main.length && !short) main = fresh0.ordered;
    const drills = freshFirst(drillPool);
    return mixRun(shuffle(main.slice(0, len)), shuffle(drills.ordered.slice(0, drills.unseen)), 0, main.slice(len));
  });
  const [gaveUp, setGaveUp] = useState(false); // chose to go over old questions after nothing new could be written
  useEffect(() => {
    if (!short) return;
    let live = true;
    const topics = [...new Set(pool.map((x) => x.topic))];
    const shared = []; // everything written for this run so far, across both calls
    let why = "";
    // Asks again for the rest rather than letting the same ones come round twice.
    async function gen(count, depth) {
      const got = [];
      for (let tries = 0; tries < 3 && got.length < count && live; tries++) {
        // asks for a few more than needed, since some come back as repeats or fail the answer check
        const qs = await moreQuestions(made, topics, Math.ceil((count - got.length) * 1.3) + 1, [...got, ...shared].map((x) => x.q), depth).catch((e) => { why = e?.message || ""; return []; });
        if (qs.error) why = qs.error;
        // anything that is, or is a rewording of, a question already there is dropped
        const phrased = qs.map((q) => phraseQuestion(q));
        const merged = uniqueQuestions([...pool, ...shared, ...phrased]);
        const candidates = phrased.filter((x) => merged.includes(x));
        // unanswerable wording is skipped, but not at the price of getting nothing
        const fresh = candidates.filter(answerable).length ? candidates.filter(answerable) : candidates;
        if (qs.length && !candidates.length) why = "the new questions were copies of ones already there";
        if (!fresh.length) break; // nothing new: asking again straight away would not help
        got.push(...fresh);
        shared.push(...fresh);
        setMade({ title: made?.title, topics: [], questions: fresh }, { material: "none" });
        // each batch joins as it lands, up to the length asked for; any extra is kept for next time
        if (live) setQUIZ((prev) => { const room = len - prev.length; return room > 0 ? [...prev, ...mixRun(shuffle(fresh).slice(0, room), [], prev.length)] : prev; });
      }
      return got;
    }
    (async () => {
      const [hard, plain] = await Promise.all([needHard ? gen(needHard, "apply") : [], needPlain ? gen(needPlain, "") : []]);
      if (!live) return;
      setLoadingMore(false);
      const total = Math.min(len, unseenPool.length) + Math.max(hard.length, 0) + plain.length;
      if (needPlain && plain.length < needPlain && total < len) setNote(`That is every new question there is for now, so this quiz is ${Math.min(total, len)} questions instead of ${len}, with no repeats.${why ? ` Why: ${why}` : " The notes only cover so many different facts, so adding more material gives more."}`);
      else if (needHard && hard.length < needHard) setNote("Some of the harder questions could not be written just now, so a few easier ones are in their place.");
    })();
    return () => { live = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // reached the end while the rest was still being written: carry on when it lands
  useEffect(() => {
    if (!hold) return;
    if (QUIZ.length > i + 1) { setHold(false); setI(i + 1); setPicked(null); }
    else if (!loadingMore) { setHold(false); playCue(score / QUIZ.length >= 0.7 ? "done-great" : "done-okay"); setFinished(true); }
  }, [hold, QUIZ.length, loadingMore]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (QUIZ.length === 0 && !gaveUp) {
    return loadingMore ? (
      <div className="card card-pad quiz-more">
        <Duck size={90} outfit="wizard" />
        <b>Writing new questions for you</b>
        <p className="small muted">You have answered all the ones you had, so these are new, in the same style, on the same topics. The first ones appear in a few seconds.</p>
        <div className="busy-bar sweep"><span /></div>
      </div>
    ) : (
      <div className="card card-pad quiz-more">
        <Duck size={90} outfit="wizard" />
        <b>You have done every question there is</b>
        <p className="small muted">{note || "No new ones could be written from this material just now. Adding more notes gives more questions, or you can go over the ones you did longest ago."}</p>
        <div className="row" style={{ justifyContent: "center" }}>
          {go && <button className="btn cta" onClick={() => go("upload")}>Add material</button>}
          <button className="btn ghost" onClick={() => { setGaveUp(true); setQUIZ(mixRun(shuffle((fresh0?.ordered || pool).slice(0, len)), [], 0)); }}>Go over the oldest ones</button>
        </div>
      </div>
    );
  }

  if (hold) {
    return (
      <div className="card card-pad quiz-more">
        <Duck size={90} outfit="wizard" />
        <b>Writing the rest of your questions</b>
        <p className="small muted">You got through the ones that were ready. The rest are on their way, in the same style as yours.</p>
        <div className="busy-bar sweep"><span /></div>
      </div>
    );
  }

  const drill = isDrill(q);
  const answered = picked !== null;

  function settle(ok) {
    if (ok) setScore((s) => s + 1);
    grade(q.id, ok, q.topic, q.type || "mc", skillMeta(q));
  }

  function pick(n) {
    if (answered) return;
    setPicked(n);
    settle(n === q.answer);
  }

  function next() {
    if (i + 1 >= QUIZ.length) {
      if (loadingMore) return setHold(true);
      playCue(score / QUIZ.length >= 0.7 ? "done-great" : "done-okay");
      return setFinished(true);
    }
    setI(i + 1);
    setPicked(null);
  }

  // another run, with questions not asked before, not the same ones over
  function restart() {
    if (onRestart) return onRestart();
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
          <span className="small muted">Question {i + 1} of {QUIZ.length}{loadingMore ? "+" : ""}</span>
          <span className="small muted">{score} correct</span>
        </div>
        <div className="bar" style={{ marginBottom: 22 }}>
          <i style={{ width: `${((i + (answered ? 1 : 0)) / QUIZ.length) * 100}%` }} />
        </div>
        {note && <p className="small muted" style={{ margin: "-10px 0 16px" }}>{note}</p>}

        {drill ? (
          <QuestionView key={q.id + ":" + i} q={q} onDone={(ok) => { setPicked(ok); settle(ok); }} />
        ) : (
          <>
            <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
              <M t={q.q} />
            </h3>

            {q.choices.map((c, n) => {
              let cls = "choice";
              if (answered && n === q.answer) cls += " right";
              else if (picked === n) cls += " wrong";
              return (
                <button key={n} className={cls} onClick={() => pick(n)} disabled={answered}>
                  <span className="key">{"ABCD"[n]}</span>
                  <M t={c} />
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
                <p className="small" style={{ margin: "10px 0 0", color: "var(--ink-2)" }}><M t={q.why} /></p>
                {early && <LikeImFour context={askContext(q, picked)} />}
              </div>
            )}
            <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
              {!drill && flagBad && (flagged === q.id
                ? <span className="small muted">Removed. Thanks for catching that.</span>
                : <button className="btn quiet small" title="The marked answer is wrong or none of the options are right" onClick={() => { flagBad(q.id); setFlagged(q.id); }}>Wrong answer? Remove this</button>)}
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

// Only the high mark questions: a few written answers, each worth 3 to 6 marks,
// marked against a mark scheme. They are written from the notes when this is
// opened, the first few arriving before the rest, so there is little waiting.
function LongMode({ grade, pool, made, topic }) {
  const [qs, setQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [got, setGot] = useState({ marks: 0, of: 0, right: 0 });
  const [answered, setAnswered] = useState(false);
  const [hold, setHold] = useState(false);
  const [try_, setTry] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true); setFailed(false);
    const all = [...new Set(pool.map((x) => x.topic))];
    const pickTopics = () => (topic ? [topic] : shuffle(all).slice(0, 3));
    const seen = new Set();
    let pending = 2, total = 0;
    const landed = (list) => {
      const fresh = (list || []).filter((x) => x?.q && Array.isArray(x.scheme) && !seen.has(x.q));
      fresh.forEach((x) => seen.add(x.q));
      total += fresh.length;
      if (live && fresh.length) setQs((prev) => [...prev, ...fresh]);
      if (--pending === 0 && live) { setLoading(false); setHold(false); if (!total) setFailed(true); }
    };
    // two calls side by side, so the first three are on screen as soon as they are ready
    longQuestions(made, pickTopics(), 3).catch(() => []).then(landed);
    longQuestions(made, pickTopics(), 3, []).catch(() => []).then(landed);
    return () => { live = false; };
  }, [try_]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = qs[i];
  // after the last one that is ready, wait if more are still being written
  useEffect(() => {
    if (hold && qs.length > i + 1) { setHold(false); setI(i + 1); setAnswered(false); }
  }, [qs.length, hold]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) {
    return (
      <div className="card card-pad quiz-more">
        <Duck size={90} outfit="wizard" />
        <b>Could not write long answer questions just now</b>
        <p className="small muted">They need a bit more material to write from, or the AI service was busy. Try again in a moment.</p>
        <button className="btn cta" onClick={() => { setQs([]); setTry((n) => n + 1); }}>Try again</button>
      </div>
    );
  }
  if (!qs.length || (hold && qs.length <= i + 1)) {
    return (
      <div className="card card-pad quiz-more">
        <Duck size={90} outfit="wizard" />
        <b>Writing your long answer questions</b>
        <p className="small muted">Each one is worth a few marks and comes with a mark scheme. The first ones appear as soon as they are ready.</p>
        <div className="busy-bar sweep"><span /></div>
      </div>
    );
  }
  if (done) {
    return (
      <div className="fade">
        <div className="card card-pad" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em" }}>{got.of ? `${got.marks} / ${got.of}` : `${got.right} / ${qs.length}`}</div>
          <div className="muted" style={{ marginBottom: 20 }}>{got.of ? "marks across your long answers" : "long answers rated right"}</div>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={() => { setQs([]); setI(0); setDone(false); setAnswered(false); setGot({ marks: 0, of: 0, right: 0 }); setTry((n) => n + 1); }}>Write more</button>
          </div>
        </div>
      </div>
    );
  }
  function next() {
    if (i + 1 >= qs.length) {
      if (loading) return setHold(true);
      return setDone(true);
    }
    setI(i + 1); setAnswered(false);
  }
  return (
    <div className="fade">
      <div className="card card-pad">
        <div className="spread" style={{ marginBottom: 8 }}>
          <span className="small muted">Question {i + 1} of {qs.length}{loading ? "+" : ""}</span>
          <span className="small muted">{got.of ? `${got.marks} of ${got.of} marks so far` : ""}</span>
        </div>
        <div className="bar" style={{ marginBottom: 22 }}><i style={{ width: `${((i + (answered ? 1 : 0)) / Math.max(qs.length, 1)) * 100}%` }} /></div>
        <QuestionView key={q.id + ":" + i} q={q} onDone={(ok, extra) => {
          setAnswered(true);
          grade(q.id, ok, q.topic, "long");
          setGot((g) => ({ marks: g.marks + (extra?.awarded || 0), of: g.of + (extra?.marks || 0), right: g.right + (ok ? 1 : 0) }));
        }} />
        {answered && (
          <div className="row fade" style={{ marginTop: 14, justifyContent: "flex-end" }}>
            <button className="btn" onClick={next}>{i + 1 >= qs.length && !loading ? "See results" : "Next question"} <Icon name="arrow" /></button>
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
  const calm = useClean();

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

        <NotifyCard user={auth?.user} />
        <div className="card card-pad spread">
          <div>
            <b>Guide</b>
            <p className="small muted" style={{ margin: "2px 0 0" }}>Walks you through every part of Dwiddle, page by page: adding material, studying, practice, the report, the planner, friends and settings.</p>
          </div>
          <button className="btn" onClick={() => startGuide()}>Start the guide</button>
        </div>
        <div className="card card-pad spread">
          <div>
            <b>Quick tour</b>
            <p className="small muted" style={{ margin: "2px 0 0" }}>A look round the app: where to add material, study, your library, chat and themes.</p>
          </div>
          <button className="btn ghost" onClick={() => { resetTour(); go("home"); setTimeout(() => dispatchEvent(new Event("dwiddle:tour")), 300); }}>Show the tour</button>
        </div>

        <div className="card card-pad spread">
          <div>
            <b>Layout</b>
            <p className="small muted" style={{ margin: "2px 0 0" }}>Classic is the original look. New is the same app with small outline icons instead of the coloured pictures, no duck mascot, one calm cream and charcoal look, and smoother movement.</p>
          </div>
          <CleanPicker />
        </div>

        <div className="card">
          <div className="card-head"><h3>Appearance</h3></div>
          {calm && <p className="small muted" style={{ margin: "0 20px 6px" }}>The New layout has one calm look, cream by day and soft charcoal at night. Choose Classic layout above to pick a theme.</p>}
          <div className="th-grid" data-tour="themes" role="radiogroup" aria-label="Theme" hidden={calm}>
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
          <SetRow label="Mode" hint={calm ? "Light is cream, Dark is soft charcoal. System follows your device." : "Every theme has a light and a dark version. System follows your device."}>
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
// Flashcards are for learning, not for testing, so they are not the quiz
// questions again. Terms and what they mean, and how to do things: the steps of
// a method or process. Both come from what the notes already hold.
const keyOf = (t) => flatMarks(t).trim().toLowerCase();
function flashDeck(pool, made, topic) {
  const out = [], seen = new Set();
  const add = (card) => {
    const k = keyOf(card.front);
    if (!k || !card.back || seen.has(k) || card.front.length > 110) return;
    seen.add(k);
    out.push(card);
  };
  // vocabulary the questions already define
  for (const q of pool) {
    if (q.kind === "vocab" && q.term && Array.isArray(q.choices) && q.choices[q.answer]) {
      add({ id: q.id, kind: "terms", topic: q.topic, front: q.term, back: q.choices[q.answer], note: q.why });
    }
  }
  for (const [name, blocks] of Object.entries(made?.notes || {})) {
    if (topic && name !== topic) continue;
    let heading = "";
    for (const b of blocks || []) {
      if (b?.h) heading = flatMarks(b.h);
      if (b?.term) add({ id: "n:" + name + ":" + keyOf(b.term), kind: "terms", topic: name, front: flatMarks(b.term).trim(), back: flatMarks(b.def).trim(), note: "" });
      for (const t of blockTexts(b)) for (const seg of parseMarks(t)) {
        if (seg.mark === "word" && seg.def) add({ id: "n:" + name + ":" + keyOf(seg.t), kind: "terms", topic: name, front: flatMarks(seg.t).trim(), back: flatMarks(seg.def).trim(), note: "" });
      }
      // how to do something: a flow of steps, or a list under a "how to" heading
      const steps = b?.flow?.steps || (b?.list && /\b(how|method|steps?|procedure|process|to )\b/i.test(heading) ? b.list : null);
      if (steps && steps.length >= 2) {
        const title = b?.flow?.title ? flatMarks(b.flow.title) : heading;
        if (title) add({ id: "h:" + name + ":" + keyOf(title), kind: "howto", topic: name, front: /^how\b/i.test(title) ? title : `How to: ${title}`, back: steps.map((x, n) => `${n + 1}. ${flatMarks(x)}`).join("\n"), note: "" });
      }
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

  const deckSource = flashDeck(pool, made, topic);
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
          <Duck size={92} outfit="party" />
          <h3 style={{ margin: "10px 0 4px", fontSize: 17 }}>{inDeck.length ? "Deck clear" : "No cards here yet"}</h3>
          <p className="muted small" style={{ margin: "0 0 20px" }}>
            {inDeck.length
              ? `You retired all ${inDeck.length} cards in this deck. They will not come back until you reset it.`
              : "Flashcards are for terms and for how to do things. They come from the terms and the step by step methods in your notes, and this material has none of that kind yet."}
          </p>
          {inDeck.length > 0 && <button className="btn" onClick={reset}>Bring them back</button>}
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
            <span className="flash-tag">{card.kind === "howto" ? "How to" : "Term"}</span>
            <p className="flash-body"><M t={card.front} /></p>
            <span className="flash-foot">
              <span className="pill">{card.topic}</span>
              <span className="kbd-hint"><kbd>Space</kbd> to flip</span>
            </span>
          </div>

          <div className="flip-face back">
            <span className="flash-tag">Answer</span>
            <p className="flash-body answer" style={{ whiteSpace: "pre-line" }}><M t={card.back} /></p>
            <p className="flash-note"><M t={card.note} /></p>
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
    setPaper(shuffle(freshFirst(pool).ordered.slice(0, Math.min(count + 6, pool.length))).slice(0, Math.min(count, pool.length)));
    setAnswers({});
    setI(0);
    setLeft(minutes * 60);
    setStage("sitting");
  }

  function submit() {
    paper.forEach((q, n) => grade(q.id, answers[n] === q.answer, q.topic, "mc", skillMeta(q)));
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
                  <div className="list-title"><M t={q.q} /></div>
                  <div className="small muted">
                    You put {got === undefined ? "nothing" : q.choices[got]}. Answer: <M t={q.choices[q.answer]} />.
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
        <M t={q.q} />
      </h3>

      {q.choices.map((c, n) => (
        <button key={n}
          className={"choice" + (answers[i] === n ? " picked" : "")}
          onClick={() => setAnswers((a) => ({ ...a, [i]: n }))}>
          <span className="key">{"ABCD"[n]}</span>
          <M t={c} />
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
  const [list] = useState(() => [...bank].filter((q) => missed.includes(q.id)));

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
    grade(q.id, n === q.answer, q.topic, "mc", skillMeta(q));
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
          <M t={q.q} />
        </h3>
  
        {q.choices.map((c, n) => {
          let cls = "choice";
          if (picked !== null && n === q.answer) cls += " right";
          else if (picked === n) cls += " wrong";
          return (
            <button key={n} className={cls} onClick={() => pick(n)} disabled={picked !== null}>
              <span className="key">{"ABCD"[n]}</span>
              <M t={c} />
            </button>
          );
        })}

        {picked !== null && (
          <div className="fade" style={{ marginTop: 16 }}>
            <div className="card card-pad" style={{ background: "var(--panel)" }}>
              <span className={"pill " + (picked === q.answer ? "good" : "warn")}>
                {picked === q.answer ? "Cleared from your list" : "Still on the list"}
              </span>
              <p className="small" style={{ margin: "10px 0 0", color: "var(--ink-2)" }}><M t={q.why} /></p>
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

  // a different order each round, with questions not asked lately first
  const [order] = useState(() => freshFirst(pool).ordered);
  const q = order[n % order.length];

  useEffect(() => {
    if (stage !== "running") return;
    if (left <= 0) { setStage("over"); return; }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, left]);

  function answer(pick) {
    const ok = pick === q.answer;
    grade(q.id, ok, q.topic, "mc", skillMeta(q));
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
        <M t={q.q} />
      </h3>

      {q.choices.map((c, k) => (
        <button key={`${n}-${k}`} className="choice" onClick={() => answer(k)}>
          <span className="key">{"ABCD"[k]}</span>
          <M t={c} />
        </button>
      ))}
    </div>
  );
}

/* ---------- test prep has its own site ---------- */

// Test prep now lives on its own site. Opening it here sends you there, with a
// button in case the browser holds the redirect back.
const TESTIDDLE = "https://testiddle.vercel.app";
function TestsMoved() {
  const [to, setTo] = useState(TESTIDDLE);
  useEffect(() => {
    let live = true, t;
    (async () => {
      // Signed in here means signed in there: the short lived sign in token goes in
      // the address after the #, which is never sent to any server or logged.
      let url = TESTIDDLE;
      try {
        const { supabase } = await import("./supabase.js");
        const token = supabase ? (await supabase.auth.getSession()).data?.session?.access_token : null;
        if (token) url = `${TESTIDDLE}/#link=${token}`;
      } catch { /* not signed in, or no account service: they sign in there */ }
      if (!live) return;
      setTo(url);
      t = setTimeout(() => { window.location.href = url; }, 900);
    })();
    return () => { live = false; clearTimeout(t); };
  }, []);
  return (
    <div className="page fade">
      <PageHead title="Test prep" sub="SAT, ACT, SSAT, IELTS and TOEFL now have their own site." />
      <div className="card card-pad" style={{ display: "grid", gap: 12, justifyItems: "start" }}>
        <b>Taking you to Testiddle...</b>
        <p className="small muted" style={{ margin: 0 }}>Timed papers, drills and marking, the same as before. You stay signed in with this account.</p>
        <a className="btn cta" href={to}>Open Testiddle</a>
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
      go("sheet");
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
                  {busy === t ? <Loading label="Writing" /> : "Questions"}
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
