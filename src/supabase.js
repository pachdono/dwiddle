// Supabase client and progress sync.
//
// The URL and anon key are public by design: they identify the project, they
// do not grant access. What protects the data is row level security in
// supabase/schema.sql, which restricts every row to the user who owns it.
// The app works without these variables set, falling back to local storage.

import { createClient } from "@supabase/supabase-js";
import { load, save, KEYS } from "./store.js";

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

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
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } })
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
];

// Roughly how much of a row Supabase will take happily. The question bank is
// the only thing that can approach it.
const MAX_PAYLOAD = 600 * 1024;

export function localSnapshot() {
  const out = {};
  SYNCED.forEach((k) => { out[k] = load(k, null); });
  return out;
}

export function applySnapshot(data) {
  if (!data) return;
  SYNCED.forEach((k) => {
    if (data[k] !== undefined && data[k] !== null) save(k, data[k]);
  });
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

function mergeMade(a, b) {
  if (!a) return b;
  if (!b) return a;
  const questions = [...a.questions];
  const ids = new Set(questions.map((q) => q.id));
  b.questions.forEach((q) => { if (!ids.has(q.id)) questions.push(q); });

  const topics = [...a.topics];
  const names = new Set(topics.map((t) => t.name));
  b.topics.forEach((t) => { if (!names.has(t.name)) topics.push(t); });

  return { ...b, topics, questions, sheet: b.sheet || a.sheet };
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

  SYNCED.forEach((k) => {
    const a = localData?.[k];
    const b = remoteData?.[k];

    if (k === KEYS.stats) out[k] = mergeStats(a, b);
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
export async function submitFeedback({ kind, rating, message, contact }) {
  if (!supabase) return { stored: false, reason: "Accounts are not configured" };

  const { data: session } = await supabase.auth.getSession();
  const user = session?.session?.user ?? null;

  const { error } = await supabase.from("feedback").insert({
    user_id: user?.id ?? null,
    kind,
    rating: kind === "review" ? rating : null,
    message,
    contact: contact || user?.email || null,
  });

  if (error) {
    console.warn("[feedback] insert failed", error.message);
    return { stored: false, reason: error.message };
  }
  return { stored: true, from: user?.email ?? null };
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
    .from("profiles").select("first_name, last_name, birth_date, country").eq("user_id", userId).maybeSingle();
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
  }, { onConflict: "user_id" });
  return error ? { ok: false, reason: error.message } : { ok: true };
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

// Whether the signed in account is on the staff list. Only decides whether a
// link shows; the staff site and the database check again for themselves.
export async function amStaff() {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("is_staff");
  return !error && data === true;
}
