'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send } from 'lucide-react';

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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiMessageContent = '';

      // Add a temporary empty message for the AI that we will fill up as the stream comes in
      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        aiMessageContent += decoder.decode(value, { stream: true });
        
        // Update the last message (the AI's message) with the new text chunk
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
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-50 p-4 bg-orange-600 text-white rounded-full shadow-2xl hover:bg-orange-700 transition-all cursor-pointer animate-bounce"
        >
          <Bot size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 z-50 w-80 sm:w-96 bg-white/90 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          
          {/* Header */}
          <div className="p-4 bg-orange-600 text-white flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <Bot size={18} />
              <span className="font-bold text-sm tracking-wide">VSS IT Helpdesk AI</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-orange-700 p-1.5 rounded-lg transition-colors cursor-pointer">
              <X size={16} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="h-80 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar bg-slate-50/50">
            {messages.length === 0 && (
              <div className="m-auto text-center text-slate-400 text-xs font-medium">
                <Bot size={32} className="mx-auto mb-2 opacity-50" />
                Hi! I am the VSS IT Assistant.<br/> Ask me about Wi-Fi, Outlook, Teams, or Windows errors!
              </div>
            )}
            
            {messages.map((m, index) => (
              <div key={index} className={`max-w-[85%] p-3 text-xs font-medium rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-orange-100 text-orange-900 self-end rounded-br-none border border-orange-200' : 'bg-white text-slate-800 self-start rounded-bl-none border border-slate-200'}`}>
                <div className={`font-bold text-[9px] mb-1 uppercase tracking-widest ${m.role === 'user' ? 'text-orange-600' : 'text-slate-400'}`}>
                  {m.role === 'user' ? 'You' : 'VSS IT Bot'}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
              </div>
            ))}
            
            {isLoading && (
              <div className="self-start bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleFormSubmit} className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your IT issue..."
              className="flex-1 text-xs px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-800"
            />
            <button type="submit" disabled={!input.trim() || isLoading} className="p-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-all cursor-pointer shadow-sm">
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}