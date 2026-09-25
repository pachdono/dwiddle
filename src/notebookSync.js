// Notebooks follow the account.
//
// Each notebook is one file in Supabase Storage, in a folder named after the
// account, beside a small index saying when each was last changed or deleted.
// A sync reads the index, sends up whatever changed here, brings down whatever
// changed elsewhere, and applies deletions, so only changed notebooks travel.
// Signed out, nothing leaves the device.

import { supabase } from "./supabase.js";
import { listBooks, getBook, putRaw, deleteBook } from "./notebookStore.js";

const BUCKET = "notebooks";
const PENDING_DEL = "dwiddle-nb-deleted";
const loadDels = () => { try { return JSON.parse(localStorage.getItem(PENDING_DEL) || "[]"); } catch { return []; } };
const saveDels = (d) => { try { localStorage.setItem(PENDING_DEL, JSON.stringify(d)); } catch {} };

async function account() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}

async function readIndex(uid) {
  const { data, error } = await supabase.storage.from(BUCKET).download(`${uid}/index.json`);
  if (error) {
    if (/not.?found|does not exist|object not found/i.test(error.message || "") && !/bucket/i.test(error.message || "")) return { books: {} };
    throw error;
  }
  try { return JSON.parse(await data.text()); } catch { return { books: {} }; }
}

const upload = (path, value) => supabase.storage.from(BUCKET).upload(path,
  new Blob([JSON.stringify(value)], { type: "application/json" }), { upsert: true, contentType: "application/json" });

let running = null;
export function syncNotebooks() {
  if (running) return running;
  running = (async () => {
    const user = await account();
    if (!user) return { state: "signed-out" };
    let index;
    try { index = await readIndex(user.id); } catch (err) {
      return /bucket/i.test(err?.message || "") ? { state: "unavailable", message: err.message } : { state: "error", message: err?.message };
    }
    index.books ||= {};
    let indexChanged = false, changed = false;

    // Deletions made here while offline or signed out.
    const dels = loadDels();
    if (dels.length) {
      await supabase.storage.from(BUCKET).remove(dels.map((id) => `${user.id}/${id}.json`));
      dels.forEach((id) => { index.books[id] = { deleted: true, updated: Date.now() }; });
      saveDels([]);
      indexChanged = true;
    }

    const local = await listBooks();
    for (const b of local) {
      const r = index.books[b.id];
      if (r?.deleted && r.updated >= (b.updated || 0)) { await deleteBook(b.id); changed = true; continue; }
      if (!r || r.deleted || (b.updated || 0) > r.updated) {
        const { error } = await upload(`${user.id}/${b.id}.json`, b);
        if (!error) { index.books[b.id] = { updated: b.updated || Date.now() }; indexChanged = true; }
      }
    }
    for (const [id, r] of Object.entries(index.books)) {
      if (r.deleted) continue;
      const mine = local.find((b) => b.id === id);
      if (!mine || r.updated > (mine.updated || 0)) {
        const { data, error } = await supabase.storage.from(BUCKET).download(`${user.id}/${id}.json`);
        if (!error) {
          try { await putRaw(JSON.parse(await data.text())); changed = true; } catch { /* a damaged copy is skipped */ }
        }
      }
    }
    if (indexChanged) await upload(`${user.id}/index.json`, index);
    return { state: "synced", changed };
  })().finally(() => { running = null; });
  return running;
}

// Changes are sent a moment after they stop, not on every stroke.
let timer = 0;
export function queueUpload() {
  clearTimeout(timer);
  timer = setTimeout(() => { syncNotebooks().catch(() => {}); }, 2500);
}

export function queueDelete(id) {
  saveDels([...new Set([...loadDels(), id])]);
  queueUpload();
}

export { getBook };
