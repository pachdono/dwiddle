// The page a new visitor lands on. It exists to answer one question quickly:
// what does this thing do, and is it for me.

import { useCallback, useEffect, useRef, useState } from "react";
import { Duck, DuckMark } from "./Duck.jsx";
import { activeAnnouncement, publicReviews, latestUpdates } from "./supabase.js";
import { ThemeMark } from "./ThemeMark.jsx";
import { THEMES } from "./themes.js";
import { DuckTalk } from "./Chat.jsx";
import shotNotes from "./assets/shots/desktop-notes.webp";
import shotLesson from "./assets/shots/phone-lesson.webp";

const TESTS = ["SAT", "ACT", "SSAT", "IELTS", "TOEFL", "Your own notes"];

// A visitor counter reading "join 4 people" argues against the product. Below
// this it is left out entirely and the page says something true instead.
const CROWD = 100;

const FAQ = [
  {
    q: "Is it free?",
    a: "Yes, all of it. There is no card, no trial and no account required to try it. An account only exists so your progress follows you between devices.",
  },
  {
    q: "Where do the questions come from?",
    a: "Two places. Some are written for this app by hand. The rest are generated, either from the notes you paste in or from a template filled with fresh numbers, which is why the same paper never comes round twice. No past paper is reproduced.",
  },
  {
    q: "Are you affiliated with the exam boards?",
    a: "No. Dwiddle is independent and is not endorsed by the College Board, ETS, the British Council, Cambridge or anyone else. Practice papers are modelled on the published structure of each exam, which is public information.",
  },
  {
    q: "How accurate is the score it gives me?",
    a: "Treat it as a rough guide. Raw marks are converted using the published scales, but a band or a scaled score from us carries no official standing and should never be presented as a predicted result.",
  },
  {
    q: "What happens to my notes?",
    a: "They are sent to an AI provider to have questions written from them, and stored against your account if you have one. They are never sold or used for advertising. The privacy policy sets out exactly which providers and why.",
  },
  {
    q: "Do I have to be online?",
    a: "Not to revise. Installed, it opens and runs your saved material with no connection. Writing new questions needs one, because that is the part that calls a model.",
  },
];

// Scroll progress, written straight to the element as a CSS variable.
//
// The obvious way is React state, and it is the wrong way: a setState on every
// scroll frame re-renders this whole page, FAQ and tiles and marquee included,
// sixty times a second. Nothing about the markup changes, only a few numbers,
// so those numbers go directly onto the node and React is left out of it.
//
// The value is eased toward the scroll position rather than pinned to it. A
// mouse wheel arrives in coarse jumps, and following those exactly is what
// reads as stutter; chasing them at a fixed fraction per frame turns each jump
// into movement, and keeps the scene animating through a dropped frame.
function useScrollVars(stageRef, paintRef, paint) {
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = stageRef.current;
    const target = paintRef.current;
    if (!el || !target) return;

    if (still) { paint(target, 1); return; }

    let frame = 0;
    let at = null;
    let prev = 0;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const travel = r.height - innerHeight;
      return travel <= 0 ? 1 : Math.max(0, Math.min(1, -r.top / travel));
    };

    // The scene moves at its own pace, and there is a limit on that pace.
    //
    // Following the scroll exactly means a flick of the wheel throws the scene
    // through a third of itself in one frame, and a jump is not an animation
    // however few milliseconds it took. So the scene chases the scroll, and it
    // may not cover more than CAP of itself per frame however far behind it
    // is. Scroll faster than that and the scene simply keeps its own speed and
    // catches up when you stop.
    //
    // Both numbers are per millisecond rather than per frame, or the whole
    // thing would run at double speed on a 120Hz screen.
    const CAP = 0.0013;   // about 2% of the scene per frame at 60Hz
    const EASE = 0.78;    // what fraction of the remaining gap survives a frame

    const tick = (now) => {
      frame = 0;
      const dt = prev ? Math.min(50, now - prev) : 16.7;
      prev = now;

      const want = measure();
      if (at === null) at = want;

      const k = 1 - Math.pow(EASE, dt / 16.7);
      const cap = CAP * dt;
      let step = (want - at) * k;
      if (step > cap) step = cap;
      else if (step < -cap) step = -cap;
      at += step;

      if (Math.abs(want - at) < 0.0006) at = want;
      paint(target, at);
      if (at !== want) frame = requestAnimationFrame(tick);
    };

    const onScroll = () => { if (!frame) frame = requestAnimationFrame(tick); };

    tick(performance.now());
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [stageRef, paintRef, paint]);
}

// True once the element has been on screen. Used for the things that should
// arrive when you reach them rather than be waiting there already.
function useSeen(ref, threshold = 0.2) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setSeen(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      setSeen(true);
      io.disconnect();
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return seen;
}

// Leans the element toward the pointer by writing two numbers onto it. Nothing
// re-renders, so this is safe to leave on large panels.
function leanTo(el, e) {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--tx", ((e.clientX - r.left) / r.width - 0.5) * 2);
  el.style.setProperty("--ty", ((e.clientY - r.top) / r.height - 0.5) * 2);
}

function leanOff(el) {
  if (!el) return;
  el.style.setProperty("--tx", 0);
  el.style.setProperty("--ty", 0);
}

// A scene you scroll through rather than past.
//
// The section is several screens tall and the stage is pinned to the viewport
// while you move through it, so the scroll drives the sequence instead of
// merely passing it. Each card owns a share of that range: it rises from the
// depth, holds, and then settles back to make room for the next.
const DECK = [
  { k: "Your notes", t: "Paste a chapter, drop a PDF, or photograph the page. It reads Word and PowerPoint too.", tag: "In" },
  { k: "Its questions", t: "Written from what you gave it, with the reasoning for every answer and the trap in the wrong ones.", tag: "Then" },
  { k: "The real paper", t: "Full length, timed, marked, and converted to the exam's own scale with feedback on what to fix.", tag: "Out" },
];

function Deck() {
  const stage = useRef(null);
  const sticky = useRef(null);

  // One function, run inside the animation frame, that touches nothing but a
  // few custom properties and one class. No React work happens while you
  // scroll, and nothing here can force a layout.
  const paint = useCallback((el, p) => {
    const at = p * DECK.length;
    el.style.setProperty("--p", p);
    el.style.setProperty("--at", at);
    const active = Math.min(DECK.length - 1, Math.floor(at));
    const cards = el.querySelectorAll(".deck-card");
    for (let i = 0; i < cards.length; i++) {
      cards[i].classList.toggle("front", i === active);
    }
    const pips = el.querySelectorAll(".rail-pip");
    for (let i = 0; i < pips.length; i++) {
      pips[i].classList.toggle("on", i <= active);
    }
  }, []);

  useScrollVars(stage, sticky, paint);

  return (
    <section className="deck-stage" ref={stage} id="how">
      <div
        className="deck-sticky"
        ref={sticky}
        onPointerMove={(e) => leanTo(sticky.current, e)}
        onPointerLeave={() => leanOff(sticky.current)}
      >
        <div className="deck-bg" aria-hidden="true">
          <span className="deck-glow" />
          <span className="deck-grid" />
          <span className="deck-beam" />
        </div>

        <header className="deck-head">
          <h2>How it works</h2>
          <p>Three steps, and the middle one is the part nobody else does properly.</p>
        </header>

        <div className="deck">
          {DECK.map((c, i) => (
            <article className="deck-card" key={c.k} style={{ "--i": i }}>
              <div className="deck-face">
                <span className="deck-tag">{c.tag}</span>
                <span className="deck-step">{i + 1}</span>
                <b>{c.k}</b>
                <p>{c.t}</p>
              </div>
              <span className="deck-shine" aria-hidden="true" />
            </article>
          ))}
        </div>

        <div className="deck-rail" aria-hidden="true">
          {DECK.map((c) => <span key={c.k} className="rail-pip" />)}
        </div>
      </div>
    </section>
  );
}

// A second pinned scene: one question being built, in the order it happens.
// The deck above says what the app does; this shows it, which is a different
// job and worth its own screens.
//
// The three cards share one box and are stacked in depth rather than laid out
// down the page. That is deliberate: a column of cards grows with its content
// and will eventually push the heading out of a pinned viewport, whereas a
// stack is the same height whatever is in it.
const BUILD = [
  { tag: "Read", note: "Your paragraph goes in as it is." },
  { tag: "Find", note: "The idea worth testing is picked out." },
  { tag: "Write", note: "A question, four options, and the reasoning." },
];

function Build() {
  const stage = useRef(null);
  const sticky = useRef(null);

  const paint = useCallback((el, p) => {
    const at = p * BUILD.length;
    el.style.setProperty("--p", p);
    el.style.setProperty("--at", at);
    // The highlight sweeps across the phrases as the second step arrives,
    // which is the moment the app is deciding what is worth asking about.
    el.style.setProperty("--lit", Math.max(0, Math.min(1, (at - 0.72) * 1.7)));
    const step = Math.min(BUILD.length - 1, Math.floor(at));
    const steps = el.querySelectorAll(".bd-step");
    for (let i = 0; i < steps.length; i++) {
      steps[i].classList.toggle("on", i <= step);
      steps[i].classList.toggle("now", i === step);
    }
  }, []);

  useScrollVars(stage, sticky, paint);

  return (
    <section className="bd-stage" ref={stage}>
      <div
        className="bd-sticky"
        ref={sticky}
        onPointerMove={(e) => leanTo(sticky.current, e)}
        onPointerLeave={() => leanOff(sticky.current)}
      >
        <span className="bd-halo" aria-hidden="true" />

        <header className="bd-head">
          <h2>One question, being written</h2>
          <p>Scroll to watch a paragraph of notes turn into something you can be asked.</p>
        </header>

        <div className="bd-panel">
          <article className="bd-layer bd-notes" style={{ "--i": 0 }}>
            <span className="bd-label">Your notes</span>
            <p>
              Active transport moves substances <mark className="bd-mark">against the
              concentration gradient</mark> and therefore requires energy from{" "}
              <mark className="bd-mark">ATP</mark>. It uses carrier proteins in the membrane.
            </p>
          </article>

          <article className="bd-layer bd-found" style={{ "--i": 1 }}>
            <span className="bd-label">What it is testing</span>
            <div className="bd-chips">
              <span style={{ "--i": 0 }}>Direction of movement</span>
              <span style={{ "--i": 1 }}>Energy requirement</span>
              <span style={{ "--i": 2 }}>Carrier proteins</span>
            </div>
            <p className="bd-aside">
              Three testable ideas in one sentence. The first is the one with a wrong
              answer worth writing.
            </p>
          </article>

          <article className="bd-layer bd-question" style={{ "--i": 2 }}>
            <span className="bd-label">The question</span>
            <b>Which process moves molecules against their concentration gradient?</b>
            <ul>
              <li><i>A</i> Simple diffusion</li>
              <li><i>B</i> Osmosis</li>
              <li className="right"><i>C</i> Active transport</li>
              <li><i>D</i> Facilitated diffusion</li>
            </ul>
            <p className="bd-why">
              <b>Why.</b> Active transport spends ATP to push molecules from low to high
              concentration. The other three are passive and only go down the gradient.
            </p>
          </article>
        </div>

        <div className="bd-rail" aria-hidden="true">
          {BUILD.map((b, i) => (
            <span className="bd-step" key={b.tag}>
              <i>{i + 1}</i>
              <em>{b.tag}</em>
              <small>{b.note}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// A tile that leans toward the pointer and counts itself up the first time it
// is seen. The lean is the whole point: a flat panel that only changes colour
// on hover reads as a link, not as an object.
function Tile({ value, label, note, i }) {
  const ref = useRef(null);
  const seen = useSeen(ref, 0.35);
  const [shown, setShown] = useState(0);
  const target = Number(String(value).replace(/[^0-9]/g, ""));
  const numeric = Number.isFinite(target) && target > 0 && /^[0-9,]+$/.test(String(value));

  useEffect(() => {
    if (!numeric || !seen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(target); return; }
    const start = performance.now();
    let frame = requestAnimationFrame(function run(now) {
      // Eased so it slows into the real figure instead of stopping dead.
      const t = Math.min(1, (now - start) / 900);
      setShown(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(run);
    });
    return () => cancelAnimationFrame(frame);
  }, [numeric, target, seen]);

  return (
    <div
      ref={ref}
      className={"num" + (seen ? " seen" : "")}
      style={{ "--i": i }}
      onPointerMove={(e) => { ref.current?.classList.add("lifted"); leanTo(ref.current, e); }}
      onPointerLeave={() => { ref.current?.classList.remove("lifted"); leanOff(ref.current); }}
    >
      <span className="num-sheen" aria-hidden="true" />
      <div className="num-v">{numeric ? shown.toLocaleString() : value}</div>
      <div className="num-k">{label}</div>
      <p className="num-note">{note}</p>
    </div>
  );
}

// Two things worth drawing rather than listing. Both are counted off the data
// the app ships with, and both add up to a figure stated in the tiles above,
// so a wrong number here would contradict the page rather than hide in it.
const SERIES = [
  {
    id: "topics",
    tab: "Topics per board",
    unit: "syllabus topics",
    note: "Every topic on the specification, taken from the board's own syllabus.",
    bars: [["Cambridge IGCSE", 64], ["Edexcel IGCSE", 46], ["IB Diploma", 45], ["A Levels", 70]],
  },
  {
    id: "sections",
    tab: "Sections per exam",
    unit: "sections",
    note: "The parts of each paper you can sit here, timed and marked to its own scale.",
    bars: [["SAT", 2], ["ACT", 5], ["SSAT", 4], ["IELTS", 4], ["TOEFL", 4]],
  },
];

function Chart() {
  const box = useRef(null);
  const seen = useSeen(box, 0.3);
  const [tab, setTab] = useState(0);
  const [hot, setHot] = useState(-1);
  const s = SERIES[tab];
  const top = Math.max(...s.bars.map((b) => b[1]));
  const total = s.bars.reduce((a, b) => a + b[1], 0);

  return (
    <div
      className={"lchart" + (seen ? " seen" : "")}
      ref={box}
      onPointerLeave={() => setHot(-1)}
    >
      <div className="lchart-head">
        <div className="lchart-title">
          <b>{s.tab}</b>
          <p>{s.note}</p>
        </div>
        <div className="lchart-tabs" role="tablist">
          {SERIES.map((x, i) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={i === tab}
              className={i === tab ? "on" : ""}
              onClick={() => { setTab(i); setHot(-1); }}
            >
              {x.tab}
            </button>
          ))}
        </div>
      </div>

      <div className="lchart-plot">
        <span className="lchart-floor" aria-hidden="true" />
        {s.bars.map(([k, v], i) => (
          <div
            className={"cbar" + (hot === i ? " hot" : "") + (hot > -1 && hot !== i ? " cold" : "")}
            key={s.id + k}
            style={{ "--h": seen ? v / top : 0, "--i": i }}
            onPointerEnter={() => setHot(i)}
            onFocus={() => setHot(i)}
            onBlur={() => setHot(-1)}
            tabIndex={0}
          >
            <span className="cbar-v">{v}</span>
            <span className="cbar-stack">
              <span className="cbar-box">
                <span className="cbar-top" />
                <span className="cbar-side" />
              </span>
            </span>
            <span className="cbar-k">{k}</span>
          </div>
        ))}
      </div>

      <p className="lchart-foot">
        <span><b>{total}</b> {s.unit} in total.</span>
        <span className="lchart-read">
          {hot > -1 ? `${s.bars[hot][0]}: ${s.bars[hot][1]}` : "Point at a column."}
        </span>
      </p>
    </div>
  );
}

function Faq() {
  const list = useRef(null);
  const seen = useSeen(list, 0.15);
  return (
    <div className={"faq-list" + (seen ? " seen" : "")} ref={list}>
      {FAQ.map((f, i) => (
        <details className="faq-item" key={f.q} style={{ "--i": i }}>
          <summary>
            <span className="faq-q">{f.q}</span>
            <span className="faq-mark" aria-hidden="true"><i /><i /></span>
          </summary>
          <div className="faq-answer"><div><p>{f.a}</p></div></div>
        </details>
      ))}
    </div>
  );
}


// Everything Dwiddle does, each shown rather than described: real screenshots
// where there are any, and small working pictures of the rest.
function Features() {
  const grid = useRef(null);
  const seen = useSeen(grid, 0.08);
  const kinds = ["Multiple choice", "Fill in the blank", "Complete the word", "True or false", "Match them up", "Put in order", "In your own words"];
  return (
    <section className="feat" id="features">
      <h2>Everything you need to study</h2>
      <p className="lp-lead">One place for the notes, the teaching, the practice and the help, made from your own material.</p>
      <div className={"feat-grid" + (seen ? " seen" : "")} ref={grid}>
        <article className="fc fc-wide" style={{ "--i": 0 }}>
          <div className="fc-copy">
            <span className="fc-tag">Notes</span>
            <h3>Full notes, not a summary</h3>
            <p>Every definition, figure, date and example in your material, reorganised under the topics it belongs to. Nothing is condensed away, so the notes are as complete as the chapter they came from.</p>
            <ul className="fc-list"><li>Definitions to learn word for word, highlighted</li><li>Key facts and figures picked out in colour</li><li>Common mistakes and exam traps flagged</li><li>Print them, or read them anywhere</li></ul>
          </div>
          <div className="fc-shot"><img src={shotNotes} alt="Dwiddle's notes, organised by topic with highlights" loading="lazy" /></div>
        </article>

        <article className="fc fc-tall" style={{ "--i": 1 }}>
          <div className="fc-copy">
            <span className="fc-tag">Learn</span>
            <h3>Lessons that actually teach</h3>
            <p>Each topic becomes a short lesson that teaches one idea at a time, the way a good teacher would explain it out loud, then checks it went in before moving on.</p>
            <ul className="fc-list"><li>Plain words first, the technical term second</li><li>A real example on most cards</li><li>5 or 6 varied questions at the end</li><li>Read aloud with Listen</li></ul>
          </div>
          <div className="fc-phone"><img src={shotLesson} alt="A Dwiddle lesson on a phone" loading="lazy" /></div>
        </article>

        <article className="fc" style={{ "--i": 2 }}>
          <span className="fc-tag">Practice</span>
          <h3>Seven ways to be tested</h3>
          <p>Picking an answer out of four is not the same as knowing it. Dwiddle mixes in questions that make you recall, spell, order and explain, which is what exams actually ask.</p>
          <div className="fc-chips">{kinds.map((k, i) => <span key={k} style={{ "--k": i }}>{k}</span>)}</div>
        </article>

        <article className="fc fc-chat" style={{ "--i": 3 }}>
          <span className="fc-tag">Ask Dwiddle</span>
          <h3>Stuck? Just ask</h3>
          <p>A study buddy that can see what is on your screen. Ask it to explain a card again, give another example, quiz you, or check an answer you think the app got wrong.</p>
          <ul className="fc-list"><li>Speak your question or type it</li><li>Replies can be read aloud</li><li>Honest when something was wrong</li></ul>
          <div className="fc-convo">
            <div className="fc-me">why is it the video game and not £20?</div>
            <div className="fc-bot"><DuckTalk mood="talking" size={34} /><span>Because <b>opportunity cost</b> is what you give up, not what you spend.</span></div>
          </div>
        </article>

        <article className="fc" style={{ "--i": 4 }}>
          <span className="fc-tag">Solve</span>
          <h3>Photograph a question</h3>
          <p>Take a photo of the question you are stuck on, or several for a question across pages. Every step is worked through with the reason it is the right move, the idea being tested, and where marks are usually lost.</p>
          <ol className="fc-steps"><li>Write the equation</li><li>Substitute the values</li><li>Rearrange for x</li></ol>
        </article>

        <article className="fc" style={{ "--i": 5 }}>
          <span className="fc-tag">Review</span>
          <h3>Remember it for the exam</h3>
          <p>Spaced repetition brings each question back just before you would forget it: sooner when you got it wrong, further apart as you keep getting it right. Optional, never forced.</p>
          <div className="fc-gaps">{["1 day", "2", "4", "1 week", "2", "1 month"].map((g, i) => <span key={i} style={{ "--k": i }}>{g}</span>)}</div>
        </article>

        <article className="fc fc-wide fc-inputs" style={{ "--i": 6 }}>
          <div className="fc-copy">
            <span className="fc-tag">Any material</span>
            <h3>Start from whatever you have</h3>
            <p>Up to ten files at once, a YouTube lecture, or a recording of a class as it happens. Or nothing at all: type a topic like "IGCSE photosynthesis" and Dwiddle writes the notes first, asking a quick question if it needs to know your level.</p>
          </div>
          <div className="fc-ins">
            {[["PDF", "#e5484d"], ["Slides", "#f59e0b"], ["Word", "#3b82f6"], ["Photos", "#10b981"], ["YouTube", "#ff0033"], ["Record", "#8b5cf6"], ["Just a topic", "#64748b"]].map(([n, c]) => (
              <span key={n}><i style={{ background: c }} />{n}</span>
            ))}
          </div>
        </article>

        <article className="fc" style={{ "--i": 7 }}>
          <span className="fc-tag">Exams</span>
          <h3>Full length test prep</h3>
          <p>Full length, timed SAT, ACT, SSAT, IELTS and TOEFL papers, marked and converted to each test's own score scale, with feedback on what to fix.</p>
          <ul className="fc-list"><li>IGCSE, IB and A Level courses</li><li>Writing marked against the real criteria</li><li>Fresh questions each sitting</li></ul>
        </article>

        <article className="fc fc-themes" style={{ "--i": 8 }}>
          <span className="fc-tag">Make it yours</span>
          <h3>Ten themes, ten ducks</h3>
          <p>Sakura, Cottage, Matcha, Violet, Ocean, Prismarine, Sunset, Autumn and Midnight, each designed in both light and dark, each with its own duck in the corner.</p>
          <div className="fc-ducks">{THEMES.filter((t) => t.id !== "classic").map((t) => <ThemeMark key={t.id} theme={t.id} size={40} />)}</div>
        </article>

        <article className="fc fc-wide" style={{ "--i": 9 }}>
          <div className="fc-copy">
            <span className="fc-tag">Everywhere</span>
            <h3>Mac, Windows and phone</h3>
            <p>Use it in any browser, install it as an app on Mac and Windows that updates itself, or add it to your phone's home screen. Sign in once and your material, streak and progress follow you between them.</p>
          </div>
          <div className="fc-ins">
            {["Web", "Mac app", "Windows app", "iPhone", "Android"].map((n) => <span key={n}><i style={{ background: "var(--accent)" }} />{n}</span>)}
          </div>
        </article>
      </div>
    </section>
  );
}

// Free, set against what studying with most AI apps costs.
function Compare() {
  const rows = [
    ["Price", "$10 or more a month", "Free"],
    ["Uploads", "A few, then pay", "No limit"],
    ["Notes, lessons and quizzes", "Some locked behind Pro", "All included"],
    ["Card to sign up", "Often", "Never"],
  ];
  return (
    <section className="cmp">
      <h2>Free, actually</h2>
      <p className="lp-lead">No trial that turns into a subscription. Sign up and everything is yours.</p>
      <div className="cmp-table">
        <div className="cmp-row cmp-head"><span /><span>Most AI study apps</span><span className="cmp-us"><DuckMark size={20} /> Dwiddle</span></div>
        {rows.map(([k, a, b]) => (
          <div className="cmp-row" key={k}><span>{k}</span><span className="cmp-no">{a}</span><span className="cmp-yes">{b}</span></div>
        ))}
      </div>
    </section>
  );
}

export function Landing({ onSignIn, onSkip, people, onLegal, onInstall }) {
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Nothing renders here until a review has been approved, so the section
  // simply does not exist rather than showing an empty shell.
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    let live = true;
    publicReviews(3).then((r) => live && setReviews(r));
    return () => { live = false; };
  }, []);

  // Written by staff: one announcement at most, and the latest update logs.
  const [news, setNews] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [allUpdates, setAllUpdates] = useState(false);
  useEffect(() => {
    let live = true;
    activeAnnouncement().then((a) => live && setNews(a));
    latestUpdates(60).then((u) => live && setUpdates(u));
    return () => { live = false; };
  }, []);

  return (
    <div className="landing">
      <header className="glassbar">
        <button className="glass-brand" onClick={toTop} aria-label="Back to the top">
          <DuckMark size={22} />
          <span>Dwiddle</span>
        </button>
        <nav className="glass-nav">
          <button onClick={() => jump("features")}>Features</button>
          <button onClick={() => jump("analytics")}>Analytics</button>
          {updates.length > 0 && <button onClick={() => jump("updates")}>What's new</button>}
          <button onClick={() => jump("faq")}>FAQ</button>
          <button onClick={onInstall}>Get the app</button>
        </nav>
        <button className="btn small glass-cta" onClick={onSignIn}>Sign in</button>
      </header>

      {news && (
        <div className="landing-news" role="status">
          <span className="landing-news-tag">News</span>
          <span>{news.message}</span>
          {news.link && /^https?:\/\//.test(news.link) && <a href={news.link} target="_blank" rel="noreferrer">Read more</a>}
        </div>
      )}

      <main className="landing-hero">
        <div className="hero-copy">
          <h1>
            Turn your notes into
            <span className="hero-accent"> the real exam.</span>
          </h1>
          <p className="hero-sub">
            Drop in a PDF, a lecture or just a topic. Dwiddle writes full notes, short lessons and
            questions with every answer explained, and helps whenever you are stuck.
          </p>

          <div className="hero-actions">
            <button className="btn hero-cta" onClick={onSignIn}>
              Start for free <Arrow />
            </button>
            <button className="btn hero-skip" onClick={onSkip}>
              Continue without an account
            </button>
          </div>

          <p className="hero-note">
            {people !== null && people >= CROWD
              ? `Join ${people.toLocaleString()} people studying with Dwiddle`
              : "Free to use. No card, no password."}
          </p>
        </div>

        <div className="hero-art" aria-hidden="true">
          <Duck size={78} className="hero-duck" shadow={false} />
          <div className="preview">
            <div className="preview-head">
              <span className="preview-dot" />
              <span className="small muted">Cell Biology, your notes</span>
              <span className="preview-clock">32:00</span>
            </div>

            <div className="preview-q">Which process moves molecules against their concentration gradient?</div>

            <div className="preview-opt"><span>A</span> Simple diffusion</div>
            <div className="preview-opt right"><span>B</span> Active transport</div>
            <div className="preview-opt"><span>C</span> Osmosis</div>

            <div className="preview-why">
              <b>Correct.</b> Active transport spends ATP to push molecules from low to high
              concentration. The other three are all passive.
            </div>
          </div>
        </div>
      </main>

      {reviews.length > 0 && (
        <section className="landing-reviews">
          <div className="marquee-label">What people say</div>
          <div className="reviews">
            {reviews.map((r) => (
              <figure className="review-card" key={r.id}>
                {r.rating ? (
                  <div className="review-stars" aria-label={`${r.rating} out of 5`}>
                    {"★".repeat(r.rating)}
                    <span style={{ color: "var(--line)" }}>{"★".repeat(5 - r.rating)}</span>
                  </div>
                ) : null}
                <p>{r.message}</p>
                {r.name && (
                  <figcaption className="review-by">
                    <ReviewAvatar name={r.name} src={r.avatar} />
                    <span>{r.name}</span>
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      <Features />

      <Deck />

      <Build />

      <Compare />

      {updates.length > 0 && (
        <section className="landing-updates" id="updates">
          <div className="marquee-label">What's new</div>
          <div className="updates-list">
            {(allUpdates ? updates : updates.slice(0, 3)).map((u) => (
              <article className="update-card" key={u.id}>
                <div className="update-meta">
                  {u.version && <span className="update-ver">{u.version}</span>}
                  <span>{new Date(u.published_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
                <h3>{u.title}</h3>
                <UpdateBody text={u.body} />
              </article>
            ))}
          </div>
          {updates.length > 3 && (
            <button className="btn ghost updates-more" onClick={() => setAllUpdates((v) => !v)}>
              {allUpdates ? "Show fewer" : `Show all ${updates.length} updates`}
            </button>
          )}
        </section>
      )}

      <section className="landing-numbers" id="analytics">
        <h2>Analytics</h2>
        <p className="lp-lead">
          Counted from the app itself, live, and not rounded up for the page.
        </p>

        <Chart />

        <div className="num-grid">
          {[
            ...(people !== null && people >= CROWD
              ? [[people.toLocaleString(), "people studying", "Live from the database."]]
              : [["40", "reading passages", "Full length, written for the app, not extracts."]]),
            ["5", "exams", "SAT, ACT, SSAT, IELTS and TOEFL, across 19 sections."],
            ["213", "written questions", "Authored for this app, not scraped from a past paper."],
            ["225", "syllabus topics", "Across 18 subjects and four exam boards."],
            ["6", "question generators", "Fresh numbers each sitting, so no two papers match."],
            ["∞", "from your own notes", "Paste anything and it writes questions about it."],
          ].map(([n, label, note], i) => (
            <Tile key={label} value={n} label={label} note={note} i={i} />
          ))}
        </div>
      </section>

      <section className="landing-faq" id="faq">
        <h2>Questions people ask</h2>
        <Faq />
      </section>

      <section className="marquee-wrap">
        <div className="marquee-label">Full length practice for</div>
        <div className="marquee">
          {/* Two identical runs, so the loop has no visible seam. */}
          {[0, 1].map((run) => (
            <div className="marquee-run" key={run}>
              {TESTS.map((t) => (
                <span className="marquee-item" key={t}>{t}</span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-foot">
        <span>&copy; {new Date().getFullYear()} Dwiddle</span>
        <button className="linkish" onClick={() => onLegal("privacy")}>Privacy</button>
        <button className="linkish" onClick={() => onLegal("terms")}>Terms</button>
        <button className="linkish" onClick={onInstall}>Get the app</button>
        <a className="linkish" href="mailto:dwiddle36@gmail.com">Contact</a>
        <span>Not affiliated with any exam board.</span>
      </footer>
    </div>
  );
}

// The reviewer's Google picture, or their first letter when there is none
// or it fails to load.
function ReviewAvatar({ name, src }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken && /^https:\/\//.test(src)) {
    return <img className="review-avatar" src={src} alt="" width={28} height={28} referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  }
  return <span className="review-avatar" aria-hidden="true">{String(name).trim().charAt(0).toUpperCase()}</span>;
}

// An update log: lines starting with "- " become a list, anything else a line of text.
function UpdateBody({ text }) {
  const lines = String(text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const items = lines.filter((l) => /^[-•*]\s+/.test(l));
  if (!items.length) return <p>{text}</p>;
  return (
    <>
      {lines.filter((l) => !/^[-•*]\s+/.test(l)).map((l, i) => <p key={i}>{l}</p>)}
      <ul>{items.map((l, i) => <li key={i}>{l.replace(/^[-•*]\s+/, "")}</li>)}</ul>
    </>
  );
}

function Arrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}
