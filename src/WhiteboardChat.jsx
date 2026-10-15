import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui.jsx";
import { SharePicker } from "./Social.jsx";
import { shrink } from "./custom.js";
import { CHAT_DATA, CHAT_FILE_BYTES, personColour } from "./whiteboard.js";

// The chat beside the board: reply, delete your own, photos and files. It only
// shows and collects; the board screen owns the messages and the channel.

const clock = (t) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const onlyEmoji = (t) => /^(\p{Extended_Pictographic}|‍|️|\s){1,8}$/u.test(t);
const sizeText = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
const readAsData = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onerror = () => rej(new Error("That file could not be read.")); r.onload = () => res(r.result); r.readAsDataURL(file); });
const previewOf = (m) => (m.kind === "image" ? "Photo" : m.kind === "file" ? m.attach?.name || "File" : m.kind === "share" ? m.attach?.title || "Shared" : String(m.body || "").slice(0, 90));

export default function WhiteboardChat({ me, name, msgs, onSend, onDelete }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [picker, setPicker] = useState(false);
  const photoIn = useRef(null), fileIn = useRef(null), list = useRef(null), box = useRef(null);

  useEffect(() => { const el = list.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs.length]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  const reply = () => (replyTo ? { reply: { from: replyTo.by === me ? "You" : replyTo.name, text: previewOf(replyTo) } } : {});
  function say() {
    const t = text.trim();
    if (!t) return;
    onSend({ kind: "text", body: t, ...reply() });
    setText(""); setErr(""); setReplyTo(null);
  }
  // the copy is saved by the picker; only its link goes into the room
  function share({ kind, id, title }) {
    onSend({ kind: "share", body: `Shared ${kind === "notebook" ? "a notebook" : "a folder"}: ${title}`.slice(0, 300), attach: { id, kind, title }, ...reply() });
    setErr(""); setReplyTo(null);
    return true;
  }
  async function photo(file) {
    if (!file) return;
    try {
      let data = "";
      for (const [side, q] of [[960, 0.7], [720, 0.6], [480, 0.55]]) {
        data = await shrink(file, side, q);
        if (data.length <= CHAT_DATA) break;
      }
      if (data.length > CHAT_DATA) { setErr("That photo is too big even after shrinking it."); return; }
      onSend({ kind: "image", body: "Sent a photo", data, attach: { name: file.name, size: 0 }, ...reply() });
      setErr(""); setReplyTo(null);
    } catch (e) { setErr(e.message); }
  }
  async function attach(file) {
    if (!file) return;
    if (file.size > CHAT_FILE_BYTES) { setErr(`Files up to ${sizeText(CHAT_FILE_BYTES)} can be sent here.`); return; }
    try {
      const data = await readAsData(file);
      if (data.length > CHAT_DATA) { setErr(`Files up to ${sizeText(CHAT_FILE_BYTES)} can be sent here.`); return; }
      onSend({ kind: "file", body: `Sent a file: ${file.name}`.slice(0, 300), data, attach: { name: file.name, size: file.size }, ...reply() });
      setErr(""); setReplyTo(null);
    } catch (e) { setErr(e.message); }
  }

  let prev = null;
  return (
    <div className="wb-chat card">
      <div className="wb-chat-msgs sc-msgs" ref={list}>
        {msgs.length === 0 && <div className="sc-empty small muted">Nothing said yet. Messages here are gone when everyone leaves.</div>}
        {msgs.map((m) => {
          const mine = m.by === me;
          const first = !prev || prev.by !== m.by || m.at - prev.at > 5 * 60000;
          prev = m;
          return (
            <div key={m.id} className="cm-wrap">
              <div className={"cm-row" + (mine ? " mine" : "") + (first ? " first" : "")}>
                <div className="cm-col">
                  {first && <span className="cm-name" style={{ color: personColour(m.by) }}>{mine ? "You" : m.name}<time>{clock(m.at)}</time></span>}
                  {m.reply && <div className="cm-quote"><b>{m.reply.from}</b><span>{m.reply.text}</span></div>}
                  {m.kind === "image" ? (
                    <div className="cm-bubble rich image"><a className="cm-img" href={m.data} target="_blank" rel="noreferrer" aria-label="Open the photo"><img src={m.data} alt="A photo sent in the chat" loading="lazy" /></a></div>
                  ) : m.kind === "share" ? (
                    <div className="cm-bubble rich share">
                      <div className="cm-share">
                        <span className={"xp-kind " + (m.attach?.kind || "material")}>{m.attach?.kind === "notebook" ? "Notebook" : "Folder"}</span>
                        <b>{m.attach?.title}</b>
                        <a className="btn small" href={`${location.origin}/?share=${m.attach?.id}`} target="_blank" rel="noreferrer">Open and save a copy</a>
                      </div>
                    </div>
                  ) : m.kind === "file" ? (
                    <div className="cm-bubble rich file">
                      <a className="cm-file" href={m.data} download={m.attach?.name || "file"}>
                        <span className="cm-file-ico"><Icon name="file" size={20} /></span>
                        <span className="cm-file-t"><b>{m.attach?.name || "File"}</b><span className="small">{m.attach?.size ? sizeText(m.attach.size) : ""} · Download</span></span>
                      </a>
                    </div>
                  ) : <div className={"cm-bubble" + (onlyEmoji(m.body) ? " big" : "")}>{m.body}</div>}
                  <span className="cm-acts">
                    <button type="button" onClick={() => { setReplyTo(m); box.current?.focus({ preventScroll: true }); }}>Reply</button>
                    {mine && <button type="button" onClick={() => onDelete(m)}>Delete</button>}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {err && <div className="dl-err">{err}</div>}
      {replyTo && (
        <div className="cm-replying"><span><b>Replying to {replyTo.by === me ? "yourself" : replyTo.name}</b> {previewOf(replyTo)}</span>
          <button type="button" className="icon-btn" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><Icon name="close" size={13} /></button></div>
      )}
      {picker && <SharePicker onClose={() => setPicker(false)} onSend={share} />}
      <form className="cm-send" onSubmit={(e) => { e.preventDefault(); say(); }}>
        <span className="cm-tools">
          <button type="button" className="icon-btn" aria-label="Send a photo" title="Photo" onClick={() => photoIn.current?.click()}><Icon name="image" size={18} /></button>
          <button type="button" className="icon-btn" aria-label="Send a file" title="File" onClick={() => fileIn.current?.click()}><Icon name="file" size={18} /></button>
          <button type="button" className="icon-btn" aria-label="Share a notebook or folder" title="Share a notebook or folder" onClick={() => setPicker((v) => !v)}><Icon name="folder" size={18} /></button>
          <input ref={photoIn} type="file" accept="image/*" hidden onChange={(e) => { photo(e.target.files[0]); e.target.value = ""; }} />
          <input ref={fileIn} type="file" hidden onChange={(e) => { attach(e.target.files[0]); e.target.value = ""; }} />
        </span>
        <textarea ref={box} rows={1} value={text} maxLength={1000} placeholder="Message" aria-label={"Message as " + name}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); say(); } }} />
        <button className="btn cta" type="submit" disabled={!text.trim()}>Send</button>
      </form>
    </div>
  );
}
