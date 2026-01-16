import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Image from "next/image";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e) {
    e?.preventDefault();
    if ((!input.trim() && !file) || loading) return;

    const userMsg = {
      role: "user",
      content: input || (file ? `File uploaded: ${file.name}` : ""),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setFile(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("messages", JSON.stringify(newMessages));
    if (file) formData.append("file", file);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "API error");

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
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
      </Head>

      {/* BRAND */}
      <div className="top-left">
        <Image src="/logo.png" alt="NovaGPT" width={26} height={26} />
        <span>NovaGPT</span>
      </div>

      <div className="page">
        <main className={`chat ${messages.length === 0 ? "centered" : ""}`}>
          {messages.length === 0 && (
            <h1 className="title fade-in">How can I help you today?</h1>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role} slide-in`}>
              <div className="bubble">{m.content}</div>
            </div>
          ))}

          {loading && (
            <div className="message assistant slide-in">
              <div className="bubble typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </main>

        {/* INPUT */}
        <form className="composer" onSubmit={sendMessage}>
          <input
            type="file"
            hidden
            ref={fileInputRef}
            onChange={e => setFile(e.target.files[0])}
          />

          <button
            type="button"
            className="icon-btn"
            onClick={() => fileInputRef.current.click()}
          >
            📎
          </button>

          <input
            className="text-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Message NovaGPT…"
          />

          <button
            type="submit"
            className="send-btn"
            disabled={loading || (!input.trim() && !file)}
          >
            ➤
          </button>
        </form>
      </div>

      {/* STYLES */}
      <style jsx>{`
        body {
          margin: 0;
          background: #000;
          color: #fff;
        }

        .top-left {
          position: fixed;
          top: 16px;
          left: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          z-index: 10;
        }

        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .chat {
          width: 100%;
          max-width: 760px;
          flex: 1;
          padding: 120px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .chat.centered {
          justify-content: center;
          align-items: center;
        }

        .title {
          font-size: 28px;
          font-weight: 400;
          opacity: 0.85;
        }

        .message {
          display: flex;
        }

        .message.user {
          justify-content: flex-end;
        }

        .bubble {
          max-width: 80%;
          padding: 14px 16px;
          background: #0d0d0d;
          border: 1px solid #222;
          border-radius: 12px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        /* --- INPUT --- */

        .composer {
          position: sticky;
          bottom: 0;
          width: 100%;
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 24px 16px 32px;
          background: linear-gradient(
            transparent,
            rgba(0, 0, 0, 0.85) 40%
          );
        }

        .icon-btn {
          background: #0d0d0d;
          border: 1px solid #222;
          color: #fff;
          border-radius: 10px;
          padding: 0 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .icon-btn:hover {
          background: #151515;
        }

        .text-input {
          flex: 1;
          padding: 14px 16px;
          background: #0d0d0d;
          border: 1px solid #222;
          border-radius: 12px;
          color: #fff;
          outline: none;
          transition: border 0.2s;
        }

        .text-input:focus {
          border-color: #444;
        }

        .send-btn {
          background: #fff;
          color: #000;
          border-radius: 10px;
          padding: 0 16px;
          border: none;
          cursor: pointer;
          transition: transform 0.1s ease, opacity 0.2s;
        }

        .send-btn:active {
          transform: scale(0.95);
        }

        .send-btn:disabled {
          opacity: 0.3;
        }

        /* --- ANIMATIONS --- */

        .fade-in {
          animation: fade 0.6s ease;
        }

        .slide-in {
          animation: slide 0.25s ease;
        }

        @keyframes fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        /* TYPING DOTS */

        .typing {
          display: flex;
          gap: 6px;
        }

        .dot {
          width: 6px;
          height: 6px;
          background: #fff;
          border-radius: 50%;
          opacity: 0.3;
          animation: blink 1.4s infinite both;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes blink {
          0% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.3;
          }
        }
      `}</style>
    </>
  );
}
