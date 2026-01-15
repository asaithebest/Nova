// pages/index.js
import { useState, useRef } from "react";
import Head from "next/head";

export default function Home() {
  const [history, setHistory] = useState([]); // {role, content}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef(null);

  const appendMessage = (role, text) => {
    setHistory(prev => {
      const next = [...prev, { role, content: text }];
      return next;
    });
    setTimeout(() => {
      messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    appendMessage("user", text);

    // construit le payload à envoyer au backend
    const payloadMessages = history.concat([{ role: "user", content: text }]);

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages })
      });
      const data = await res.json();
      if (!res.ok) {
        appendMessage("assistant", `Erreur: ${data?.error?.message || JSON.stringify(data)}`);
      } else {
        appendMessage("assistant", data.reply || "Pas de réponse.");
      }
    } catch (err) {
      appendMessage("assistant", `Erreur réseau: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Nova — Assistant</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <div className="app">
        <aside className="sidebar">
          <h2>Nova</h2>
          <p>Assistant personnel</p>
        </aside>

        <main className="main">
          <header className="header">
            <h1>Nova</h1>
            <small>Basé sur OpenAI</small>
          </header>

          <section className="chat" ref={messagesRef}>
            <div className="messages">
              {history.map((m, i) => (
                <div key={i} className={`message ${m.role === "user" ? "user" : "assistant"}`}>
                  {m.content}
                </div>
              ))}
              {loading && <div className="message assistant">Nova est en train d'écrire…</div>}
            </div>
          </section>

          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écris un message..."
              rows={1}
            />
            <button type="submit" disabled={loading}>{loading ? "..." : "Envoyer"}</button>
          </form>
        </main>
      </div>
    </>
  );
}
