import { useEffect, useState } from "react";
import { Icon } from "./ui.jsx";

// A guided walk through the whole app. Each step opens the page it is about
// and says, in a card at the bottom of the screen, what it is for. Next moves
// to the next page, so someone can be shown everything without hunting for it.
// It remembers where it was, so a reload does not lose the place.

const KEY = "dwiddle-guide";

export const STEPS = [
  { page: "upload", title: "Add your material", text: "Everything starts here. Paste notes, upload a PDF, slides or a photo, paste a YouTube link, or just type a topic. Dwiddle turns it into notes, lessons and questions.", where: "New material, top of the left menu" },
  { page: "library", title: "Your folders", text: "Each thing you add becomes a folder. Open one to study it. You can rename a folder, delete it, or share it from Explore.", where: "Library" },
  { page: "sheet", title: "Notes", text: "The notes written from your material. Tap a highlighted word to see just that kind of highlight, and use the tabs at the top to move between the study pages.", where: "Inside a folder: the icons down the left", needs: "Open a folder first." },
  { page: "learn", title: "Learn", text: "Short lessons, one topic at a time, with a quick check after each part. Finish a topic and the next one opens.", where: "Inside a folder, Learn" },
  { page: "quiz", title: "Practice", text: "Six ways to practise. Quiz mixes picked answers, typed answers, true or false and matching, and gets harder on topics you know. Review brings questions back just before you would forget them. Flashcards are terms and how-to steps. Mock exam, Speed round and Missed complete the set.", where: "Inside a folder, Practice" },
  { page: "topics", title: "Topics and videos", text: "Topics lists what your material covers, and lets you remove ones you do not need. Videos makes a short explainer video on any topic, and the podcast on the Practice page reads your notes aloud.", where: "Inside a folder, Topics and Videos" },
  { page: "chat", title: "Ask Dwiddle", text: "Ask anything, in the chat or from the Ask Dwiddle button on any page. It can explain, change your notes, draw a diagram, make a picture, or start new material for you.", where: "Chat, and the Ask Dwiddle button" },
  { page: "notebook", title: "Notebooks", text: "A notebook for handwriting and drawing, with pens, highlighters, shapes and graphs. It stays separate from your folders.", where: "Notebooks" },
  { beta: true, page: "report", title: "Your report", text: "How you are doing: accuracy on each topic and each kind of question, your last two weeks, and the hours you do best. It ends with what to do next.", where: "Progress, Report" },
  { beta: true, page: "planner", title: "Study planner", text: "Say when you are free and how you like to study, and it plans your week with the weak topics first. Add the sessions to Google Calendar, or load your calendar file so it keeps clear of what is already booked.", where: "Progress, Planner" },
  { page: "social", title: "Friends, Duel and the leaderboard", text: "Add friends by username, message them, and race them on the same questions in Duel. The leaderboard shows everyone overall and your friends this month.", where: "Friends, and the top bar" },
  { page: "tests", title: "Exams", text: "Sit full test papers and work through courses, with a mark and feedback at the end.", where: "Exams" },
  { page: "settings", title: "Settings", text: "Your account, how you are called, the Layout (Classic, or the plainer New one), themes, notifications and this guide. The gear at the bottom of the left menu opens it.", where: "The gear, bottom left" },
];

const read = () => { try { const v = sessionStorage.getItem(KEY); return v == null ? -1 : Number(v); } catch { return -1; } };
const write = (n) => { try { n < 0 ? sessionStorage.removeItem(KEY) : sessionStorage.setItem(KEY, String(n)); } catch { /* fine */ } };

export const startGuide = () => dispatchEvent(new CustomEvent("dwiddle:guide", { detail: { at: 0 } }));

export function GuideHost({ go, beta = false }) {
  const steps = beta ? STEPS : STEPS.filter((x) => !x.beta);
  const [at, setAt] = useState(read);
  useEffect(() => {
    const on = (e) => { const n = e.detail?.at ?? 0; write(n); setAt(n); show(n); };
    addEventListener("dwiddle:guide", on);
    return () => removeEventListener("dwiddle:guide", on);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function show(n) {
    const s = steps[n];
    if (!s) return;
    go(s.page);
  }
  function jump(n) {
    if (n < 0 || n >= steps.length) { write(-1); setAt(-1); return; }
    write(n); setAt(n); show(n);
  }
  if (at < 0 || !steps[at]) return null;
  const s = steps[at];
  return (
    <aside className="guide" role="dialog" aria-label="Guide">
      <div className="guide-top">
        <span className="guide-count">{at + 1} of {steps.length}</span>
        <select value={at} onChange={(e) => jump(Number(e.target.value))} aria-label="Jump to a step">
          {steps.map((x, i) => <option key={i} value={i}>{i + 1}. {x.title}</option>)}
        </select>
        <button className="icon-btn" aria-label="Close the guide" onClick={() => jump(-1)}><Icon name="close" size={14} /></button>
      </div>
      <h3>{s.title}</h3>
      <p>{s.text}</p>
      <p className="small muted guide-where">Find it: {s.where}.{s.needs ? ` ${s.needs}` : ""}</p>
      <div className="guide-dots" aria-hidden="true">{steps.map((_, i) => <i key={i} className={i === at ? "on" : i < at ? "past" : ""} />)}</div>
      <div className="guide-act">
        <button className="btn ghost" disabled={at === 0} onClick={() => jump(at - 1)}>Back</button>
        <button className="btn quiet" onClick={() => show(at)}>Open this page</button>
        <button className="btn cta" onClick={() => jump(at + 1)}>{at === steps.length - 1 ? "Finish" : "Next"}</button>
      </div>
    </aside>
  );
}
