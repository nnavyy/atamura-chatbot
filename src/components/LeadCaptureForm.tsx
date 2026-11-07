'use client';
import { useState } from 'react';
import { Language, t } from '@/lib/i18n';

interface Props {
  lang: Language;
  sessionId: string;
  onSubmit: () => void;
  onSkip: () => void;
}

export default function LeadCaptureForm({ lang, sessionId, onSubmit, onSkip }: Props) {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if ((!name.trim() && !whatsapp.trim()) || !consent) return;
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, name: name.trim(), whatsapp: whatsapp.trim(), consent }),
      });
      if (!response.ok) { setError('Unable to save your contact. Verify the phone format (+ country code).'); return; }
      setSubmitted(true);
      setTimeout(onSubmit, 2000);
    } catch { setError('Network error. Please try again.'); }
  };

  if (submitted) {
    return (
      <div style={{
        padding: '16px', margin: '0 16px 8px', background: 'rgba(0,200,83,0.1)',
        border: '1px solid rgba(0,200,83,0.3)', borderRadius: 14,
        textAlign: 'center', fontSize: 13, color: '#00c853',
        animation: 'fadeIn 0.3s ease-out',
      }}>
        ✅ {t('lead.thanks', lang)}
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px', margin: '0 16px 8px',
      background: 'linear-gradient(135deg, rgba(0,116,132,0.1), rgba(201,169,110,0.05))',
      border: '1px solid rgba(0,116,132,0.3)', borderRadius: 14,
      animation: 'fadeIn 0.4s ease-out',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4f8', marginBottom: 4 }}>
        {t('lead.title', lang)}
      </div>
      <div style={{ fontSize: 12, color: '#8899a6', marginBottom: 12 }}>
        {t('lead.subtitle', lang)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder={t('lead.name', lang)}
          style={{
            background: '#1a2332', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '10px 14px', color: '#f0f4f8',
            fontSize: 13, outline: 'none',
          }}
          id="lead-name-input"
        />
        <input
          value={whatsapp} onChange={(e) => {
            let val = e.target.value;
            // Hanya izinkan + dan angka
            val = val.replace(/[^\+0-9]/g, '');
            // Pastikan + hanya ada di awal
            if (val.includes('+')) {
              val = '+' + val.replace(/\+/g, '');
            }
            // Otomatis tambah + di awal jika user mengetik angka
            if (val.length > 0 && !val.startsWith('+')) {
              val = '+' + val;
            }
            setWhatsapp(val);
          }}
          placeholder={t('lead.whatsapp', lang)}
          style={{
            background: '#1a2332', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '10px 14px', color: '#f0f4f8',
            fontSize: 13, outline: 'none',
          }}
          id="lead-whatsapp-input"
        />
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#c2cbd4' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I agree to save the provided contact details for this research chatbot demonstration. I understand that this is not an official Atamura Group sales channel.
        </label>
        {error && <div role="alert" style={{ fontSize: 12, color: '#ef8383' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!consent} onClick={handleSubmit} className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: 13 }} id="lead-submit-btn">
            {t('lead.submit', lang)}
          </button>
          <button onClick={onSkip} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '10px 16px', color: '#8899a6',
            fontSize: 12, cursor: 'pointer',
          }} id="lead-skip-btn">
            {t('lead.skip', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
