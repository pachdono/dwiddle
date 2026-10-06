// The name and picture someone shows as: in the sidebar, and beside their
// review on the front page. Chosen in Settings from Dwiddle's own ducks, their
// Google picture, or a picture of their own.

import { useEffect, useState } from "react";
import { getProfile, saveLook } from "./supabase.js";
import { setHandle } from "./social.js";
import { ThemeMark } from "./ThemeMark.jsx";
import { avatarUrl } from "./Account.jsx";
import { CHARACTERS, DuckAvatar } from "./DuckAvatars.jsx";

// Dwiddle's own pictures: Dwiddle, Puddle and Dwiddle dressed up.
export const DUCKS = CHARACTERS.map((c) => [c.id, c.name]);
// Older picks from before the characters: the theme ducks.
const SCENE_IDS = ["sakura", "cottage", "matcha", "violet", "ocean", "prismarine", "sunset", "autumn", "midnight"];

/* ---------- one copy of the signed in person's profile, shared ---------- */

let cache = { id: null, data: undefined };
const listeners = new Set();
const tell = () => listeners.forEach((f) => f(cache.data));

export function useMyProfile(user) {
  const [data, setData] = useState(cache.id === user?.id ? cache.data : undefined);
  useEffect(() => {
    listeners.add(setData);
    return () => listeners.delete(setData);
  }, []);
  useEffect(() => {
    if (!user) { cache = { id: null, data: undefined }; setData(undefined); return; }
    if (cache.id === user.id && cache.data !== undefined) { setData(cache.data); return; }
    cache = { id: user.id, data: undefined };
    getProfile(user.id).then((p) => { if (cache.id === user.id) { cache.data = p; tell(); } });
  }, [user?.id]);
  return data;
}

export function setMyProfile(change) {
  cache.data = { ...(cache.data || {}), ...change };
  tell();
}

/* ---------- the picture ---------- */

// What to draw for an avatar value: a Dwiddle duck, a picture, or nothing.
export function iconSource(avatar, user) {
  if (avatar?.startsWith("duck:")) return { duck: avatar.slice(5) };
  if (avatar?.startsWith("data:image/") || /^https:\/\//.test(avatar || "")) return { src: avatar };
  const g = avatarUrl(user);
  return g ? { src: g } : { duck: "dwiddle" };
}

export function DuckIcon({ theme = "dwiddle", size = 32, dark = false }) {
  if (SCENE_IDS.includes(theme)) {
    return <span className="uicon" style={{ width: size, height: size }}><ThemeMark theme={theme} dark={dark} size={size} /></span>;
  }
  if (theme === "classic") theme = "dwiddle";
  return <span className="uicon" style={{ width: size, height: size }}><DuckAvatar id={theme} size={size} /></span>;
}

// The round picture for a person. Falls back to the Dwiddle duck.
export function UserIcon({ avatar, user, size = 32 }) {
  const [broken, setBroken] = useState(false);
  const s = iconSource(avatar, user);
  if (s.src && !broken) {
    return <img className="uicon" src={s.src} alt="" width={size} height={size} style={{ width: size, height: size }}
      referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  }
  return <DuckIcon theme={s.duck || "dwiddle"} size={size} />;
}

/* ---------- choosing them, in Settings ---------- */

// A picture of their own, cut to a square and made small enough to keep in
// the profile itself.
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  c.getContext("2d").drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 160, 160);
  for (const q of [0.85, 0.7, 0.55, 0.4]) {
    const url = c.toDataURL("image/jpeg", q);
    if (url.length < 85000) return url;
  }
  throw new Error("That picture is too detailed. Try another one.");
}

export function ProfileCard({ user }) {
  const saved = useMyProfile(user);
  const google = avatarUrl(user);
  const firstName = saved?.first_name || "";
  const start = { name: saved?.display_name || "", avatar: saved?.avatar || null };
  const [draft, setDraft] = useState(start);
  const [state, setState] = useState("");
  useEffect(() => { setDraft({ name: saved?.display_name || "", avatar: saved?.avatar || null }); }, [saved?.display_name, saved?.avatar]);

  if (saved === undefined) return null;
  if (saved === null) return <p className="small muted card-pad" style={{ margin: 0 }}>Fill in your details above first, then you can pick a name and picture.</p>;

  const dirty = draft.name.trim() !== (saved.display_name || "") || (draft.avatar || null) !== (saved.avatar || null);
  const pick = (avatar) => { setDraft((d) => ({ ...d, avatar })); setState(""); };

  async function upload(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { pick(await shrink(f)); } catch (err) { setState(err.message || "That picture could not be used."); }
  }

  async function save() {
    setState("Saving");
    const change = { display_name: draft.name.trim() || null, avatar: draft.avatar || null };
    const r = await saveLook(user.id, change);
    if (!r.ok) { setState(r.reason || "It could not be saved."); return; }
    setMyProfile(change);
    setState("Saved");
  }

  return (
    <div className="profile-card">
      <div className="profile-top">
        <UserIcon avatar={draft.avatar} user={user} size={64} />
        <label className="field" style={{ flex: 1, minWidth: 0 }}>
          <span>Name people see</span>
          <input type="text" maxLength={40} value={draft.name} placeholder={firstName || "Your name"}
            onChange={(e) => { setDraft((d) => ({ ...d, name: e.target.value })); setState(""); }} />
          <small className="muted">Shown in the sidebar and beside your reviews. Leave it empty to use {firstName ? `"${firstName}"` : "your first name"}.</small>
        </label>
      </div>

      <div className="icon-grid" role="radiogroup" aria-label="Profile picture">
        {DUCKS.map(([id, name]) => (
          <button key={id} type="button" role="radio" aria-checked={draft.avatar === "duck:" + id} title={name}
            className={"icon-pick" + (draft.avatar === "duck:" + id ? " on" : "")} onClick={() => pick("duck:" + id)}>
            <DuckIcon theme={id} size={44} />
          </button>
        ))}
        {google && (
          <button type="button" role="radio" aria-checked={!draft.avatar} title="Your Google picture"
            className={"icon-pick" + (!draft.avatar ? " on" : "")} onClick={() => pick(null)}>
            <img className="uicon" src={google} alt="" width={44} height={44} referrerPolicy="no-referrer" />
          </button>
        )}
        {draft.avatar?.startsWith("data:") && (
          <button type="button" role="radio" aria-checked className="icon-pick on" title="Your picture">
            <img className="uicon" src={draft.avatar} alt="" width={44} height={44} />
          </button>
        )}
        <label className="icon-pick icon-upload" title="Use your own picture">
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload} />
          <span>+</span>
        </label>
      </div>

      <div className="profile-actions">
        {state && <span className={"small " + (state === "Saved" ? "muted" : state === "Saving" ? "muted" : "warn-text")}>{state}</span>}
        <button type="button" className="btn ghost" disabled={!dirty || state === "Saving"} onClick={() => { setDraft(start); setState(""); }}>Discard</button>
        <button type="button" className="btn cta" disabled={!dirty || state === "Saving"} onClick={save}>Save changes</button>
      </div>
    </div>
  );
}

/* ---------- a display name and a username, asked for once ---------- */

// Friends find each other by username, and the board shows a display name, so
// everyone signed in is asked for both the next time they open Dwiddle and
// cannot carry on without. It stays away if the database does not have them
// yet, rather than trapping anyone.
export function HandleGate({ user }) {
  const p = useMyProfile(user);
  const [name, setName] = useState("");
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [skip, setSkip] = useState(false);
  // null means the column exists and is empty; undefined means it is not there yet
  const need = !!user && !skip && p && (p.handle === null || p.display_name === null);
  useEffect(() => {
    if (!need) return;
    setName((n) => n || p.display_name || String(p.first_name || "").trim());
    if (!v && p.handle === null) {
      const first = String(p.first_name || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 14);
      if (first.length >= 2) setV(first + Math.floor(100 + Math.random() * 900));
    } else if (p.handle) setV(p.handle);
  }, [need]); // eslint-disable-line react-hooks/exhaustive-deps
  // tells the tour to wait while this is on screen
  useEffect(() => {
    document.documentElement.dataset.gate = need ? "1" : "0";
    return () => { document.documentElement.dataset.gate = "0"; };
  }, [need]);
  if (!need) return null;
  const clean = v.replace(/^@/, "");
  async function save() {
    setBusy(true); setErr("");
    if (p.display_name === null || name.trim() !== (p.display_name || "")) {
      const l = await saveLook(user.id, { display_name: name.trim().slice(0, 40), avatar: p.avatar || null });
      if (!l.ok) { setBusy(false); setErr(l.reason || "That did not save. Try again."); return; }
    }
    if (p.handle === null) {
      const r = await setHandle(clean);
      if (!r.ok) {
        setBusy(false);
        if (r.missing) { setSkip(true); return; } // usernames are not switched on, so do not block anyone
        setErr(r.error || "That did not work. Try another."); return;
      }
      setMyProfile({ display_name: name.trim(), handle: r.data });
    } else setMyProfile({ display_name: name.trim() });
    setBusy(false);
  }
  return (
    <div className="gate-scrim">
      <div className="gate profile-gate" role="dialog" aria-modal="true" aria-labelledby="hg-title">
        <h2 id="hg-title">Choose how you show up</h2>
        <p className="gate-sub">A display name and a username. They are two different things, and both are needed to continue.</p>
        <form className="profile-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label className="field"><span>Display name</span>
            <input type="text" autoFocus maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="How you show up, e.g. Maya" />
            <em className="hint">Shown to friends and on the leaderboard. It can be anything.</em></label>
          {p.handle === null && (
            <label className="field"><span>Username</span>
              <input type="text" maxLength={21} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={v} placeholder="e.g. maya_studies"
                onChange={(e) => setV(e.target.value.toLowerCase().replace(/[^a-z0-9_@]/g, ""))} />
              <em className="hint">How friends find you. 3 to 20 letters, numbers or underscores.</em></label>
          )}
          {err && <p className="small" style={{ color: "var(--warn, #b25b00)", margin: 0 }}>{err}</p>}
          <div className="profile-actions">
            <button className="btn cta" type="submit" disabled={busy || !name.trim() || (p.handle === null && !/^[a-z0-9_]{3,20}$/.test(clean))}>{busy ? "Saving..." : "Continue"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
