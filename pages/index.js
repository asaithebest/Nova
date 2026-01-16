// pages/index.js
import { useEffect, useRef, useState } from "react";

/**
 * NovaGPT — Single-file Next.js page (UI-only)
 * - No external deps
 * - Persists conversations & messages to localStorage
 * - Centered ChatGPT-like layout (grey / white only)
 * - File attachments (frontend only)
 * - Basic markdown formatting (bold, italic, lists, inline code, code blocks, hr)
 * - Copy message button, rename/delete convs, create convs
 * - Auto-resize textarea, mobile friendly
 * - Simulated streaming when no backend available (falls back to echo)
 *
 * To connect a backend, post to /api/chat with { message, conversationId, files }.
 */

function uid(prefix = "") {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function simpleMarkdownToHtml(text = "") {
  // escape HTML
  const esc = (s) =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  // code blocks ```lang\n...\n```
  let out = esc(text);

  out = out.replace(/```([\s\S]*?)```/g, (m, code) => {
    return `<pre class="md-code"><code>${code.replaceAll(
      "&lt;",
      "<"
    )}</code></pre>`;
  });

  // inline code `x`
  out = out.replace(/`([^`]+)`/g, (m, c) => `<code class="md-inline">${c}</code>`);

  // bold **text**
  out = out.replace(/\*\*(.*?)\*\*/g, (m, t) => `<strong>${t}</strong>`);

  // italic *text* or _text_
  out = out.replace(/(^|[^*])\*(?!\s)(.*?)\*(?!\*)/g, (m, s, t) => `${s}<em>${t}</em>`);
  out = out.replace(/_(.*?)_/g, (m, t) => `<em>${t}</em>`);

  // horizontal rule
  out = out.replace(/(^|\n)---(\n|$)/g, "<hr class='md-hr'/>");

  // unordered list
  out = out.replace(/(^|\n)[\-\+\*] (.+?)(?=\n|$)/g, (m, p1, item) => {
    return `\n<ul><li>${item}</li></ul>\n`;
  });
  // merge successive ULs
  out = out.replace(/<\/ul>\s*<ul>/g, "");

  // ordered list
  out = out.replace(/(^|\n)\d+\. (.+?)(?=\n|$)/g, (m, p1, item) => {
    return `\n<ol><li>${item}</li></ol>\n`;
  });
  out = out.replace(/<\/ol>\s*<ol>/g, "");

  // line breaks -> <br>
  out = out.replace(/\n/g, "<br>");

  return out;
}

function Message({ m, onCopy }) {
  return (
    <div className={`msg ${m.role}`}>
      <div className="avatar">{m.role === "user" ? "U" : "N"}</div>
      <div className="bubble">
        <div
          className="content"
          dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(m.content) }}
        />
        {m.files?.length > 0 && (
          <div className="files">
            {m.files.map((f) => (
              <div key={f.id} className="file">
                📎 <span className="file-name">{f.name}</span>
              </div>
            ))}
          </div>
        )}
        <div className="msg-actions">
          <button onClick={() => onCopy(m.content)}>Copy</button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // load from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("novagpt_conversations") || "[]");
      setConversations(saved);
      if (saved.length > 0) setActiveConvId(saved[0].id);
    } catch {
      setConversations([]);
    }
  }, []);

  // save
  useEffect(() => {
    localStorage.setItem("novagpt_conversations", JSON.stringify(conversations));
  }, [conversations]);

  // scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConvId, conversations, loading]);

  // textarea auto resize
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 300) + "px";
  }, [input]);

  const activeConv = conversations.find((c) => c.id === activeConvId);

  function createNewConversation() {
    const conv = { id: uid("conv_"), title: "New chat", messages: [], createdAt: Date.now() };
    setConversations((s) => [conv, ...s]);
    setActiveConvId(conv.id);
    setInput("");
    setAttachments([]);
  }

  function renameConversation(id) {
    const title = prompt("New conversation title:");
    if (!title) return;
    setConversations((s) => s.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  function deleteConversation(id) {
    if (!confirm("Delete this conversation?")) return;
    setConversations((s) => s.filter((c) => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
    }
  }

  function pushMessageToConv(convId, msg) {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, msg] } : c))
    );
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments((a) => [...a, { id: uid("f_"), name: file.name, data: reader.result }]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeAttachment(id) {
    setAttachments((a) => a.filter((x) => x.id !== id));
  }

  async function sendMessage() {
    if ((!input || !input.trim()) && attachments.length === 0) return;
    if (!activeConvId) {
      createNewConversation();
      await new Promise((r) => setTimeout(r, 80)); // wait a tick for conv to be created
    }
    const convId = activeConvId || (conversations[0] && conversations[0].id);
    const userMsg = { id: uid("m_"), role: "user", content: input.trim(), files: attachments };
    pushMessageToConv(convId, userMsg);
    setInput("");
    setAttachments([]);
    setLoading(true);

    // try to call backend first
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, conversationId: convId, files: attachments })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const aiText = data.reply ?? data?.choices?.[0]?.message?.content ?? "No response.";
      // if streaming not available, simple push
      const assistantMsg = { id: uid("m_"), role: "assistant", content: aiText, files: [] };
      pushMessageToConv(convId, assistantMsg);
    } catch (err) {
      // fallback: simulated short streaming echo
      const fallback = `Echo: ${userMsg.content}`;
      await simulateStreaming(convId, fallback);
    } finally {
      setLoading(false);
    }
  }

  async function simulateStreaming(convId, text) {
    const id = uid("m_");
    pushMessageToConv(convId, { id, role: "assistant", content: "", files: [] });
    let current = "";
    for (let i = 0; i < text.length; i++) {
      current += text[i];
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: c.messages.map((m) => (m.id === id ? { ...m, content: current } : m)) }
            : c
        )
      );
      // small delay to simulate streaming
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 25));
    }
  }

  function onCopy(text) {
    navigator.clipboard?.writeText(text).then(() => {
      // brief visual feedback could be added
    });
  }

  function exportConversation(conv) {
    const content = conv.messages.map((m) => `${m.role.toUpperCase()}:\n${m.content}\n`).join("\n---\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conv.title || "conversation"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="left">
          <img src="/logo.png" alt="Nova" className="logo" />
          <div className="brand">
            <div className="brand-title">NovaGPT</div>
            <div className="brand-sub">AI Assistant</div>
          </div>
        </div>

        <div className="right">
          <button
            className="icon-btn hide-on-mobile"
            onClick={() => {
              setSidebarOpen((s) => !s);
            }}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
        </div>
      </header>

      <main className="main">
        <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <div className="sidebar-actions">
            <button className="new-btn" onClick={createNewConversation}>
              + New chat
            </button>
          </div>

          <div className="convs">
            {conversations.length === 0 && <div className="empty">No conversations yet</div>}
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`conv ${c.id === activeConvId ? "active" : ""}`}
                onClick={() => setActiveConvId(c.id)}
              >
                <div className="conv-title">{c.title}</div>
                <div className="conv-actions">
                  <button title="Rename" onClick={(e) => { e.stopPropagation(); renameConversation(c.id); }}>✎</button>
                  <button title="Export" onClick={(e) => { e.stopPropagation(); exportConversation(c); }}>⇩</button>
                  <button title="Delete" onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}>🗑</button>
                </div>
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <small>Local only • Grey & white UI</small>
          </div>
        </aside>

        <section className="chat-area">
          {!activeConv && (
            <div className="center-empty">
              <h1>How can NovaGPT help?</h1>
              <p>Start by creating a new chat or selecting one from the left.</p>
              <button className="new-btn big" onClick={createNewConversation}>
                + New chat
              </button>
            </div>
          )}

          {activeConv && (
            <>
              <div className="chat-header">
                <div className="chat-title">{activeConv.title}</div>
                <div className="chat-header-actions">
                  <button onClick={() => renameConversation(activeConv.id)}>Rename</button>
                  <button onClick={() => exportConversation(activeConv)}>Export</button>
                </div>
              </div>

              <div className="messages" aria-live="polite">
                {activeConv.messages.map((m) => (
                  <Message key={m.id} m={m} onCopy={onCopy} />
                ))}

                {loading && (
                  <div className="assistant-typing">
                    <div className="dot" />
                    <div className="dot" />
                    <div className="dot" />
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              <div className="composer">
                <div className="attachments">
                  {attachments.map((a) => (
                    <div key={a.id} className="attach-pill">
                      <span className="name">{a.name}</span>
                      <button onClick={() => removeAttachment(a.id)}>✕</button>
                    </div>
                  ))}
                </div>

                <div className="input-row">
                  <textarea
                    ref={textareaRef}
                    className="input"
                    placeholder="Message NovaGPT (Shift+Enter for new line)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />

                  <div className="controls">
                    <label className="file-label" title="Attach file">
                      📎
                      <input type="file" onChange={handleFileChange} />
                    </label>

                    <button className="send-btn" onClick={sendMessage} disabled={loading}>
                      {loading ? "Sending..." : "Send ▶"}
                    </button>
                  </div>
                </div>

                <div className="hints">
                  <small>Supports **bold**, *italic*, `inline code`, lists, and ```code blocks```</small>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f6f6f6;
          color: #111;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
            "Helvetica Neue", Arial;
        }
        .topbar {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          border-bottom: 1px solid #e6e6e6;
          background: #fff;
        }
        .left { display:flex; align-items:center; gap:12px; }
        .logo { width:36px; height:36px; object-fit:contain; filter: grayscale(100%); }
        .brand-title { font-weight:700; font-size:16px; color:#111; }
        .brand-sub { font-size:12px; color:#777; margin-top:2px; }

        .main { display:flex; flex:1; height: calc(100vh - 64px); }
        .sidebar {
          width:280px;
          border-right:1px solid #e6e6e6;
          background:#fff;
          padding:12px;
          display:flex;
          flex-direction:column;
          transition: transform .22s ease;
        }
        .sidebar.closed { transform: translateX(-100%); position:absolute; z-index:100; }
        .sidebar-actions { padding-bottom:8px; }
        .new-btn { width:100%; padding:10px; border-radius:10px; border:1px solid #ddd; background:#f8f8f8; cursor:pointer; }
        .new-btn.big { padding:14px 20px; margin-top:14px; font-size:16px; }
        .convs { margin-top:10px; overflow:auto; flex:1; }
        .conv { display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:8px; cursor:pointer; }
        .conv:hover { background:#f2f2f2; }
        .conv.active { background:#e9e9e9; }
        .conv-title { font-size:14px; color:#111; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:170px; }
        .conv-actions button { margin-left:6px; background:transparent; border:none; cursor:pointer; color:#666; }

        .sidebar-footer { padding-top:8px; font-size:12px; color:#666; }

        .chat-area { flex:1; display:flex; flex-direction:column; align-items:center; background: linear-gradient(#f6f6f6, #fff); }
        .center-empty { margin-top:80px; text-align:center; color:#222; }
        .center-empty h1 { font-size:28px; margin-bottom:6px; }
        .messages { width:100%; max-width:820px; padding:28px; display:flex; flex-direction:column; gap:12px; overflow:auto; min-height:200px; }
        .chat-header { width:100%; max-width:820px; display:flex; justify-content:space-between; align-items:center; padding:12px 28px 0 28px; border-bottom:1px solid #eee; background:transparent; }
        .chat-title { font-weight:700; color:#111; }
        .chat-header-actions button { margin-left:8px; background:transparent; border:1px solid #eee; padding:6px 8px; border-radius:8px; cursor:pointer; }

        .msg { display:flex; gap:12px; align-items:flex-start; }
        .msg.user { justify-content:flex-end; }
        .avatar { width:36px; height:36px; border-radius:8px; background:#111; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0; }
        .bubble { max-width:76%; background:#fff; border:1px solid #e9e9e9; padding:12px 12px; border-radius:12px; box-shadow:0 1px 0 rgba(0,0,0,0.02); }
        .msg.user .bubble { background:#111; color:#fff; border-color:#111; }
        .content { line-height:1.45; font-size:15px; color:inherit; word-break:break-word; white-space:pre-wrap; }
        .md-inline { background:#eee; padding:2px 6px; border-radius:6px; font-family:monospace; font-size:13px; }
        .md-code { background:#f3f3f3; padding:10px; border-radius:8px; overflow:auto; font-family:monospace; font-size:13px; }
        .md-hr { border:none; border-top:1px solid #ddd; margin:8px 0; }

        .files { margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; }
        .file { font-size:13px; background:#fafafa; padding:6px 8px; border-radius:8px; border:1px solid #eee; }

        .msg-actions { margin-top:8px; display:flex; gap:6px; }
        .msg-actions button { font-size:12px; border-radius:8px; padding:6px 8px; border:1px solid #eee; background:transparent; cursor:pointer; }

        .assistant-typing { display:flex; gap:6px; align-items:center; padding:8px; }
        .dot { width:8px; height:8px; background:#bbb; border-radius:50%; animation: pulse 1s infinite ease-in-out; }
        .dot:nth-child(2) { animation-delay:.15s; }
        .dot:nth-child(3) { animation-delay:.3s; }
        @keyframes pulse { 0% { opacity:.4; transform:translateY(0); } 50% { opacity:1; transform:translateY(-4px);} 100% { opacity:.4; transform:translateY(0);} }

        .composer { width:100%; max-width:820px; padding:12px 28px 36px 28px; }
        .attachments { display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
        .attach-pill { background:#fff; border:1px solid #eee; padding:6px 8px; border-radius:999px; display:flex; gap:8px; align-items:center; }
        .input-row { display:flex; gap:12px; align-items:flex-end; background:transparent; }
        .input { flex:1; min-height:46px; max-height:220px; padding:12px 14px; border-radius:12px; border:1px solid #e6e6e6; resize:none; background:#fff; font-size:15px; outline:none; }
        .controls { display:flex; gap:8px; align-items:center; }
        .file-label { display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:8px; border:1px solid #eee; cursor:pointer; background:#fff; }
        .file-label input { display:none; }
        .send-btn { padding:10px 14px; border-radius:10px; background:#111; color:#fff; border:none; cursor:pointer; }

        .hints { margin-top:8px; color:#777; font-size:13px; }

        /* responsive */
        @media (max-width: 880px) {
          .sidebar { position:absolute; z-index:40; left:0; top:64px; bottom:0; background:#fff; transform:translateX(-100%); width:260px; }
          .sidebar.open { transform:translateX(0); }
          .chat-area { padding:0 12px; }
          .hide-on-mobile { display:none; }
        }
      `}</style>

      <style jsx global>{`
        /* minimal resets */
        html,body,#__next { height:100%; margin:0; }
        * { box-sizing:border-box; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
      `}</style>
    </div>
  );
}
