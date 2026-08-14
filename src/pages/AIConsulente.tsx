import React, { useRef, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, Sparkles, Loader, MessageSquare, Map } from 'lucide-react';
import { House, UserSettings, ChatMessage } from '../types';
import Logo from '../components/Logo';
import MarkdownLite from '../components/MarkdownLite';

interface Props {
  houses: House[];
  settings: UserSettings;
  messages: ChatMessage[];
  loading: boolean;
  onSend: (message: string) => void;
}

/** Genera domande contestuali basate sulle case reali in lista. */
function getSuggestions(houses: House[], mode: 'buy' | 'rent'): string[] {
  const relevant = houses.filter(h => (h.type || 'buy') === mode);
  const visitabili = relevant.filter(h => {
    const s = h.visitStatus ?? (h.visited ? 'visitata' : 'da_visitare');
    return s !== 'visitata';
  });
  const visitate = relevant.filter(h => {
    const s = h.visitStatus ?? (h.visited ? 'visitata' : 'da_visitare');
    return s === 'visitata';
  });
  const conPunteggio = relevant.filter(h => h.visitScore != null);

  const s: string[] = [];

  if (relevant.length >= 2)
    s.push(`Qual è il miglior rapporto qualità-prezzo tra i miei ${relevant.length} annunci?`);
  if (visitabili.length > 0)
    s.push(`Quale di queste case visiteresti per prima, e perché?`);
  if (conPunteggio.length >= 2)
    s.push(`Motiva la classifica delle case che ho già valutato.`);
  if (visitate.length >= 2)
    s.push(`Confronta le case che ho visitato: quali differenze emergono dalle note?`);
  if (relevant.length >= 2) {
    const a = relevant[0]?.title?.split(' ').slice(0, 3).join(' ');
    const b = relevant[1]?.title?.split(' ').slice(0, 3).join(' ');
    if (a && b) s.push(`Confronta "${a}" e "${b}" sui criteri che contano di più.`);
  }
  if (relevant.some(h => h.availability === 'unavailable'))
    s.push(`Quali case non sono più disponibili? Vale la pena cercare alternative simili?`);

  return s.slice(0, 4);
}

export default function AIConsulente({ houses, settings, messages, loading, onSend }: Props) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const mode = settings.appMode;
  const suggestions = getSuggestions(houses, mode);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setDraft('');
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2.5 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors flex items-center gap-2 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Dashboard</span>
            </button>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <Link to="/consulente" className="flex items-center gap-3">
              <Logo size={40} />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold tracking-tight">Consulente AI</h1>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  {houses.filter(h => (h.type || 'buy') === mode).length} immobili in contesto
                </p>
              </div>
            </Link>
          </div>
          <nav className="flex items-center gap-6">
            <Link to="/mappa" className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5">
              <Map size={14} />Mappa
            </Link>
          </nav>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 pt-24 pb-36 px-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Consulente AI</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
              Conosce tutti i tuoi annunci e può confrontarli, motivare le classifiche
              e rispondere alle domande che hai raccolto in visita.
            </p>
            {suggestions.length > 0 && (
              <div className="grid gap-2 max-w-xl mx-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onSend(s)}
                    className="text-left px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 text-sm text-slate-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center mr-2.5 shrink-0 mt-1">
                      <Sparkles size={14} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm whitespace-pre-wrap'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                  }`}>
                    {m.role === 'assistant' ? <MarkdownLite text={m.content} /> : m.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center mr-2.5 shrink-0">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                  <Loader size={14} className="animate-spin text-indigo-500" />
                  <span className="text-xs text-slate-400">Sto analizzando...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input fisso in fondo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Chiedi degli annunci che hai salvato…"
            rows={1}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-200 resize-none leading-relaxed max-h-32 overflow-y-auto"
            style={{ minHeight: '48px' }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 128) + 'px';
            }}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || loading}
            className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-colors shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">
          Risponde solo sui tuoi annunci · Invio per inviare · Shift+Invio per andare a capo
        </p>
      </div>
    </div>
  );
}
