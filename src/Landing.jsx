// The page a new visitor lands on. It exists to answer one question quickly:
// what does this thing do, and is it for me.

import { useEffect, useRef, useState } from "react";
import { Duck, DuckMark } from "./Duck.jsx";
import { approvedReviews } from "./supabase.js";

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

// A scene you scroll through rather than past.
//
// The section is three screens tall and the stage is pinned to the viewport
// while you move through it, so the scroll drives the sequence instead of
// merely passing it. Each card owns a third of that range: it rises from the
// depth, holds, and then settles back to make room for the next.
function useScrollRange(ref) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setP(1); return; }
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const travel = r.height - innerHeight;
      setP(travel <= 0 ? 1 : Math.max(0, Math.min(1, -r.top / travel)));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
  return p;
}

const DECK = [
  { k: "Your notes", t: "Paste a chapter, drop a PDF, or photograph the page. It reads Word and PowerPoint too.", tag: "In" },
  { k: "Its questions", t: "Written from what you gave it, with the reasoning for every answer and the trap in the wrong ones.", tag: "Then" },
  { k: "The real paper", t: "Full length, timed, marked, and converted to the exam's own scale with feedback on what to fix.", tag: "Out" },
];

// A tile that leans toward the pointer and counts itself up the first time it
// is seen. The lean is the whole point: a flat panel that only changes colour
// on hover reads as a link, not as an object.
function Tile({ value, label, note }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState(null);
  const [shown, setShown] = useState(0);
  const target = Number(String(value).replace(/[^0-9]/g, ""));
  const numeric = Number.isFinite(target) && target > 0 && /^[0-9,]+$/.test(String(value));

  useEffect(() => {
    if (!numeric) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(target); return; }

    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const run = (now) => {
        // Eased so it slows into the real figure instead of stopping dead.
        const t = Math.min(1, (now - start) / 900);
        setShown(Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => io.disconnect();
  }, [numeric, target]);

  function onMove(e) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - r.left) / r.width - 0.5) * 2,
      y: ((e.clientY - r.top) / r.height - 0.5) * 2,
    });
  }

  return (
    <div
      ref={ref}
      className={"num" + (tilt ? " lifted" : "")}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt(null)}
      style={tilt ? { "--tx": tilt.x, "--ty": tilt.y } : undefined}
    >
      <span className="num-sheen" aria-hidden="true" />
      <div className="num-v">{numeric ? shown.toLocaleString() : value}</div>
      <div className="num-k">{label}</div>
      <p className="num-note">{note}</p>
    </div>
  );
}

function Deck() {
  const ref = useRef(null);
  const p = useScrollRange(ref);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const still = useRef(false);

  useEffect(() => {
    still.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  function onMove(e) {
    if (still.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - r.left) / r.width - 0.5) * 2,
      y: ((e.clientY - r.top) / r.height - 0.5) * 2,
    });
  }

  // Which card is in front, as a fraction, so the rail can move continuously
  // rather than snapping between three states.
  const at = p * DECK.length;
  const active = Math.min(DECK.length - 1, Math.floor(at));

  return (
    <section className="deck-stage" ref={ref} id="how">
      <div
        className="deck-sticky"
        onPointerMove={onMove}
        onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        style={{ "--p": p, "--tx": tilt.x, "--ty": tilt.y, "--at": at }}
      >
        <div className="deck-bg" aria-hidden="true">
          <span className="deck-glow" />
          <span className="deck-grid" />
        </div>

        <header className="deck-head">
          <h2>How it works</h2>
          <p>Three steps, and the middle one is the part nobody else does properly.</p>
        </header>

        <div className="deck">
          {DECK.map((c, i) => (
            <article
              className={"deck-card" + (active === i ? " front" : "")}
              key={c.k}
              style={{ "--i": i }}
            >
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
          {DECK.map((c, i) => (
            <span key={c.k} className={"rail-pip" + (active >= i ? " on" : "")} />
          ))}
          <span className="rail-fill" />
        </div>
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
    approvedReviews(3).then((r) => live && setReviews(r));
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
          <button onClick={() => jump("analytics")}>Analytics</button>
          <button onClick={() => jump("faq")}>FAQ</button>
          <button onClick={onInstall}>Get the app</button>
        </nav>
        <button className="btn small glass-cta" onClick={onSignIn}>Sign in</button>
      </header>

      <main className="landing-hero">
        <div className="hero-copy">
          <h1>
            Turn your notes into
            <span className="hero-accent"> the real exam.</span>
          </h1>
          <p className="hero-sub">
            Paste your notes or drop in a PDF. Dwiddle writes the topics, the questions and an
            explanation for every answer, then puts you through full length timed papers.
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
                    {"\u2605".repeat(r.rating)}
                    <span style={{ color: "var(--line)" }}>{"\u2605".repeat(5 - r.rating)}</span>
                  </div>
                ) : null}
                <p>{r.message}</p>
              </figure>
            ))}
          </div>
        </section>
      )}

      <Deck />

      <section className="landing-numbers" id="analytics">
        <h2>Analytics</h2>
        <p className="lp-lead">
          Counted from the app itself, live, and not rounded up for the page.
        </p>
        <div className="num-grid">
          {[
            ...(people !== null && people >= CROWD
              ? [[people.toLocaleString(), "people studying", "Live from the database."]]
              : [["40", "reading passages", "Full length, written for the app, not extracts."]]),
            ["5", "exams", "SAT, ACT, SSAT, IELTS and TOEFL, across 19 sections."],
            ["213", "written questions", "Authored for this app, not scraped from a past paper."],
            ["225", "syllabus topics", "Across 18 subjects and four exam boards."],
            ["6", "question generators", "Fresh numbers each sitting, so no two papers match."],
            ["\u221e", "from your own notes", "Paste anything and it writes questions about it."],
          ].map(([n, label, note]) => (
            <Tile key={label} value={n} label={label} note={note} />
          ))}
        </div>
      </section>

      <section className="landing-faq" id="faq">
        <h2>Questions people ask</h2>
        <div className="faq-list">
          {FAQ.map((f) => (
            <details className="faq-item" key={f.q}>
              <summary>{f.q}</summary>
              <div className="faq-answer"><div><p>{f.a}</p></div></div>
            </details>
          ))}
        </div>
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

function Arrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}
