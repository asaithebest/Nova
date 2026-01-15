// pages/index.js
import { useState } from "react";
import Head from "next/head";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  function pushMessage(role, content) {
    setMessages(prev => [...prev, { role, content }]);
  }

  async function sendMessage(e) {
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
        body: JSON.stringify({ messages: newMessages })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // extraire un message d'erreur lisible, fallback si nécessaire
        const errMsg =
          data?.error?.message ||
          data?.error ||
          (typeof data === "string" ? data : null) ||
          JSON.stringify(data) ||
          `HTTP ${res.status}`;
        pushMessage("assistant", `Erreur : ${errMsg}`);
      } else {
        const reply =
          data?.reply ??
          data?.choices?.[0]?.message?.content ??
          data?.message ??
          "Pas de réponse.";
        pushMessage("assistant", reply);
      }
    } catch (err) {
      pushMessage("assistant", `Erreur réseau : ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Nova GPT-4</title>
      </Head>

      <main style={{ padding: 20, maxWidth: 800, margin: "auto" }}>
        <div style={{ marginBottom: 16 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <strong>{m.role === "user" ? "Toi" : "Nova"} :</strong> {m.content}
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Écris un message..."
            style={{ width: "100%", padding: 10 }}
          />
        </form>

        {loading && <p>Nova écrit…</p>}
      </main>
    </>
  );
}
