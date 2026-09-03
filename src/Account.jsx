// Sign in, and the sync that follows from it.
//
// Magic link rather than a password: there is no password to store, to leak,
// or to get wrong, and it needs no extra fields.

import { useEffect, useState } from "react";
import { supabase, configured, pullProgress, pushProgress, localSnapshot, applySnapshot, merge } from "./supabase.js";
import { Duck } from "./Duck.jsx";

export function useAuth(onSignedOut) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!configured);
  const [syncedAt, setSyncedAt] = useState(null);

  // Signing out has to work even when the server call fails, which it does
  // whenever the session has already expired or the refresh token is stale.
  // Fire and forget left you visibly signed in with no way out, so this awaits
  // the call, falls back to a local sign out, and clears the stored session by
  // hand if both are refused. The local state is cleared either way.
  async function signOut() {
    setSyncedAt(null);
    setUser(null);
    onSignedOut?.();

    if (!supabase) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) await supabase.auth.signOut({ scope: "local" });
    } catch {
      // fall through to clearing storage
    }

    try {
      const stale = Object.keys(localStorage).filter((k) => k.startsWith("sb-"));
      stale.forEach((k) => localStorage.removeItem(k));
    } catch {
      // private browsing, nothing to clear
    }
  }

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

  return { user, ready, syncedAt, setSyncedAt, signOut };
}

// Google first, then the email link. Both live on the sign in page.
export function SignInPanel({ onDone }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [message, setMessage] = useState("");

  async function withGoogle() {
    setState("sending");
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setState("error");
      // The commonest cause by far is the provider not being switched on.
      setMessage(
        /provider/i.test(error.message)
          ? "Google sign in is not enabled on this project yet. Use the email link below."
          : error.message,
      );
    }
    // On success the browser leaves for Google, so there is nothing to do here.
  }

  async function sendLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
      setMessage(`Check ${email.trim()} for a sign in link. It expires in an hour.`);
      onDone?.();
    }
  }

  if (state === "sent") {
    return (
      <div className="auth-sent">
        <span className="pill good">Link sent</span>
        <p className="small">{message}</p>
        <p className="small muted">
          You can close this page. Opening the link signs you in on whichever device you open it on.
        </p>
      </div>
    );
  }

  return (
    <>
      <button className="btn ghost full auth-google" onClick={withGoogle} disabled={state === "sending"}>
        <GoogleMark /> Continue with Google
      </button>

      <div className="or"><span>or</span></div>

      <form onSubmit={sendLink} className="auth-form">
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            placeholder="you@example.com"
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="btn full" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending" : "Email me a link"}
        </button>
      </form>

      {state === "error" && <p className="small warn-text auth-error">{message}</p>}
    </>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.96 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.65 3.58 9 3.58Z" />
    </svg>
  );
}

// A page rather than a dialog, so there is room for both routes in.
export function SignInPage({ onClose }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Duck size={64} shadow={false} className="auth-duck" />
        <h1>Save your progress</h1>
        <p className="auth-sub">
          {configured
            ? "Your topics, missed questions and retired cards follow you to any device."
            : "Accounts are not configured on this deployment yet, so progress stays in this browser."}
        </p>

        {configured && <SignInPanel />}

        <button className="btn quiet auth-back" onClick={onClose}>
          {configured ? "Continue without an account" : "Close"}
        </button>
      </div>
    </div>
  );
}

export function Account({ user, syncedAt, signOut }) {
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
          <button className="btn ghost" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-pad">
      <b className="small">Sign in</b>
      <p className="small muted" style={{ margin: "4px 0 14px" }}>
        Sync your progress across devices.
      </p>
      <SignInPanel />
    </div>
  );
}

