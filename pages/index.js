import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Image from "next/image";

function Message({ role, content }) {
  return (
    <div className={`message ${role}`}>
      <div className="message-content">
        <div className="avatar">
          {role === "assistant" ? (
            <Image src="/logo.png" alt="Zero" width={40} height={40} />
          ) : (
            "U"
          )}
        </div>
        <div className="text">{content}</div>
      </div>
    </div>
  );
}

function ConversationItem({ conv, onClick, isActive }) {
  const preview = conv.messages[conv.messages.length - 1]?.content.substring(0, 50) || "New conversation";
  
  return (
    <div className={`conv-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className="conv-item-title">{conv.title}</div>
      <div className="conv-item-preview">{preview}...</div>
    </div>
  );
}

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

  // Load user session on mount
  useEffect(() => {
    const session = localStorage.getItem("zero_session");
    if (session) {
      const user = JSON.parse(session);
      setCurrentUser(user);
      setIsAuthenticated(true);
      loadUserConversations(user.username);
    }
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  // Save conversations whenever they change
  useEffect(() => {
    if (currentUser && conversations.length > 0) {
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
        setMessages(convs[0].messages);
      }
    }
  }

  function handleAuth(e) {
    e.preventDefault();
    
    if (!username || !password) {
      alert("Please fill all fields");
      return;
    }

    if (authMode === "register") {
      // Check if user exists
      const existingUser = localStorage.getItem(`zero_user_${username}`);
      if (existingUser) {
        alert("Username already exists");
        return;
      }

      // Create new user
      const newUser = { username, password, createdAt: new Date().toISOString() };
      localStorage.setItem(`zero_user_${username}`, JSON.stringify(newUser));
      localStorage.setItem("zero_session", JSON.stringify(newUser));
      setCurrentUser(newUser);
      setIsAuthenticated(true);
      setShowAuthModal(false);
      setUsername("");
      setPassword("");
    } else {
      // Login
      const userData = localStorage.getItem(`zero_user_${username}`);
      if (!userData) {
        alert("User not found");
        return;
      }

      const user = JSON.parse(userData);
      if (user.password !== password) {
        alert("Invalid password");
        return;
      }

      localStorage.setItem("zero_session", JSON.stringify(user));
      setCurrentUser(user);
      setIsAuthenticated(true);
      setShowAuthModal(false);
      loadUserConversations(username);
      setUsername("");
      setPassword("");
    }
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
    const newConv = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString()
    };
    
    setConversations([newConv, ...conversations]);
    setCurrentConvId(newConv.id);
    setMessages([]);
  }

  function switchConversation(convId) {
    setCurrentConvId(convId);
    const conv = conversations.find(c => c.id === convId);
    if (conv) {
      setMessages(conv.messages);
    }
  }

  function updateCurrentConversation(newMessages) {
    setConversations(prev => prev.map(conv => {
      if (conv.id === currentConvId) {
        // Auto-generate title from first message
        const title = newMessages.length > 0 && conv.title === "New Chat"
          ? newMessages[0].content.substring(0, 30) + "..."
          : conv.title;
        
        return { ...conv, messages: newMessages, title };
      }
      return conv;
    }));
  }

  const push = (m) => {
    const newMessages = [...messages, m];
    setMessages(newMessages);
    updateCurrentConversation(newMessages);
  };

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    // Create conversation if none exists
    if (!currentConvId) {
      createNewConversation();
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

  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>Zero - AI Assistant</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
        </Head>

        <div className="landing-page">
          <div className="landing-content">
            <div className="logo-large">
              <Image src="/logo.png" alt="Zero" width={120} height={120} />
            </div>
            <h1 className="landing-title">Welcome to Zero</h1>
            <p className="landing-subtitle">Your intelligent AI assistant powered by GPT-4o</p>
            
            <div className="landing-buttons">
              <button 
                className="btn btn-primary" 
                onClick={() => { setAuthMode("register"); setShowAuthModal(true); }}
              >
                Get Started
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => { setAuthMode("login"); setShowAuthModal(true); }}
              >
                Sign In
              </button>
            </div>

            <div className="features-grid">
              <div className="feature-card-mini">
                <div className="feature-icon-mini">🚀</div>
                <div className="feature-text-mini">Lightning Fast</div>
              </div>
              <div className="feature-card-mini">
                <div className="feature-icon-mini">🔒</div>
                <div className="feature-text-mini">Secure & Private</div>
              </div>
              <div className="feature-card-mini">
                <div className="feature-icon-mini">💎</div>
                <div className="feature-text-mini">GPT-4o Powered</div>
              </div>
            </div>
          </div>

          {showAuthModal && (
            <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setShowAuthModal(false)}>×</button>
                
                <h2 className="modal-title">
                  {authMode === "login" ? "Welcome Back" : "Create Account"}
                </h2>
                <p className="modal-subtitle">
                  {authMode === "login" ? "Sign in to continue" : "Join Zero today"}
                </p>

                <form onSubmit={handleAuth}>
                  <div className="input-group">
                    <label className="input-label">Username</label>
                    <input
                      type="text"
                      className="input-field"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Password</label>
                    <input
                      type="password"
                      className="input-field"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                    {authMode === "login" ? "Sign In" : "Create Account"}
                  </button>
                </form>

                <div className="switch-auth">
                  {authMode === "login" ? (
                    <>Don't have an account? <a onClick={() => setAuthMode("register")}>Sign up</a></>
                  ) : (
                    <>Already have an account? <a onClick={() => setAuthMode("login")}>Sign in</a></>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Zero - Chat</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-header">
            <button className="new-chat" onClick={createNewConversation}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New chat
            </button>
          </div>

          <div className="conversations">
            <div className="conv-section">
              <div className="conv-title">Recent</div>
              {conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === currentConvId}
                  onClick={() => switchConversation(conv.id)}
                />
              ))}
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="user-section">
              <div className="user-avatar">{currentUser.username[0].toUpperCase()}</div>
              <span>{currentUser.username}</span>
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <main className="main">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="logo-welcome">
                <Image src="/logo.png" alt="Zero" width={80} height={80} />
              </div>
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
                      <Image src="/logo.png" alt="Zero" width={40} height={40} />
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
                placeholder="Message Zero"
                rows="1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button type="submit" disabled={loading || !input.trim()} className="send-button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 11L12 6L17 11M12 18V7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>
            <div className="input-footer">Zero can make mistakes. Check important info.</div>
          </div>
        </main>
      </div>
    </>
  );
}
