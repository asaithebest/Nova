import { useState, useEffect, useRef } from 'react';

export default function CompleteAIChat() {
  // Core state
  const [page, setPage] = useState('loading');
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  
  // Auth state
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Settings state
  const [settings, setSettings] = useState({
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful assistant.',
  });
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Initialize
  useEffect(() => {
    const savedUser = localStorage.getItem('ai_user');
    const savedTheme = localStorage.getItem('ai_theme') || 'dark';
    
    setTheme(savedTheme);
    
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      loadUserData(userData.id);
      setPage('app');
    } else {
      setPage('landing');
    }
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Load user data
  const loadUserData = (userId) => {
    const savedConvs = localStorage.getItem(`ai_convs_${userId}`);
    const savedSettings = localStorage.getItem(`ai_settings_${userId}`);
    
    if (savedConvs) {
      const convs = JSON.parse(savedConvs);
      setConversations(convs);
      if (convs.length > 0) {
        setActiveConvId(convs[0].id);
        setMessages(convs[0].messages);
      }
    }
    
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  // Save data
  const saveConversations = (convs) => {
    setConversations(convs);
    localStorage.setItem(`ai_convs_${user.id}`, JSON.stringify(convs));
  };

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem(`ai_settings_${user.id}`, JSON.stringify(newSettings));
  };

  // Auth functions
  const handleAuth = (e) => {
    e.preventDefault();
    
    if (authMode === 'signup' && (!name || !email || !password)) {
      alert('Please fill all fields');
      return;
    }
    
    if (authMode === 'login' && (!email || !password)) {
      alert('Please fill all fields');
      return;
    }

    const userId = btoa(email);
    const userKey = `ai_user_${userId}`;
    
    if (authMode === 'signup') {
      if (localStorage.getItem(userKey)) {
        alert('User already exists');
        return;
      }
      
      const newUser = {
        id: userId,
        name,
        email,
        password: btoa(password),
        createdAt: new Date().toISOString(),
        avatar: name.charAt(0).toUpperCase(),
      };
      
      localStorage.setItem(userKey, JSON.stringify(newUser));
      localStorage.setItem('ai_user', JSON.stringify(newUser));
      setUser(newUser);
      setConversations([]);
      setPage('app');
    } else {
      const savedUser = localStorage.getItem(userKey);
      
      if (!savedUser) {
        alert('User not found');
        return;
      }
      
      const userData = JSON.parse(savedUser);
      
      if (userData.password !== btoa(password)) {
        alert('Wrong password');
        return;
      }
      
      localStorage.setItem('ai_user', JSON.stringify(userData));
      setUser(userData);
      loadUserData(userData.id);
      setPage('app');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ai_user');
    setUser(null);
    setConversations([]);
    setMessages([]);
    setActiveConvId(null);
    setPage('landing');
  };

  // Conversation functions
  const createNewConversation = () => {
    const newConv = {
      id: Date.now().toString(),
      title: 'New conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    
    const updatedConvs = [newConv, ...conversations];
    saveConversations(updatedConvs);
    setActiveConvId(newConv.id);
    setMessages([]);
  };

  const deleteConversation = (id) => {
    if (!confirm('Delete this conversation?')) return;
    
    const updatedConvs = conversations.filter(c => c.id !== id);
    saveConversations(updatedConvs);
    
    if (activeConvId === id) {
      if (updatedConvs.length > 0) {
        setActiveConvId(updatedConvs[0].id);
        setMessages(updatedConvs[0].messages);
      } else {
        setActiveConvId(null);
        setMessages([]);
      }
    }
  };

  const renameConversation = (id) => {
    const newTitle = prompt('Enter new title:');
    if (!newTitle) return;
    
    const updatedConvs = conversations.map(c =>
      c.id === id ? { ...c, title: newTitle } : c
    );
    saveConversations(updatedConvs);
  };

  const switchConversation = (id) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setActiveConvId(id);
      setMessages(conv.messages);
    }
  };

  // Message functions
  const sendMessage = async (e) => {
    e?.preventDefault();
    
    if (!input.trim() || isTyping) return;
    
    let currentConvId = activeConvId;
    
    // Create new conversation if none exists
    if (!currentConvId) {
      const newConv = {
        id: Date.now().toString(),
        title: input.slice(0, 50),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      
      const updatedConvs = [newConv, ...conversations];
      saveConversations(updatedConvs);
      setActiveConvId(newConv.id);
      currentConvId = newConv.id;
    }
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);
    
    // Update conversation
    const updatedConvs = conversations.map(c => {
      if (c.id === currentConvId) {
        return {
          ...c,
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
          title: c.messages.length === 0 ? input.slice(0, 50) : c.title,
        };
      }
      return c;
    });
    saveConversations(updatedConvs);
    
    // Simulate AI response
    setTimeout(() => {
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `This is a simulated AI response. To enable real AI responses, integrate with an API like OpenAI, Anthropic, or your custom backend.\n\nYour message was: "${userMessage.content}"`,
        timestamp: new Date().toISOString(),
      };
      
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      setIsTyping(false);
      
      const finalConvs = conversations.map(c => {
        if (c.id === currentConvId) {
          return {
            ...c,
            messages: finalMessages,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });
      saveConversations(finalConvs);
    }, 1000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Theme toggle
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('ai_theme', newTheme);
  };

  // Render pages
  if (page === 'loading') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  if (page === 'landing') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center max-w-2xl px-4">
          <h1 className={`text-6xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Welcome to AI Chat
          </h1>
          <p className={`text-xl mb-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Your intelligent conversation partner
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setAuthMode('login');
                setPage('auth');
              }}
              className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Log in
            </button>
            <button
              onClick={() => {
                setAuthMode('signup');
                setPage('auth');
              }}
              className={`px-8 py-3 rounded-lg transition ${
                theme === 'dark'
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'auth') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`w-full max-w-md p-8 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
          <h2 className={`text-3xl font-bold mb-6 text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {authMode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-gray-50 text-gray-900 border-gray-300'
                } border focus:outline-none focus:border-emerald-500`}
              />
            )}
            
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-700 text-white border-gray-600'
                  : 'bg-gray-50 text-gray-900 border-gray-300'
              } border focus:outline-none focus:border-emerald-500`}
            />
            
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-700 text-white border-gray-600'
                  : 'bg-gray-50 text-gray-900 border-gray-300'
              } border focus:outline-none focus:border-emerald-500`}
            />
            
            <button
              type="submit"
              className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
            >
              {authMode === 'login' ? 'Log in' : 'Sign up'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className={`${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'} hover:underline`}
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </button>
          </div>
          
          <div className="mt-4 text-center">
            <button
              onClick={() => setPage('landing')}
              className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} hover:underline text-sm`}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className={`h-screen flex ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 ${
          theme === 'dark' ? 'bg-gray-950' : 'bg-white border-r border-gray-200'
        } flex flex-col overflow-hidden`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <button
            onClick={createNewConversation}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
          >
            + New chat
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`ml-2 p-2 rounded-lg ${
              theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => switchConversation(conv.id)}
              className={`group p-3 rounded-lg mb-1 cursor-pointer transition ${
                activeConvId === conv.id
                  ? theme === 'dark'
                    ? 'bg-gray-800'
                    : 'bg-gray-100'
                  : theme === 'dark'
                  ? 'hover:bg-gray-800'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm truncate flex-1 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                }`}>
                  {conv.title}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      renameConversation(conv.id);
                    }}
                    className={`p-1 rounded hover:bg-gray-700 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className={`p-1 rounded hover:bg-gray-700 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
              {user?.avatar}
            </div>
            <div className="flex-1">
              <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {user?.name}
              </div>
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {user?.email}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setSettingsOpen(true)}
            className={`w-full px-3 py-2 rounded-lg text-sm mb-2 transition ${
              theme === 'dark'
                ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            ⚙️ Settings
          </button>
          
          <button
            onClick={handleLogout}
            className={`w-full px-3 py-2 rounded-lg text-sm transition ${
              theme === 'dark'
                ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            🚪 Log out
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`h-14 flex items-center justify-between px-4 border-b ${
          theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
        }`}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className={`p-2 rounded-lg ${
                theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          
          <div className="flex-1 text-center">
            <h2 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {conversations.find(c => c.id === activeConvId)?.title || 'AI Chat'}
            </h2>
          </div>
          
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg ${
              theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  How can I help you today?
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Start a conversation by typing a message below
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      AI
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : theme === 'dark'
                        ? 'bg-gray-800 text-gray-100'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {user?.avatar}
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    AI
                  </div>
                  <div className={`px-4 py-3 rounded-2xl ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'
                  }`}>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className={`border-t p-4 ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <form onSubmit={sendMessage} className="max-w-3xl mx-auto">
            <div className={`flex gap-2 items-end p-2 rounded-xl ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white border border-gray-200'
            }`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message AI..."
                rows={1}
                className={`flex-1 px-3 py-2 bg-transparent resize-none focus:outline-none ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
                style={{ maxHeight: '200px' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-lg p-6 rounded-xl m-4 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Settings
              </h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Model
                </label>
                <select
                  value={settings.model}
                  onChange={(e) => saveSettings({ ...settings, model: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-white border-gray-600'
                      : 'bg-gray-50 text-gray-900 border-gray-300'
                  } border focus:outline-none focus:border-emerald-500`}
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5">GPT-3.5</option>
                  <option value="claude">Claude</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Temperature: {settings.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => saveSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Max Tokens: {settings.maxTokens}
                </label>
                <input
                  type="range"
                  min="256"
                  max="4096"
                  step="256"
                  value={settings.maxTokens}
                  onChange={(e) => saveSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  System Prompt
                </label>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => saveSettings({ ...settings, systemPrompt: e.target.value })}
                  rows={4}
                  className={`w-full px-4 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-white border-gray-600'
                      : 'bg-gray-50 text-gray-900 border-gray-300'
                  } border focus:outline-none focus:border-emerald-500`}
                />
              </div>
              
              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
              }`}>
                <h3 className={`font-medium mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Account Information
                </h3>
                <div className={`text-sm space-y-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <p><strong>Name:</strong> {user?.name}</p>
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Created:</strong> {new Date(user?.createdAt).toLocaleDateString()}</p>
                  <p><strong>Conversations:</strong> {conversations.length}</p>
                  <p><strong>Total Messages:</strong> {conversations.reduce((acc, c) => acc + c.messages.length, 0)}</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  if (confirm('Clear all conversations? This cannot be undone.')) {
                    saveConversations([]);
                    setMessages([]);
                    setActiveConvId(null);
                    setSettingsOpen(false);
                  }
                }}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Clear All Conversations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
