import { useState, useRef, useEffect } from "react";
import Head from "next/head";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() && !file) return;

    const userMessage = {
      role: "user",
      content: input || file.name,
    };

    setMessages((m) => [...m, userMessage]);
    setInput("");
    setLoading(true);

    const formData = new FormData();
    formData.append("message", input);
    if (file) formData.append("file", file);

    setFile(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || "No response." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Server error." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>NovaGPT</title>
        <link rel="icon" href="/logo.png" />
      </Head>

      <main className="app">
        <div className="chat">
          {messages.length === 0 && (
            <div className="empty">
              <h1>NovaGPT</h1>
              <p>Ask anything. Upload files. Analyze images & PDFs.</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <div className="bubble">{m.content}</div>
            </div>
          ))}

          {loading && (
            <div className="msg assistant">
              <div className="bubble typing">Thinking…</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
            />
          </label>

          <input
            placeholder="Message NovaGPT"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <button type="submit">➤</button>
        </form>
      </main>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: system-ui, sans-serif;
          background: #0f0f0f;
          color: white;
        }

        .app {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .chat {
          flex: 1;
          width: 100%;
          max-width: 720px;
          padding: 40px 20px;
          overflow-y: auto;
        }

        .empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          opacity: 0;
          animation: fadeIn 0.6s forwards;
        }

        .empty h1 {
          font-size: 42px;
          margin-bottom: 8px;
        }

        .empty p {
          opacity: 0.6;
        }

        .msg {
          display: flex;
          margin-bottom: 16px;
          animation: slideUp 0.25s ease;
        }

        .msg.user {
          justify-content: flex-end;
        }

        .bubble {
          max-width: 85%;
          padding: 14px 16px;
          border-radius: 14px;
          line-height: 1.45;
          background: #1f1f1f;
        }

        .msg.user .bubble {
          background: #2d2d2d;
        }

        .typing {
          opacity: 0.6;
          font-style: italic;
        }

        .inputBar {
          width: 100%;
          max-width: 720px;
          display: flex;
          align-items: center;
          padding: 12px;
          border-top: 1px solid #222;
          background: #0f0f0f;
        }

        .upload {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid #333;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin-right: 10px;
        }

        .inputBar input {
          flex: 1;
          background: #1a1a1a;
          border: none;
          color: white;
          padding: 12px;
          border-radius: 20px;
          outline: none;
        }

        .inputBar button {
          margin-left: 10px;
          background: white;
          color: black;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
        }

        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
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
