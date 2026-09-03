// Sign in, and the sync that follows from it.
//
// Magic link rather than a password: there is no password to store, to leak,
// or to get wrong, and it needs no extra fields.

import { useEffect, useState } from "react";
import { supabase, configured, pullProgress, pushProgress, localSnapshot, applySnapshot, merge } from "./supabase.js";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!configured);
  const [syncedAt, setSyncedAt] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // On sign in, merge what is on this device with what is on the account, so
  // neither side loses work, then write the result back.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const remote = await pullProgress(user.id);
      if (cancelled) return;
      const merged = merge(localSnapshot(), remote || {});
      applySnapshot(merged);
      await pushProgress(user.id, merged);
      if (!cancelled) setSyncedAt(new Date());
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { user, ready, syncedAt, setSyncedAt };
}

export function Account({ user, syncedAt }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [message, setMessage] = useState("");

  if (!configured) {
    return (
      <div className="card card-pad note-card">
        <b className="small">Accounts are not switched on</b>
        <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-2)" }}>
          Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and redeploy to turn on sign in and
          syncing. Until then your progress is saved in this browser only.
        </p>
      </div>
    );
  }

  async function sendLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
      setMessage(`Check ${email.trim()} for a sign in link.`);
    }
  }

  if (user) {
    return (
      <div className="card">
        <div className="card-head"><h3>Account</h3></div>
        <div className="set-row">
          <div className="sec-main">
            <div className="list-title">{user.email}</div>
            <div className="small muted">
              {syncedAt
                ? `Progress synced at ${syncedAt.toLocaleTimeString()}. It will follow you to any device you sign in on.`
                : "Syncing your progress."}
            </div>
          </div>
          <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head"><h3>Sign in</h3></div>
      <form className="set-row" onSubmit={sendLink}>
        <div className="sec-main">
          <div className="list-title">Sync across devices</div>
          <div className="small muted">
            We email a link. No password to choose, remember or lose.
          </div>
        </div>
        <div className="row">
          <input type="email" required value={email} placeholder="you@example.com"
            style={{ width: 220 }} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn" type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Sending" : "Email me a link"}
          </button>
        </div>
      </form>
      {message && (
        <div className="set-row">
          <div className={"small " + (state === "error" ? "warn-text" : "good-text")}>{message}</div>
        </div>
      )}
    </div>
  );
}
