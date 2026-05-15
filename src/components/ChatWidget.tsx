'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { t, detectLanguage } from '@/lib/i18n';
import { useLanguage } from './LanguageContext';
import UnitCardInChat from './UnitCardInChat';
import CalculationCard from './CalculationCard';
import LeadCaptureForm from './LeadCaptureForm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  units?: Unit[];
  calculation?: Calculation | null;
  options?: string[];
}

interface Unit {
  id: string; code: string; type: string; rooms: number;
  areaSqm: number; priceMin: number; status: string;
  view?: string; floor?: string; features?: string;
  floorPlan?: string;
}

interface Calculation {
  unitCode: string; method: string; dp: number;
  monthly: number; total: number; tenor: number;
}

/** Lightweight markdown → HTML for chat bubbles */
function renderMarkdown(text: string): string {
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_ (single)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Unordered list items: lines starting with * or -
    .replace(/^[\*\-]\s+(.+)$/gm, '<li style="margin-left:16px;list-style:disc inside">$1</li>')
    // Numbered list items: 1. 2. etc
    .replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-left:16px;list-style:decimal inside">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { lang, setLang, cycleLang } = useLanguage();
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const [msgCount, setMsgCount] = useState(0);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: t('chat.welcome', lang),
        options: lang === 'ru'
          ? ['Покажите 1-комнатные', 'Какой бюджет нужен?', 'Способы оплаты']
          : lang === 'kz'
          ? ['1 бөлмелі көрсетіңіз', 'Қандай бюджет керек?', 'Төлем тәсілдері']
          : ['Show me 1BR apartments', 'What budget do I need?', 'Payment options'],
      }]);
    }
  }, [isOpen, lang, messages.length]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (overrideInput?: string) => {
    const userMsg = overrideInput || input.trim();
    if (!userMsg || loading) return;
    if (!overrideInput) setInput('');

    // Auto-detect language on first message
    if (msgCount === 0) {
      const detected = detectLanguage(userMsg);
      setLang(detected);
    }

    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    setMsgCount((c) => c + 1);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          sessionId,
          history: newMessages.slice(-30).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.message,
        units: data.recommendedUnits || [],
        calculation: data.calculation,
        options: data.options || [],
      }]);
      if (data.language) setLang(data.language);

      // Show lead capture after 3 user messages
      if (msgCount + 1 >= 3 && !leadCaptured && !showLeadCapture) {
        setTimeout(() => setShowLeadCapture(true), 1500);
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const langLabels = { en: 'EN', ru: 'RU', kz: 'KZ' } as const;
  const onlineText = { en: 'Online', ru: 'Онлайн', kz: 'Желіде' } as const;

  return (
    <>
      {/* Floating Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="animate-pulse-glow"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #007484, #00a3b8)',
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,116,132,0.4)',
            transition: 'transform 0.3s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          aria-label="Open AI Chat"
          id="chat-bubble-btn"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
            <circle cx="8" cy="10" r="1.2" fill="white"/>
            <circle cx="12" cy="10" r="1.2" fill="white"/>
            <circle cx="16" cy="10" r="1.2" fill="white"/>
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 420, maxWidth: 'calc(100vw - 32px)',
          height: 600, maxHeight: 'calc(100vh - 48px)',
          borderRadius: 20, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          background: '#0f1419',
          border: '1px solid rgba(255,255,255,0.08)',
        }} id="chat-window">
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #223C50, #1a3a4a)',
            padding: '16px 20px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, #007484, #00a3b8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>🏠</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#f0f4f8' }}>
                  {t('chat.title', lang)}
                </div>
                <div style={{ fontSize: 12, color: '#00c853', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00c853', display: 'inline-block' }} />
                  {onlineText[lang]}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={cycleLang}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#00a3b8', borderRadius: 8, padding: '4px 10px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                id="lang-toggle-btn"
              >{langLabels[lang]}</button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none', border: 'none', color: '#8899a6',
                  cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4,
                }}
                id="chat-close-btn"
              >×</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'fadeIn 0.3s ease-out',
              }}>
                <div style={{
                  maxWidth: '85%', padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #007484, #005f6b)'
                    : '#1a2332',
                  color: '#f0f4f8', fontSize: 14, lineHeight: 1.6,
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
                }}>
                  {msg.role === 'user' ? msg.content : (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  )}
                </div>
                {/* Unit cards */}
                {msg.units && msg.units.length > 0 && (
                  <div style={{ maxWidth: '85%', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {msg.units.map((unit) => (
                      <UnitCardInChat key={unit.id} unit={unit} lang={lang} />
                    ))}
                  </div>
                )}
                {/* Calculation card */}
                {msg.calculation && (
                  <div style={{ maxWidth: '85%', marginTop: 8 }}>
                    <CalculationCard calc={msg.calculation} lang={lang} />
                  </div>
                )}
                {/* Options / Quick Replies */}
                {msg.options && msg.options.length > 0 && i === messages.length - 1 && !loading && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, maxWidth: '85%' }}>
                    {msg.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(opt)}
                        style={{
                          background: 'rgba(0,116,132,0.15)',
                          border: '1px solid rgba(0,116,132,0.3)',
                          color: '#00a3b8',
                          padding: '6px 12px',
                          borderRadius: 16,
                          fontSize: 13,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,116,132,0.25)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,116,132,0.15)'}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{
                display: 'flex', gap: 6, padding: '12px 16px',
                background: '#1a2332', borderRadius: '16px 16px 16px 4px',
                alignSelf: 'flex-start', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#007484',
                    animation: `typing 1.4s infinite ${i * 0.2}s`,
                  }} />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Lead Capture */}
          {showLeadCapture && !leadCaptured && (
            <LeadCaptureForm
              lang={lang}
              sessionId={sessionId}
              onSubmit={() => { setLeadCaptured(true); setShowLeadCapture(false); }}
              onSkip={() => setShowLeadCapture(false)}
            />
          )}

          {/* Input */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 8, background: '#0f1419',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={t('chat.placeholder', lang)}
              style={{
                flex: 1, background: '#1a2332', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '12px 16px', color: '#f0f4f8',
                fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#007484')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              id="chat-input"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim()
                  ? '#243447' : 'linear-gradient(135deg, #007484, #00a3b8)',
                border: 'none', borderRadius: 12, width: 44, height: 44,
                cursor: loading || !input.trim() ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              id="chat-send-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
