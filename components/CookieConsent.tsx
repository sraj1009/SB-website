import React, { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'singglebee_cookie_consent';

interface CookieConsentProps {
  onNavigatePrivacy?: () => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ onNavigatePrivacy }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString()
    }));
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: false,
      timestamp: new Date().toISOString()
    }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 md:p-6 animate-slide-up">
      <div className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-2xl border-4 border-brand-primary/20 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1">
          <p className="text-brand-black font-bold text-sm md:text-base leading-relaxed">
            🍯 We use cookies to improve your experience, analyze traffic, and personalize content. By continuing, you accept our{' '}
            <button type="button" onClick={() => { onNavigatePrivacy?.(); }} className="text-brand-primary hover:underline font-black">Privacy Policy</button>.
          </p>
        </div>
        <div className="flex gap-4 shrink-0">
          <button
            onClick={decline}
            className="px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider border-2 border-brand-primary/30 text-gray-600 hover:border-brand-primary/50 transition-all"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider bg-brand-primary text-brand-black shadow-honey hover:scale-105 transition-all"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
