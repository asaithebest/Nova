import { useState, useEffect, useRef } from "react";
import { useAuth } from "./hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, Plus, LogOut, MessageSquare, Trash2 } from "lucide-react";

export default function ZeroGPT() {
  const { user, isAuthenticated, logout } = useAuth();
  const [input, setInput] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);

  const { data: convs } = useQuery({
    queryKey: ["/api/conversations"],
    enabled: isAuthenticated
  });

  const { data: messages } = useQuery({
    queryKey: ["/api/messages", activeId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${activeId}`);
      return res.json();
    },
    enabled: !!activeId
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (text) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId: activeId, files: attachments })
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: (data) => {
      setActiveId(data.conversationId);
      setAttachments([]);
      queryClient.invalidateQueries(["/api/messages", data.conversationId]);
      queryClient.invalidateQueries(["/api/conversations"]);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      setAttachments([...attachments, data]);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d0d0d] text-white">
        <div className="max-w-md w-full p-8 text-center">
          <h1 className="text-5xl font-bold mb-6 tracking-tight">ZeroGPT</h1>
          <p className="text-gray-400 mb-8">Your private AI assistant. Log in to get started.</p>
          <button 
            onClick={() => window.location.href = "/api/login"}
            className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95"
          >
            Log in with Replit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#212121] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-[260px] bg-[#171717] flex flex-col p-3 border-r border-white/5">
        <button 
          onClick={() => { setActiveId(null); setInput(""); }}
          className="flex items-center gap-3 px-3 py-3 border border-white/10 rounded-lg hover:bg-white/5 transition-colors mb-4"
        >
          <Plus size={18} />
          <span className="font-medium text-sm">New Chat</span>
        </button>
        
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
          {convs?.map(c => (
            <div 
              key={c.id} 
              onClick={() => setActiveId(c.id)}
              className={`group flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg text-sm transition-colors ${activeId === c.id ? 'bg-[#2f2f2f]' : 'hover:bg-[#2f2f2f]/50'}`}
            >
              <MessageSquare size={16} className="text-gray-400" />
              <span className="flex-1 truncate">{c.title}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 mt-auto border-t border-white/5 space-y-1">
          <div className="flex items-center gap-3 px-3 py-3">
             <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
               {user?.firstName?.[0] || 'U'}
             </div>
             <span className="flex-1 truncate text-sm font-medium">{user?.firstName || 'User'}</span>
          </div>
          <button 
            onClick={logout} 
            className="w-full flex items-center gap-3 px-3 py-3 text-red-400 hover:bg-white/5 rounded-lg text-sm transition-colors"
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col relative bg-[#212121]">
        <div className="flex items-center justify-center py-3 border-b border-white/5 bg-[#212121]/80 backdrop-blur-md sticky top-0 z-10">
          <span className="font-bold text-gray-400">ZeroGPT 4o</span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 space-y-6 scroll-smooth">
          {!activeId && !messages?.length && (
            <div className="h-full flex flex-col items-center justify-center text-center pb-20">
              <h2 className="text-3xl font-bold mb-2">How can I help you today?</h2>
              <p className="text-gray-400">Start a new conversation with ZeroGPT.</p>
            </div>
          )}
          {messages?.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={m.role === 'user' ? 'message-user' : 'message-assistant leading-relaxed'}>
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.files?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.files.map((f, idx) => (
                      <div key={idx} className="text-[10px] bg-white/10 px-2 py-1 rounded border border-white/5">
                        📎 {f.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="message-assistant text-gray-400 italic flex items-center gap-2">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent">
          <div className="max-w-3xl mx-auto relative group">
            {attachments.length > 0 && (
              <div className="absolute -top-12 left-0 right-0 flex gap-2 overflow-x-auto pb-2 px-1">
                {attachments.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#2f2f2f] border border-white/10 px-3 py-1.5 rounded-full text-xs">
                    <span className="truncate max-w-[100px]">{f.name}</span>
                    <Trash2 size={12} className="cursor-pointer hover:text-red-400" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} />
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2 border border-white/10 rounded-2xl bg-[#2f2f2f] p-2 shadow-2xl focus-within:border-white/20 transition-all">
              <textarea 
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !chatMutation.isPending) {
                      chatMutation.mutate(input);
                      setInput("");
                    }
                  }
                }}
                placeholder="Message ZeroGPT..."
                className="w-full bg-transparent outline-none p-3 resize-none max-h-48 scrollbar-hide"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-1">
                  <label className="p-2 text-gray-400 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    <Paperclip size={18} className={isUploading ? 'animate-pulse' : ''} />
                  </label>
                </div>
                <button 
                  disabled={(!input.trim() && attachments.length === 0) || chatMutation.isPending}
                  onClick={() => { chatMutation.mutate(input); setInput(""); }}
                  className="p-2 bg-white text-black rounded-xl disabled:opacity-30 disabled:hover:bg-white hover:bg-gray-200 transition-all active:scale-95 shadow-lg"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center text-gray-500 mt-3">ZeroGPT can make mistakes. Check important info.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
