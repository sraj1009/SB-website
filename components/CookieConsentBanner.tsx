import React, { useState, useEffect } from 'react';
import { X, Shield, Cookie, Info } from 'lucide-react';

interface CookieConsentProps {
  onAccept?: (preferences: CookiePreferences) => void;
  className?: string;
}

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const CookieConsentBanner: React.FC<CookieConsentProps> = ({ 
  onAccept, 
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    // Check if user has already made consent choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    } else {
      // Apply saved preferences
      const savedPrefs = JSON.parse(consent);
      setPreferences(savedPrefs);
      applyCookiePreferences(savedPrefs);
    }
  }, []);

  const applyCookiePreferences = (prefs: CookiePreferences) => {
    // Block/allow Google Analytics based on preferences
    if (!prefs.analytics) {
      // Disable GA
      window.gtag?.('config', 'GA_MEASUREMENT_ID', {
        'anonymize_ip': true,
        'send_page_view': false,
      });
    }

    // Block/allow marketing cookies
    if (!prefs.marketing) {
      // Disable marketing pixels and tracking
      document.querySelectorAll('[data-category="marketing"]').forEach(el => {
        el.setAttribute('data-consent', 'denied');
      });
    }

    // Block/allow functional cookies
    if (!prefs.functional) {
      // Disable functional scripts
      document.querySelectorAll('[data-category="functional"]').forEach(el => {
        el.setAttribute('data-consent', 'denied');
      });
    }

    // Notify parent component
    onAccept?.(prefs);
  };

  const handleAcceptAll = () => {
    const allPrefs: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    
    setPreferences(allPrefs);
    localStorage.setItem('cookie-consent', JSON.stringify(allPrefs));
    applyCookiePreferences(allPrefs);
    setIsVisible(false);
  };

  const handleAcceptNecessary = () => {
    const necessaryPrefs: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    
    setPreferences(necessaryPrefs);
    localStorage.setItem('cookie-consent', JSON.stringify(necessaryPrefs));
    applyCookiePreferences(necessaryPrefs);
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences));
    applyCookiePreferences(preferences);
    setIsVisible(false);
  };

  const handlePreferenceChange = (category: keyof Omit<CookiePreferences, 'necessary'>) => {
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-2xl z-50 ${className}`}>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Cookie className="w-6 h-6 text-yellow-400" />
              <h3 className="text-lg font-semibold">Cookie Consent</h3>
            </div>
            
            <p className="text-gray-300 mb-4 text-sm leading-relaxed">
              We use cookies to enhance your browsing experience, serve personalized content, 
              and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
              Read our{' '}
              <a href="/privacy-policy" className="text-blue-400 hover:text-blue-300 underline">
                Privacy Policy
              </a>{' '}
              for more information.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={handleAcceptAll}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={handleAcceptNecessary}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Necessary Only
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Info className="w-4 h-4" />
                Customize
              </button>
            </div>

            {/* Detailed Preferences */}
            {showDetails && (
              <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Cookie Preferences
                </h4>
                
                <div className="space-y-3">
                  {/* Necessary Cookies */}
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div>
                      <div className="font-medium">Necessary Cookies</div>
                      <div className="text-sm text-gray-400">
                        Required for the website to function properly
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.necessary}
                      disabled
                      className="w-5 h-5 rounded"
                    />
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div>
                      <div className="font-medium">Analytics Cookies</div>
                      <div className="text-sm text-gray-400">
                        Help us understand how visitors interact with our website
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={() => handlePreferenceChange('analytics')}
                      className="w-5 h-5 rounded"
                    />
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div>
                      <div className="font-medium">Marketing Cookies</div>
                      <div className="text-sm text-gray-400">
                        Used to personalize advertising and marketing content
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={() => handlePreferenceChange('marketing')}
                      className="w-5 h-5 rounded"
                    />
                  </div>

                  {/* Functional Cookies */}
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div>
                      <div className="font-medium">Functional Cookies</div>
                      <div className="text-sm text-gray-400">
                        Enable enhanced functionality and personalization
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={() => handlePreferenceChange('functional')}
                      className="w-5 h-5 rounded"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSavePreferences}
                  className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
