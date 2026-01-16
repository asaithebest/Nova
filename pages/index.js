// pages/index.js
import { useEffect, useRef, useState } from "react";
import Head from "next/head";

export default function Home() {
  const [isAuth, setIsAuth] = useState(false);
  const [user, setUser] = useState(null);

  const [convs, setConvs] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const msgRef = useRef(null);
  const taRef = useRef(null);

  /* -------------------- AUTH -------------------- */
  useEffect(() => {
    const session = localStorage.getItem("zero_session");
    if (session) {
      const u = JSON.parse(session);
      setUser(u);
      setIsAuth(true);
      const saved = localStorage.getItem(`zero_convs_${u.username}`);
      if (saved) {
        const c = JSON.parse(saved);
        setConvs(c);
        if (c[0]) {
          setCurrentId(c[0].id);
          setMessages(c[0].messages);
        }
      }
    }
  }, []);

  function login() {
    const username = prompt("Username");
    if (!username) return;
    const u = { username };
    localStorage.setItem("zero_session", JSON.stringify(u));
    setUser(u);
    setIsAuth(true);
  }

  function logout() {
    localStorage.removeItem("zero_session");
    setIsAuth(false);
    setUser(null);
    setConvs([]);
    setMessages([]);
    setCurrentId(null);
  }

  /* -------------------- CHAT -------------------- */
  useEffect(() => {
    msgRef.current?.scrollTo({
      top: msgRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(
        `zero_convs_${user.username}`,
        JSON.stringify(convs)
      );
    }
  }, [convs, user]);

  function newChat() {
    const c = {
      id: Date.now().toString(),
      title: "New chat",
      messages: [],
    };
    setConvs([c, ...convs]);
    setCurrentId(c.id);
    setMessages([]);
  }

  function switchChat(id) {
    const c = convs.find((x) => x.id === id);
    if (!c) return;
    setCurrentId(id);
    setMessages(c.messages);
  }

  function updateConv(msgs) {
    setConvs((prev) =>
      prev.map((c) =>
        c.id === currentId
          ? {
              ...c,
              messages: msgs,
              title:
                c.title === "New chat" && msgs[0]
                  ? msgs[0].content.slice(0, 32) + "…"
                  : c.title,
            }
          : c
      )
    );
  }

  async function send(e) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    if (!currentId) newChat();

    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    updateConv(next);
    setInput("");
    setLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const d = await r.json();
      const reply =
        d?.reply ||
        d?.choices?.[0]?.message?.content ||
        "No response.";
      const final = [...next, { role: "assistant", content: reply }];
      setMessages(final);
      updateConv(final);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /* -------------------- UI -------------------- */
  if (!isAuth) {
    return (
      <>
        <Head>
          <title>ZeroGPT</title>
        </Head>
        <div className="center" style={{ height: "100vh" }}>
          <div style={{ textAlign: "center" }}>
            <div className="logo-round" style={{ margin: "0 auto 20px" }}>
              Z
            </div>
            <h1>ZeroGPT</h1>
            <p className="kv">AI Assistant</p>
            <button className="send-btn" onClick={login}>
              Login
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>ZeroGPT</title>
      </Head>

      <div className="app">
        {/* SIDEBAR */}
        <aside>
          <button className="new" onClick={newChat}>
            + New chat
          </button>

          <div className="sidebar-list">
            {convs.map((c) => (
              <div
                key={c.id}
                className={`conv-item ${c.id === currentId ? "active" : ""}`}
                onClick={() => switchChat(c.id)}
              >
                <div className="title">{c.title}</div>
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="user-avatar">
              {user.username[0].toUpperCase()}
            </div>
            <button className="kv" onClick={logout}>
              Logout
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main>
          <div className="header">
            <div className="brand">
              <div className="logo-round">Z</div>
              <strong>ZeroGPT</strong>
            </div>
          </div>

          <div className="chat-container">
            <div className="chat-column">
              {messages.length === 0 ? (
                <div className="center" style={{ flex: 1 }}>
                  <h2>How can I help you today?</h2>
                </div>
              ) : (
                <div className="messages" ref={msgRef}>
                  {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                      {m.content}
                    </div>
                  ))}
                  {loading && (
                    <div className="message assistant">
                      <div className="typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <form className="input-area" onSubmit={send}>
                <textarea
                  ref={taRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message ZeroGPT…"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button
                  className="send-btn"
                  disabled={loading || !input.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
