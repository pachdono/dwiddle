// Friends, the weekly board, messages and the online library. Everything goes
// through functions in the database that check who is asking (see
// supabase/social.sql). Until that file has been run, every call answers
// { missing: true } and the screens say so rather than failing.

import { supabase } from "./supabase.js";

const gone = (e) => e && (e.code === "PGRST202" || e.code === "42883" || e.code === "42P01" || e.code === "PGRST205" || /could not find|does not exist/i.test(e.message || ""));
const fail = (e) => ({ ok: false, missing: gone(e), error: e?.message || "Something went wrong." });

async function rpc(name, args) {
  if (!supabase) return { ok: false, missing: true, error: "Not connected." };
  const { data, error } = await supabase.rpc(name, args);
  return error ? fail(error) : { ok: true, data };
}

export const setHandle = (h) => rpc("set_handle", { h });
export const reportXp = (p_total) => rpc("report_xp", { p_total });
export const leaderboard = (scope) => rpc("leaderboard", { scope });
export const findPerson = (h) => rpc("find_person", { h: String(h || "").trim().replace(/^@/, "") });
export const addFriend = (other) => rpc("add_friend", { other });
export const answerFriend = (other, accept) => rpc("answer_friend", { other, accept });
export const myFriends = () => rpc("my_friends");
export const explore = (q = "", n = 40) => rpc("explore", { q, n });
export const openShare = (sid) => rpc("open_share", { sid });
export const countSave = (sid) => rpc("count_save", { sid });
export const reportShare = (sid, why) => rpc("report_share", { sid, why });

export async function myHandle(userId) {
  if (!supabase || !userId) return null;
  const { data } = await supabase.from("profiles").select("handle").eq("user_id", userId).maybeSingle();
  return data?.handle || null;
}

export async function publish({ kind, title, about, subject, payload, listed }) {
  if (!supabase) return { ok: false, missing: true, error: "Not connected." };
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return { ok: false, error: "Sign in first." };
  const size = JSON.stringify(payload).length;
  if (size > 2900000) return { ok: false, error: "That is too big to share. Try a smaller one." };
  const { data, error } = await supabase.from("shares")
    .insert({ owner: u.user.id, kind, title: title.slice(0, 120), about: about?.slice(0, 300) || null, subject: subject?.slice(0, 40) || null, payload, listed: !!listed })
    .select("id").single();
  return error ? fail(error) : { ok: true, id: data.id };
}

export async function myShares() {
  if (!supabase) return { ok: false, missing: true };
  const { data, error } = await supabase.from("shares").select("id, kind, title, listed, hidden, saves, created_at").order("created_at", { ascending: false });
  return error ? fail(error) : { ok: true, data: data || [] };
}

export async function removeShare(id) {
  const { error } = await supabase.from("shares").delete().eq("id", id);
  return error ? fail(error) : { ok: true };
}

/* ---------- messages ---------- */

const COLS = "id, from_id, to_id, body, created_at";
const COLS_V2 = COLS + ", kind, attach, reply_to, reply_preview";

export async function messagesWith(friend, limit = 80) {
  if (!supabase) return { ok: false, missing: true };
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) return { ok: false, error: "Sign in first." };
  const ask = (cols) => supabase.from("messages").select(cols)
    .or(`and(from_id.eq.${me},to_id.eq.${friend}),and(from_id.eq.${friend},to_id.eq.${me})`)
    .order("id", { ascending: false }).limit(limit);
  // the newer columns come from supabase/messages-v2.sql; without it, plain text
  let { data, error } = await ask(COLS_V2);
  let v2 = !error;
  if (error) ({ data, error } = await ask(COLS));
  return error ? fail(error) : { ok: true, me, v2, data: (data || []).reverse() };
}

// extra: { kind, attach, data, replyTo, replyPreview } for replies, photos, files and shares
export async function sendMessage(to, body, extra = {}) {
  const { data: u } = await supabase.auth.getUser();
  const kind = extra.kind || "text";
  const text = String(body || "").trim().slice(0, 1000);
  if (!text) return { ok: false, error: "Nothing to send." };
  const row = { from_id: u.user.id, to_id: to, body: text };
  const rich = kind !== "text" || extra.replyTo;
  if (kind !== "text") Object.assign(row, { kind, attach: extra.attach || null, data: extra.data || null });
  if (extra.replyTo) Object.assign(row, { reply_to: extra.replyTo, reply_preview: extra.replyPreview || null });
  const { data, error } = await supabase.from("messages").insert(row).select(rich ? COLS_V2 : COLS).single();
  if (error && /column|schema cache/i.test(error.message || "")) return { ok: false, error: "Replies, photos and files are not switched on yet. Staff: run supabase/messages-v2.sql once." };
  return error ? fail(error) : { ok: true, data };
}

export async function deleteMessage(id) {
  const { error } = await supabase.from("messages").delete().eq("id", id);
  return error ? fail(error) : { ok: true };
}

// A photo or file is kept out of the message list and fetched when it is shown.
const dataCache = new Map();
export async function messageData(id) {
  if (dataCache.has(id)) return dataCache.get(id);
  const { data, error } = await supabase.rpc("message_data", { mid: id });
  if (error || !data) return null;
  dataCache.set(id, data);
  return data;
}
export const cacheMessageData = (id, data) => { if (data) dataCache.set(id, data); };

// Calls back when a message for this person arrives. Returns how to stop.
export function onMessage(me, fn) {
  if (!supabase) return () => {};
  const ch = supabase.channel("msgs:" + me)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `to_id=eq.${me}` }, (p) => fn(p.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/* ---------- what a share carries ---------- */

// A folder, as everything a stranger needs to study it. No lessons progress,
// no personal data: just topics, questions, drills, notes and the sheet.
export function packMaterial(view) {
  return {
    title: view.title,
    topics: view.topics,
    questions: view.questions,
    drills: view.drills || [],
    notes: view.notes || {},
    sheet: view.sheet || null,
  };
}

// Anything that came from outside is checked before it is kept.
export function unpackMaterial(p) {
  if (!p || typeof p !== "object" || !Array.isArray(p.topics) || !Array.isArray(p.questions)) return null;
  const str = (s, n) => (typeof s === "string" ? s.slice(0, n) : "");
  const topics = p.topics.filter((t) => t && typeof t.name === "string").slice(0, 80).map((t, i) => ({ id: str(t.id, 40) || "s" + i, name: str(t.name, 120), reason: str(t.reason, 300), questions: Number(t.questions) || 0 }));
  const names = new Set(topics.map((t) => t.name));
  const questions = p.questions.filter((q) => q && names.has(q.topic) && typeof q.q === "string").slice(0, 600);
  return {
    title: str(p.title, 120) || "Shared material",
    topics, questions,
    drills: (Array.isArray(p.drills) ? p.drills : []).filter((d) => d && names.has(d.topic)).slice(0, 300),
    notes: Object.fromEntries(Object.entries(p.notes && typeof p.notes === "object" ? p.notes : {}).filter(([k, v]) => names.has(k) && Array.isArray(v))),
    lessons: {},
    sheet: p.sheet && typeof p.sheet === "object" ? p.sheet : null,
  };
}
