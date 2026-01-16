import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Image from "next/image";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  function send(e) {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    // UI placeholder (no persistence, no API)
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "This is a placeholder response.\n\nConnect an API to enable real intelligence.",
        },
      ]);
      setLoading(false);
    }, 900);
  }

  return (
    <>
      <Head>
        <title>NovaGPT</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="nova-root">
        {/* HEADER */}
        <header className="nova-header">
          <Image src="/logo.png" alt="NovaGPT" width={28} height={28} />
          <span className="nova-title">NovaGPT</span>
        </header>

        {/* MAIN */}
        <main className="nova-main">
          {messages.length === 0 ? (
            <div className="nova-empty">
              <Image
                src="/logo.png"
                alt="NovaGPT"
                width={64}
                height={64}
                className="nova-logo-big"
              />
              <h1>How can I help you today?</h1>
              <p className="nova-sub">
                NovaGPT is a conversational AI assistant
              </p>
            </div>
          ) : (
            <div className="nova-messages" ref={messagesRef}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`nova-message ${
                    m.role === "user" ? "user" : "assistant"
                  }`}
                >
                  <div className="nova-bubble">{m.content}</div>
                </div>
              ))}

              {loading && (
                <div className="nova-message assistant">
                  <div className="nova-bubble typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* INPUT */}
        <form className="nova-input-area" onSubmit={send}>
          <div className="nova-input-wrapper">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message NovaGPT…"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              type="submit"
              className="nova-send"
              disabled={!input.trim() || loading}
            >
              ↑
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
