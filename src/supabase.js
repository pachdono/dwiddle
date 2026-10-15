// Supabase client and progress sync.
//
// The URL and anon key are public by design: they identify the project, they
// do not grant access. What protects the data is row level security in
// supabase/schema.sql, which restricts every row to the user who owns it.
// The app works without these variables set, falling back to local storage.

import { createClient } from "@supabase/supabase-js";
import { load, save, KEYS, changedAt, setChangedAt } from "./store.js";

const rawUrl = (import.meta.env?.VITE_SUPABASE_URL || "").trim();
const anon = (import.meta.env?.VITE_SUPABASE_ANON_KEY || "").trim();

// The dashboard link and the API endpoint are different addresses, and pasting
// the first is an easy mistake that fails silently: the client builds fine,
// every request 404s, and sign in appears to do nothing. Recover the project
// reference and say so loudly rather than shipping a broken client.
function apiUrl(value) {
  if (!value) return "";

  const dashboard = value.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboard) {
    const fixed = `https://${dashboard[1]}.supabase.co`;
    console.warn(
      `[supabase] VITE_SUPABASE_URL is the dashboard link, not the API endpoint. ` +
      `Using ${fixed} instead. Set it to that in your host's environment variables.`,
    );
    return fixed;
  }

  // A bare project reference is also a reasonable thing to paste.
  if (/^[a-z0-9]{16,}$/i.test(value)) return `https://${value}.supabase.co`;

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    console.warn("[supabase] VITE_SUPABASE_URL is not a valid URL:", value);
    return "";
  }
}

const url = apiUrl(rawUrl);

export const configured = Boolean(url && anon);

// Which third party sign in methods are actually switched on for this project.
//
// signInWithOAuth does not fail when a provider is disabled: it builds the
// authorize URL and sends the browser there, and the server answers with
// "Unsupported provider: provider is not enabled" as a raw JSON page. So the
// only way to avoid showing a dead button is to ask first.
let providerCache = null;

export async function enabledProviders() {
  if (!configured) return {};
  if (providerCache) return providerCache;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } });
    if (!res.ok) return {};
    const data = await res.json();
    providerCache = data?.external || {};
    return providerCache;
  } catch {
    return {};
  }
}

export const supabase = configured
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true }, realtime: { params: { eventsPerSecond: 40 } } })
  : null;

// The keys that follow you between devices. Leaving material, stats and the
// question bank out of this meant signing in on a second device lost your
// generated topics and reset your streak, which is the opposite of what
// "save your progress" promises.
const SYNCED = [
  KEYS.known,
  KEYS.missed,
  KEYS.topic,
  KEYS.hidden,
  KEYS.quizLen,
  KEYS.stats,
  KEYS.made,
  KEYS.madeCleared,
  KEYS.seen,
  KEYS.testBank,
  KEYS.level,
  KEYS.srs,
  KEYS.srsOn,
  KEYS.focus,
  "dwiddle-look",
  "dwiddle-decks",
  "dwiddle-study-log",
];
// Values that are one choice (a theme, a quiz length), where the copy changed
// most recently is the one to keep.
const LATEST = new Set([KEYS.topic, KEYS.quizLen, KEYS.level, KEYS.srsOn, KEYS.focus, "dwiddle-look", "dwiddle-decks"]);

// Roughly how much of a row Supabase will take happily. The question bank is
// the only thing that can approach it.
const MAX_PAYLOAD = 600 * 1024;

export function localSnapshot() {
  const out = {};
  SYNCED.forEach((k) => { out[k] = load(k, null); });
  const times = changedAt();
  out._times = Object.fromEntries(SYNCED.filter((k) => times[k]).map((k) => [k, times[k]]));
  return out;
}

export function applySnapshot(data) {
  if (!data) return;
  SYNCED.forEach((k) => {
    // Written without a new time: this is the account's copy arriving, not a
    // change made here.
    if (data[k] !== undefined && data[k] !== null) save(k, data[k], { at: 0 });
  });
  if (data._times) setChangedAt(data._times);
  // Material deleted, here or on another device, is removed here too.
  if (data[KEYS.made] === null && data[KEYS.madeCleared]) save(KEYS.made, null);
}

// Merging matters more than it looks. Two devices both hold a full picture, so
// overwriting either way loses work. Each kind of value merges on its own terms.
function mergeStats(a, b) {
  const x = a || {};
  const y = b || {};
  const byTopic = { ...(x.byTopic || {}) };

  for (const [name, v] of Object.entries(y.byTopic || {})) {
    const mine = byTopic[name];
    // Whichever device has answered more of this topic has the fuller record.
    byTopic[name] = !mine || v.total > mine.total ? v : mine;
  }

  return {
    // Counts are cumulative on each device, so the larger one is the truer one.
    // Adding them would double count everything already synced.
    answered: Math.max(x.answered || 0, y.answered || 0),
    correct: Math.max(x.correct || 0, y.correct || 0),
    xp: Math.max(x.xp || 0, y.xp || 0),
    days: [...new Set([...(x.days || []), ...(y.days || [])])].sort().slice(-400),
    byTopic,
  };
}

// A merge only ever adds, so something deleted on one copy came back from the
// other. Deleted library items are remembered (removed, gone; see
// materials.js) and a merge leaves them out, whichever copy still has them.
const stamp = (v) => (v && typeof v === "object" ? v.at : v) || 0;
const newestOf = (x, y) => { const o = { ...(x || {}) }; for (const [k, v] of Object.entries(y || {})) if (!o[k] || stamp(v) > stamp(o[k])) o[k] = v; return o; };

function mergeMade(a, b) {
  if (!a) return b;
  if (!b) return a;
  const removed = newestOf(a.removed, b.removed), gone = newestOf(a.gone, b.gone);

  // Library items from both, each once, without any that were deleted.
  let items = [...(a.materials || [])];
  const itemIds = new Set(items.map((m) => m.id));
  (b.materials || []).forEach((m) => {
    if (!itemIds.has(m.id)) items.push(m);
    else {
      // the copy saved last decides the name, so a rename on one device sticks
      const i = items.findIndex((x) => x.id === m.id);
      const title = (a.savedAt || 0) >= (b.savedAt || 0) ? items[i].title : m.title;
      items[i] = { ...items[i], title, topics: [...new Set([...items[i].topics, ...m.topics])] };
    }
  });
  items = items.filter((m) => !removed[m.id]).sort((x, y) => (x.at || 0) - (y.at || 0));
  // A topic that was deleted is only kept if an item still left has it.
  const kept = new Set(items.flatMap((m) => m.topics));
  const goneNow = (name) => !!gone[name] && !kept.has(name);

  const questions = [...a.questions];
  const ids = new Set(questions.map((q) => q.id));
  b.questions.forEach((q) => { if (!ids.has(q.id)) questions.push(q); });

  const topics = [...a.topics];
  const names = new Set(topics.map((t) => t.name));
  b.topics.forEach((t) => { if (!names.has(t.name)) topics.push(t); });

  const drills = [...(a.drills || [])];
  const drillIds = new Set(drills.map((d) => d.id));
  (b.drills || []).forEach((d) => { if (!drillIds.has(d.id)) drills.push(d); });

  const removedTitles = new Set(Object.values(removed).map((v) => v?.title).filter(Boolean));
  const itemTitles = new Set(items.map((m) => m.title));
  const sheets = [...(a.sheets || []), ...(b.sheets || [])].filter((sh, i, all) => all.findIndex((x) => x.title === sh.title) === i && !removedTitles.has(sh.title)
    // a sheet under an old name of something renamed is not kept as a second copy
    && (!items.length || itemTitles.has(sh.title)));
  const without = (obj) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => !goneNow(k)));

  // Where both copies have notes or a lesson for the same topic, the copy
  // saved last wins. Otherwise an edit made here (a graph Dwiddle added, a
  // fixed note) was undone a second later by the older copy in the cloud.
  const [older, newer] = (a.savedAt || 0) > (b.savedAt || 0) ? [b, a] : [a, b];
  return {
    ...b,
    topics: topics.filter((t) => !goneNow(t.name)),
    questions: questions.filter((q) => !goneNow(q.topic)),
    drills: drills.filter((d) => !goneNow(d.topic)),
    sheet: b.sheet || a.sheet,
    sheets,
    notes: without({ ...(older.notes || {}), ...(newer.notes || {}) }),
    lessons: without({ ...(older.lessons || {}), ...(newer.lessons || {}) }),
    materials: items,
    removed, gone,
  };
}

function mergeBank(a, b) {
  const out = { ...(a || {}) };
  for (const [section, list] of Object.entries(b || {})) {
    const seen = new Set((out[section] || []).map((q) => q.id));
    out[section] = [...(out[section] || []), ...list.filter((q) => !seen.has(q.id))].slice(-400);
  }
  return out;
}

export function merge(localData, remoteData) {
  const out = {};
  const ta = localData?._times || {}, tb = remoteData?._times || {};
  out._times = { ...tb };
  Object.entries(ta).forEach(([k, t]) => { if (!out._times[k] || t > out._times[k]) out._times[k] = t; });

  SYNCED.forEach((k) => {
    const a = localData?.[k];
    const b = remoteData?.[k];

    if (LATEST.has(k)) out[k] = (ta[k] || 0) > (tb[k] || 0) ? a ?? b ?? null : b ?? a ?? null;
    else if (k === "dwiddle-study-log") {
      // Minutes studied each day: the larger count for each day.
      const o = { ...(b || {}) };
      Object.entries(a || {}).forEach(([d, v]) => { o[d] = Math.max(Number(v) || 0, Number(o[d]) || 0); });
      out[k] = Object.keys(o).length ? o : null;
    }
    else if (k === KEYS.srs) out[k] = (ta[k] || 0) > (tb[k] || 0) ? { ...(b || {}), ...(a || {}) } : { ...(a || {}), ...(b || {}) };
    else if (k === KEYS.stats) out[k] = mergeStats(a, b);
    else if (k === KEYS.made) {
      // A deletion newer than either copy wins, so deleting on one device
      // is not undone by the copy another device still has.
      const cleared = Math.max(localData?.[KEYS.madeCleared] || 0, remoteData?.[KEYS.madeCleared] || 0);
      const keep = (m) => (m && (!cleared || (m.savedAt || 0) > cleared) ? m : null);
      out[k] = mergeMade(keep(a), keep(b)) || null;
    }
    else if (k === KEYS.madeCleared) out[k] = Math.max(a || 0, b || 0) || null;
    else if (k === KEYS.testBank) out[k] = mergeBank(a, b);
    else if (Array.isArray(a) || Array.isArray(b)) {
      out[k] = [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])];
    } else {
      out[k] = b ?? a ?? null;
    }
  });

  return out;
}

export async function pullProgress(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("progress").select("data").eq("user_id", userId).maybeSingle();
  if (error) {
    console.warn("[sync] pull failed", error.message);
    return null;
  }
  return data?.data ?? null;
}

export async function pushProgress(userId, data) {
  if (!supabase) return false;

  // The bank is the only thing that can grow without bound. If a row gets too
  // big, send everything else rather than failing the whole sync.
  let payload = data;
  if (JSON.stringify(data).length > MAX_PAYLOAD) {
    console.warn("[sync] payload over limit, syncing without the question bank");
    payload = { ...data, [KEYS.testBank]: undefined };
  }

  const { error } = await supabase
    .from("progress")
    .upsert({ user_id: userId, data: payload }, { onConflict: "user_id" });
  if (error) {
    console.warn("[sync] push failed", error.message);
    return false;
  }
  return true;
}

export async function saveMaterial(userId, title, payload) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("materials")
    .insert({ user_id: userId, title, payload })
    .select("id")
    .single();
  if (error) {
    console.warn("[materials] save failed", error.message);
    return null;
  }
  return data.id;
}

export async function listMaterials(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("materials")
    .select("id, title, created_at, payload")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[materials] list failed", error.message);
    return [];
  }
  return data || [];
}

// The headcount shown on the dashboard. Returns null rather than a guess when
// the function is missing or the project is not configured, so the app can
// simply not make the claim.
export async function userCount() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("user_count");
  if (error) {
    console.warn("[stats] user_count unavailable", error.message);
    return null;
  }
  const n = Number(data);
  return Number.isFinite(n) ? n : null;
}

// Feedback and reviews.
//
// Written straight to the table, which is insert only and readable only once
// approved, so nothing anyone submits can appear anywhere until it is approved
// in the dashboard.
export async function submitFeedback({ kind, rating, message, contact, title }) {
  if (!supabase) return { stored: false, reason: "Accounts are not configured" };

  const { data: session } = await supabase.auth.getSession();
  const user = session?.session?.user ?? null;

  // The id is made here so the thank you email can quote a reference for it.
  const id = crypto.randomUUID();
  const { error } = await supabase.from("feedback").insert({
    id,
    user_id: user?.id ?? null,
    kind,
    rating: kind === "review" ? rating : null,
    message,
    contact: contact || user?.email || null,
    ...(title ? { title } : {}),
  });

  if (error) {
    console.warn("[feedback] insert failed", error.message);
    return { stored: false, reason: error.message };
  }
  return { stored: true, id, from: user?.email ?? null };
}

// Only ever returns approved reviews: the policy enforces it, this just asks.
export async function approvedReviews(limit = 6) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("feedback")
    .select("id, rating, message, created_at")
    .eq("kind", "review")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

// ---------- profile, announcements, update logs ----------

// The person's profile, or null if they have not filled it in yet. Returns
// undefined when it cannot be known (offline, or the table is not set up),
// so the app never nags about a form it cannot save.
export async function getProfile(userId) {
  if (!supabase) return undefined;
  const { data, error } = await supabase
    .from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) { console.warn("[profile] read failed", error.message); return undefined; }
  return data ?? null;
}

export async function saveProfile(userId, p) {
  if (!supabase) return { ok: false, reason: "Accounts are not configured" };
  const { error } = await supabase.from("profiles").upsert({
    user_id: userId,
    first_name: p.first_name.trim(),
    last_name: p.last_name.trim(),
    birth_date: p.birth_date,
    country: p.country?.trim() || null,
    ...(p.display_name?.trim() ? { display_name: p.display_name.trim().slice(0, 40) } : {}),
  }, { onConflict: "user_id" });
  return error ? { ok: false, reason: error.message } : { ok: true };
}

// The name and picture shown for them, changed in Settings.
export async function saveLook(userId, { display_name, avatar }) {
  if (!supabase) return { ok: false, reason: "Accounts are not configured" };
  const { data, error } = await supabase.from("profiles").update({ display_name, avatar }).eq("user_id", userId).select("user_id");
  if (error) return { ok: false, reason: /column/.test(error.message) ? "Profiles are being set up. Try again soon." : error.message };
  return data?.length ? { ok: true } : { ok: false, reason: "Fill in your details first." };
}

export async function activeAnnouncement() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("announcements").select("id, message, link").eq("active", true)
    .order("created_at", { ascending: false }).limit(1);
  return error ? null : data?.[0] ?? null;
}

export async function latestUpdates(limit = 4) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("updates").select("id, version, title, body, published_at")
    .order("published_at", { ascending: false }).limit(limit);
  return error ? [] : data || [];
}

// The signed in person's staff role, tester flag and ban. Only decides what
// the app shows; the database enforces all of it for itself.
export async function myAccess() {
  const none = { role: null, tester: false, banned: false, reason: null };
  if (!supabase) return none;
  const { data, error } = await supabase.rpc("my_access");
  if (!error && data) return { ...none, ...data };
  // before roles.sql is run, fall back to the plain staff check
  const r = await supabase.rpc("is_staff");
  return { ...none, role: !r.error && r.data === true ? "admin" : null };
}

// Approved reviews with the reviewer's first name and picture.
export async function publicReviews(n = 3) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("public_reviews", { n });
  if (!error) return data || [];
  return approvedReviews(n);
}


// One round of syncing: the account's copy and this device's merged, the
// result kept on both, and the app told so the screen shows it. Run on sign
// in, after changes here, when the app comes back into view and once a
// minute, so a topic made on a phone appears on the laptop without a reload.
let syncing = null;
export function syncNow(userId) {
  if (!supabase || !userId) return Promise.resolve(false);
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      const remote = await pullProgress(userId);
      const before = JSON.stringify(localSnapshot());
      const merged = merge(localSnapshot(), remote || {});
      applySnapshot(merged);
      const changedHere = JSON.stringify(localSnapshot()) !== before;
      if (JSON.stringify(remote || {}) !== JSON.stringify(merged)) await pushProgress(userId, merged);
      if (changedHere) window.dispatchEvent(new Event("dwiddle:synced"));
      return true;
    } catch (err) {
      console.warn("[sync]", err?.message || err);
      return false;
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}