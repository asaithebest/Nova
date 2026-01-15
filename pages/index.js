import { useEffect, useRef, useState } from "react";
import Head from "next/head";

function Message({ role, content }) {
  return (
    <div className={`message ${role}`}>
      <div className="message-content">
        <div className="avatar">
          {role === "assistant" && (
            <svg width="41" height="41" viewBox="0 0 41 41" fill="none">
              <circle cx="20.5" cy="20.5" r="20.5" fill="#10A37F"/>
            </svg>
          )}
        </div>
        <div className="text">
          {content}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef();
  const textareaRef = useRef();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const push = (m) => setMessages((p) => [...p, m]);

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, model: "gpt-4o" })
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
        <title>ChatGPT</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-header">
            <button className="new-chat" onClick={() => setMessages([])}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New chat
            </button>
          </div>
          
          <div className="conversations">
            {/* Placeholder for conversation history */}
            <div className="conv-section">
              <div className="conv-title">Today</div>
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="user-section">
              <div className="user-avatar">U</div>
              <span>User</span>
            </div>
          </div>
        </aside>

        <main className="main">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h1>How can I help you today?</h1>
            </div>
          ) : (
            <div className="messages" ref={scrollRef}>
              {messages.map((m, i) => (
                <Message key={i} role={m.role} content={m.content} />
              ))}
              {loading && (
                <div className="message assistant">
                  <div className="message-content">
                    <div className="avatar">
                      <svg width="41" height="41" viewBox="0 0 41 41" fill="none">
                        <circle cx="20.5" cy="20.5" r="20.5" fill="#10A37F"/>
                      </svg>
                    </div>
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="input-area">
            <form className="input-form" onSubmit={handleSend}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message ChatGPT"
                rows="1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button 
                type="submit" 
                disabled={loading || !input.trim()}
                className="send-button"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
            <div className="input-footer">
              ChatGPT can make mistakes. Check important info.
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
