// The page a new visitor lands on. It exists to answer one question quickly:
// what does this thing do, and is it for me.

import { useEffect, useState } from "react";
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
          <button onClick={() => jump("numbers")}>Numbers</button>
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

      <section className="landing-numbers" id="numbers">
        <h2>What is actually in it</h2>
        <p className="lp-lead">
          Counted from the app itself, not rounded up for the page.
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
            <div className="num" key={label}>
              <div className="num-v">{n}</div>
              <div className="num-k">{label}</div>
              <p className="num-note">{note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-faq" id="faq">
        <h2>Questions people ask</h2>
        <div className="faq-list">
          {FAQ.map((f) => (
            <details className="faq-item" key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
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
