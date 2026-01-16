import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Image from "next/image";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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

  const isEmpty = messages.length === 0;

  return (
    <>
      <Head>
        <title>NovaGPT</title>
      </Head>

      {/* TOP LEFT */}
      <div className="top-bar">
        <Image src="/logo.png" alt="NovaGPT" width={22} height={22} />
        <span>NovaGPT</span>
      </div>

      <div className={`page ${isEmpty ? "empty" : "chatting"}`}>
        {/* CENTER ZONE */}
        {isEmpty && (
          <div className="center-zone">
            <h1>How can I help you today?</h1>

            <form className="input-pill" onSubmit={sendMessage}>
              <button type="button" className="icon">＋</button>

              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Message NovaGPT"
              />

              <button
                type="submit"
                className="send"
                disabled={!input.trim()}
              >
                ↑
              </button>
            </form>
          </div>
        )}

        {/* CHAT */}
        {!isEmpty && (
          <>
            <main className="chat">
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
            </main>

            {/* BOTTOM INPUT */}
            <form className="bottom-input" onSubmit={sendMessage}>
              <div className="input-pill">
                <button type="button" className="icon">＋</button>

                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Message NovaGPT"
                />

                <button
                  type="submit"
                  className="send"
                  disabled={!input.trim()}
                >
                  ↑
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <style jsx>{`
        body {
          margin: 0;
          background: #202020;
          color: #fff;
          font-family: system-ui, sans-serif;
        }

        .top-bar {
          position: fixed;
          top: 12px;
          left: 16px;
          display: flex;
          gap: 8px;
          align-items: center;
          font-weight: 600;
          z-index: 10;
          opacity: 0.9;
        }

        .page {
          min-height: 100vh;
          transition: all 0.4s ease;
        }

        /* EMPTY STATE */
        .center-zone {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 28px;
        }

        .center-zone h1 {
          font-size: 28px;
          font-weight: 400;
          text-align: center;
        }

        /* CHAT */
        .chat {
          max-width: 760px;
          margin: 0 auto;
          padding: 120px 20px 120px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .msg {
          display: flex;
          animation: appear 0.25s ease;
        }

        .msg.user {
          justify-content: flex-end;
        }

        .bubble {
          max-width: 80%;
          padding: 14px 16px;
          background: #111;
          border-radius: 12px;
          line-height: 1.55;
        }

        .typing {
          opacity: 0.6;
          font-style: italic;
        }

        /* INPUT */
        .input-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #2a2a2a;
          border-radius: 999px;
          padding: 10px 12px;
          width: 560px;
          max-width: calc(100vw - 32px);
        }

        .input-pill input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: white;
          font-size: 14px;
        }

        .icon {
          background: none;
          border: none;
          color: #aaa;
          font-size: 18px;
          cursor: pointer;
        }

        .send {
          background: white;
          color: black;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
        }

        .send:disabled {
          opacity: 0.3;
        }

        .bottom-input {
          position: fixed;
          bottom: 20px;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: center;
          animation: slideUp 0.4s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: none;
            opacity: 1;
          }
        }

        @keyframes appear {
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
