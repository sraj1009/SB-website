
import React, { useState } from 'react';
import { SupportPageType } from './SupportPage';

interface FooterProps {
  onNavigateShop: () => void;
  onNavigateSupport: (page: SupportPageType) => void;
  onNavigateHome: () => void;
  onNavigateWishlist: () => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigateShop, onNavigateSupport, onNavigateHome, onNavigateWishlist }) => {
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("https://formspree.io/f/mlggdqro", {
        method: "POST",
        body: JSON.stringify({
          email: email,
          _subject: `🍯 New Hive Newsletter Subscriber: ${email}`,
          source: "Footer Newsletter Form"
        }),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setJoined(true);
        setEmail('');
        setTimeout(() => setJoined(false), 5000);
      } else {
        setJoined(true); // Fail gracefully for demo
      }
    } catch (err) {
      console.error("Newsletter error:", err);
      setJoined(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const footerGroups = [
    {
      title: 'Quick Links',
      links: [
        { label: 'HOME', action: onNavigateHome },
        { label: 'SHOP', action: onNavigateShop },
        { label: 'WISHLIST', action: onNavigateWishlist },
        { label: 'CONTACT US', action: () => onNavigateSupport('contact') },
        { label: 'ABOUT US', action: () => onNavigateSupport('about') }
      ]
    },
    {
      title: 'Important Links',
      links: [
        { label: 'RETURN & REFUND', action: () => onNavigateSupport('returns') },
        { label: 'SHIPPING POLICY', action: () => onNavigateSupport('shipping') },
        { label: 'T&C', action: () => onNavigateSupport('terms') },
        { label: 'CONTACT US', action: () => onNavigateSupport('contact') }
      ]
    }
  ];

  const socialLinks = [
    { icon: 'YouTube', url: 'https://www.youtube.com/@jbedutainer3366' },
    { icon: 'Instagram', url: 'https://www.instagram.com/sing.glebee' },
    { icon: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61579383012990' },
    { icon: 'WhatsApp', url: 'https://wa.me/c/919176008087' }
  ];

  const getIconPath = (name: string) => {
    switch (name) {
      case 'YouTube': return 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z';
      case 'Instagram': return 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z';
      case 'Facebook': return 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z';
      case 'WhatsApp': return 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z';
      default: return '';
    }
  };

  return (
    <footer className="bg-brand-black text-white pt-6 md:pt-10 pb-6 rounded-t-[2rem] md:rounded-t-[4rem] mt-4 md:mt-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-primary/5 honey-blob blur-[100px] -mr-20 -mt-20"></div>

      <div className="container mx-auto px-6 md:px-16 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          <div className="space-y-6 text-center sm:text-left flex flex-col items-center sm:items-start">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold tracking-tight drop-shadow-[0_0_15px_rgba(220,102,1,0.6)]">SINGGLE<span className="text-[#dc6601]">BEE</span></span>
            </div>
            <p className="text-gray-400 font-medium text-sm leading-relaxed max-w-xs mx-auto sm:mx-0">
              Curating the best books and premium supplies for your family. Trusted by parents, loved by kids.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:contents gap-8">
            {footerGroups.map((group, i) => (
              <div key={i} className="text-center sm:text-left">
                <h4 className="font-extrabold text-brand-primary text-[10px] sm:text-xs mb-4 uppercase tracking-[0.2em]">{group.title}</h4>
                <ul className="space-y-2.5 text-gray-400 font-medium text-xs">
                  {group.links.map((link, j) => (
                    <li key={j}>
                      <button onClick={link.action} className="hover:text-brand-primary transition-colors text-left">{link.label}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center sm:text-left">
            <h4 className="font-extrabold text-brand-primary text-[10px] sm:text-xs mb-4 uppercase tracking-[0.2em]">Join Us</h4>
            {joined ? (
              <div className="bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-xl animate-fade-in text-brand-primary font-black text-xs uppercase tracking-widest mx-auto sm:mx-0 max-w-[280px] sm:max-w-none">
                Welcome to the Hive! 🍯
              </div>
            ) : (
              <div className="max-w-[320px] sm:max-w-none mx-auto sm:mx-0">
                <p className="text-gray-400 font-medium text-xs mb-4">Weekly honey drops and family deals directly to your hive.</p>
                <form className="relative group mb-4" onSubmit={handleJoin}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e-mail address"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-xs font-bold focus:bg-white/10 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder:text-gray-600"
                    disabled={isSubmitting}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="absolute right-1.5 top-1.5 bottom-1.5 bg-brand-primary text-brand-black text-[9px] sm:text-[10px] font-black px-4 rounded-lg hover:bg-brand-accent transition-all"
                  >
                    {isSubmitting ? '...' : 'Join'}
                  </button>
                </form>
              </div>
            )}

            {/* Social Icons */}
            <div className="flex justify-center sm:justify-start gap-4 mt-6">
              {socialLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-brand-primary hover:text-brand-black transition-all hover:scale-110 hover:shadow-[0_0_15px_rgba(251,191,36,0.5)] group"
                  aria-label={link.icon}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d={getIconPath(link.icon)} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-center gap-6 pb-4 sm:pb-0">
          <p className="text-gray-500 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.2em]">© 2026 SINGGLEBEE.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
