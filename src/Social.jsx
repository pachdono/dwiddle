import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, PageHead } from "./ui.jsx";
import { leaderboard, myFriends, addFriend, answerFriend, findPerson, setHandle, myHandle, messagesWith, sendMessage } from "./social.js";
import { useSocial, setActiveThread, seenUpTo, onIncoming, refreshSocial } from "./socialState.js";
import { useMyProfile, UserIcon } from "./Profile.jsx";

// Friends, the weekly board and messages, in one place.

const TABS = [["friends", "Friends"], ["chat", "Messages"]];

function Setup({ what }) {
  return (
    <div className="card card-pad sc-note">
      <b>{what} is not switched on yet</b>
      <p className="small muted">The database half of this has not been set up. Staff: run <code>supabase/social.sql</code> in the Supabase SQL editor, once.</p>
    </div>
  );
}

export default function Social({ auth, onSignIn, compact = false }) {
  const [tab, setTab] = useState(() => { try { const t = sessionStorage.getItem("dwiddle-social-tab"); return t === "chat" ? "chat" : "friends"; } catch { return "friends"; } });
  const [chatWith, setChatWith] = useState(null);
  const soc = useSocial();
  const pick = (t) => { setTab(t); try { sessionStorage.setItem("dwiddle-social-tab", t); } catch {} };

  if (!auth?.user) {
    return (
      <div className={compact ? "sc-compact" : "page fade sc"}>
        {!compact && <PageHead title="Friends" sub="Add friends and message them." />}
        <div className="card card-pad sc-note"><b>Sign in to use this</b><p className="small muted">Friends and the board live on your account.</p>
          <button className="btn cta" onClick={onSignIn}>Sign in</button></div>
      </div>
    );
  }
  return (
    <div className={compact ? "sc-compact" : "page fade sc"}>
      {!compact && <PageHead title="Friends" sub="Add friends and message them." />}
      <div className="hf-switch sc-tabs" role="tablist">
        {TABS.map(([id, label]) => {
          const n = id === "friends" ? soc.requests : soc.messages;
          return <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => pick(id)}>{label}{n > 0 && <i className="badge">{n > 99 ? "99+" : n}</i>}</button>;
        })}
      </div>
      {tab === "friends" && <Friends user={auth.user} openChat={(f) => { setChatWith(f); pick("chat"); }} />}
      {tab === "chat" && <Chat user={auth.user} start={chatWith} compact={compact} />}
    </div>
  );
}

/* ---------- the weekly board ---------- */

function Board({ user }) {
  const [scope, setScope] = useState("everyone");
  const [rows, setRows] = useState(null);
  const [miss, setMiss] = useState(false);
  const load = useCallback(() => {
    setRows(null);
    leaderboard(scope).then((r) => { if (r.ok) { setRows(r.data || []); setMiss(false); } else { setMiss(!!r.missing); setRows([]); } });
  }, [scope]);
  useEffect(load, [load]);
  if (miss) return <Setup what="The leaderboard" />;
  const medal = ["#f5c242", "#b8c1cc", "#d9965b"];
  return (
    <>
      <div className="sc-row">
        <div className="hf-switch">
          <button className={scope === "everyone" ? "on" : ""} onClick={() => setScope("everyone")}>Global</button>
          <button className={scope === "friends" ? "on" : ""} onClick={() => setScope("friends")}>Friends</button>
        </div>
        <span className="small muted">{scope === "everyone" ? "All time XP." : "XP earned this month. Resets on the 1st."}</span>
      </div>
      <div className="card">
        {rows === null && <div className="card-pad small muted">Loading...</div>}
        {rows?.length === 0 && <div className="card-pad small muted">{scope === "friends" ? "Add a friend and you will race here." : "Nobody is on the board yet."}</div>}
        {rows?.map((r, i) => {
          const rank = r.rank ?? i + 1;
          if (rank > 10 && !r.me) return null;
          return (
            <div key={r.user_id}>
              {rank > 10 && <div className="sc-gap" aria-hidden="true">...</div>}
              <div className={"sc-rank" + (r.me ? " me" : "")}>
                <span className={"sc-pos" + (rank > 99 ? " wide" : "")} style={rank <= 3 ? { background: medal[rank - 1], color: "#fff" } : null}>{rank > 10 ? "#" + rank.toLocaleString() : rank}</span>
                <UserIcon avatar={r.avatar} user={null} size={34} />
                <span className="sc-who"><b>{r.me ? "You" : r.name}</b>{r.handle && <span className="small muted">@{r.handle}</span>}</span>
                <span className="sc-xp"><b>{(r.score ?? r.week_xp ?? 0).toLocaleString()}</b><span className="small muted"> XP</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- friends ---------- */

function Friends({ user, openChat }) {
  const myProfile = useMyProfile(user);
  const myName = myProfile?.display_name || "You";
  const [list, setList] = useState(null);
  const [miss, setMiss] = useState(false);
  const [handle, setH] = useState(null);
  const [mine, setMine] = useState("");
  const [q, setQ] = useState("");
  const [found, setFound] = useState(null);
  const [msg, setMsg] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const load = () => myFriends().then((r) => { if (r.ok) { refreshSocial(); setList(r.data || []); setMiss(false); setLoadErr(""); } else { setMiss(!!r.missing); setLoadErr(r.missing ? "" : r.error); setList([]); } });
  useEffect(() => { load(); myHandle(user.id).then(setH); }, [user.id]);
  if (miss) return <Setup what="Friends" />;

  async function claim() {
    const r = await setHandle(mine);
    if (r.ok) { setH(r.data); setMsg("Saved."); } else setMsg(r.error);
  }
  async function search() {
    setMsg(""); setFound(null);
    const r = await findPerson(q);
    if (!r.ok) { setMsg(r.error); return; }
    if (!r.data?.length) { setMsg("No one has that username."); return; }
    setFound(r.data[0]);
  }
  async function add(id) {
    const r = await addFriend(id);
    setMsg(r.ok ? (r.data === "accepted" ? "You are friends." : r.data === "sent" ? "Request sent." : "Already " + r.data + ".") : r.error);
    setFound(null); setQ(""); load();
  }
  const incoming = (list || []).filter((f) => f.status === "pending" && f.incoming);
  const sent = (list || []).filter((f) => f.status === "pending" && !f.incoming);
  const friends = (list || []).filter((f) => f.status === "accepted");

  return (
    <div className="stack">
      {loadErr && <div className="dl-err">Could not load your friends: {loadErr}</div>}
      <div className="card card-pad sc-me">
        <span className="sc-me-av" title={myName}><UserIcon avatar={myProfile?.avatar} user={user} size={60} /></span>
        <h3>Your username</h3>
        {handle ? <p>Friends find you as <b>@{handle}</b>. </p>
          : <p className="small muted">Pick a username so friends can find you. </p>}
        <div className="sc-form">
          <input value={mine} onChange={(e) => setMine(e.target.value.toLowerCase())} placeholder={handle ? "Change it" : "e.g. maya_studies"} maxLength={20} />
          <button className="btn" onClick={claim} disabled={mine.length < 3}>{handle ? "Change" : "Save"}</button>
        </div>
      </div>

      <div className="card card-pad">
        <h3>Add a friend</h3>
        <div className="sc-form">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Their username" />
          <button className="btn cta" onClick={search} disabled={q.trim().length < 3}>Find</button>
        </div>
        {found && (
          <div className="sc-person">
            <UserIcon avatar={found.avatar} user={null} size={36} />
            <span className="sc-who"><b>{found.name}</b><span className="small muted">@{found.handle}</span></span>
            <button className="btn small cta" onClick={() => add(found.user_id)}>Add friend</button>
          </div>
        )}
        {msg && <p className="small sc-msg">{msg}</p>}
      </div>

      {incoming.length > 0 && (
        <div className="card">
          <div className="card-head"><h3>Requests</h3></div>
          {incoming.map((f) => (
            <div key={f.user_id} className="sc-person">
              <UserIcon avatar={f.avatar} user={null} size={36} />
              <span className="sc-who"><b>{f.name}</b>{f.handle && <span className="small muted">@{f.handle}</span>}</span>
              <button className="btn small cta" onClick={() => answerFriend(f.user_id, true).then(load)}>Accept</button>
              <button className="btn small ghost" onClick={() => answerFriend(f.user_id, false).then(load)}>Decline</button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-head"><h3>{friends.length} friend{friends.length === 1 ? "" : "s"}</h3></div>
        {list === null && <div className="card-pad small muted">Loading...</div>}
        {list && friends.length === 0 && <div className="card-pad small muted">No friends yet. Find one by username above.</div>}
        {friends.map((f) => (
          <div key={f.user_id} className="sc-person">
            <UserIcon avatar={f.avatar} user={null} size={36} />
            <span className="sc-who"><b>{f.name}</b><span className="small muted">{(f.month_xp ?? f.week_xp ?? 0).toLocaleString()} XP this month</span></span>
            <button className="btn small" onClick={() => openChat(f)}>Message</button>
            <button className="icon-btn" title="Remove friend" aria-label={`Remove ${f.name}`} onClick={() => confirm(`Remove ${f.name} as a friend?`) && answerFriend(f.user_id, false).then(load)}><Icon name="close" size={14} /></button>
          </div>
        ))}
        {sent.map((f) => (
          <div key={f.user_id} className="sc-person">
            <UserIcon avatar={f.avatar} user={null} size={36} />
            <span className="sc-who"><b>{f.name}</b><span className="small muted">Request sent</span></span>
            <button className="btn small ghost" onClick={() => answerFriend(f.user_id, false).then(load)}>Cancel</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- messages ---------- */

const clock = (t) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
function dayLabel(t) {
  const d = new Date(t), n = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, n)) return "Today";
  const y = new Date(n); y.setDate(n.getDate() - 1);
  if (same(d, y)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
const onlyEmoji = (t) => /^(\p{Extended_Pictographic}|\u200d|\ufe0f|\s){1,8}$/u.test(t);

function Chat({ user, start, compact = false }) {
  const me = useMyProfile(user);
  const soc = useSocial();
  const [friends, setFriends] = useState(null);
  const [miss, setMiss] = useState(false);
  const [with_, setWith] = useState(start || null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const end = useRef(null);
  const box = useRef(null);

  useEffect(() => {
    myFriends().then((r) => {
      if (!r.ok) { setMiss(!!r.missing); setFriends([]); return; }
      const list = (r.data || []).filter((f) => f.status === "accepted");
      setFriends(list);
      // opened from a notification: go straight to that friend
      let want = null;
      try { want = sessionStorage.getItem("dwiddle-chat-with"); sessionStorage.removeItem("dwiddle-chat-with"); } catch {}
      const f = want && list.find((x) => x.user_id === want);
      if (f) setWith(f);
    });
  }, []);

  useEffect(() => {
    if (!with_) return;
    let live = true;
    setActiveThread(with_.user_id);
    const pull = () => messagesWith(with_.user_id).then((r) => {
      if (!live || !r.ok) return;
      setMsgs(r.data);
      const top = r.data.filter((m) => m.from_id === with_.user_id).reduce((a, m) => Math.max(a, m.id), 0);
      if (top) seenUpTo(with_.user_id, top);
    });
    pull();
    const off = onIncoming((m) => { if (m.from_id === with_.user_id) { setMsgs((x) => (x.some((y) => y.id === m.id) ? x : [...x, m])); seenUpTo(with_.user_id, m.id); } });
    const poll = setInterval(pull, 8000); // in case realtime is not switched on
    return () => { live = false; off(); clearInterval(poll); setActiveThread(null); };
  }, [with_?.user_id, user.id]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length, with_]);

  // the box grows with what is typed, up to a few lines
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [text, with_]);

  if (miss) return <Setup what="Messages" />;
  async function send() {
    const t = text.trim();
    if (!t) return;
    setText(""); setErr("");
    const r = await sendMessage(with_.user_id, t);
    if (r.ok) setMsgs((x) => [...x, r.data]); else { setErr(r.error); setText(t); }
  }

  const ordered = [...(friends || [])].sort((a, b) => (soc.unread[b.user_id] || 0) - (soc.unread[a.user_id] || 0));
  let lastDay = "", prev = null;

  return (
    <div className={"sc-chat card" + (compact ? " compact" : "")}>
      {(!compact || !with_) && (
      <div className="sc-side">
        {friends === null && <div className="card-pad small muted">Loading...</div>}
        {friends?.length === 0 && <div className="card-pad small muted">Add a friend first, then message them here.</div>}
        {ordered.map((f) => (
          <button key={f.user_id} className={"sc-pick" + (with_?.user_id === f.user_id ? " on" : "")} onClick={() => setWith(f)}>
            <UserIcon avatar={f.avatar} user={null} size={compact ? 44 : 36} />
            <span className="sc-pick-who"><b>{f.name}</b>{f.handle && <span className="small">@{f.handle}</span>}</span>
            {soc.unread[f.user_id] > 0 && with_?.user_id !== f.user_id && <i className="badge">{soc.unread[f.user_id] > 99 ? "99+" : soc.unread[f.user_id]}</i>}
          </button>
        ))}
      </div>
      )}
      {(!compact || with_) && (
      <div className="sc-thread">
        {!with_ ? <div className="sc-empty small muted">Pick a friend to message.</div> : (
          <>
            <div className="cm-head">
              {compact && <button type="button" className="icon-btn cm-back" aria-label="Back to your friends" onClick={() => setWith(null)}><span className="hf-back-ico"><Icon name="arrow" size={16} /></span></button>}
              <UserIcon avatar={with_.avatar} user={null} size={40} />
              <span className="sc-who"><b>{with_.name}</b>{with_.handle && <span className="small muted">@{with_.handle}</span>}</span>
            </div>
            <div className="sc-msgs">
              {msgs.length === 0 && <div className="sc-empty small muted">Say hello to {with_.name}.</div>}
              {msgs.map((m) => {
                const mine = m.from_id === user.id;
                const day = dayLabel(m.created_at);
                const newDay = day !== lastDay; lastDay = day;
                const first = newDay || !prev || prev.from_id !== m.from_id || new Date(m.created_at) - new Date(prev.created_at) > 5 * 60000;
                prev = m;
                const big = onlyEmoji(m.body);
                return (
                  <div key={m.id} className="cm-wrap">
                    {newDay && <div className="cm-day"><span>{day}</span></div>}
                    <div className={"cm-row" + (mine ? " mine" : "") + (first ? " first" : "")}>
                      {!mine && <span className="cm-av">{first && <UserIcon avatar={with_.avatar} user={null} size={32} />}</span>}
                      <div className="cm-col">
                        {first && <span className="cm-name">{mine ? "You" : with_.name}<time>{clock(m.created_at)}</time></span>}
                        <div className={"cm-bubble" + (big ? " big" : "")}>{m.body}</div>
                      </div>
                      {mine && <span className="cm-av">{first && <UserIcon avatar={me?.avatar} user={user} size={32} />}</span>}
                    </div>
                  </div>
                );
              })}
              <div ref={end} />
            </div>
            {err && <div className="dl-err">{err}</div>}
            <form className="cm-send" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <textarea ref={box} rows={1} value={text} maxLength={1000} placeholder={`Message ${with_.name}`} aria-label={`Message ${with_.name}`}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
              <button className="btn cta" type="submit" disabled={!text.trim()}>Send</button>
            </form>
          </>
        )}
      </div>
      )}
    </div>
  );
}

// The weekly board on a page of its own, reached from the top bar.
export function LeaderboardPage({ auth, onSignIn }) {
  if (!auth?.user) {
    return (
      <div className="page fade sc">
        <PageHead title="Leaderboard" sub="All time among everyone, or this month among friends." />
        <div className="card card-pad sc-note"><b>Sign in to see the board</b><button className="btn cta" onClick={onSignIn}>Sign in</button></div>
      </div>
    );
  }
  return (
    <div className="page fade sc">
      <PageHead title="Leaderboard" sub="All time among everyone, or this month among friends." />
      <Board user={auth.user} />
    </div>
  );
}

// Friends and messages in a window over the page, so someone studying a topic
// can chat and keep reading at the same time.
export function FriendsPopup({ auth, onSignIn, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fp" role="dialog" aria-label="Friends">
      <div className="fp-head"><b>Friends</b>
        <button className="icon-btn" aria-label="Close friends" onClick={onClose}><Icon name="close" size={15} /></button>
      </div>
      <div className="fp-body"><Social auth={auth} onSignIn={onSignIn} compact /></div>
    </div>
  );
}
