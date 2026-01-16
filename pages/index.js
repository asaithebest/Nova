import { useEffect, useRef, useState } from "react";
import Head from "next/head";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function formatText(text) {
    let html = text
      .replace(/```([\s\S]*?)```/g, (_, c) =>
        `<pre><code>${c.replace(/</g, "&lt;")}</code><button class="copy">Copy</button></pre>`
      )
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");

    return html;
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] })
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Error." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>NovaGPT</title>
      </Head>

      <style>{`
        * { box-sizing: border-box }
        body {
          margin: 0;
          background: #0f0f0f;
          color: white;
          font-family: system-ui, -apple-system, BlinkMacSystemFont;
        }

        .topbar {
          position: fixed;
          top: 0;
          left: 0;
          height: 60px;
          width: 100%;
          display: flex;
          align-items: center;
          padding: 0 16px;
          background: #0f0f0f;
          border-bottom: 1px solid #222;
          z-index: 10;
        }

        .brand {
          font-weight: 700;
          font-size: 15px;
          opacity: .9;
        }

        .container {
          max-width: 780px;
          margin: auto;
          padding: 100px 16px 120px;
        }

        .empty {
          text-align: center;
          margin-top: 20vh;
          animation: fade .6s ease;
        }

        .empty h1 {
          font-size: 28px;
          font-weight: 600;
        }

        .message {
          margin: 24px 0;
          line-height: 1.6;
          animation: slide .4s ease;
        }

        .user { opacity: .9 }
        .assistant { opacity: .95 }

        pre {
          background: #111;
          padding: 14px;
          border-radius: 10px;
          position: relative;
          overflow-x: auto;
          margin-top: 10px;
        }

        pre code {
          color: white;
          font-family: monospace;
        }

        .copy {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #222;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
        }

        .inputBar {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: center;
          background: #0f0f0f;
          padding: 16px;
          border-top: 1px solid #222;
        }

        .inputWrap {
          width: 100%;
          max-width: 760px;
          display: flex;
          align-items: center;
          background: #1c1c1c;
          border-radius: 999px;
          padding: 8px 12px;
        }

        .plus {
          font-size: 18px;
          margin-right: 8px;
          opacity: .8;
          cursor: pointer;
        }

        input {
          flex: 1;
          background: none;
          border: none;
          color: white;
          outline: none;
          font-size: 15px;
        }

        .send {
          background: white;
          border-radius: 50%;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: black;
          cursor: pointer;
        }

        @keyframes fade {
          from { opacity: 0 }
          to { opacity: 1 }
        }

        @keyframes slide {
          from { transform: translateY(8px); opacity: 0 }
          to { transform: translateY(0); opacity: 1 }
        }
      `}</style>

      <div className="topbar">
        <div className="brand">NovaGPT</div>
      </div>

      <div className="container">
        {messages.length === 0 && !loading ? (
          <div className="empty">
            <h1>How can I help you today?</h1>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div dangerouslySetInnerHTML={{ __html: formatText(m.content) }} />
            </div>
          ))
        )}
        {loading && <div className="message assistant">Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <form className="inputBar" onSubmit={sendMessage}>
        <div className="inputWrap">
          <div className="plus">+</div>
          <input
            placeholder="Ask NovaGPT…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="send" onClick={sendMessage}>➤</div>
        </div>
      </form>
    </>
  );
}
