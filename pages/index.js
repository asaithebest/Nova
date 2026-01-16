// pages/index.js
import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Image from "next/image";

/* ---------- Helpers: rendu markdown minimal + copy ---------- */
function renderMessage(text) {
  if (typeof text !== "string") text = String(text || "");

  // Split par blocs de code ```code```
  const blocks = text.split(/```/g);

  return blocks.map((block, i) => {
    // blocs impair => code block
    if (i % 2 === 1) {
      const code = block.replace(/^\n+|\n+$/g, ""); // trim newlines around code
      return (
        <div key={`code-${i}`} className="code-block">
          <button
            className="copy-btn"
            onClick={() => {
              try {
                navigator.clipboard.writeText(code);
              } catch {
                // fallback
                const ta = document.createElement("textarea");
                ta.value = code;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
              }
            }}
            title="Copier le code"
          >
            Copier
          </button>
          <pre><code>{code}</code></pre>
        </div>
      );
    }

    // texte normal => convert basic markdown inline
    const html = block
      // bold **text**
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // italic *text*
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // inline code `code`
      .replace(/`(.+?)`/g, "<code>$1</code>")
      // ordered lists 1. item
      .replace(/(^|\n)\s*\d+\.\s+(.*?)(?=\n|$)/g, "$1<li>$2</li>")
      // unordered lists - item or * item
      .replace(/(^|\n)\s*[-*]\s+(.*?)(?=\n|$)/g, "$1<li>$2</li>")
      // line breaks
      .replace(/\n/g, "<br>");

    // handle list wrapping if any <li> found
    if (/<li>/.test(html)) {
      // split into lines and find sequences of li
      const parts = html.split(/(<br>)/g);
      // simple approach: if html contains <li> wrap all li in <ul>
      const wrapped = html.replace(/(<li>.*?<\/li>)/gs, (m) => m);
      const withUl = "<ul class='simple-list'>" + wrapped.replace(/\s*<br>\s*/g, "") + "</ul>";
      return <div key={`txt-${i}`} dangerouslySetInnerHTML={{ __html: withUl }} />;
    }

    return <div key={`txt-${i}`} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

/* ---------- Message component ---------- */
function Message({ role, content }) {
  return (
    <div className={`message ${role}`}>
      <div className="message-content">
        <div className="avatar">
          {role === "assistant" ? (
            <Image src="/logo.png" alt="Nova" width={40} height={40} />
          ) : (
            <div className="user-initial">U</div>
          )}
        </div>

        <div className="bubble">
          {renderMessage(content)}
        </div>
      </div>
    </div>
  );
}

/* ---------- Conversation list item ---------- */
function ConversationItem({ conv, onClick, isActive }) {
  const preview = conv.messages?.[conv.messages.length - 1]?.content?.slice(0, 60) || "Nouvelle conversation";
  return (
    <div className={`conv-item ${isActive ? "active" : ""}`} onClick={onClick}>
      <div className="conv-item-title">{conv.title}</div>
      <div className="conv-item-preview">{preview}{preview.length >= 60 ? "…" : ""}</div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef();
  const textareaRef = useRef();

  useEffect(() => {
    const session = localStorage.getItem("zero_session");
    if (session) {
      const user = JSON.parse(session);
      setCurrentUser(user);
      setIsAuthenticated(true);
      loadUserConversations(user.username);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 260) + "px";
    }
  }, [input]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`zero_convs_${currentUser.username}`, JSON.stringify(conversations));
    }
  }, [conversations, currentUser]);

  function loadUserConversations(username) {
    const saved = localStorage.getItem(`zero_convs_${username}`);
    if (saved) {
      const convs = JSON.parse(saved);
      setConversations(convs);
      if (convs.length > 0) {
        setCurrentConvId(convs[0].id);
        setMessages(convs[0].messages || []);
      }
    }
  }

  function handleAuth(e) {
    e?.preventDefault();
    if (!username || !password) return alert("Remplis tous les champs");

    if (authMode === "register") {
      if (localStorage.getItem(`zero_user_${username}`)) return alert("Utilisateur existe déjà");
      const u = { username, password, createdAt: new Date().toISOString() };
      localStorage.setItem(`zero_user_${username}`, JSON.stringify(u));
      localStorage.setItem("zero_session", JSON.stringify(u));
      setCurrentUser(u);
      setIsAuthenticated(true);
      setShowAuthModal(false);
      setUsername(""); setPassword("");
      setConversations([]);
      return;
    }

    const raw = localStorage.getItem(`zero_user_${username}`);
    if (!raw) return alert("Utilisateur introuvable");
    const u = JSON.parse(raw);
    if (u.password !== password) return alert("Mot de passe incorrect");
    localStorage.setItem("zero_session", JSON.stringify(u));
    setCurrentUser(u);
    setIsAuthenticated(true);
    setShowAuthModal(false);
    setUsername(""); setPassword("");
    loadUserConversations(username);
  }

  function handleLogout() {
    localStorage.removeItem("zero_session");
    setCurrentUser(null);
    setIsAuthenticated(false);
    setConversations([]);
    setMessages([]);
    setCurrentConvId(null);
  }

  function createNewConversation() {
    const newConv = { id: Date.now().toString(), title: "Nouvelle conversation", messages: [], createdAt: new Date().toISOString() };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConvId(newConv.id);
    setMessages([]);
  }

  function switchConversation(id) {
    setCurrentConvId(id);
    const conv = conversations.find(c => c.id === id);
    if (conv) setMessages(conv.messages || []);
  }

  function updateCurrentConversation(newMessages) {
    if (!currentConvId) return;
    setConversations(prev => prev.map(conv => {
      if (conv.id === currentConvId) {
        const title = conv.title === "Nouvelle conversation" && newMessages.length > 0 ? newMessages[0].content.slice(0, 30) + "..." : conv.title;
        return { ...conv, messages: newMessages, title };
      }
      return conv;
    }));
  }

  const push = (m) => {
    const nm = [...messages, m];
    setMessages(nm);
    updateCurrentConversation(nm);
  };

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    if (!currentConvId) {
      const newConv = { id: Date.now().toString(), title: "Nouvelle conversation", messages: [], createdAt: new Date().toISOString() };
      setConversations(prev => [newConv, ...prev]);
      setCurrentConvId(newConv.id);
    }

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    updateCurrentConversation(newMessages);
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
        const msg = data?.message || data?.error?.message || JSON.stringify(data) || `HTTP ${res.status}`;
        push({ role: "assistant", content: `Erreur : ${msg}` });
      } else {
        const reply = data?.reply ?? data?.choices?.[0]?.message?.content ?? "Pas de réponse.";
        push({ role: "assistant", content: reply });
      }
    } catch (err) {
      push({ role: "assistant", content: `Erreur réseau : ${err?.message || String(err)}` });
    } finally {
      setLoading(false);
    }
  }

  /* ---------- UI ---------- */
  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>ZeroGPT</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
        </Head>

        <div className="landing-page">
          <div className="landing-content">
            <div className="logo-large"><Image src="/logo.png" alt="Zero" width={120} height={120} /></div>
            <h1 className="landing-title">ZeroGPT</h1>
            <p className="landing-subtitle">Assistant — rapide et simple</p>

            <div className="landing-buttons">
              <button className="btn btn-primary" onClick={() => { setAuthMode("register"); setShowAuthModal(true); }}>Créer un compte</button>
              <button className="btn btn-secondary" onClick={() => { setAuthMode("login"); setShowAuthModal(true); }}>Se connecter</button>
            </div>

            <div className="features-grid">
              <div className="feature-card-mini"><div className="feature-icon-mini">⚡</div><div className="feature-text-mini">Rapide</div></div>
              <div className="feature-card-mini"><div className="feature-icon-mini">🔒</div><div className="feature-text-mini">Local & simple</div></div>
              <div className="feature-card-mini"><div className="feature-icon-mini">🧠</div><div className="feature-text-mini">GPT-4o</div></div>
            </div>
          </div>

          {showAuthModal && (
            <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setShowAuthModal(false)}>×</button>
                <h2 className="modal-title">{authMode === "login" ? "Connexion" : "Inscription"}</h2>
                <form onSubmit={handleAuth}>
                  <div className="input-group">
                    <label className="input-label">Nom d'utilisateur</label>
                    <input className="input-field" value={username} onChange={e => setUsername(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Mot de passe</label>
                    <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>{authMode === "login" ? "Se connecter" : "S'inscrire"}</button>
                </form>
                <div className="switch-auth">{authMode === "login" ? <>Pas de compte ? <a onClick={() => setAuthMode("register")}>Inscris-toi</a></> : <>Déjà un compte ? <a onClick={() => setAuthMode("login")}>Connecte-toi</a></>}</div>
              </div>
            </div>
          )}
        </div>

        <style jsx global>{`
          :root{--bg:#0b1220;--panel:#071023;--muted:#9fb4c9;--accent:#06b6d4;--text:#e6eef8}
          *{box-sizing:border-box}html,body,#__next{height:100%;margin:0;font-family:Inter,system-ui,Roboto,Arial;background:var(--bg);color:var(--text)}
          .landing-page{min-height:100vh;display:flex;align-items:center;justify-content:center}
          .landing-content{text-align:center}
          .logo-large{margin-bottom:20px}
          .landing-title{font-size:36px;margin:0 0 8px;font-weight:800}
          .landing-subtitle{color:var(--muted);margin-bottom:18px}
          .landing-buttons{display:flex;gap:12px;justify-content:center;margin-bottom:20px}
          .btn{padding:10px 14px;border-radius:10px;border:none;cursor:pointer}
          .btn-primary{background:var(--accent);color:#062;box-shadow:0 6px 20px rgba(6,182,212,0.12)}
          .btn-secondary{background:transparent;border:1px solid rgba(255,255,255,0.06);color:var(--text)}
          .features-grid{display:flex;gap:12px;justify-content:center;margin-top:8px}
          .feature-card-mini{background:rgba(255,255,255,0.03);padding:12px;border-radius:10px;width:140px;text-align:center}
          .feature-text-mini{color:var(--muted);margin-top:6px}

          /* Main app layout */
          .app{display:flex;height:100vh;width:100vw}
          .sidebar{width:260px;background:rgba(10,10,15,0.95);padding:14px;border-right:1px solid rgba(255,255,255,0.03);display:flex;flex-direction:column}
          .new-chat{width:100%;padding:10px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);color:var(--text);cursor:pointer}
          .conversations{flex:1;overflow:auto;margin-top:12px}
          .conv-item{padding:10px;border-radius:8px;cursor:pointer;margin-bottom:8px}
          .conv-item.active{background:rgba(255,255,255,0.03)}
          .main{flex:1;display:flex;flex-direction:column}
          .messages{flex:1;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:12px}
          .message{display:flex;gap:12px;max-width:900px;margin:0 auto}
          .message.user{flex-direction:row-reverse}
          .message-content{display:flex;gap:12px;align-items:flex-start}
          .avatar{width:40px;height:40px;border-radius:8px;overflow:hidden;background:linear-gradient(135deg,#8b5cf6,#3b82f6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}
          .user-initial{background:#2b3b52;color:#fff;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:6px}
          .bubble{background:rgba(255,255,255,0.02);padding:12px;border-radius:12px;max-width:78%;white-space:pre-wrap}
          .bubble p{margin:0}
          .code-block{position:relative;margin:8px 0}
          .code-block pre{background:#071022;padding:12px;border-radius:8px;overflow:auto;border:1px solid rgba(255,255,255,0.03)}
          .code-block code{display:block;white-space:pre-wrap;color:#dbefff}
          .copy-btn{position:absolute;top:8px;right:8px;padding:6px 8px;border-radius:8px;border:none;background:#0f1720;color:#dbefff;cursor:pointer}
          .input-area{padding:16px;border-top:1px solid rgba(255,255,255,0.03)}
          .input-form{max-width:900px;margin:0 auto;position:relative}
          .input-form textarea{width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.03);background:transparent;color:var(--text);resize:none}
          .send-button{position:absolute;right:12px;bottom:12px;width:44px;height:44px;border-radius:10px;background:var(--accent);border:none;color:#012;cursor:pointer}
          .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center}
          .modal{background:rgba(10,10,15,0.98);padding:24px;border-radius:12px;max-width:420px;width:100%}
          .modal-close{position:absolute;right:12px;top:12px;border:none;background:transparent;color:var(--muted);font-size:20px;cursor:pointer}
          .typing-indicator{display:flex;gap:6px;align-items:center}
          .typing-indicator span{width:8px;height:8px;border-radius:50%;background:#8b5cf6;animation:blink 1s infinite}
          @keyframes blink{0%,80%,100%{transform:scale(0);opacity:0.4}40%{transform:scale(1);opacity:1}}
          .simple-list{padding-left:18px;margin:6px 0}
          @media(max-width:900px){.sidebar{display:none}}
        `}</style>
      </>
    );
  }

  /* ---------- Authenticated UI ---------- */
  return (
    <>
      <Head>
        <title>ZeroGPT - Chat</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-header">
            <button className="new-chat" onClick={createNewConversation}>+ Nouveau chat</button>
          </div>

          <div className="conversations">
            <div className="conv-section">
              <div className="conv-title" style={{padding:"8px", color:"#9fb4c9"}}>Récentes</div>
              {conversations.map(conv => (
                <ConversationItem key={conv.id} conv={conv} isActive={conv.id === currentConvId} onClick={() => switchConversation(conv.id)} />
              ))}
            </div>
          </div>

          <div style={{marginTop:"auto",padding:"12px"}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div className="user-avatar" style={{width:36,height:36,borderRadius:8,background:"linear-gradient(135deg,#8b5cf6,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#012"}}>{currentUser.username[0].toUpperCase()}</div>
              <div style={{color:"var(--muted)"}}>{currentUser.username}</div>
              <button className="logout-btn" onClick={handleLogout} style={{marginLeft:"auto",background:"transparent",border:"1px solid rgba(255,255,255,0.03)",padding:8,borderRadius:8}}>Déconnexion</button>
            </div>
          </div>
        </aside>

        <main className="main">
          {messages.length === 0 ? (
            <div className="empty-state" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
              <div className="logo-welcome"><Image src="/logo.png" alt="Zero" width={96} height={96} /></div>
              <h1 style={{marginTop:12}}>Comment puis-je t'aider ?</h1>
            </div>
          ) : (
            <div className="messages" ref={scrollRef}>
              {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} />)}
              {loading && (
                <div className="message assistant">
                  <div className="message-content">
                    <div className="avatar"><Image src="/logo.png" alt="Zero" width={40} height={40} /></div>
                    <div className="bubble"><div className="typing-indicator"><span></span><span></span><span></span></div></div>
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
                onChange={e => setInput(e.target.value)}
                placeholder="Tape ton message... (Enter = envoyer, Shift+Enter = nouvelle ligne)"
                rows={1}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <button type="submit" disabled={loading || !input.trim()} className="send-button" aria-label="Envoyer">
                {loading ? "…" : "→"}
              </button>
            </form>
          </div>
        </main>
      </div>

      <style jsx global>{`
        /* small additional tweaks when logged in */
        .modal-overlay{z-index:2000}
      `}</style>
    </>
  );
}
