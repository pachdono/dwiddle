import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase.js";
import { diffBooks, applyOps, fullOps, mergeOps, invertDiff, cleanCursor, split, Joiner } from "./liveNotebook.js";

// Joins a notebook to a live room and keeps the two ends in step. The rules for
// what a change looks like are in liveNotebook.js; this is the plumbing.
//
//   code    the room, or "" when not live
//   host    true for the person who started it: they hold the notebook that
//           others are sent when they arrive
//   book    the notebook on screen, setBook changes it
//   save    saves the notebook on this device (a joiner keeps their copy)

const FLUSH_MS = 120; // changes made in this time go out together
const SPACING_MS = 30;
const UNDO_DEPTH = 60; // gap between messages, under the room's rate limit
let n = 0;

export function useLiveNotebook({ code: wanted, host, book, setBook, save, myId, myName, pageId }) {
  // not before the notebook itself has loaded, or there is nothing to compare with
  const code = book ? wanted : "";
  const [status, setStatus] = useState("off"); // off | connecting | live | error
  const [people, setPeople] = useState([]);
  const [error, setError] = useState("");
  const [cursors, setCursors] = useState([]); // other people's pointers: { id, name, p, x, y, at }
  const curs = useRef(new Map());
  const lastCur = useRef(0);
  const pageRef = useRef(pageId);
  pageRef.current = pageId;
  const chan = useRef(null);
  const base = useRef(null); // the notebook as both sides last agreed
  const bookRef = useRef(book);
  const ready = useRef(false);
  const pending = useRef([]);
  const outbox = useRef([]);
  const timers = useRef({ flush: 0, drain: 0, save: 0 });
  const joiner = useRef(new Joiner());
  // Undo while live takes back only what I did. Each change of mine is kept with
  // the ops that undo exactly it, so a friend's work in between is never touched.
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const replay = useRef(null); // "undo" | "redo" while an undo or redo is being applied
  const [depth, setDepth] = useState({ undo: 0, redo: 0 });
  const sync = () => setDepth({ undo: undoStack.current.length, redo: redoStack.current.length });
  const saveRef = useRef(save);
  bookRef.current = book;
  saveRef.current = save;

  function pump() {
    if (timers.current.drain) return;
    timers.current.drain = setInterval(() => {
      const m = outbox.current.shift();
      if (!m) { clearInterval(timers.current.drain); timers.current.drain = 0; return; }
      chan.current?.send({ type: "broadcast", event: m.event, payload: m.payload });
    }, SPACING_MS);
  }
  function sendOps(ops) {
    if (!ops.length) return;
    const mid = (myId || "x").slice(0, 6) + (++n).toString(36) + Date.now().toString(36);
    for (const piece of split(JSON.stringify(ops), mid)) outbox.current.push({ event: "ops", payload: piece });
    pump();
  }

  useEffect(() => {
    if (!code) { setStatus("off"); setPeople([]); return; }
    if (!supabase) { setStatus("error"); setError("Live notebooks need an online connection, which this copy does not have."); return; }
    setStatus("connecting"); setError("");
    ready.current = !!host;
    base.current = bookRef.current;
    pending.current = []; outbox.current = [];
    undoStack.current = []; redoStack.current = []; replay.current = null; sync();
    joiner.current = new Joiner();

    const ch = supabase.channel("nb:" + code, { config: { broadcast: { self: false }, presence: { key: myId } } });
    chan.current = ch;
    ch.on("presence", { event: "sync" }, () => setPeople(Object.values(ch.presenceState()).flat().map((p) => ({ id: p.id, name: p.name, host: p.host, page: p.page }))))
      .on("broadcast", { event: "ops" }, ({ payload }) => {
        const text = joiner.current.add(payload);
        if (text === null) return;
        let ops;
        try { ops = JSON.parse(text); } catch { return; }
        if (!Array.isArray(ops)) return;
        // theirs go into both the notebook and the agreed copy, so only what is
        // really mine is left to send
        base.current = applyOps(base.current, ops);
        setBook((prev) => (prev ? applyOps(prev, ops) : prev));
        clearTimeout(timers.current.save);
        timers.current.save = setTimeout(() => saveRef.current?.(bookRef.current), 700);
      })
      .on("broadcast", { event: "cur" }, ({ payload }) => {
        const c = cleanCursor(payload);
        if (!c || c.id === myId) return;
        curs.current.set(c.id, { ...c, at: Date.now() });
        setCursors([...curs.current.values()]);
      })
      .on("broadcast", { event: "synced" }, () => { ready.current = true; setStatus("live"); })
      .on("broadcast", { event: "hello" }, () => {
        if (!host) return;
        // someone arrived: send them the whole notebook, then say it is all there
        sendOps(fullOps(bookRef.current));
        outbox.current.push({ event: "synced", payload: {} });
        pump();
      })
      .subscribe(async (s) => {
        if (s === "SUBSCRIBED") {
          await ch.track({ id: myId, name: myName, host: !!host, page: pageRef.current });
          if (host) setStatus("live"); else ch.send({ type: "broadcast", event: "hello", payload: {} });
        }
        if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") { setStatus("error"); setError("Could not reach the room. Check your connection and try again."); }
      });
    return () => {
      clearTimeout(timers.current.flush); clearTimeout(timers.current.save);
      clearInterval(timers.current.drain); timers.current.drain = 0;
      supabase.removeChannel(ch);
      chan.current = null; ready.current = false; setPeople([]); setStatus("off");
    };
  }, [code, host]); // eslint-disable-line react-hooks/exhaustive-deps

  // tell the room which page I am on, and drop pointers that stopped moving
  useEffect(() => {
    if (!code || !chan.current || status === "connecting" || status === "error") return;
    chan.current.track({ id: myId, name: myName, host: !!host, page: pageId });
  }, [pageId, status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!code) { curs.current.clear(); setCursors([]); return; }
    const t = setInterval(() => {
      let drop = false;
      for (const [id, c] of curs.current) if (Date.now() - c.at > 4000) { curs.current.delete(id); drop = true; }
      if (drop) setCursors([...curs.current.values()]);
    }, 1000);
    return () => clearInterval(t);
  }, [code]);

  // where my pointer is, a few times a second
  function moveCursor(p, x, y) {
    const now = Date.now();
    if (!chan.current || status !== "live" || now - lastCur.current < 70) return;
    lastCur.current = now;
    chan.current.send({ type: "broadcast", event: "cur", payload: { id: myId, name: myName, p, x: Math.round(x), y: Math.round(y) } });
  }

  // whatever I change goes out a moment later, as small changes
  useEffect(() => {
    if (!code || !ready.current || !book || !base.current || book === base.current) return;
    const ops = diffBooks(base.current, book);
    const inverse = ops.length ? invertDiff(base.current, book) : [];
    base.current = book;
    if (!ops.length) { replay.current = null; return; }
    if (replay.current === "undo") redoStack.current.push(inverse);
    else if (replay.current === "redo") undoStack.current.push(inverse);
    else { undoStack.current.push(inverse); redoStack.current = []; }
    replay.current = null;
    if (undoStack.current.length > UNDO_DEPTH) undoStack.current.shift();
    sync();
    pending.current.push(...ops);
    clearTimeout(timers.current.flush);
    timers.current.flush = setTimeout(() => { const list = mergeOps(pending.current); pending.current = []; sendOps(list); }, FLUSH_MS);
  }, [book, code, status]); // eslint-disable-line react-hooks/exhaustive-deps

  function step(from, mode) {
    const inverse = from.current.pop();
    if (!inverse) return;
    replay.current = mode;
    setBook((prev) => {
      const next = prev ? applyOps(prev, inverse) : prev;
      if (next === prev) replay.current = null; // nothing changed, so nothing to record
      return next;
    });
    clearTimeout(timers.current.save);
    timers.current.save = setTimeout(() => saveRef.current?.(bookRef.current), 700);
    sync();
  }
  const undo = () => step(undoStack, "undo");
  const redo = () => step(redoStack, "redo");

  return { status, people, error, cursors, moveCursor, undo, redo, canUndo: depth.undo > 0, canRedo: depth.redo > 0 };
}
