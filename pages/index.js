import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Image from "next/image";

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const format = (text) => {
    return text
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  };

  async function send() {
    if ((!input.trim() && !file) || loading) return;

    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const form = new FormData();
    form.append("messages", JSON.stringify(newMessages));
    if (file) form.append("file", file);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setFile(null);
    }
  }

  return (
    <>
      <Head>
        <title>NovaGPT</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <div className="app">
        <header>
          <Image src="/logo.png" alt="NovaGPT" width={28} height={28} />
          <span>NovaGPT</span>
        </header>

        <main className={messages.length === 0 ? "empty" : ""}>
          {messages.length === 0 && (
            <h1 className="welcome">How can I help you?</h1>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <div
                className="bubble"
                dangerouslySetInnerHTML={{ __html: format(m.content) }}
              />
            </div>
          ))}

          {loading && (
            <div className="msg assistant">
              <div className="bubble typing">Thinking…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        <footer className={messages.length === 0 ? "centered" : ""}>
          <label className="upload">
            +
            <input
              type="file"
              hidden
              onChange={(e) => setFile(e.target.files[0])}
            />
          </label>

          <textarea
            placeholder="Message NovaGPT"
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />

          <button onClick={send} disabled={loading}>
            ➤
          </button>
        </footer>
      </div>
    </>
  );
}
