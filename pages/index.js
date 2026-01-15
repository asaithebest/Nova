import { useState } from "react";
import Head from "next/head";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Erreur : " + data.error.message }
      ]);
      return;
    }

    setMessages([
      ...newMessages,
      { role: "assistant", content: data.reply }
    ]);
  }

  return (
    <>
      <Head><title>Nova GPT-4</title></Head>

      <main style={{ padding: 20, maxWidth: 800, margin: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <strong>{m.role === "user" ? "Toi" : "Nova"} :</strong> {m.content}
          </div>
        ))}

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
