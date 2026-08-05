'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';

export default function StaffAIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Connecting to the real API route we built
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiMessageContent = '';

      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        aiMessageContent += decoder.decode(value, { stream: true });
        
        setMessages([...newMessages, { role: 'assistant', content: aiMessageContent }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the IT Helpdesk server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 🌟 FROSTED GLASS FLOATING BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-4 bg-linear-to-r from-orange-500 to-purple-600 text-white rounded-full shadow-[0_8px_20px_rgba(168,85,247,0.4)] hover:scale-110 active:scale-95 transition-all cursor-pointer animate-bounce border border-purple-400/50"
        >
          <Bot size={28} />
        </button>
      )}

      {/* 🌟 APPLE PREMIUM 2026 FROSTED GLASS WINDOW */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white/40 backdrop-blur-2xl backdrop-saturate-[1.5] border border-white/70 shadow-[0_16px_40px_rgba(31,38,135,0.1)] rounded-4xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-6 duration-300">
          
          {/* Glass Header */}
          <div className="p-4 bg-linear-to-r from-orange-500/90 to-purple-600/90 backdrop-blur-md text-white flex justify-between items-start border-b border-white/20">
            <div className="flex items-center gap-3">
              <Bot size={24} />
              <div>
                <h2 className="font-extrabold text-sm tracking-tight leading-none">AI Support Assistant</h2>
                <p className="font-bold text-[10px] tracking-widest uppercase opacity-90 mt-1">Virtual Staffing IT</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer">
              <X size={18} />
            </button>
          </div>

          {/* Chat Messages Area (Transparent) */}
          <div className="h-96 p-5 overflow-y-auto flex flex-col gap-4 bg-transparent custom-scrollbar">
            {messages.length === 0 && (
              <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-[inset_0_2px_8px_rgba(255,255,255,0.6)] rounded-2xl rounded-tl-none px-4 py-4 text-sm self-start text-slate-800 w-11/12">
                <div className="font-bold text-[10px] mb-2 uppercase tracking-widest text-purple-600 flex items-center gap-1.5">
                  <Sparkles size={12} /> VSIT AI
                </div>
                Hi! I am your VSIT Assistant. How can I help you with your IT portal today?
              </div>
            )}
            
            {messages.map((m, index) => (
              m.role === 'user' ? (
                /* User Message (Purple Glass Bubble) */
                <div key={index} className="bg-linear-to-r from-purple-500/90 to-purple-600/90 backdrop-blur-md text-white self-end rounded-2xl rounded-br-none px-4 py-3 text-sm shadow-lg border border-purple-400/50 max-w-[85%]">
                  <div className="whitespace-pre-wrap font-medium">{m.content}</div>
                </div>
              ) : (
                /* AI Message (White Frosted Bubble) */
                <div key={index} className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-[inset_0_2px_8px_rgba(255,255,255,0.6)] rounded-2xl rounded-tl-none px-4 py-4 text-sm self-start text-slate-800 max-w-[90%]">
                  <div className="font-bold text-[10px] mb-2 uppercase tracking-widest text-purple-600 flex items-center gap-1.5">
                    <Sparkles size={12} /> VSIT AI
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed font-medium">{m.content}</div>
                </div>
              )
            ))}
            
            {isLoading && (
              <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl rounded-tl-none px-4 py-4 shadow-sm self-start flex gap-1.5 items-center w-16">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Frosted Input Area */}
          <form onSubmit={handleFormSubmit} className="p-3 bg-white/30 border-t border-white/50 backdrop-blur-md flex gap-2 items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about IT issues..."
              className="flex-1 text-xs font-semibold px-4 py-3 bg-white/50 border border-white/60 rounded-xl outline-none focus:bg-white/70 focus:ring-4 focus:ring-purple-500/10 transition-all text-slate-900 placeholder:text-slate-500 shadow-inner"
            />
            <button type="submit" disabled={!input.trim() || isLoading} className="p-3 bg-linear-to-r from-purple-500 to-purple-600 text-white rounded-xl disabled:opacity-50 transition-all cursor-pointer shadow-sm hover:opacity-90 border border-purple-400/50 shrink-0 active:scale-95">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}