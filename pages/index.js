// pages/index.js
import { useEffect, useRef, useState } from "react";
import Head from "next/head";

function Avatar({ who }) {
  return (
    <div className={`avatar ${who === "user" ? "user" : "assistant"}`}>
      {who === "user" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      )}
    </div>
  );
}

function Message({ role, content }) {
  return (
    <div className={`message-row ${role === "user" ? "right" : "left"}`}>
      <Avatar who={role === "user" ? "user" : "assistant"} />
      <div className={`bubble ${role === "user" ? "user" : "assistant"}`}>
        <pre className="msg">{content}</pre>
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Welcome to SecureVault. Your secure AI assistant is ready. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const model = "gpt-4o";
  const scrollRef = useRef();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const push = (m) => setMessages((p) => [...p, m]);

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, model })
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.message || (data?.error?.message) || JSON.stringify(data) || `HTTP ${res.status}`;
        push({ role: "assistant", content: `Error: ${msg}` });
      } else {
        const reply = data?.reply ?? data?.choices?.[0]?.message?.content ?? "No response.";
        push({ role: "assistant", content: reply });
      }
    } catch (err) {
      push({ role: "assistant", content: `Network error: ${err?.message || String(err)}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>SecureVault — AI Assistant</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <div className="app">
        <aside className="leftbar">
          <div className="brand">
            <div className="logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="brand-text">
              <h1>SecureVault</h1>
              <small>AI Security Assistant</small>
            </div>
          </div>

          <div className="nav-section">
            <div className="nav-title">CONVERSATIONS</div>
            <div className="nav-list">
              <button className="nav-item active">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Current Session</span>
              </button>
            </div>
          </div>

          <div className="sidebar-footer">
            <button className="footer-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
              </svg>
              <span>Settings</span>
            </button>
            <button className="footer-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
            <div className="footer-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>End-to-end encrypted</span>
            </div>
          </div>
        </aside>

        <main className="chat-area">
          <div className="header-area">
            <div className="header-left">
              <h2>SecureVault AI</h2>
              <div className="status-indicator">
                <span className="status-dot"></span>
                <span>Secure connection established</span>
              </div>
            </div>
            <div className="header-actions">
              <button className="icon-btn" title="New conversation">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <button className="icon-btn" title="Clear conversation" onClick={() => {
                setMessages([{ role: "assistant", content: "Conversation cleared. Welcome back to SecureVault." }]);
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>

          <div className="messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <Message key={i} role={m.role} content={m.content} />
            ))}
            {loading && (
              <div className="message-row left">
                <Avatar who="assistant" />
                <div className="bubble assistant">
                  <div className="typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="composer-wrapper">
            <form className="composer" onSubmit={handleSend}>
              <button type="button" className="attach-btn" aria-label="Attach file">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button type="submit" className="send-btn" aria-label="Send message" disabled={loading || !input.trim()}>
                {loading ? (
                  <svg className="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </form>
            <div className="composer-footer">
              <span className="model-badge">GPT-4O</span>
              <span className="separator">•</span>
              <span>Powered by OpenAI</span>
              <span className="separator">•</span>
              <span className="encrypted-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Encrypted
              </span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
