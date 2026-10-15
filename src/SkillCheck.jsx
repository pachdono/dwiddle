import { useEffect, useMemo, useState } from "react";
import { Icon, Portal } from "./ui.jsx";
import { M } from "./MathText.jsx";
import { load, save } from "./store.js";
import { skillCheck } from "./ai.js";
import { scoreSkillCheck, usableCheck, keepCheck, CHECKS_KEY, SKILL_LEVEL } from "./skillcheck.js";

// A skill check: one topic, tested skill by skill. The writer decides how many
// questions it takes to cover every skill, so the length is whatever comes
// back. Nothing is marked until the end, like an exam, then the result shows
// each skill on its own and a predicted grade for the topic.

const tone = (p) => (p == null ? "" : p >= 80 ? "good" : p >= 60 ? "mid" : "low");

export default function SkillCheck({ topic, made, grade, onClose, onPractise }) {
  const [phase, setPhase] = useState("loading"); // loading | quiz | result | error
  const [test, setTest] = useState(null);
  const [err, setErr] = useState("");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const [round, setRound] = useState(0);

  useEffect(() => {
    let live = true;
    setPhase("loading"); setErr(""); setI(0); setAnswers({});
    skillCheck(made, topic)
      .then((d) => {
        if (!live) return;
        const t = usableCheck(d);
        if (!t) { setErr("The skill check did not come back complete. Try again."); setPhase("error"); return; }
        setTest(t); setPhase("quiz");
      })
      .catch((e) => { if (live) { setErr(e?.message || "Could not make the skill check."); setPhase("error"); } });
    return () => { live = false; };
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { const k = (e) => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);

  const result = useMemo(() => (phase === "result" ? scoreSkillCheck(test.skills, test.questions, answers) : null), [phase, test, answers]);

  function pick(n) {
    const q = test.questions[i];
    if (answers[q.id] != null) return;
    setAnswers((a) => ({ ...a, [q.id]: n }));
    grade?.(q.id, n === q.answer, topic, "mc"); // so the report, streak and review all see it
  }
  function next() {
    if (i + 1 < test.questions.length) { setI(i + 1); return; }
    const r = scoreSkillCheck(test.skills, test.questions, answers);
    save(CHECKS_KEY, keepCheck(load(CHECKS_KEY, []), r, topic));
    try { dispatchEvent(new Event("dwiddle:skillcheck")); } catch { /* not in a browser */ }
    setPhase("result");
  }

  const q = phase === "quiz" ? test.questions[i] : null;
  const chosen = q ? answers[q.id] : null;

  return (
    <Portal>
      <div className="sk-scrim" role="dialog" aria-label={`Skill check: ${topic}`}>
        <div className="sk">
          <div className="sk-top">
            <div><span className="sk-kicker">Skill check</span><b>{topic}</b></div>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
          </div>

          {phase === "loading" && (
            <div className="sk-center">
              <div className="sk-spin" aria-hidden="true" />
              <b>Working out the skills in {topic}</b>
              <span className="small muted">Dwiddle decides how many questions it takes to cover every one. This can take up to a minute.</span>
            </div>
          )}

          {phase === "error" && (
            <div className="sk-center">
              <b>That did not work</b>
              <span className="small muted">{err}</span>
              <div className="row" style={{ gap: 8 }}><button className="btn cta" onClick={() => setRound((n) => n + 1)}>Try again</button><button className="btn ghost" onClick={onClose}>Close</button></div>
            </div>
          )}

          {phase === "quiz" && q && (
            <div className="sk-body">
              <div className="sk-prog" aria-label={`Question ${i + 1} of ${test.questions.length}`}>
                <span className="rp-track"><i style={{ width: `${(i / test.questions.length) * 100}%` }} /></span>
                <small>Question {i + 1} of {test.questions.length} · covers {test.skills.length} skills</small>
              </div>
              <h2 className="sk-q"><M t={q.q} /></h2>
              <div className="sk-choices">
                {q.choices.map((c, n) => (
                  <button key={n} className={"sk-choice" + (chosen === n ? " on" : "")} disabled={chosen != null} onClick={() => pick(n)}>
                    <span className="sk-key">{"ABCD"[n]}</span><M t={c} />
                  </button>
                ))}
              </div>
              <div className="sk-foot">
                <span className="small muted">{chosen == null ? "Pick an answer. You see how you did at the end." : "Locked in."}</span>
                <button className="btn cta" disabled={chosen == null} onClick={next}>{i + 1 < test.questions.length ? "Next" : "See my result"}</button>
              </div>
            </div>
          )}

          {phase === "result" && result && (
            <div className="sk-body sk-result">
              <div className="sk-hero">
                <div className="sk-grade"><span>Predicted grade for this topic</span><b>{result.grade}</b>
                  <small>{result.gradeLo === result.gradeHi ? result.gradeLo : `${result.gradeLo} to ${result.gradeHi}`} possible, from {result.total} questions</small></div>
                <div className="sk-score"><b>{result.right}<small>/{result.total}</small></b><span>questions right</span></div>
              </div>
              <h3>Skill by skill</h3>
              <div className="sk-skills">
                {result.rows.map((r) => (
                  <div key={r.name} className="sk-skill">
                    <span className="sk-skill-name">{r.name}</span>
                    <span className="rp-track"><i className={tone(r.pct)} style={{ width: `${r.pct}%` }} /></span>
                    <b className="sk-pct">{r.pct}%</b>
                    <span className={"rp-badge " + (r.level === "strong" ? "good" : r.level === "secure" ? "mid" : "low")}>{SKILL_LEVEL[r.level]}</span>
                    <small className="muted">{r.right} of {r.total}</small>
                  </div>
                ))}
              </div>
              {result.weakest.length > 0
                ? <p className="sk-next"><b>Work on these first:</b> {result.weakest.map((r) => r.name).join(", ")}.</p>
                : <p className="sk-next"><b>Every skill is strong.</b> Keep it fresh with a little practice each week.</p>}
              {test.questions.some((x) => answers[x.id] !== x.answer) && (
                <details className="sk-review">
                  <summary>Review the ones you missed</summary>
                  {test.questions.filter((x) => answers[x.id] !== x.answer).map((x) => (
                    <div key={x.id} className="sk-miss">
                      <small className="muted">{x.skill}</small>
                      <p><M t={x.q} /></p>
                      <p className="small"><b>Your answer:</b> {answers[x.id] == null ? "none" : <M t={x.choices[answers[x.id]]} />}</p>
                      <p className="small"><b>Right answer:</b> <M t={x.choices[x.answer]} /></p>
                      {x.why && <p className="small muted"><M t={x.why} /></p>}
                    </div>
                  ))}
                </details>
              )}
              <p className="small muted">A rough guide worked out from this one check, with every skill counted equally. A short check says less than a long one, which is why it gives a range.</p>
              <div className="sk-foot">
                <button className="btn ghost" onClick={() => setRound((n) => n + 1)}>Check again</button>
                <button className="btn cta" onClick={() => onPractise(topic)}>Practise {topic}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
