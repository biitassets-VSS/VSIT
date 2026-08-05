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
      {/* Floating Button matching the purple theme */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full shadow-2xl hover:opacity-90 transition-all cursor-pointer animate-bounce"
        >
          <Bot size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Header matching your screenshot exactly */}
          <div className="p-5 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white flex justify-between items-start">
            <div className="flex items-start gap-3">
              <Bot size={24} className="mt-1" />
              <div>
                <h2 className="font-extrabold text-lg leading-none">AI Support Assistant</h2>
                <p className="font-bold text-[10px] tracking-widest uppercase opacity-90 mt-1">Virtual Staffing IT</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-xl transition-colors cursor-pointer -mt-1">
              <X size={18} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="h-96 p-5 overflow-y-auto flex flex-col gap-4 bg-slate-50/50 custom-scrollbar">
            {messages.length === 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-4 text-sm shadow-sm self-start text-slate-700 w-11/12">
                <div className="font-bold text-[10px] mb-2 uppercase tracking-widest text-[#a855f7] flex items-center gap-1.5">
                  <Sparkles size={12} /> VSIT AI
                </div>
                Hi! I am your VSIT Assistant. How can I help you with your IT portal today?
              </div>
            )}
            
            {messages.map((m, index) => (
              m.role === 'user' ? (
                /* User Message (Purple Bubble) */
                <div key={index} className="bg-[#a855f7] text-white self-end rounded-2xl rounded-tr-none px-4 py-3 text-sm shadow-sm max-w-[85%]">
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ) : (
                /* AI Message (White Bubble) */
                <div key={index} className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-4 text-sm shadow-sm self-start text-slate-700 max-w-[90%]">
                  <div className="font-bold text-[10px] mb-2 uppercase tracking-widest text-[#a855f7] flex items-center gap-1.5">
                    <Sparkles size={12} /> VSIT AI
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                </div>
              )
            ))}
            
            {isLoading && (
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-4 shadow-sm self-start flex gap-1.5 items-center w-16">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleFormSubmit} className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about IT issues..."
              className="flex-1 text-sm px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-purple-400 transition-all text-slate-800"
            />
            <button type="submit" disabled={!input.trim() || isLoading} className="p-3 bg-[#c084fc] hover:bg-[#a855f7] text-white rounded-2xl disabled:opacity-50 transition-all cursor-pointer shadow-md shrink-0">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}