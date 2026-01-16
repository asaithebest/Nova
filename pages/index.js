import { useState, useRef, useEffect } from "react";
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
  }, [messages, loading]);

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    const history = [...messages, userMsg];

    setMessages(history);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";

    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      assistantText += decoder.decode(value);

      setMessages((msgs) => {
        const copy = [...msgs];
        copy[copy.length - 1] = {
          role: "assistant",
          content: assistantText
        };
        return copy;
      });
    }

    setLoading(false);
  }

  return (
    <>
      <Head>
        <title>NovaGPT</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app">
        <header>
          <span>NovaGPT</span>
        </header>

        <main className={messages.length === 0 ? "empty" : ""}>
          {messages.length === 0 ? (
            <div className="welcome">What can I help you with?</div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="bubble">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="msg assistant">
              <div className="bubble typing">NovaGPT is typing…</div>
            </div>
          )}

          <div ref={bottomRef} />
        </main>

        <footer className={messages.length === 0 ? "centered" : ""}>
          <form onSubmit={sendMessage}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message NovaGPT…"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button type="submit" disabled={loading}>➤</button>
          </form>
        </footer>
      </div>

      {/* ================= CSS GLOBAL ================= */}
      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background: #0d0d0d;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
            Roboto, Helvetica, Arial, sans-serif;
        }

        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        header {
          padding: 14px 16px;
          font-weight: 600;
          border-bottom: 1px solid #1e1e1e;
        }

        main {
          flex: 1;
          overflow-y: auto;
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        main.empty {
          justify-content: center;
          align-items: center;
        }

        .welcome {
          font-size: 26px;
          font-weight: 600;
          text-align: center;
          opacity: 0.9;
        }

        .msg {
          display: flex;
        }

        .msg.user {
          justify-content: flex-end;
        }

        .msg.assistant {
          justify-content: flex-start;
        }

        .bubble {
          max-width: 680px;
          width: 100%;
          padding: 14px 16px;
          border-radius: 14px;
          line-height: 1.55;
        }

        .msg.user .bubble {
          background: #ffffff;
          color: #000000;
          border-bottom-right-radius: 6px;
        }

        .msg.assistant .bubble {
          background: #1a1a1a;
          border-bottom-left-radius: 6px;
        }

        .typing {
          opacity: 0.6;
          font-style: italic;
        }

        /* MARKDOWN */
        .bubble strong {
          font-weight: 700;
        }

        .bubble em {
          opacity: 0.9;
        }

        .bubble hr {
          border: none;
          border-top: 1px solid #444;
          margin: 16px 0;
        }

        .bubble code {
          background: #000;
          padding: 3px 6px;
          border-radius: 6px;
          font-size: 0.9em;
        }

        .bubble pre {
          background: #000;
          padding: 12px;
          border-radius: 12px;
          overflow-x: auto;
          margin: 12px 0;
          font-size: 0.9em;
        }

        footer {
          padding: 14px;
          border-top: 1px solid #1e1e1e;
        }

        footer.centered {
          max-width: 720px;
          margin: 0 auto 20px;
          border: 1px solid #1e1e1e;
          border-radius: 16px;
        }

        footer form {
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }

        textarea {
          flex: 1;
          resize: none;
          border: none;
          outline: none;
          background: transparent;
          color: white;
          font-size: 15px;
          line-height: 1.4;
        }

        textarea::placeholder {
          color: #777;
        }

        button {
          background: #ffffff;
          color: #000000;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 16px;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.4;
        }

        /* 📱 MOBILE */
        @media (max-width: 600px) {
          .bubble {
            max-width: 100%;
            font-size: 14px;
          }

          .welcome {
            font-size: 22px;
          }

          footer.centered {
            margin: 0 10px 14px;
          }
        }
      `}</style>
    </>
  );
}
