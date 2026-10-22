// Sign in, and the sync that follows from it.
//
// Magic link rather than a password: there is no password to store, to leak,
// or to get wrong, and it needs no extra fields.

import { LevelPicker } from "./LevelPicker.jsx";
import { myLevel, setMyLevel } from "./level.js";
import { useEffect, useState } from "react";
import { supabase, configured, enabledProviders, syncNow, getProfile, saveProfile } from "./supabase.js";
import { Duck } from "./Duck.jsx";
import { setHandle } from "./social.js";
import { ProfileCard, setMyProfile } from "./Profile.jsx";

// Google supplies a profile picture; an email link sign in does not. Either
// way the caller gets something to show.
export function avatarUrl(user) {
  const m = user?.user_metadata || {};
  return m.avatar_url || m.picture || null;
}

// In the desktop app the provider sends the browser to dwiddle://auth with the
// session in the fragment. The main process hands that here, and the tokens are
// installed exactly as the web build installs its own.
function useDesktopCallback() {
  useEffect(() => {
    if (!window.DWIDDLE_AUTH || !supabase) return;
    return window.DWIDDLE_AUTH.onCallback(async (url) => {
      try {
        const hash = new URL(url).hash.replace(/^#/, "");
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          return;
        }
        // The newer flow returns a single use code instead of tokens.
        const code = params.get("code") || new URL(url).searchParams.get("code");
        if (code) await supabase.auth.exchangeCodeForSession(code);
      } catch (err) {
        console.warn("[auth] could not complete the desktop sign in", err);
      }
    });
  }, []);
}

export function useAuth(onSignedOut) {
  useDesktopCallback();
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

    if (supabase) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) await supabase.auth.signOut({ scope: "local" });
      } catch {
        // fall through to clearing storage
      }
    }

    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // private browsing, nothing to clear
    }

    // Then reload. Clearing state in place left too many ways to end up half
    // signed out: a listener that fires afterwards and restores the session, a
    // stale token the client refreshes on its own, an effect still holding the
    // old user. Starting the app again from a cleared store cannot half work.
    try {
      window.location.replace(window.location.origin);
    } catch {
      // non browser environment, nothing to do
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
      await syncNow(user.id);
      if (!cancelled) setSyncedAt(new Date());
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { user, ready, syncedAt, setSyncedAt, signOut };
}

// Google first, then the email link. Both live on the sign in page.
function returnTo() {
  return window.DWIDDLE_DESKTOP ? "dwiddle://auth" : window.location.origin;
}

export function SignInPanel({ onDone }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [message, setMessage] = useState("");
  const [google, setGoogle] = useState(null); // null while we find out

  useEffect(() => {
    let live = true;
    enabledProviders().then((p) => live && setGoogle(Boolean(p.google)));
    return () => { live = false; };
  }, []);

  async function withGoogle() {
    setState("sending");
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: returnTo() },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
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
      options: { emailRedirectTo: returnTo() },
    });
    if (error) {
      setState("error");
      setMessage(/rate limit|too many|seconds/i.test(error.message)
        ? "Too many sign in emails were just sent. Wait a minute, then try again, or continue with Google."
        : /invalid/i.test(error.message) && /email/i.test(error.message) ? "That email address does not look right. Check it and try again." : error.message);
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
      {google && (
        <>
          <button className="btn ghost full auth-google" onClick={withGoogle} disabled={state === "sending"}>
            <GoogleMark /> Continue with Google
          </button>
          <div className="or"><span>or</span></div>
        </>
      )}

      <form onSubmit={sendLink} className="auth-form">
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="btn full" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending" : "Email me a link"}
        </button>
      </form>

      {state === "error" && <p className="small warn-text auth-error">{message}</p>}
      <p className="small muted" style={{ marginTop: 12, textAlign: "center" }}>
        By continuing you agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a> and have read the <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
      </p>
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

// ---------- your details ----------

// First name, last name, date of birth and country. Asked once, straight
// after signing up, and changeable in Settings.
export function ProfileForm({ user, initial, onSaved, onCancel, submitLabel = "Save" }) {
  const [f, setF] = useState({ first_name: "", last_name: "", birth_date: "", country: "", display_name: "", handle: "", ...(initial || {}) });
  const [level, setLevel] = useState(() => myLevel()?.id || null);
  const [state, setState] = useState("idle");
  const [err, setErr] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  // Dwiddle is for 8 and over (see the privacy policy), so a younger date
  // of birth cannot complete an account.
  const minAge = new Date(); minAge.setFullYear(minAge.getFullYear() - 8);
  const young = !!f.birth_date && f.birth_date > minAge.toISOString().slice(0, 10);
  const handleOk = /^[a-z0-9_]{3,20}$/.test(String(f.handle || "").replace(/^@/, ""));
  const ok = f.first_name.trim() && f.last_name.trim() && String(f.display_name || "").trim() && handleOk && f.birth_date && f.birth_date < today && f.birth_date > "1900-01-01" && !young && level;

  // Say what is missing instead of leaving a dead button, which is what
  // someone on a tablet sees when a field is off screen.
  function why() {
    if (!f.first_name.trim()) return "Add your first name.";
    if (!f.last_name.trim()) return "Add your last name.";
    if (!String(f.display_name || "").trim()) return "Add a display name.";
    if (!handleOk) return "Pick a username of 3 to 20 letters, numbers or underscores.";
    if (!f.birth_date || f.birth_date >= today || f.birth_date <= "1900-01-01") return "Add your date of birth.";
    if (young) return "";
    if (!level) return "Pick what you are studying for.";
    return "";
  }
  async function submit(e) {
    e.preventDefault();
    if (!ok) { setErr(why()); return; }
    setState("saving"); setErr("");
    setMyLevel(level);
    const r = await saveProfile(user.id, f);
    if (!r.ok) { setState("idle"); setErr(r.reason || "It could not be saved. Try again."); return; }
    // the username is its own thing, so friends can find you; it is set once the profile exists
    const h = await setHandle(String(f.handle || "").replace(/^@/, ""));
    if (!h.ok && !h.missing) { setState("idle"); setErr(h.error || "That username did not work. Try another."); return; }
    onSaved?.({ ...f, display_name: String(f.display_name || "").trim(), handle: h.ok ? h.data : f.handle, country: f.country?.trim() || null });
  }

  return (
    <form className="profile-form" onSubmit={submit} noValidate>
      <div className="profile-row">
        <label className="field"><span>First name</span>
          <input type="text" required autoComplete="given-name" maxLength={60} value={f.first_name} onChange={set("first_name")} /></label>
        <label className="field"><span>Last name</span>
          <input type="text" required autoComplete="family-name" maxLength={60} value={f.last_name} onChange={set("last_name")} /></label>
      </div>
      <label className="field"><span>Display name</span>
        <input type="text" required maxLength={40} value={f.display_name || ""} onChange={set("display_name")} placeholder="How you show up, e.g. Maya" />
        <em className="hint">Shown to friends and on the leaderboard. It can be anything.</em></label>
      <label className="field"><span>Username</span>
        <input type="text" required maxLength={20} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={f.handle || ""}
          onChange={(e) => setF((o) => ({ ...o, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} placeholder="e.g. maya_studies" />
        <em className="hint">How friends find you. 3 to 20 letters, numbers or underscores, and different from your display name.</em></label>
      <label className="field"><span>Date of birth</span>
        <input required type="date" autoComplete="bday" min="1900-01-02" max={today} value={f.birth_date} onChange={set("birth_date")} /></label>
      <label className="field"><span>Country <em className="muted">(optional)</em></span>
        <input type="text" autoComplete="country-name" maxLength={60} value={f.country || ""} onChange={set("country")} /></label>
      <div className="field"><span>What are you studying for?</span>
        <LevelPicker value={level} onChange={setLevel} />
        <em className="muted small">So everything is written for your level. You can change it in Settings.</em></div>
      {young && <p className="small" style={{ color: "var(--warn)", margin: 0 }}>Dwiddle is for people aged 8 and over, so an account can't be set up with this date of birth.</p>}
      {err && <p className="small" style={{ color: "var(--warn)", margin: 0 }}>{err}</p>}
      <div className="profile-actions">
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
        <button className="btn cta" type="submit" disabled={state === "saving"}>{state === "saving" ? "Saving" : submitLabel}</button>
      </div>
    </form>
  );
}

// Shown over the app to someone signed in who has not filled in their
// details yet. If the details cannot be checked (offline), it stays away.
export function ProfileGate({ user }) {
  const [need, setNeed] = useState(false);
  useEffect(() => {
    if (!user) { setNeed(false); return; }
    let live = true;
    getProfile(user.id).then((p) => live && setNeed(p === null));
    return () => { live = false; };
  }, [user]);
  if (!need || !user) return null;
  const m = user.user_metadata || {};
  const [first = "", ...rest] = String(m.full_name || m.name || "").split(" ");
  return (
    <div className="gate-scrim">
      <div className="gate profile-gate" role="dialog" aria-modal="true" aria-labelledby="pf-title">
        <h2 id="pf-title">Finish setting up your account</h2>
        <p className="gate-sub">A few details so your account is yours. Only you and the Dwiddle team can see them.</p>
        <ProfileForm user={user} initial={{ first_name: first, last_name: rest.join(" "), display_name: first }} submitLabel="Continue" onSaved={(x) => { setMyProfile(x); setNeed(false); }} />
      </div>
    </div>
  );
}

function YourDetails({ user }) {
  const [p, setP] = useState(undefined);
  const [editing, setEditing] = useState(false);
  useEffect(() => { let live = true; getProfile(user.id).then((x) => live && setP(x)); return () => { live = false; }; }, [user]);
  if (p === undefined) return null;
  if (editing || p === null) {
    return <div className="card-pad" style={{ paddingTop: 0 }}>
      <ProfileForm user={user} initial={p} onSaved={(x) => { setP(x); setMyProfile(x); setEditing(false); }} onCancel={p ? () => setEditing(false) : undefined} />
    </div>;
  }
  return (
    <div className="set-row">
      <div className="sec-main">
        <div className="list-title">{p.first_name} {p.last_name}</div>
        <div className="small muted">Born {new Date(p.birth_date + "T00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}{p.country ? ` · ${p.country}` : ""}</div>
      </div>
      <button className="btn ghost" onClick={() => setEditing(true)}>Edit details</button>
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
          <div className="row" style={{ flex: 1, minWidth: 0 }}>
            <Avatar user={user} size={34} />
            <div className="sec-main">
              <div className="list-title">{user.email}</div>
            <div className="small muted">
              {syncedAt
                ? `Progress synced at ${syncedAt.toLocaleTimeString()}. It will follow you to any device you sign in on.`
                : "Syncing your progress."}
              </div>
            </div>
          </div>
          <button className="btn ghost" onClick={signOut}>Sign out</button>
        </div>
        <YourDetails user={user} />
        <div className="card-head" style={{ borderTop: "1px solid var(--line-soft)" }}><h3>Profile</h3></div>
        <ProfileCard user={user} />
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


// The circle beside a name: a real picture when the provider gave us one,
// otherwise initials. A broken image URL falls back rather than showing a
// broken image icon.
export function Avatar({ user, size = 26, initials }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : avatarUrl(user);

  if (src) {
    return (
      <img
        className="avatar avatar-img"
        src={src}
        alt={user?.email ? `Profile picture for ${user.email}` : "Profile picture"}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="avatar" style={{ width: size, height: size, flexBasis: size }}>
      {initials}
    </span>
  );
}
