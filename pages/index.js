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

    const userMessage = {
      role: "user",
      content: input || (file ? `Uploaded file: ${file.name}` : ""),
    };

    const newMessages = [...messages, userMessage];
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

      {/* TOP LEFT BRAND */}
      <div className="top-left">
        <Image src="/logo.png" alt="NovaGPT" width={26} height={26} />
        <span>NovaGPT</span>
      </div>

      <div className="page">
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

        {/* INPUT BAR (CENTERED LIKE CHATGPT) */}
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

        .typing {
          opacity: 0.6;
          font-style: italic;
        }

        .composer {
          position: sticky;
          bottom: 0;
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 24px 16px 32px;
          background: linear-gradient(
            transparent,
            rgba(0, 0, 0, 0.85) 40%
          );
        }

        .composer > * {
          max-width: 760px;
        }

        .composer {
          gap: 8px;
        }

        .icon-btn {
          background: #0d0d0d;
          border: 1px solid #222;
          color: #fff;
          border-radius: 10px;
          padding: 0 12px;
          cursor: pointer;
        }

        .text-input {
          flex: 1;
          padding: 14px 16px;
          background: #0d0d0d;
          border: 1px solid #222;
          border-radius: 12px;
          color: #fff;
          outline: none;
        }

        .send-btn {
          background: #fff;
          color: #000;
          border-radius: 10px;
          padding: 0 16px;
          border: none;
          cursor: pointer;
        }

        .send-btn:disabled {
          opacity: 0.3;
        }
      `}</style>
    </>
  );
}
