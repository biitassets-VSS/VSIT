'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';

interface ChatMessage {
  sender: 'AI' | 'User' | 'Me' | string;
  text: string;
  image?: string; 
}

interface StaffAIChatbotProps {
  isDarkMode: boolean;
}

export default function StaffAIChatbot({ isDarkMode }: StaffAIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'AI', text: 'Hi! I am your VSIT Assistant. How can I help you with your IT portal today?' }
  ]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, isOpen, isLoading]);

  // 🌟 CUSTOM INLINE IMAGE RENDERER WITH ZOOM
  const renderAiText = (text: string) => {
    const parts = text.split(/(\[IMG:.*?\])/g);
    return parts.map((part, i) => {
      if (part.startsWith('[IMG:') && part.endsWith(']')) {
        const src = part.slice(5, -1);
        return (
          <img 
            key={i} 
            src={src} 
            alt="Guide Step" 
            onClick={() => setZoomedImage(src)}
            className="my-3 rounded-xl w-full h-auto object-contain border border-purple-500/20 shadow-sm animate-in fade-in zoom-in-95 duration-500 bg-white/50 cursor-zoom-in hover:opacity-80 transition-all hover:scale-[1.02]" 
          />
        );
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  // 🌟 SMARTER LOCAL AI ENGINE
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setMessages(prev => [...prev, { sender: 'User', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const lowerInput = userMessage.toLowerCase();
      let finalResponse = "I'm an automated assistant. To resolve complex hardware or software issues, please navigate to the 'IT Tickets' module on your dashboard and click 'Raise Ticket'.";
      let finalImage: string | undefined = undefined;

      // 🧠 MASTER KEYWORD RECOGNITION
      if (/(handover|agreement|sign)/i.test(lowerInput)) {
        finalResponse = "📝 **How to find and sign Handover Agreements:**\n\n1. Click on 'My Assets' from your dashboard sidebar.\n2. Look for the red alert message at the top.\n3. Review your assigned asset details carefully.\n4. Scroll down to the bottom, type your name in the box, and it will automatically sign digitally!\n[IMG:/chat-images/handover-signature.png]";
      }
      else if (/(australia time|india time|time zone|canberra|melbourne|sydney)/i.test(lowerInput)) {
        finalResponse = "⏱️ **How to set Australia Time:**\n\n1. Right-Click on the current time at the bottom right corner of your Windows screen.\n2. Select 'Adjust date/time'.\n3. Change 'Time zone' to '(UTC +10:00) Canberra, Melbourne, Sydney'.\n[IMG:/chat-images/timezone-settings.png]";
      }
      else if (/(notification|alert|not showing|desktop alert)/i.test(lowerInput)) {
        finalResponse = "🔔 **Alerts Not Showing on Desktop?**\n\nPlease check your Windows Settings. Make sure 'Notifications' are turned ON, and verify that you have allowed permissions for the Virtual Staffing Solution application to send alerts.\n[IMG:/chat-images/notification-settings.png]";
      }
      else if (/(team screen|remote access|remote control)/i.test(lowerInput)) {
        finalResponse = "💻 **Team Screen / Remote Access**\n\nThis feature allows the IT Admin to remotely access your laptop to help fix issues. They can only see your screen AFTER you click 'Accept' on their request. It also includes a live chat option!";
      }
      else if (/(my hardware|return|replace|swap)/i.test(lowerInput)) {
        finalResponse = "📦 **My Hardware Units**\n\nHere you can see your assigned assets.\n• **Return Button**: Use this to return an asset to the IT Admin if you no longer need it.\n• **Replace Button**: Use this if your asset is broken or having issues to request a replacement.";
      }
      else if (/(device audit|audit window|audit close|camera)/i.test(lowerInput)) {
        finalResponse = "📸 **Device Audit Window**\n\nWhy is the button closed? The Audit button is only visible and automatically enabled when your inspection is near its due date (specifically, 5 days before the deadline).";
      }
      else if (/(my tickets|ticket status)/i.test(lowerInput)) {
        finalResponse = "🎫 **My Tickets**\n\nHere you can check the status of all the tickets you have previously raised and see exactly how they were resolved.";
      }
      else if (/(assigned)/i.test(lowerInput) && !lowerInput.includes('ticket')) {
        finalResponse = "📌 **Assigned**\n\nThis statistic shows exactly how many hardware assets are currently assigned under your name.";
      }
      else if (/(action req|pending task)/i.test(lowerInput)) {
        finalResponse = "⚡ **Action Req.**\n\nHere you can check any pending tasks that require your immediate attention to complete (like signing agreements).";
      }
      else if (/(open tix|open ticket)/i.test(lowerInput)) {
        finalResponse = "📂 **Open Tix**\n\nThis shows how many of your raised tickets are currently 'Open' and waiting to be resolved by the IT team.";
      }
      else if (/(ai chatbot|bot|who are you)/i.test(lowerInput)) {
        finalResponse = "🤖 **AI Chatbot**\n\nThat's me! You can ask me any IT-related issues here, and I will do my best to solve them for you automatically.";
      }
      else if (/(ticket|tickt|ticet|raise|rise|create|submit|issue)/i.test(lowerInput)) {
        finalResponse = "🎟️ **How to Raise a Ticket:**\n\n1. Click on the 'Raise Ticket' button on your dashboard.\n2. Type your issue.\n3. Select the category (Hardware, Software, or Internet).\n4. Explain briefly, then hit Submit!\n[IMG:/chat-images/raise-ticket.png]";
      }
      else if (/(wifi|wi-fi|internet|network|basement)/i.test(lowerInput)) {
        finalResponse = "📶 **VSIT Wi-Fi Passwords:**\n\n• 1st Basement: 'VSS 5G' or '4G' (Pass: Vss@2026)\n• 2nd Basement: 'NETPLUS 5G' or '4G' (Pass: bansal@123)\n• 3rd Basement: 'VS2 5G' (Pass: Vss@2024)\n\nNo internet? Turn laptop Wi-Fi off, wait 5s, and turn back on.";
      } 
      else if (/(login|pin|0x80284001|code|password)/i.test(lowerInput) && !lowerInput.includes('wifi') && !lowerInput.includes('wi-fi')) {
        finalResponse = "🔑 **Windows Login Issues:**\n\n• Ensure PIN is correct & Num Lock is ON.\n• See code A1B2C3? Type code, then PIN.\n• Error 0x80284001: Hold 'Shift', click 'Shutdown'. Hold Shift until lights turn off, then power on.";
      }
      else if (/(teams|message won't send|crashing)/i.test(lowerInput)) {
        finalResponse = "💬 **Microsoft Teams Fixes:**\n\n1️⃣ **General Fix:** Press CTRL+Shift+ESC, find Teams in Task Manager, and click 'End Task'.\n[IMG:/chat-images/task-manager.png]\n\n2️⃣ **Crashing/Errors:** Go to Windows Settings -> Apps -> Search 'Teams' -> Advanced Options -> Click 'Repair'.\n[IMG:/chat-images/teams-repair.png]\n\n3️⃣ **Needs Login:** Use your provided Outlook email. Ask IT for password if needed.\n[IMG:/chat-images/teams-login.png]";
      }
      else if (/(outlook|email|syncing|sync)/i.test(lowerInput)) {
        finalResponse = "📧 **Outlook Email Fixes:**\n\n1️⃣ **Not Opening:** Press CTRL+Shift+ESC, 'End Task' Outlook. Try again.\n2️⃣ **Not Syncing:** Open Outlook -> File -> Office Account -> Update Options -> Update Now. (Do this weekly!).\n[IMG:/chat-images/outlook-update.png]";
      }
      else if (/(hello|hi|hey|greetings|help|support|assist)/i.test(lowerInput)) {
        finalResponse = "Hello there! I am the VSIT automated assistant. I can answer questions about raising tickets, software errors, signing agreements, or replacing broken hardware. How can I help you today?";
      }

      let currentText = "";
      const words = finalResponse.split(" ");
      let i = 0;

      const streamInterval = setInterval(() => {
        if (i < words.length) {
          currentText += (i === 0 ? "" : " ") + words[i];
          setMessages(prev => {
            const newArr = [...prev];
            newArr[newArr.length - 1] = { sender: 'AI', text: currentText, image: finalImage };
            return newArr;
          });
          i++;
        } else {
          clearInterval(streamInterval);
          setIsLoading(false);
        }
      }, 40); 

    }, 800); 
  };

  const theme = {
    chatWindow: isDarkMode 
      ? 'bg-zinc-900/40 backdrop-blur-[40px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]' 
      : 'bg-white/40 backdrop-blur-[40px] backdrop-saturate-[1.5] border border-white/70 shadow-[0_16px_40px_rgba(31,38,135,0.1)] shadow-[inset_0_0_2px_1px_rgba(255,255,255,0.8)]',
    aiBubble: isDarkMode 
      ? 'bg-black/40 backdrop-blur-xl border border-white/10 text-zinc-100 shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]' 
      : 'bg-white/60 backdrop-blur-xl border border-white/80 text-slate-800 shadow-sm shadow-[inset_0_2px_8px_rgba(255,255,255,0.6)]',
    userBubble: 'bg-linear-to-r from-purple-500/90 to-purple-600/90 backdrop-blur-md text-white shadow-lg border border-purple-400/50',
    chatInputBg: isDarkMode ? 'bg-black/20 border-t border-white/10' : 'bg-white/30 border-t border-white/50 backdrop-blur-md',
    chatInputField: isDarkMode ? 'bg-black/40 text-white border border-white/10 focus:border-purple-500/50' : 'bg-white/50 text-slate-900 border border-white/60 focus:bg-white/70 focus:ring-4 focus:ring-purple-500/10'
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-9990 flex flex-col items-end pointer-events-none">
        {isOpen && (
          <div className={`w-80 sm:w-96 mb-4 rounded-4xl flex flex-col pointer-events-auto animate-in slide-in-from-bottom-4 overflow-hidden ${theme.chatWindow}`}>
            <div className={`p-4 border-b flex justify-between items-center text-white bg-linear-to-r from-orange-500/90 to-purple-600/90 backdrop-blur-md border-b-white/20`}>
              <div className="flex items-center gap-3">
                <Bot size={24} />
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight leading-none">AI Support Assistant</h3>
                  <p className="font-bold text-[10px] tracking-widest uppercase opacity-90 mt-1">Virtual Staffing IT</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer"><X size={18}/></button>
            </div>
            
            <div className="h-96 p-5 overflow-y-auto flex flex-col gap-4 bg-transparent custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`max-w-[85%] text-[12px] font-medium p-4 ${msg.sender === 'User' ? `${theme.userBubble} self-end rounded-2xl rounded-br-none` : `${theme.aiBubble} self-start rounded-2xl rounded-tl-none`}`}>
                  {msg.sender === 'AI' && <div className="font-bold text-[10px] mb-2 uppercase tracking-widest text-purple-600 dark:text-purple-400 flex items-center gap-1.5"><Sparkles size={12}/> VSIT AI</div>}
                  
                  <div className="whitespace-pre-wrap leading-relaxed font-medium">
                    {msg.sender === 'AI' ? renderAiText(msg.text) : msg.text}
                  </div>
                  
                  {msg.sender === 'AI' && msg.image && (
                    <img 
                      src={msg.image} 
                      alt="Guide" 
                      onClick={() => setZoomedImage(msg.image!)}
                      className="mt-3 rounded-xl w-full h-auto object-cover border border-purple-500/20 shadow-sm animate-in fade-in zoom-in-95 duration-500 cursor-zoom-in hover:opacity-80 transition-all hover:scale-[1.02]" 
                    />
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className={`${theme.aiBubble} rounded-2xl rounded-tl-none px-4 py-4 shadow-sm self-start flex gap-1.5 items-center w-16`}>
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <form onSubmit={handleChatSubmit} className={`p-3 flex gap-2 items-center ${theme.chatInputBg}`}>
              <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about IT issues..." className={`flex-1 text-xs font-semibold px-4 py-3 rounded-xl outline-none transition-all shadow-inner ${theme.chatInputField}`} />
              <button type="submit" disabled={!input.trim() || isLoading} className={`p-3 rounded-xl disabled:opacity-50 cursor-pointer transition-all shadow-sm bg-linear-to-r from-purple-500 to-purple-600 text-white hover:opacity-90 border border-purple-400/50 shrink-0 active:scale-95`}><Send size={16}/></button>
            </form>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full bg-linear-to-r from-orange-500 to-purple-600 text-white shadow-[0_8px_20px_rgba(168,85,247,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all pointer-events-auto cursor-pointer border border-purple-400/50 ${isOpen ? 'rotate-12' : 'rotate-0'}`}
        >
          {isOpen ? <X size={24} /> : <Bot size={28} />}
        </button>
      </div>

      {/* 🌟 PREMIUM IMAGE ZOOM OVERLAY */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-99999 flex items-center justify-center p-4 sm:p-10 bg-black/50 backdrop-blur-[20px] cursor-zoom-out animate-in fade-in duration-300"
          onClick={() => setZoomedImage(null)}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center p-2 rounded-4xl bg-white/10 border border-white/20 shadow-[0_32px_80px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300" 
            onClick={(e) => e.stopPropagation()}
          >
            <img src={zoomedImage} alt="Zoomed View" className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl" />
            <button onClick={() => setZoomedImage(null)} className="absolute -top-4 -right-4 p-3 rounded-full bg-linear-to-r from-rose-500 to-rose-600 text-white shadow-[0_8px_20px_rgba(225,29,72,0.4)] hover:scale-110 active:scale-95 transition-all cursor-pointer border border-rose-400"><X size={20} /></button>
          </div>
        </div>
      )}
    </>
  );
}