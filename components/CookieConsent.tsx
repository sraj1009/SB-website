import React, { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'singglebee_cookie_consent';

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({
        accepted: true,
        essential: true,
        analytics: true,
        marketing: true,
        timestamp: new Date().toISOString(),
      })
    );
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({
        accepted: true,
        essential: true,
        analytics: false,
        marketing: false,
        timestamp: new Date().toISOString(),
      })
    );
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[300] p-4 animate-slide-up"
      style={{ fontFamily: '"Plus Jakarta Sans", "Quicksand", system-ui, sans-serif' }}
    >
      <div className="max-w-4xl mx-auto bg-brand-black border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 backdrop-blur-xl">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl"
          style={{ background: 'linear-gradient(135deg, #FFC107, #E65100)' }}
        >
          🍪
        </div>
        <div className="flex-1">
          <h3 className="text-white font-black text-sm mb-1">Cookie Policy 🐝</h3>
          <p className="text-gray-400 text-xs leading-relaxed">
            We use cookies to enhance your shopping experience, analyze site traffic, and provide
            personalized content. By clicking "Accept All", you consent to our use of cookies.
            <a
              href="#"
              className="text-amber-400 hover:text-amber-300 ml-1 underline underline-offset-2"
            >
              Learn more
            </a>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleEssentialOnly}
            className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-400 border border-white/10 hover:border-white/30 hover:text-white transition-all"
          >
            Essential Only
          </button>
          <button
            onClick={handleAccept}
            className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-brand-black transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FFC107, #E65100)' }}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
