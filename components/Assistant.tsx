
import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../types';
import { getShoppingAssistantResponse } from '../services/geminiService';
import BeeCharacter from './BeeCharacter.tsx';

interface AssistantProps {
  products: Product[];
}

const Assistant: React.FC<AssistantProps> = ({ products }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage = query.trim();
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await getShoppingAssistantResponse(userMessage, products);
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, the hive is a bit busy. Please try again later!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end font-sans">
      {isOpen && (
        <div className="w-80 md:w-96 h-[500px] bg-white rounded-[2.5rem] shadow-premium-hover border-4 border-brand-primary/20 mb-4 flex flex-col overflow-hidden animate-slide-up">
          <div className="bg-brand-black p-6 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-buzz flex items-center justify-center">
                <BeeCharacter size="2.8rem" />
              </span>
              <div>
                <span className="text-brand-primary font-black uppercase tracking-widest text-[10px] block">Hive Assistant</span>
                <span className="text-white/50 text-[8px] font-bold uppercase tracking-widest">Powered by SINGGLEBEE</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-brand-rose transition-colors font-black text-sm">✕</button>
          </div>

          <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar bg-brand-light/10">
            {messages.length === 0 && (
              <div className="text-center py-12 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center text-3xl">🍯</div>
                <p className="text-gray-400 font-bold text-sm italic max-w-[200px]">
                  "Buzzing with excitement to help! Ask me anything about our books or treats."
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] px-5 py-3 rounded-[1.5rem] text-sm font-semibold leading-relaxed ${msg.role === 'user'
                  ? 'bg-brand-black text-brand-primary shadow-sm rounded-tr-none'
                  : 'bg-white text-gray-700 shadow-sm border border-brand-primary/10 rounded-tl-none'
                  }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white border border-brand-primary/10 px-5 py-3 rounded-[1.5rem] rounded-tl-none shadow-sm">
                  <div className="flex gap-1.5 py-1">
                    <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-5 border-t border-brand-light bg-white shrink-0">
            <div className="relative flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Message the hive..."
                className="flex-grow pl-5 pr-4 py-3.5 rounded-2xl bg-brand-light/50 border-2 border-transparent focus:border-brand-primary outline-none text-sm font-bold shadow-inner transition-all"
              />
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="w-12 h-12 bg-brand-black text-brand-primary rounded-2xl flex items-center justify-center hover:bg-brand-dark transition-all shadow-premium active:scale-95 disabled:opacity-50 disabled:grayscale"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[1.5rem] shadow-premium-hover flex items-center justify-center text-3xl transition-all duration-300 hover:scale-105 active:scale-95 border-4 border-white ${isOpen ? 'bg-brand-rose text-white rotate-90' : 'bg-brand-primary text-brand-black'
          }`}
      >
        {isOpen ? '✕' : <BeeCharacter size="2.5rem" />}
      </button>
    </div>
  );
};

export default Assistant;
