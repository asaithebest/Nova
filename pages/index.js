import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Image from "next/image";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "API error");

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "⚠️ Error: " + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>NovaGPT</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="page">
        <header className="top">
          <Image src="/logo.png" alt="NovaGPT" width={28} height={28} />
          <span>NovaGPT</span>
        </header>

        <main className="chat">
          {messages.length === 0 && (
            <div className="welcome">
              <Image src="/logo.png" alt="NovaGPT" width={64} height={64} />
              <h1>How can I help you today?</h1>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div className="bubble">{m.content}</div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="bubble typing">NovaGPT is typing…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        <form className="input-bar" onSubmit={sendMessage}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message NovaGPT…"
          />
          <button type="submit" disabled={loading || !input.trim()}>
            ➤
          </button>
        </form>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
        }
        .page {
          height: 100vh;
          background: #0f0f0f;
          color: #e5e5e5;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .top {
          height: 56px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
          border-bottom: 1px solid #1f1f1f;
          background: #0f0f0f;
        }
        .chat {
          flex: 1;
          width: 100%;
          max-width: 720px;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .welcome {
          margin-top: 20vh;
          text-align: center;
          opacity: 0.9;
          animation: fadeIn 0.6s ease;
        }
        .welcome h1 {
          margin-top: 16px;
          font-size: 26px;
          font-weight: 500;
        }
        .message {
          display: flex;
          animation: fadeIn 0.3s ease;
        }
        .message.user {
          justify-content: flex-end;
        }
        .bubble {
          max-width: 80%;
          padding: 12px 14px;
          border-radius: 12px;
          line-height: 1.5;
          background: #1f1f1f;
        }
        .message.user .bubble {
          background: #2a2a2a;
        }
        .typing {
          opacity: 0.6;
          font-style: italic;
        }
        .input-bar {
          width: 100%;
          max-width: 720px;
          display: flex;
          gap: 8px;
          padding: 16px;
          border-top: 1px solid #1f1f1f;
          background: #0f0f0f;
        }
        .input-bar input {
          flex: 1;
          padding: 12px 14px;
          background: #1f1f1f;
          border: none;
          border-radius: 10px;
          color: #fff;
          outline: none;
          font-size: 14px;
        }
        .input-bar button {
          padding: 0 16px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          background: #19c37d;
          color: #000;
          font-size: 16px;
        }
        .input-bar button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </>
  );
}
