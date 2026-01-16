// pages/index.js
import { useEffect, useRef, useState } from "react";
import Head from "next/head";

export default function Home() {
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nova_messages") || "[]");
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [theme, setTheme] = useState("light"); // keep for future toggle
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("nova_messages", JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // auto-resize textarea
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 240) + "px";
  }, [input]);

  function pushMessage(role, content, meta = {}) {
    setMessages((m) => {
      const next = [...m, { role, content, meta, id: Date.now() + Math.random() }];
      return next;
    });
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // optimistic attach
    const temp = { name: file.name, size: file.size, uploading: true };
    setAttachments((a) => [...a, temp]);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (json?.ok && json.file) {
        // replace last temp with returned file
        setAttachments((a) => {
          const copy = [...a];
          const idx = copy.findIndex((c) => c.uploading);
          if (idx >= 0) copy[idx] = { ...json.file, uploading: false };
          else copy.push({ ...json.file, uploading: false });
          return copy;
        });
      } else {
        throw new Error(json?.error || "Upload failed");
      }
    } catch (err) {
      console.error("upload err", err);
      // remove uploading placeholder
      setAttachments((a) => a.filter((x) => !x.uploading));
      alert("Upload failed: " + (err?.message || err));
    } finally {
      // clear file input value so same file can be reselected
      e.target.value = "";
    }
  }

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text && attachments.length === 0) return;

    // assemble user content (include parsedText from attachments if present)
    let content = text;
    if (attachments.length) {
      const attTexts = attachments
        .map((a) => (a.parsedText ? `\n\n[FILE:${a.originalFilename || a.filename}]\n${a.parsedText}` : `\n\n[FILE:${a.originalFilename || a.filename}]`))
        .join("");
      content = content + attTexts;
    }

    pushMessage("user", content, { attachments: attachments.map((a) => a.originalFilename || a.filename || a.name) });
    setInput("");
    setAttachments([]);
    setIsSending(true);

    // Prepare messages history to send to API (limit tokens by slicing last n)
    const historyForApi = messages.concat([{ role: "user", content }]).slice(-20).map((m) => ({ role: m.role, content: m.content }));

    // call streaming endpoint
    try {
      const res = await fetch("/api/chat?stream=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyForApi })
      });

      // If server didn't return a stream, fallback to normal JSON
      if (!res.ok) {
        const txt = await res.text();
        pushMessage("assistant", `Erreur: ${txt}`);
        setIsSending(false);
        return;
      }

      // Create an assistant placeholder message and update with chunks
      const assistantId = Date.now() + Math.random();
      setMessages((m) => [...m, { role: "assistant", content: "", id: assistantId }]);

      // If streaming, read chunks
      if (res.body && res.body.getReader) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let accumulated = "";
        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            // append chunk to accumulated and update the assistant message
            accumulated += chunk;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
            );
            // auto-scroll
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }
      } else {
        // not streaming: parse JSON
        const json = await res.json();
        const reply = json.reply || json.message || JSON.stringify(json);
        setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: reply } : x)));
      }
    } catch (err) {
      console.error(err);
      pushMessage("assistant", `Erreur réseau: ${err?.message || err}`);
    } finally {
      setIsSending(false);
    }
  }

  function removeAttachment(idx) {
    setAttachments((a) => a.filter((_, i) => i !== idx));
  }

  function clearConversation() {
    if (confirm("Clear conversation?")) {
      setMessages([]);
      localStorage.removeItem("nova_messages");
    }
  }

  return (
    <>
      <Head>
        <title>NovaGPT</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <div className="page">
        <header className="topbar">
          <div className="brand">
            <img src="/logo.png" alt="logo" className="logo" />
            <span className="brand-text">NovaGPT</span>
          </div>
          <div className="actions">
            <button onClick={clearConversation} className="ghost">Clear</button>
            <button className="ghost" onClick={() => { setTheme((t) => (t === "light" ? "dark" : "light")); }}>
              Theme
            </button>
          </div>
        </header>

        <main className="centerArea">
          <div className="chatContainer">
            <div ref={scrollRef} className="messages" aria-live="polite">
              {messages.length === 0 && (
                <div className="emptyState">
                  <h2>Welcome to NovaGPT</h2>
                  <p>Ask anything — attach a PDF or image to analyze. Streaming replies supported.</p>
                </div>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`message ${m.role === "user" ? "fromUser" : "fromAssistant"}`}>
                  <div className="bubble">
                    <div className="meta">
                      <strong>{m.role === "user" ? "You" : "Nova"}</strong>
                    </div>
                    <div className="content">
                      {/* simple rendering: preserve newlines and basic code block style */}
                      {m.content ? (
                        <>
                          {m.content.split("\n\n").map((block, i) => {
                            const isCode = block.startsWith("```") && block.endsWith("```");
                            if (isCode) {
                              const code = block.replace(/```/g, "");
                              return <pre key={i} className="codeBlock">{code}</pre>;
                            }
                            // small markdown-like bold/italic/simple replacement
                            const html = block
                              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                              .replace(/\*(.+?)\*/g, "<em>$1</em>")
                              .replace(/`(.+?)`/g, "<code>$1</code>")
                              .replace(/\n/g, "<br/>");
                            return <div key={i} className="textBlock" dangerouslySetInnerHTML={{ __html: html }} />;
                          })}
                        </>
                      ) : (
                        <em className="muted">...</em>
                      )}
                    </div>

                    {m.meta?.attachments?.length > 0 && (
                      <div className="attachmentsRow">
                        {m.meta.attachments.map((f, idx) => (
                          <div key={idx} className="fileChip">📎 {f}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="composer">
              <div className="attachmentList">
                {attachments.map((a, i) => (
                  <div className="filePreview" key={i}>
                    <span className="fileName">{a.originalFilename || a.filename || a.name}</span>
                    <button type="button" className="removeBtn" onClick={() => removeAttachment(i)}>✕</button>
                  </div>
                ))}
              </div>

              <div className="composerRow">
                <label className="attachBtn" title="Attach file">
                  📎
                  <input type="file" onChange={handleFileChange} className="hiddenFile" />
                </label>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isSending ? "Waiting for Nova..." : "Write a message... Shift+Enter for newline"}
                  className="input"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!isSending) sendMessage();
                    }
                  }}
                />

                <button type="submit" className="sendBtn" disabled={isSending}>
                  {isSending ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </div>
        </main>

        <style jsx>{`
          :root {
            --bg: #f6f7f8;
            --panel: #ffffff;
            --muted: #7d7d7d;
            --accent: #111111;
            --bubble-user: #e9e9e9;
            --bubble-assistant: #ffffff;
            --border: #e6e6e6;
          }

          .page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: linear-gradient(180deg,var(--bg), #f2f2f2);
            color: var(--accent);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          }

          .topbar {
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            border-bottom: 1px solid var(--border);
            background: var(--panel);
            position: sticky;
            top: 0;
            z-index: 20;
          }

          .brand { display:flex; align-items:center; gap:12px; }
          .logo { width:36px; height:36px; object-fit:contain; filter: grayscale(1); }
          .brand-text { font-weight:700; font-size:18px; letter-spacing: -0.3px; }

          .actions .ghost {
            background:transparent; border: 1px solid var(--border); padding:6px 10px; border-radius:8px; cursor:pointer;
            color:var(--muted); margin-left:8px;
          }

          .centerArea {
            flex:1;
            display:flex;
            align-items:center;
            justify-content:center;
            padding: 28px 18px;
          }

          .chatContainer {
            width:100%;
            max-width:820px;
            height: calc(100vh - 160px);
            display:flex;
            flex-direction:column;
            background: transparent;
          }

          .messages {
            flex:1;
            overflow:auto;
            padding: 28px;
            display:flex;
            flex-direction:column;
            gap:12px;
            border-radius:12px;
            scroll-behavior:smooth;
          }

          .emptyState {
            margin:auto;
            text-align:center;
            color:var(--muted);
          }

          .message {
            display:flex;
            width:100%;
            animation: fadeIn 220ms ease;
          }
          .fromUser { justify-content:flex-end; }
          .fromAssistant { justify-content:flex-start; }

          .bubble {
            max-width: 78%;
            background: var(--bubble-assistant);
            border:1px solid var(--border);
            padding: 12px 14px;
            border-radius: 12px;
            box-shadow: 0 1px 0 rgba(0,0,0,0.03);
            color: var(--accent);
            white-space: pre-wrap;
          }

          .fromUser .bubble { background: var(--bubble-user); }

          .meta { font-size:12px; color:var(--muted); margin-bottom:6px; }
          .textBlock { font-size:15px; line-height:1.5; color:var(--accent); }
          .muted { color:var(--muted); }

          .codeBlock {
            background:#f4f4f4; padding:10px; border-radius:8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace; overflow:auto;
          }

          .attachmentsRow { margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; }
          .fileChip { background:#fafafa; border:1px solid var(--border); padding:6px 8px; border-radius:999px; font-size:12px; color:var(--muted); }

          .composer {
            margin-top:10px;
            padding: 12px;
            background: rgba(255,255,255,0.8);
            border-top: 1px solid var(--border);
            border-radius: 12px;
            backdrop-filter: blur(6px);
          }

          .attachmentList { display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap; }

          .filePreview { display:flex; gap:8px; align-items:center; background:#fff; border:1px solid var(--border); padding:6px 8px; border-radius:10px; font-size:13px; }
          .removeBtn { background:transparent; border:0; cursor:pointer; color:var(--muted); padding:2px 6px; border-radius:6px; }

          .composerRow {
            display:flex;
            gap:8px;
            align-items:stretch;
          }

          .attachBtn {
            display:flex; align-items:center; justify-content:center; width:46px; border-radius:10px; border:1px solid var(--border); background:var(--panel); cursor:pointer; font-size:18px;
          }
          .hiddenFile { display:none; }

          .input {
            flex:1;
            padding:12px 14px;
            border-radius:10px;
            border:1px solid var(--border);
            resize:none;
            outline:none;
            font-size:15px;
            min-height:44px;
            max-height:240px;
          }

          .sendBtn {
            min-width:84px;
            padding:10px 14px;
            border-radius:10px;
            border:0;
            background:#111;
            color:#fff;
            cursor:pointer;
            font-weight:600;
          }

          @keyframes fadeIn {
            from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); }
          }

          /* responsive */
          @media (max-width:720px) {
            .chatContainer { height: calc(100vh - 120px); }
            .bubble { max-width: 92%; }
            .brand-text { display:none; }
            .topbar { padding: 0 12px; }
          }
        `}</style>
      </div>
    </>
  );
}
