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
        { role: "assistant", content: "Error: " + err.message },
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

      {/* TOP BAR */}
      <div className="top-bar">
        <Image src="/logo.png" alt="NovaGPT" width={26} height={26} />
        <span>NovaGPT</span>
      </div>

      {/* MAIN */}
      <div className="container">
        <main className={`chat ${messages.length === 0 ? "centered" : ""}`}>
          {messages.length === 0 && (
            <h1 className="title">How can I help you today?</h1>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div className="bubble">{m.content}</div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="bubble typing">Thinking…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        {/* INPUT */}
        <form className="input-wrapper" onSubmit={sendMessage}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message NovaGPT…"
          />
          <button type="submit" disabled={loading || !input.trim()}>
            ↵
          </button>
        </form>
      </div>

      {/* STYLES */}
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .top-bar {
          position: fixed;
          top: 0;
          left: 0;
          height: 56px;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 20px;
          background: #000;
          border-bottom: 1px solid #1a1a1a;
          font-weight: 600;
          z-index: 10;
        }

        .container {
          height: 100vh;
          padding-top: 56px;
          background: #000;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .chat {
          width: 100%;
          max-width: 720px;
          flex: 1;
          padding: 32px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .chat.centered {
          justify-content: center;
          align-items: center;
        }

        .title {
          font-size: 28px;
          font-weight: 400;
          opacity: 0.85;
          animation: fadeUp 0.6s ease;
          text-align: center;
        }

        .message {
          display: flex;
          animation: fadeUp 0.3s ease;
        }

        .message.user {
          justify-content: flex-end;
        }

        .bubble {
          max-width: 80%;
          padding: 14px 16px;
          border-radius: 12px;
          background: #111;
          border: 1px solid #222;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .message.user .bubble {
          background: #0a0a0a;
          border-color: #333;
        }

        .typing {
          opacity: 0.6;
          font-style: italic;
        }

        .input-wrapper {
          width: 100%;
          max-width: 720px;
          padding: 16px 24px 24px;
          display: flex;
          gap: 10px;
          background: #000;
        }

        .input-wrapper input {
          flex: 1;
          padding: 14px 16px;
          font-size: 15px;
          background: #0a0a0a;
          color: #fff;
          border: 1px solid #222;
          border-radius: 12px;
          outline: none;
        }

        .input-wrapper button {
          padding: 0 16px;
          background: #fff;
          color: #000;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          cursor: pointer;
        }

        .input-wrapper button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(6px);
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
