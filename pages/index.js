import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    setLoading(false);
  }

  return (
    <>
      <Head>
        <title>NovaGPT</title>
      </Head>

      <main className="container">
        <header className="topbar">
          <span className="logo">NOVAGPT</span>
        </header>

        <section className="chat">
          {messages.length === 0 && (
            <div className="empty">
              <h1>How can I help you today?</h1>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {m.content}
              </ReactMarkdown>
            </div>
          ))}

          {loading && (
            <div className="bubble assistant">Typing…</div>
          )}
          <div ref={bottomRef} />
        </section>

        <form className="input-zone" onSubmit={sendMessage}>
          <div className="input-pill">
            <button type="button" className="icon">+</button>

            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="ASK NOVAGPT"
            />

            <button type="button" className="icon">🎤</button>

            <button className="send" disabled={!input.trim()}>
              ↑
            </button>
          </div>
        </form>
      </main>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        body {
          background: #1e1e1e;
        }

        .container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          color: white;
          font-family: system-ui, -apple-system, BlinkMacSystemFont;
        }

        .topbar {
          padding: 14px 24px;
          border-bottom: 1px solid #2a2a2a;
        }

        .logo {
          font-weight: 600;
          letter-spacing: 0.08em;
          font-size: 13px;
        }

        .chat {
          flex: 1;
          overflow-y: auto;
          padding: 32px 20px 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .empty {
          margin-top: 25vh;
          text-align: center;
          opacity: 0;
          animation: fade 0.6s ease forwards;
        }

        .empty h1 {
          font-weight: 500;
          color: #e5e5e5;
        }

        .bubble {
          max-width: 720px;
          width: 100%;
          padding: 14px 18px;
          margin-bottom: 18px;
          line-height: 1.6;
          font-size: 15px;
          animation: fadeUp 0.3s ease;
        }

        .bubble.user {
          background: #2b2b2b;
          border-radius: 14px;
        }

        .bubble.assistant {
          background: transparent;
        }

        .bubble pre {
          background: #111;
          padding: 14px;
          border-radius: 10px;
          overflow-x: auto;
        }

        .bubble code {
          background: #111;
          padding: 2px 6px;
          border-radius: 6px;
          font-family: monospace;
        }

        .bubble strong {
          font-weight: 600;
        }

        .bubble ul {
          padding-left: 20px;
        }

        .bubble li {
          margin-bottom: 6px;
        }

        .input-zone {
          position: fixed;
          bottom: 24px;
          width: 100%;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }

        .input-pill {
          pointer-events: all;
          display: flex;
          align-items: center;
          background: #2b2b2b;
          border-radius: 999px;
          padding: 8px 14px;
          width: 560px;
          max-width: calc(100vw - 32px);
          gap: 10px;
          box-shadow: inset 0 0 0 1px #333;
        }

        .input-pill input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: white;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #aaa;
          cursor: pointer;
        }

        .icon:hover {
          background: #3a3a3a;
          color: white;
        }

        .send {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: none;
          background: white;
          color: black;
          cursor: pointer;
        }

        .send:disabled {
          opacity: 0.3;
          cursor: default;
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

        @keyframes fade {
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
