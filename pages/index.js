import { useState, useRef, useEffect } from "react";
import Head from "next/head";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

  // Scroll auto
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Textarea auto-grow
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      Math.min(textareaRef.current.scrollHeight, 220) + "px";
  }, [input]);

  function format(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMsg = { role: "user", content: input };
    const assistantMsg = { role: "assistant", content: "" };

    setMessages((m) => [...m, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, userMsg] })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      const chunk = decoder.decode(value || new Uint8Array(), {
        stream: !done
      });

      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: copy[copy.length - 1].content + chunk
        };
        return copy;
      });
    }

    setStreaming(false);
  }

  return (
    <>
      <Head>
        <title>NovaGPT</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="page">
        <section className="chat">
          {messages.length === 0 && (
            <div className="center">
              <h1>How can I help you today?</h1>
            </div>
          )}

          <div className="msgs">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: format(m.content)
                  }}
                />
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form className="bar" onSubmit={sendMessage}>
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
            <button disabled={!input.trim() || streaming}>⮕</button>
          </form>
        </section>
      </main>

      <style jsx>{`
        body {
          margin: 0;
          background: #0e0e0e;
          color: #f2f2f2;
          font-family: system-ui, -apple-system, BlinkMacSystemFont;
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
        }

        .center {
          margin-top: 24vh;
          text-align: center;
          opacity: 0;
          animation: fade 0.5s forwards;
        }

        .center h1 {
          font-weight: 500;
          font-size: 26px;
        }

        .msgs {
          flex: 1;
          padding-bottom: 140px;
          overflow-y: auto;
        }

        .msg {
          margin: 16px 0;
          padding: 14px 16px;
          border-radius: 12px;
          background: #151515;
          animation: up 0.2s ease;
          line-height: 1.6;
        }

        .msg.user {
          background: #1f1f1f;
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

        .bar {
          position: sticky;
          bottom: 18px;
          background: #121212;
          border-radius: 18px;
          border: 1px solid #222;
          display: flex;
          align-items: flex-end;
          gap: 12px;
          padding: 12px 14px;
          backdrop-filter: blur(12px);
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
          max-height: 220px;
        }

        button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background: #fff;
          color: #000;
          font-size: 16px;
        }

        button:disabled {
          opacity: 0.3;
        }

        @keyframes up {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade {
          to {
            opacity: 1;
          }
        }

        @media (max-width: 600px) {
          .center h1 {
            font-size: 22px;
          }
        }
      `}</style>
    </>
  );
}
