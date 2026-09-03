// Supabase client and progress sync.
//
// The URL and anon key are public by design: they identify the project, they
// do not grant access. What protects the data is row level security in
// supabase/schema.sql, which restricts every row to the user who owns it.
// The app works without these variables set, falling back to local storage.

import { createClient } from "@supabase/supabase-js";
import { load, save, KEYS } from "./store.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
