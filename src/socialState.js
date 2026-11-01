// What is new for the signed in person: messages they have not read, and
// friend requests waiting. One place owns the realtime subscription and the
// counts, so the sidebar badge, the Friends page and the little toast all
// agree. What has been read is kept on this device, per friend, as the highest
// message id seen, so it needs nothing from the database.

import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { myFriends, onMessage } from "./social.js";

const SEEN = "dwiddle-chat-seen";
const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || "null"); } catch { return null; } };
const writeSeen = (m) => { try { localStorage.setItem(SEEN, JSON.stringify(m)); } catch {} };

let me = null;
let state = { unread: {}, requests: 0, people: {} };
let seen = {};
let incoming = []; // messages to me still in memory: { id, from_id, body, created_at }
let active = null; // the friend whose thread is open on screen right now
let stopRealtime = null, timer = null;
const subs = new Set();
const hub = new Set();
const emit = () => subs.forEach((f) => f(state));

function recount() {
  const unread = {};
  for (const m of incoming) if (m.id > (seen[m.from_id] || 0) && m.from_id !== active) unread[m.from_id] = (unread[m.from_id] || 0) + 1;
  state = { ...state, unread };
  emit();
}

async function pull() {
  if (!supabase || !me) return;
  const { data } = await supabase.from("messages").select("id, from_id, to_id, body, created_at").eq("to_id", me).order("id", { ascending: false }).limit(150);
  if (data) {
    incoming = data;
    // first time on this device: everything already there counts as read
    if (readSeen() === null) {
      for (const m of data) seen[m.from_id] = Math.max(seen[m.from_id] || 0, m.id);
      writeSeen(seen);
    }
  }
  const f = await myFriends();
  if (f.ok) {
    const people = {};
    f.data.forEach((p) => { people[p.user_id] = p; });
    state = { ...state, people, requests: f.data.filter((p) => p.status === "pending" && p.incoming).length };
  }
  recount();
}

export function startSocial(userId) {
  if (me === userId) return;
  stopSocial();
  me = userId;
  seen = readSeen() || {};
  pull();
  stopRealtime = onMessage(userId, (m) => {
    if (!incoming.some((x) => x.id === m.id)) incoming = [m, ...incoming].slice(0, 300);
    hub.forEach((f) => f(m));
    recount();
  });
  timer = setInterval(() => { if (document.visibilityState === "visible") pull(); }, 30000);
}
export function stopSocial() {
  stopRealtime?.(); stopRealtime = null;
  clearInterval(timer); timer = null;
  me = null; incoming = []; seen = {};
  state = { unread: {}, requests: 0, people: {} };
  emit();
}

// The thread on screen. Messages from that friend are read as they arrive.
export function setActiveThread(friendId) {
  active = friendId;
  if (friendId) markRead(friendId);
  else recount();
}
function markRead(friendId) {
  const top = incoming.filter((m) => m.from_id === friendId).reduce((a, m) => Math.max(a, m.id), 0);
  if (top > (seen[friendId] || 0)) { seen[friendId] = top; writeSeen(seen); }
  recount();
}
// Called by the thread when it loads older messages, so it also counts as read.
export function seenUpTo(friendId, id) {
  if (id > (seen[friendId] || 0)) { seen[friendId] = id; writeSeen(seen); recount(); }
}
export const refreshSocial = () => pull();
export const onIncoming = (f) => { hub.add(f); return () => hub.delete(f); };
export const peopleNow = () => state.people;
export const activeNow = () => active;

export function useSocial() {
  const [s, setS] = useState(state);
  useEffect(() => { subs.add(setS); setS(state); return () => subs.delete(setS); }, []);
  const messages = Object.values(s.unread).reduce((a, n) => a + n, 0);
  return { ...s, messages, badge: messages + s.requests };
}
