import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, ArrowRight } from 'lucide-react';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: 'Hi! I am your ParkEase Assistant. How can I help you find or navigate to a parking spot today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (textToSend?: string) => {
    const rawText = textToSend || input;
    if (!rawText.trim()) return;

    // Add user message
    const userMsg: Message = {
      sender: 'user',
      text: rawText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');

    // Generate assistant response
    setTimeout(() => {
      let reply = '';
      const text = rawText.toLowerCase();

      if (text.includes('reserve') || text.includes('book')) {
        reply = 'To reserve a parking spot:\n1. Search for a destination above.\n2. Click on any nearby parking lot card.\n3. In the drawer, select "Choose Spot & Book" to choose your spot and complete checkout.';
      } else if (text.includes('directions') || text.includes('route') || text.includes('map')) {
        reply = 'You can calculate driving directions from your location! Click on a parking lot, open the details drawer, and click the "🧭 Get Directions" button. A route will draw on the map with distance and duration details.';
      } else if (text.includes('surge') || text.includes('pricing') || text.includes('price')) {
        reply = 'ParkEase uses dynamic pricing! When a lot is over 80% occupied in the next 2 hours, prices temporarily increase by 20% (marked with a warning badge). You can check surge rates directly in the drawer details.';
      } else if (text.includes('ev') || text.includes('charge')) {
        reply = 'Yes! You can filter for EV charging spots using the active tags on the left filter panel. Look for the green EV symbol on the map markers.';
      } else if (text.includes('trichy') || text.includes('chennai')) {
        reply = 'We have added multiple live parking spots in both Trichy (near Pettavaithalai Bus Stand) and Chennai (T. Nagar, Anna Nagar, Adyar Gate). Simply search for these cities to explore all options!';
      } else {
        reply = 'I am here to help you navigate ParkEase! You can get driving directions on the map, filter lots by amenities, and book spots in real-time. What else would you like to know?';
      }

      const assistantMsg: Message = {
        sender: 'assistant',
        text: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 800);
  };

  const quickPrompts = [
    { label: '🧭 How do I get directions?', query: 'How do I get driving directions?' },
    { label: '⚡ What is surge pricing?', query: 'Explain surge pricing' },
    { label: '🔋 Find EV charging spots', query: 'How to find EV charging spots?' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[500px] bg-slate-950/95 border border-slate-800 rounded-3xl shadow-premium flex flex-col overflow-hidden mb-4 backdrop-blur-md animate-fade-in">
          {/* Header */}
          <div className="bg-slate-900 px-5 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-600 p-1.5 rounded-xl shadow-sm text-white">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-100 leading-none">ParkEase Guide</h4>
                <span className="text-[9px] text-indigo-400 font-extrabold leading-none mt-1 inline-block">AI Assistant</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-semibold">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl whitespace-pre-line leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length === 1 && (
            <div className="px-4 py-2 flex flex-col space-y-1.5 shrink-0 border-t border-slate-900 bg-slate-950/40">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1 block">Frequently Asked</span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.query)}
                  className="w-full text-left bg-slate-900/50 hover:bg-slate-800/80 text-slate-300 border border-slate-800/80 px-3 py-2 rounded-xl text-[10px] font-extrabold flex justify-between items-center transition"
                >
                  <span>{p.label}</span>
                  <ArrowRight className="h-3 w-3 text-indigo-400" />
                </button>
              ))}
            </div>
          )}

          {/* Footer Input */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/20 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl shadow transition"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-premium transition duration-300 hover-lift hover:scale-105 flex items-center justify-center relative group"
      >
        <MessageSquare className="h-6 w-6 group-hover:rotate-12 transition duration-200" />
        <span className="absolute -top-1 -right-1 bg-rose-600 w-3.5 h-3.5 rounded-full border-2 border-slate-950 flex items-center justify-center text-[8px] font-bold">1</span>
      </button>
    </div>
  );
}
