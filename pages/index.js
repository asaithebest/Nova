import { useEffect, useRef, useState } from "react";
import Head from "next/head";

export default function Home() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    const u = localStorage.getItem("zero_user");
    if (u) {
      setUser(u);
      const saved = JSON.parse(localStorage.getItem(`zero_chats_${u}`) || "[]");
      setChats(saved);
      if (saved[0]) setActiveId(saved[0].id);
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`zero_chats_${user}`, JSON.stringify(chats));
    }
  }, [chats, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeId]);

  function login(name) {
    localStorage.setItem("zero_user", name);
    setUser(name);
    setChats([]);
  }

  function logout() {
    localStorage.clear();
    setUser(null);
    setChats([]);
  }

  function newChat() {
    const chat = {
      id: Date.now().toString(),
      title: "New chat",
      messages: []
    };
    setChats([chat, ...chats]);
    setActiveId(chat.id);
  }

  function send() {
    if (!input.trim()) return;
    setChats(prev =>
      prev.map(c =>
        c.id === activeId
          ? {
              ...c,
              title: c.messages.length === 0 ? input.slice(0, 30) : c.title,
              messages: [...c.messages, { role: "user", content: input }]
            }
          : c
      )
    );
    setInput("");
  }

  const current = chats.find(c => c.id === activeId);

  if (!user) {
    return (
      <div className="login">
        <h1>ZeroGPT</h1>
        <input
          placeholder="Username"
          onKeyDown={e => e.key === "Enter" && login(e.target.value)}
        />
        <p>Press Enter to continue</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>ZeroGPT</title>
      </Head>

      <div className="app">
        <aside className="sidebar">
          <button className="new" onClick={newChat}>＋ New chat</button>

          <div className="list">
            {chats.map(c => (
              <div
                key={c.id}
                className={`chat-item ${c.id === activeId ? "active" : ""}`}
                onClick={() => setActiveId(c.id)}
              >
                {c.title}
              </div>
            ))}
          </div>

          <button className="logout" onClick={logout}>Log out</button>
        </aside>

        <main className="chat">
          <div className="messages">
            {current?.messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>{m.content}</div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="input">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Message ZeroGPT…"
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
          </div>
        </main>
      </div>
    </>
  );
}
