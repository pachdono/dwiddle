// Sign in, and the sync that follows from it.
//
// Magic link rather than a password: there is no password to store, to leak,
// or to get wrong, and it needs no extra fields.

import { useEffect, useState } from "react";
import { supabase, configured, pullProgress, pushProgress, localSnapshot, applySnapshot, merge } from "./supabase.js";
import { Duck } from "./Duck.jsx";

export function useAuth() {
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

// The magic link form, used by the Settings page and by the sign in dialog.
export function SignInForm({ onDone, compact = false }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [message, setMessage] = useState("");

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
      setMessage(`Check ${email.trim()} for a sign in link. It expires in an hour.`);
      onDone?.();
    }
  }

  if (state === "sent") {
    return (
      <div className={compact ? "" : "set-row"}>
        <div className="small good-text">{message}</div>
      </div>
    );
  }

  return (
    <>
      <form className={compact ? "stack" : "set-row"} onSubmit={sendLink}>
        {!compact && (
          <div className="sec-main">
            <div className="list-title">Sync across devices</div>
            <div className="small muted">We email a link. No password to choose, remember or lose.</div>
          </div>
        )}
        <div className={compact ? "stack" : "row"} style={compact ? { gap: 10 } : undefined}>
          <input
            type="email"
            required
            value={email}
            placeholder="you@example.com"
            autoComplete="email"
            style={compact ? undefined : { width: 220 }}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className={"btn" + (compact ? " full" : "")} type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Sending" : "Email me a link"}
          </button>
        </div>
      </form>
      {state === "error" && (
        <p className="small warn-text" style={{ margin: compact ? "10px 0 0" : undefined }}>{message}</p>
      )}
    </>
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
    <div className="card">
      <div className="card-head"><h3>Sign in</h3></div>
      <SignInForm />
    </div>
  );
}

// The dialog opened from the banner and from the sidebar.
export function SignInDialog({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="scrim dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <Duck size={54} shadow={false} className="dialog-duck" />
        <h3>Save your progress</h3>
        <p>
          {configured
            ? "Your topics, missed questions and retired cards follow you to any device. We email a link, so there is no password."
            : "Accounts are not configured on this deployment yet, so progress stays in this browser."}
        </p>
        {configured && <SignInForm compact />}
        <button className="btn quiet dialog-dismiss" onClick={onClose}>
          {configured ? "Not now" : "Close"}
        </button>
      </div>
    </div>
  );
}
