import { useEffect, useRef, useState } from "react";
import Head from "next/head";

/* ===================== UTILS ===================== */
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const hash = (s) => btoa(unescape(encodeURIComponent(s)));

const getIP = async () => {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    return j.ip || "unknown";
  } catch {
    return "unknown";
  }
};

/* ===================== STORAGE ===================== */
const LS = {
  user: (u) => `zg_user_${u}`,
  convs: (u) => `zg_convs_${u}`,
  session: "zg_session",
};

/* ===================== MAIN ===================== */
export default function Home() {
  const [page, setPage] = useState("loading"); // loading | landing | login | register | app
  const [session, setSession] = useState(null);
  const [meta, setMeta] = useState(null);

  // auth
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // chat
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const fileRef = useRef(null);
  const scrollRef = useRef(null);

  /* ===================== INIT ===================== */
  useEffect(() => {
    const s = localStorage.getItem(LS.session);
    if (s) {
      const parsed = JSON.parse(s);
      setSession(parsed);
      loadUser(parsed.username);
      setPage("app");
    } else {
      setPage("landing");
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [convs, loading]);

  /* ===================== USER ===================== */
  async function register(e) {
    e.preventDefault();
    if (!username || !password) return;

    if (localStorage.getItem(LS.user(username)))
      return alert("User already exists");

    const ip = await getIP();

    const user = {
      username,
      pass: hash(password),
      createdAt: now(),
      lastLogin: now(),
      ip,
      userAgent: navigator.userAgent,
    };

    localStorage.setItem(LS.user(username), JSON.stringify(user));
    localStorage.setItem(LS.session, JSON.stringify({ username }));
    localStorage.setItem(LS.convs(username), JSON.stringify([]));

    setSession({ username });
    setMeta(user);
    setConvs([]);
    setActive(null);
    setPage("app");
  }

  async function login(e) {
    e.preventDefault();
    const raw = localStorage.getItem(LS.user(username));
    if (!raw) return alert("User not found");

    const user = JSON.parse(raw);
    if (user.pass !== hash(password)) return alert("Wrong password");

    const ip = await getIP();
    user.lastLogin = now();
    user.lastIP = ip;

    localStorage.setItem(LS.user(username), JSON.stringify(user));
    localStorage.setItem(LS.session, JSON.stringify({ username }));

    loadUser(username);
    setPage("app");
  }

  function logout() {
    localStorage.removeItem(LS.session);
    setSession(null);
    setPage("landing");
  }

  function loadUser(username) {
    const user = JSON.parse(localStorage.getItem(LS.user(username)));
    const c = JSON.parse(localStorage.getItem(LS.convs(username)) || "[]");
    setMeta(user);
    setConvs(c);
    setActive(c[0]?.id || null);
  }

  function saveConvs(next) {
    setConvs(next);
    localStorage.setItem(LS.convs(session.username), JSON.stringify(next));
  }

  /* ===================== CONVS ===================== */
  function newConv() {
    const c = {
      id: uid(),
      title: "New chat",
      manualTitle: false,
      createdAt: now(),
      messages: [],
    };
    saveConvs([c, ...convs]);
    setActive(c.id);
  }

  function renameConv(id) {
    const t = prompt("Rename conversation");
    if (!t) return;
    saveConvs(
      convs.map((c) =>
        c.id === id ? { ...c, title: t, manualTitle: true } : c
      )
    );
  }

  function deleteConv(id) {
    if (!confirm("Delete this chat?")) return;
    const next = convs.filter((c) => c.id !== id);
    saveConvs(next);
    setActive(next[0]?.id || null);
  }

  /* ===================== MESSAGE ===================== */
  function send(e) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    if (!active) newConv();

    const msg = {
      id: uid(),
      role: "user",
      content: input.trim(),
      createdAt: now(),
    };

    let next = convs.map((c) =>
      c.id === active
        ? {
            ...c,
            title:
              !c.manualTitle && c.messages.length === 0
                ? msg.content.slice(0, 40)
                : c.title,
            messages: [...c.messages, msg],
          }
        : c
    );

    saveConvs(next);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const ai = {
        id: uid(),
        role: "assistant",
        content:
          "This is a placeholder response.\nConnect the API for real AI replies.",
        createdAt: now(),
      };
      saveConvs(
        next.map((c) =>
          c.id === active ? { ...c, messages: [...c.messages, ai] } : c
        )
      );
      setLoading(false);
    }, 800);
  }

  /* ===================== ATTACH ===================== */
  function attach(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const msg = {
        id: uid(),
        role: "user",
        content: file.name,
        attachment: {
          name: file.name,
          type: file.type,
          data: reader.result,
        },
        createdAt: now(),
      };
      saveConvs(
        convs.map((c) =>
          c.id === active ? { ...c, messages: [...c.messages, msg] } : c
        )
      );
    };
    reader.readAsDataURL(file);
  }

  /* ===================== UI ===================== */
  if (page === "landing") {
    return (
      <main className="center">
        <h1>ZeroGPT</h1>
        <p>Private AI chat interface</p>
        <button onClick={() => setPage("login")}>Login</button>
        <button onClick={() => setPage("register")}>Create account</button>
      </main>
    );
  }

  if (page === "login" || page === "register") {
    const submit = page === "login" ? login : register;
    return (
      <main className="center">
        <h1>{page === "login" ? "Login" : "Create account"}</h1>
        <form onSubmit={submit}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <button>{page}</button>
        </form>
        <a onClick={() => setPage(page === "login" ? "register" : "login")}>
          Switch
        </a>
      </main>
    );
  }

  /* ===================== APP ===================== */
  const current = convs.find((c) => c.id === active);

  return (
    <>
      <Head><title>ZeroGPT</title></Head>

      <div className="layout">
        <aside>
          <button onClick={newConv}>+ New chat</button>
          {convs.map((c) => (
            <div key={c.id} onClick={() => setActive(c.id)}>
              <span>{c.title}</span>
              <button onClick={() => renameConv(c.id)}>✏️</button>
              <button onClick={() => deleteConv(c.id)}>🗑️</button>
            </div>
          ))}
          <hr />
          <small>
            User: {meta?.username}<br />
            IP: {meta?.ip}<br />
            Created: {meta?.createdAt}<br />
            Last login: {meta?.lastLogin}
          </small>
          <button onClick={logout}>Logout</button>
        </aside>

        <section>
          <div ref={scrollRef} className="msgs">
            {current?.messages.map((m) => (
              <div key={m.id} className={m.role}>
                {m.attachment ? (
                  <img src={m.attachment.data} width={120} />
                ) : (
                  m.content
                )}
              </div>
            ))}
            {loading && <div className="assistant">Typing…</div>}
          </div>

          <form onSubmit={send} className="input">
            <input type="file" hidden ref={fileRef} onChange={(e) => attach(e.target.files[0])} />
            <button type="button" onClick={() => fileRef.current.click()}>📎</button>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} />
            <button>Send</button>
          </form>
        </section>
      </div>
    </>
  );
}
