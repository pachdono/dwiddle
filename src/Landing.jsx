// The page a new visitor lands on. It exists to answer one question quickly:
// what does this thing do, and is it for me.

import { useEffect, useState } from "react";
import { Duck, DuckMark } from "./Duck.jsx";
import { approvedReviews } from "./supabase.js";

const TESTS = ["SAT", "ACT", "SSAT", "IELTS", "TOEFL", "Your own notes"];

export function Landing({ onSignIn, onSkip, people, onLegal }) {
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
      <header className="landing-top">
        <div className="landing-brand">
          <DuckMark size={26} />
          Dwiddle
        </div>
        <button className="btn ghost" onClick={onSignIn}>Sign in</button>
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
            {people !== null && people > 0
              ? `Join ${people.toLocaleString()} ${people === 1 ? "person" : "people"} studying with Dwiddle`
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
