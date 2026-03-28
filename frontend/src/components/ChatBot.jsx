import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'ai', text: "Hello! I'm your AI Supply Chain Assistant. How can I help you today?" }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        // Simulate AI Response logic
        setTimeout(() => {
            let response = "";
            const query = userMsg.toLowerCase();

            if (query.includes('war') || query.includes('conflict')) {
                response = "I'm monitoring several high-risk conflict zones, including the Red Sea and Eastern Europe. These areas currently show >90% risk intensity, which may affect shipping transit times.";
            } else if (query.includes('weather') || query.includes('storm')) {
                response = "There are major weather anomalies in the North Atlantic and Pacific. Our AI suggests alternate southern routes to avoid potential cyclonic activity.";
            } else if (query.includes('help') || query.includes('map')) {
                response = "You are viewing the Global Risk Heatmap. Red zones indicate armed conflict, Cyan indicates weather hazards, and Orange indicates geopolitical tension.";
            } else {
                response = "That's an interesting question. As an AI assistant, I can help you analyze global supply chain risks, weather impacts, and geopolitical stressors. Try asking about 'War' or 'Weather'.";
            }

            setMessages(prev => [...prev, { role: 'ai', text: response }]);
            setIsTyping(false);
        }, 1200);
    };

    return (
        <div className="fixed bottom-6 left-6 z-[100] font-sans">
            {/* Chat Bubble Button */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgba(59,130,246,0.5)] hover:scale-110 transition-all active:scale-95 group relative"
                >
                    <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0D0F18] animate-pulse" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="w-[360px] h-[500px] bg-[#13151F]/90 backdrop-blur-2xl border border-white/10 rounded-2xl flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white leading-none">Risk Assistant</h3>
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Powered by AI</span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${m.role === 'user' ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                                        {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-blue-400" />}
                                    </div>
                                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800/80 text-gray-200 border border-white/5 rounded-tl-none'}`}>
                                        {m.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="flex gap-2 max-w-[85%] items-center">
                                    <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center bg-slate-800">
                                        <Bot className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div className="bg-slate-800/40 px-3 py-2 rounded-2xl border border-white/5 rounded-tl-none flex items-center gap-1">
                                        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">AI is thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Input */}
                    <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-white/5">
                        <div className="relative">
                            <input 
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Ask about 'War' or 'Weather'..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all pr-10"
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400 transition-colors">
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-2 text-center uppercase tracking-tighter">AI may generate simulated risk data for demonstration</p>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatBot;
