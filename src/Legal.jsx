import { DuckMark } from "./Duck.jsx";

/* Two short documents. They describe what the app actually does, in the words
   somebody would use out loud. A policy nobody reads protects nobody, so this
   is kept to the length a person will actually finish. */

const UPDATED = "10 September 2026";
const EMAIL = "dwiddle36@gmail.com";

function Mail() {
  return <a href={`mailto:${EMAIL}`}>{EMAIL}</a>;
}

function Privacy() {
  return (
    <>
      <h1>Privacy</h1>
      <p className="legal-date">Last updated {UPDATED}</p>

      <p className="legal-lead">
        Dwiddle is a study tool. It needs your notes to make questions and your email to keep
        your progress. That is the whole of it. There is no advertising, no tracking across
        other websites, and nothing is sold to anyone.
      </p>

      <h2>What is collected</h2>
      <dl className="legal-list">
        <dt>Study material</dt>
        <dd>
          The notes you paste and the text of any PDF you add. This is the material questions
          are generated from.
        </dd>

        <dt>Your progress</dt>
        <dd>
          Answers, scores, streaks, saved questions and which topics you have hidden.
        </dd>

        <dt>Account details, only if you sign in</dt>
        <dd>
          Your email address. If you sign in with Google, your name and profile picture come
          across from Google as well. No password is ever created or stored.
        </dd>

        <dt>Feedback you send</dt>
        <dd>
          The message, the rating, and a contact address if you give one.
        </dd>

        <dt>Your IP address</dt>
        <dd>
          Seen briefly by the server to limit how many requests one visitor can make. It is
          held in memory for a few minutes and never written to the database.
        </dd>
      </dl>

      <h2>If you do not sign in</h2>
      <p>
        Everything stays in your own browser and never reaches the database. Clearing your
        browser data deletes it permanently, and there is no copy anywhere else. The one
        exception is material you send to be turned into questions, which is described next.
      </p>

      <h2>Your notes are sent to an AI provider</h2>
      <p>
        This is the part worth knowing. To write questions, the text you provide is sent to an
        AI model run by OpenRouter, Groq or NVIDIA, whichever is available. They process it,
        return the questions, and the request is not used to train their models under the API
        terms in force. Even so, do not paste anything confidential, and do not paste anything
        about other people that they would not want shared.
      </p>

      <h2>Who else handles your data</h2>
      <dl className="legal-list">
        <dt>Vercel</dt>
        <dd>Runs the website and the server functions.</dd>
        <dt>Supabase</dt>
        <dd>Stores accounts and progress, and sends the sign in links.</dd>
        <dt>OpenRouter, Groq, NVIDIA</dt>
        <dd>Generate questions and mark written answers.</dd>
        <dt>Resend</dt>
        <dd>Delivers feedback messages to the address above.</dd>
        <dt>Google</dt>
        <dd>Only if you choose to sign in with Google.</dd>
      </dl>
      <p>
        Each of these acts on instructions and for no other purpose. Nobody is given your data
        to use for themselves.
      </p>

      <h2>How long it is kept</h2>
      <p>
        Until you ask for it to go. Accounts and progress stay while the account exists.
        Feedback is kept so reviews can be checked before they appear. Ask for deletion and it
        is removed within thirty days.
      </p>

      <h2>What you can ask for</h2>
      <p>
        A copy of everything held about you, a correction, or complete deletion. Email{" "}
        <Mail /> from the address you signed in with and it will be done. There is no form and
        no charge.
      </p>

      <h2>Age</h2>
      <p>
        Dwiddle is not for children under 13. If you are under 16, ask a parent or guardian
        before you make an account. If an account is found to belong to a younger child it
        will be deleted.
      </p>

      <h2>Security</h2>
      <p>
        Traffic is encrypted in transit. Progress is protected by database rules that make one
        account unable to read another, enforced by the database rather than by the app. API
        keys live only on the server and are never sent to your browser. No system is perfect,
        and none is claimed to be here.
      </p>

      <h2>Changes</h2>
      <p>
        If this changes, the date at the top changes with it. Material changes will be
        announced in the app rather than made quietly.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, complaints, or a deletion request all go to <Mail />.
      </p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h1>Terms</h1>
      <p className="legal-date">Last updated {UPDATED}</p>

      <p className="legal-lead">
        Using Dwiddle means agreeing to what follows. It is short on purpose.
      </p>

      <h2>What Dwiddle is</h2>
      <p>
        A study tool that turns your material into practice questions, study sheets and timed
        papers. It is offered free of charge, as it is, and may change or stop at any time.
      </p>

      <h2>Questions are generated, so check them</h2>
      <p>
        Questions, explanations, marks and predicted scores are produced by an AI model. They
        will sometimes be wrong. Treat a predicted band or score as rough practice feedback
        and nothing more. Do not rely on Dwiddle alone for an exam that matters, and check
        anything important against your syllabus or your teacher.
      </p>

      <h2>Not affiliated with any exam board</h2>
      <p>
        Dwiddle is independent. It is not endorsed by, affiliated with, or approved by the
        College Board, ETS, the British Council, IDP, Cambridge Assessment, the Enrollment
        Management Association, Pearson, the International Baccalaureate Organization, or any
        other examining body. SAT, IELTS, TOEFL, SSAT, IGCSE and IB are the trade marks of
        their respective owners and are used only to describe the format a practice paper is
        modelled on. No real or past exam paper is reproduced here. Every question is written
        for this app.
      </p>

      <h2>Your material stays yours</h2>
      <p>
        You keep every right to the notes you upload. Permission is granted only to process
        them in order to run the service for you. Questions generated from your material are
        yours to use.
      </p>

      <h2>Fair use of the service</h2>
      <p>Do not:</p>
      <ul>
        <li>upload material you have no right to share</li>
        <li>upload live or leaked exam content</li>
        <li>submit anything unlawful, hateful, or aimed at harming another person</li>
        <li>script, scrape, or otherwise put automated load on the service</li>
        <li>attempt to reach another account's data</li>
      </ul>
      <p>Accounts that do any of these may be closed without notice.</p>

      <h2>Reviews</h2>
      <p>
        A review you submit may be shown publicly, with the rating and the text but never your
        email. Reviews are read before they appear and may be declined for any reason.
      </p>

      <h2>Liability</h2>
      <p>
        Dwiddle is free and provided without warranty of any kind. To the extent the law
        allows, no liability is accepted for lost work, lost data, or an exam result. Nothing
        here limits liability where the law does not permit it to be limited.
      </p>

      <h2>Ending it</h2>
      <p>
        Stop using it whenever you like, and email <Mail /> to have your account and data
        deleted.
      </p>

      <h2>Contact</h2>
      <p>
        <Mail />
      </p>
    </>
  );
}

export default function Legal({ which, onHome, onOther }) {
  const other = which === "privacy" ? "terms" : "privacy";
  return (
    <div className="legal-shell">
      <header className="legal-top">
        <button className="brand legal-brand" onClick={onHome}>
          <DuckMark size={26} />
          <span>Dwiddle</span>
        </button>
        <button className="btn ghost small" onClick={onHome}>Back to Dwiddle</button>
      </header>

      <main className="legal">
        {which === "privacy" ? <Privacy /> : <Terms />}

        <div className="legal-foot">
          <button className="linkish" onClick={onOther}>
            Read the {other === "privacy" ? "privacy policy" : "terms"}
          </button>
        </div>
      </main>
    </div>
  );
}
