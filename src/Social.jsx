import { useCallback, useEffect, useRef, useState } from "react";
import { Icon, PageHead } from "./ui.jsx";
import { UserIcon } from "./Profile.jsx";
import { leaderboard, myFriends, addFriend, answerFriend, findPerson, setHandle, myHandle, messagesWith, sendMessage, onMessage } from "./social.js";

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

export default function Social({ auth, onSignIn }) {
  const [tab, setTab] = useState(() => { try { const t = sessionStorage.getItem("dwiddle-social-tab"); return t === "chat" ? "chat" : "friends"; } catch { return "friends"; } });
  const [chatWith, setChatWith] = useState(null);
  const pick = (t) => { setTab(t); try { sessionStorage.setItem("dwiddle-social-tab", t); } catch {} };

  if (!auth?.user) {
    return (
      <div className="page fade sc">
        <PageHead title="Friends" sub="Add friends and message them." />
        <div className="card card-pad sc-note"><b>Sign in to use this</b><p className="small muted">Friends and the board live on your account.</p>
          <button className="btn cta" onClick={onSignIn}>Sign in</button></div>
      </div>
    );
  }
  return (
    <div className="page fade sc">
      <PageHead title="Friends" sub="Add friends and message them." />
      <div className="hf-switch sc-tabs" role="tablist">
        {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => pick(id)}>{label}</button>)}
      </div>
      {tab === "friends" && <Friends user={auth.user} openChat={(f) => { setChatWith(f); pick("chat"); }} />}
      {tab === "chat" && <Chat user={auth.user} start={chatWith} />}
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
        {rows?.length === 0 && <div className="card-pad small muted">{scope === "friends" ? "Add a friend and you will race here." : "Nobody is on the board yet. Pick a username under Friends to join it."}</div>}
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
                <span className="sc-xp"><b>{r.score.toLocaleString()}</b><span className="small muted"> XP</span></span>
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
  const [list, setList] = useState(null);
  const [miss, setMiss] = useState(false);
  const [handle, setH] = useState(null);
  const [mine, setMine] = useState("");
  const [q, setQ] = useState("");
  const [found, setFound] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => myFriends().then((r) => { if (r.ok) { setList(r.data || []); setMiss(false); } else { setMiss(!!r.missing); setList([]); } });
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
      <div className="card card-pad">
        <h3>Your username</h3>
        {handle ? <p>Friends find you as <b>@{handle}</b>. It also puts you on the Everyone board.</p>
          : <p className="small muted">Pick a username so friends can find you. It also puts you on the Everyone board.</p>}
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
            <span className="sc-who"><b>{f.name}</b><span className="small muted">{f.month_xp.toLocaleString()} XP this month</span></span>
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

function Chat({ user, start }) {
  const [friends, setFriends] = useState(null);
  const [miss, setMiss] = useState(false);
  const [with_, setWith] = useState(start || null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const end = useRef(null);

  useEffect(() => { myFriends().then((r) => { if (r.ok) setFriends((r.data || []).filter((f) => f.status === "accepted")); else { setMiss(!!r.missing); setFriends([]); } }); }, []);
  useEffect(() => {
    if (!with_) return;
    let live = true;
    const pull = () => messagesWith(with_.user_id).then((r) => { if (live && r.ok) setMsgs(r.data); });
    pull();
    const off = onMessage(user.id, (m) => { if (m.from_id === with_.user_id) setMsgs((x) => (x.some((y) => y.id === m.id) ? x : [...x, m])); });
    const poll = setInterval(pull, 8000); // in case realtime is not switched on
    return () => { live = false; off(); clearInterval(poll); };
  }, [with_?.user_id, user.id]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.length, with_]);

  if (miss) return <Setup what="Messages" />;
  async function send() {
    const t = text.trim();
    if (!t) return;
    setText(""); setErr("");
    const r = await sendMessage(with_.user_id, t);
    if (r.ok) setMsgs((x) => [...x, r.data]); else { setErr(r.error); setText(t); }
  }

  return (
    <div className="sc-chat card">
      <div className="sc-side">
        {friends === null && <div className="card-pad small muted">Loading...</div>}
        {friends?.length === 0 && <div className="card-pad small muted">Add a friend first, then message them here.</div>}
        {friends?.map((f) => (
          <button key={f.user_id} className={"sc-pick" + (with_?.user_id === f.user_id ? " on" : "")} onClick={() => setWith(f)}>
            <UserIcon avatar={f.avatar} user={null} size={30} /> <span>{f.name}</span>
          </button>
        ))}
      </div>
      <div className="sc-thread">
        {!with_ ? <div className="sc-empty small muted">Pick a friend.</div> : (
          <>
            <div className="sc-msgs">
              {msgs.length === 0 && <div className="sc-empty small muted">Say hello to {with_.name}.</div>}
              {msgs.map((m) => (
                <div key={m.id} className={"sc-bubble" + (m.from_id === user.id ? " mine" : "")}>{m.body}</div>
              ))}
              <div ref={end} />
            </div>
            {err && <div className="dl-err">{err}</div>}
            <form className="sc-send" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={`Message ${with_.name}`} />
              <button className="btn cta" type="submit" disabled={!text.trim()}>Send</button>
            </form>
          </>
        )}
      </div>
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
