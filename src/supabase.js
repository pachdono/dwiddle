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

export const supabase = configured
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

// The keys that follow you between devices.
const SYNCED = [KEYS.known, KEYS.missed, KEYS.topic, KEYS.hidden, KEYS.quizLen];

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
}

// Merge rather than overwrite: signing in on a second device should not throw
// away what you did on the first. Lists union, single values prefer whichever
// side actually has one.
export function merge(localData, remoteData) {
  const out = { ...remoteData };
  SYNCED.forEach((k) => {
    const a = localData?.[k];
    const b = remoteData?.[k];
    if (Array.isArray(a) || Array.isArray(b)) {
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
  const { error } = await supabase
    .from("progress")
    .upsert({ user_id: userId, data }, { onConflict: "user_id" });
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
