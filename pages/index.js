import { useState, useRef, useEffect } from "react";
import Head from "next/head";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto resize textarea
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
  }, [input]);

  function formatText(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages })
      });

      const data = await res.json();
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.reply || "No response." }
      ]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Error." }
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
        <div className="chat">
          {messages.length === 0 && !loading && (
            <div className="welcome">
              <h1>How can I help you today?</h1>
            </div>
          )}

          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatText(m.content)
                  }}
                />
              </div>
            ))}
            {loading && <div className="bubble assistant">Thinking…</div>}
            <div ref={bottomRef} />
          </div>

          <form className="input-wrap" onSubmit={sendMessage}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message NovaGPT…"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
            />
            <button type="submit" disabled={!input.trim()}>
              ⬆
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #0f0f0f;
          color: #f5f5f5;
          font-family: system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        .page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          padding: 24px;
        }

        .chat {
          width: 100%;
          max-width: 780px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .welcome {
          text-align: center;
          margin-top: 22vh;
          opacity: 0;
          animation: fadeIn 0.6s forwards;
        }

        .welcome h1 {
          font-size: 26px;
          font-weight: 600;
          color: #eaeaea;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 120px;
        }

        .bubble {
          max-width: 100%;
          margin: 12px 0;
          padding: 14px 16px;
          border-radius: 12px;
          line-height: 1.6;
          font-size: 15px;
          animation: fadeUp 0.25s ease;
        }

        .bubble.user {
          background: #1e1e1e;
        }

        .bubble.assistant {
          background: #151515;
          border: 1px solid #222;
        }

        strong {
          font-weight: 600;
        }

        em {
          opacity: 0.9;
        }

        code {
          background: #222;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 13px;
        }

        .input-wrap {
          position: sticky;
          bottom: 20px;
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: #121212;
          border-radius: 18px;
          padding: 12px 14px;
          border: 1px solid #222;
          backdrop-filter: blur(10px);
        }

        textarea {
          flex: 1;
          resize: none;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-size: 15px;
          line-height: 1.6;
          max-height: 200px;
        }

        button {
          background: #fff;
          color: #000;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 18px;
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        button:hover:not(:disabled) {
          transform: scale(1.05);
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }

        @media (max-width: 600px) {
          .chat {
            padding-bottom: 10px;
          }

          .welcome h1 {
            font-size: 22px;
          }
        }
      `}</style>
    </>
  );
}
