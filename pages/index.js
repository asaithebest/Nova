// pages/index.js
import { useEffect, useRef, useState } from "react";
import Head from "next/head";

function Avatar({ who }) {
  return (
    <div className={`avatar ${who === "user" ? "user" : "assistant"}`}>
      {who === "user" ? "T" : "N"}
    </div>
  );
}

function Message({ role, content }) {
  return (
    <div className={`message-row ${role === "user" ? "right" : "left"}`}>
      <Avatar who={role === "user" ? "user" : "assistant"} />
      <div className={`bubble ${role === "user" ? "user" : "assistant"}`}>
        <pre className="msg">{content}</pre>
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Salut — je suis Nova. Pose-moi une question !" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(process.env.NEXT_PUBLIC_MODEL || "gpt-4");
  const scrollRef = useRef();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const push = (m) => setMessages((p) => [...p, m]);

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, model })
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.message || (data?.error?.message) || JSON.stringify(data) || `HTTP ${res.status}`;
        push({ role: "assistant", content: `Erreur : ${msg}` });
      } else {
        const reply = data?.reply ?? data?.choices?.[0]?.message?.content ?? "Pas de réponse.";
        push({ role: "assistant", content: reply });
      }
    } catch (err) {
      push({ role: "assistant", content: `Erreur réseau : ${err?.message || String(err)}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Nova — Assistant</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <div className="app">
        <aside className="leftbar">
          <div className="brand">
            <div className="logo">N</div>
            <div>
              <h1>Nova</h1>
              <small>Assistant</small>
            </div>
          </div>

          <div className="controls">
            <label className="model-label">Modèle</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="gpt-4">gpt-4</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
            </select>
            <button
              className="clear"
              onClick={() => {
                setMessages([{ role: "assistant", content: "Conversation réinitialisée. Salut !" }]);
              }}
            >
              Nouvelle conversation
            </button>
          </div>

          <footer className="left-footer">Déployé sur Vercel — Key côté serveur</footer>
        </aside>

        <main className="chat-area">
          <div className="header-area">
            <h2>Nova</h2>
            <div className="header-note">Nova utilise l'API OpenAI côté serveur.</div>
          </div>

          <div className="messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <Message key={i} role={m.role} content={m.content} />
            ))}
            {loading && (
              <div className="message-row left">
                <div className="avatar assistant">N</div>
                <div className="bubble assistant">
                  <div className="typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form className="composer" onSubmit={handleSend}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écris un message... (Enter = envoyer, Shift+Enter = saut de ligne)"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button type="submit" aria-label="Envoyer" disabled={loading || !input.trim()}>
              {loading ? "…" : "Envoyer"}
            </button>
          </form>
        </main>
      </div>
    </>
  );
}
