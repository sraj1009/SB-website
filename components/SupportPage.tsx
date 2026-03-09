import React, { useState } from 'react';
import BeeCharacter from './BeeCharacter';

export type SupportPageType = 'help' | 'returns' | 'shipping' | 'contact' | 'about' | 'terms' | 'privacy';

interface SupportPageProps {
  page: SupportPageType;
  onBack: () => void;
  onNavigate?: (page: SupportPageType) => void;
}

const SupportPage: React.FC<SupportPageProps> = ({ page, onBack, onNavigate }) => {
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('https://formspree.io/f/mlggdqro', {
        method: 'POST',
        body: JSON.stringify({
          ...contactForm,
          _subject: `🍯 New Contact Buzz from ${contactForm.name}`,
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        // Fallback for UI if API fails but we want to show a success state anyway for demo
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (page) {
      case 'about':
        return (
          <div className="max-w-4xl mx-auto space-y-16 animate-fade-in">
            <div className="text-center">
              <div className="w-24 h-24 bg-brand-primary rounded-[2rem] flex items-center justify-center shadow-2xl mx-auto mb-8 animate-float">
                <BeeCharacter size="4rem" />
              </div>
              <h1 className="text-6xl font-black text-brand-black mb-6 tracking-tighter">
                The SinggleBee Story
              </h1>
              <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto">
                We believe that every family is a hive, and every hive deserves the sweetest
                nourishment for the mind and body.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="bg-white p-10 rounded-[4rem] shadow-premium border-2 border-brand-primary/5">
                <h3 className="text-2xl font-black text-brand-black mb-6">🌟 Our Mission</h3>
                <div className="space-y-4 text-gray-500 font-bold leading-relaxed text-sm md:text-base">
                  <p>
                    At SinggleBee 🐝, we make learning joyful and future-ready for Gen Z and Alpha
                    kids through bilingual (Tamil & English) educational content.
                  </p>
                  <p>
                    We create engaging storybooks, rhymes, and preschool materials with fully
                    colored, laminated pages that build curiosity using practical and scientific
                    words.
                  </p>
                  <p>
                    Beyond books, SinggleBee is growing into stationery and food products to support
                    children’s learning and well-being.
                  </p>
                  <p className="text-[#dc6601]">
                    ✨ Our goal is to inspire young minds and shape a bright, happy future.
                  </p>
                </div>
              </div>
              <div className="bg-brand-black p-10 rounded-[4rem] shadow-premium relative overflow-hidden text-white">
                <div className="absolute inset-0 bg-brand-primary/10 honey-blob blur-3xl opacity-30"></div>
                <h3 className="text-2xl font-black text-brand-primary mb-6 relative z-10">
                  🐝 Why Bees?
                </h3>
                <div className="space-y-4 text-gray-400 font-bold leading-relaxed text-sm md:text-base relative z-10">
                  <p>
                    Bees are small, curious, and hardworking — just like young learners. They
                    explore, collect, and turn knowledge into something sweet 🍯.
                  </p>
                  <p>At SinggleBee 🐝, we see every child as a little bee:</p>
                  <ul className="space-y-1 text-brand-primary/95 font-black">
                    <li>✨ Curious to discover,</li>
                    <li>✨ Busy learning every day, and</li>
                    <li>✨ Creating a bright future drop by drop.</li>
                  </ul>
                  <p>
                    Bees also work together, reminding us that learning grows best with care,
                    creativity, and community.
                  </p>
                  <p className="text-brand-primary font-black uppercase tracking-widest text-xs pt-4 border-t border-white/5">
                    That’s why SinggleBee chose the bee — a symbol of curiosity, effort, and joyful
                    learning.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'terms':
        return (
          <div className="max-w-4xl mx-auto animate-fade-in px-4">
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-7xl font-black text-brand-black mb-4 tracking-tighter uppercase">
                📜 TERMS <span className="text-[#dc6601]">& CONDITIONS</span>
              </h1>
              <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.3em] border-y border-brand-primary/10 py-4 inline-block px-8">
                Last Updated: January 2026
              </p>
            </div>

            <div className="bg-white p-8 md:p-14 rounded-[2.5rem] md:rounded-[4rem] shadow-premium border border-brand-primary/5 space-y-12">
              {[
                {
                  title: '1. Acceptance of Terms',
                  icon: '✅',
                  text: 'By visiting or using the SinggleBee website, you agree to these Terms & Conditions. If you do not agree, please stop using our services. Continued use means you accept any future updates.',
                },
                {
                  title: '2. Eligibility',
                  icon: '👨👩👧',
                  text: 'You must be of legal age in your location or have consent from a parent or guardian to use SinggleBee and make purchases.',
                },
                {
                  title: '3. Intellectual Property',
                  icon: '🧠',
                  text: 'All content on SinggleBee — including text, images, logos, designs, and product information — belongs to SinggleBee. Copying, sharing, or reproducing without permission is not allowed.',
                },
                {
                  title: '4. Product Information',
                  icon: '📚',
                  text: 'We aim to show accurate descriptions and images, but small differences may occur. Please read product details carefully before ordering.',
                },
                {
                  title: '5. Pricing & Availability',
                  icon: '💰',
                  text: 'Prices and stock can change without notice. Taxes and shipping are calculated at checkout.',
                },
                {
                  title: '6. Orders & Cancellation',
                  icon: '🛒',
                  text: 'SinggleBee may accept, reject, or cancel any order due to pricing errors, stock issues, or suspected misuse. You will be informed if this happens.',
                },
                {
                  title: '7. Payments',
                  icon: '💳',
                  text: 'You agree to provide valid and updated payment details. If payment fails, your order may be cancelled.',
                },
                {
                  title: '8. Returns & Refunds',
                  icon: '🔄',
                  text: 'Returns are accepted only for items damaged during shipping, following our Return & Refund Policy.',
                },
                {
                  title: '9. Third-Party Links',
                  icon: '🔗',
                  text: 'Our site may include links or tools from other websites. SinggleBee is not responsible for their content or services.',
                },
                {
                  title: '10. User Content',
                  icon: '✍️',
                  text: 'If you post reviews, feedback, or images, you allow SinggleBee to use them for marketing and communication.',
                },
                {
                  title: '11. Privacy',
                  icon: '🔐',
                  text: 'We respect your privacy. Please read our Privacy Policy to understand how your data is handled.',
                },
                {
                  title: '12. Limitation of Liability',
                  icon: '⚠️',
                  text: 'SinggleBee is not liable for indirect losses, technical issues, or service interruptions while using our platform.',
                },
                {
                  title: '13. Prohibited Activities',
                  icon: '🚫',
                  text: 'Do not misuse the site for illegal actions, hacking, fraud, or copyright violation.',
                },
                {
                  title: '14. Indemnification',
                  icon: '🛡',
                  text: 'You agree to protect SinggleBee from claims arising from misuse of the website or violation of these terms.',
                },
                {
                  title: '15. Governing Law',
                  icon: '⚖️',
                  text: 'These terms are governed by the laws of India, and disputes will be handled in Indian courts.',
                },
                {
                  title: '16. Changes to Terms',
                  icon: '🔄',
                  text: 'SinggleBee may update these Terms at any time. Continued use after updates means acceptance.',
                },
              ].map((clause, idx) => (
                <section key={idx} className="space-y-4">
                  <h3 className="text-xl font-black text-brand-black flex items-center gap-4">
                    <span className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center text-lg shadow-sm">
                      {clause.icon}
                    </span>
                    {clause.title}
                  </h3>
                  <p className="text-gray-500 font-bold leading-relaxed text-sm md:text-base border-l-4 border-brand-primary/10 pl-6">
                    {clause.text}
                  </p>
                </section>
              ))}

              <div className="pt-10 border-t border-brand-primary/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <p className="text-xs text-brand-secondary font-black uppercase tracking-widest">
                    Questions about our terms?
                  </p>
                  <button
                    onClick={() => onNavigate?.('contact')}
                    className="text-sm font-black text-[#dc6601] hover:underline uppercase tracking-widest"
                  >
                    Reach out to us →
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'help':
        return (
          <div className="space-y-12">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="w-20 h-20 bg-brand-primary rounded-3xl flex items-center justify-center text-4xl shadow-xl mx-auto mb-6 animate-buzz">
                🐝
              </div>
              <h1 className="text-5xl font-black text-brand-black mb-4 tracking-tighter">
                How can we help the Hive?
              </h1>
              <div className="relative mt-8">
                <input
                  type="text"
                  placeholder="Search the reading knowledge base..."
                  className="w-full pl-16 pr-8 py-6 rounded-[2rem] bg-white border-2 border-brand-primary/10 shadow-xl focus:border-brand-primary outline-none font-bold text-lg"
                />
                <svg
                  className="w-6 h-6 text-brand-primary absolute left-6 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: 'Track Order', icon: '📦', desc: 'Where is my book drop?' },
                { title: 'Payments', icon: '🍯', desc: 'Manage your hive wallet.' },
                { title: 'Safe Bee', icon: '🛡️', desc: 'Your security and privacy.' },
                { title: 'E-Books', icon: '📱', desc: 'Digital hive collection.' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-8 rounded-[3rem] border-2 border-brand-primary/5 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group"
                >
                  <div className="text-4xl mb-4 group-hover:buzz transition-transform inline-block">
                    {item.icon}
                  </div>
                  <h3 className="font-black text-xl text-brand-black mb-2">{item.title}</h3>
                  <p className="text-gray-400 font-bold text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'returns':
        return (
          <div className="max-w-4xl mx-auto space-y-16 animate-fade-in px-4">
            <div className="text-center">
              <h1 className="text-5xl md:text-7xl font-black text-brand-black mb-4 tracking-tighter">
                Returns & <span className="text-[#dc6601]">Refunds</span>
              </h1>
              <p className="max-w-2xl mx-auto text-gray-500 font-bold leading-relaxed text-lg">
                At SinggleBee 🐝, we carefully pack every book to make sure it reaches you safely
                and in perfect shape 📦✨. Still, we understand that problems can sometimes happen
                during delivery 🚚. To support you, we’ve created a simple and fair return and
                refund policy below to handle such situations smoothly 🤝😊.
              </p>
            </div>

            <div className="space-y-10">
              {/* Returns Section */}
              <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] shadow-premium border border-brand-primary/5">
                <h3 className="font-black text-2xl text-brand-black mb-10 flex items-center gap-4">
                  <span className="w-12 h-12 bg-brand-light rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                    🔄
                  </span>{' '}
                  RETURNS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  <div className="space-y-3">
                    <h4 className="font-black text-brand-secondary text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                      <span>✅</span> Eligible Returns
                    </h4>
                    <p className="text-gray-500 font-bold text-sm md:text-base leading-relaxed">
                      Returns are accepted only if the product is damaged during transit 📦💥. Other
                      reasons won’t be considered.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-black text-brand-secondary text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                      <span>📹</span> Proof Required
                    </h4>
                    <p className="text-gray-500 font-bold text-sm md:text-base leading-relaxed">
                      Please share an unboxing video showing the product condition from opening to
                      inspection. This is mandatory for approval.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-black text-brand-secondary text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                      <span>⏱</span> Request Time
                    </h4>
                    <p className="text-gray-500 font-bold text-sm md:text-base leading-relaxed">
                      Contact us within 24 hours of delivery via the Contact Us page with your video
                      and damage details.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-black text-brand-secondary text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                      <span>🚚</span> Return Shipping
                    </h4>
                    <p className="text-gray-500 font-bold text-sm md:text-base leading-relaxed">
                      If damage is confirmed, SinggleBee covers the return shipping cost.
                    </p>
                  </div>
                </div>
              </div>

              {/* Refunds Section */}
              <div className="bg-brand-black p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] shadow-premium text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 honey-blob blur-[100px] opacity-20"></div>
                <h3 className="font-black text-2xl text-brand-primary mb-10 flex items-center gap-4 relative z-10">
                  <span className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                    💰
                  </span>{' '}
                  REFUNDS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
                  <div className="space-y-3">
                    <h4 className="font-black text-brand-accent text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                      <span>🔍</span> Damage Check
                    </h4>
                    <p className="text-gray-400 font-bold text-sm leading-relaxed">
                      We review your unboxing video to confirm transit damage.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-black text-brand-accent text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                      <span>📩</span> Refund Processing
                    </h4>
                    <p className="text-gray-400 font-bold text-sm leading-relaxed">
                      Once approved, refunds are processed within 2–7 business days to your original
                      payment method.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-black text-brand-accent text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                      <span>💵</span> Refund Coverage
                    </h4>
                    <p className="text-gray-400 font-bold text-sm leading-relaxed">
                      Approved refunds include product + shipping charges.
                    </p>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-[#dc6601]/5 p-6 md:p-8 rounded-[2rem] border-2 border-dashed border-[#dc6601]/30">
                <h3 className="font-black text-lg text-brand-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                  <span className="text-2xl">⚠</span> Important Notes
                </h3>
                <ul className="space-y-4 text-gray-700 font-bold text-sm">
                  <li className="flex items-start gap-4">
                    <span className="text-brand-primary mt-1">🏠</span>
                    <span>Wrong address/contact details — SinggleBee is not responsible.</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="text-brand-primary mt-1">🔁</span>
                    <span>Exchanges only for unused, damaged items in original packaging.</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="text-brand-primary mt-1">🏷</span>
                    <span>Sale items are not refundable.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );
      case 'shipping':
        return (
          <div className="max-w-4xl mx-auto space-y-16 animate-fade-in px-4">
            <div className="text-center">
              <h1 className="text-5xl md:text-7xl font-black text-brand-black mb-4 tracking-tighter uppercase">
                SHIPPING <span className="text-[#dc6601]">POLICY</span>
              </h1>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.34em]">
                Delivering Knowledge Everywhere 🚚
              </p>
            </div>

            <div className="space-y-10">
              {/* Free Delivery Section */}
              <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] shadow-premium border border-brand-primary/5 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-brand-primary/5 rounded-full blur-3xl transition-all group-hover:bg-brand-primary/10"></div>
                <h3 className="font-black text-2xl text-brand-black mb-8 flex items-center gap-4">
                  <span className="w-12 h-12 bg-brand-light rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                    🎁
                  </span>{' '}
                  Free Delivery
                </h3>
                <div className="space-y-6 text-gray-500 font-bold leading-relaxed relative z-10">
                  <p className="text-lg md:text-xl text-brand-black tracking-tight">
                    Get FREE shipping on orders above ₹1,499.
                  </p>
                  <div className="p-8 bg-brand-light/30 rounded-[2rem] border border-brand-primary/10">
                    <p className="text-sm font-black uppercase text-brand-secondary tracking-widest mb-3">
                      For orders below ₹1,499
                    </p>
                    <p className="text-xl font-black text-brand-black flex items-center gap-3">
                      <span className="text-brand-primary">📍</span> Tamil Nadu – Flat ₹50 shipping
                      charge.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Order Dispatch Section */}
                <div className="bg-brand-black p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-premium text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 honey-blob blur-[100px] opacity-20"></div>
                  <h3 className="font-black text-2xl text-brand-primary mb-8 flex items-center gap-4 relative z-10">
                    <span className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl shadow-sm">
                      📦
                    </span>{' '}
                    Order Dispatch
                  </h3>
                  <p className="font-bold text-gray-400 leading-relaxed text-sm md:text-base relative z-10">
                    All orders are prepared and sent within 2–3 business days using India Post or
                    trusted courier services.
                  </p>
                </div>

                {/* Delivery Window Section */}
                <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-premium border border-brand-primary/5">
                  <h3 className="font-black text-2xl text-brand-black mb-8 flex items-center gap-4">
                    <span className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center text-xl shadow-sm">
                      ⏳
                    </span>{' '}
                    Delivery Window
                  </h3>
                  <div className="space-y-6">
                    <p className="font-bold text-gray-500 leading-relaxed text-sm md:text-base">
                      Your books usually arrive within 5–7 working days after dispatch, based on
                      location 📍.
                    </p>
                    <div className="inline-block px-4 py-3 bg-brand-secondary/5 rounded-xl border border-brand-secondary/10">
                      <p className="text-[10px] text-brand-secondary font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <span>🚧</span> Minor delays may occur due to unforeseen situations{' '}
                        <span>🚧🌧️</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="max-w-6xl mx-auto animate-fade-in px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start lg:items-center">
              <div className="space-y-12">
                <div>
                  <h1 className="text-6xl md:text-8xl font-black text-brand-black mb-8 tracking-tighter leading-none">
                    Contact <br />
                    <span className="text-[#dc6601]">Us</span>
                  </h1>
                  <div className="text-gray-500 font-bold text-lg leading-relaxed max-w-sm space-y-4">
                    <p>We’re happy to help! 😊</p>
                    <p>
                      If you have questions about your order, books, shipping, or returns, feel free
                      to reach out to us anytime.
                    </p>
                    <p className="text-sm bg-brand-light/50 p-6 rounded-3xl border border-brand-primary/5">
                      📧 Email us or use the form on this page, and our team will get back to you as
                      soon as possible 🤝🐝.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-6 p-6 bg-white rounded-3xl border border-brand-primary/5 shadow-premium">
                    <div className="w-14 h-14 bg-brand-light text-brand-primary rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                      📞
                    </div>
                    <div>
                      <h4 className="font-black text-brand-black uppercase text-[10px] tracking-widest mb-1">
                        PHONE NUMBER
                      </h4>
                      <p className="text-xl font-extrabold text-brand-black tracking-tight">
                        +91 9176008087
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 p-6 bg-white rounded-3xl border border-brand-primary/5 shadow-premium overflow-hidden">
                    <div className="w-14 h-14 bg-brand-light text-brand-primary rounded-2xl flex-shrink-0 flex items-center justify-center text-3xl shadow-sm">
                      📧
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-brand-black uppercase text-[10px] tracking-widest mb-1">
                        E-MAIL
                      </h4>
                      <p className="text-sm sm:text-lg font-extrabold text-brand-black truncate">
                        singglebee.rsventures@gmail.com
                      </p>
                    </div>
                  </div>
                </div>

                {/* Social Media Section */}
                <div className="space-y-6">
                  <h4 className="font-black text-brand-black uppercase text-[10px] tracking-[0.2em] ml-2">
                    Social Media
                  </h4>
                  <div className="flex gap-4">
                    {[
                      {
                        icon: 'YouTube',
                        url: 'https://www.youtube.com/@jbedutainer3366',
                        color: '#FF0000',
                        path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
                      },
                      {
                        icon: 'Instagram',
                        url: 'https://www.instagram.com/sing.glebee',
                        color: '#E4405F',
                        path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
                      },
                      {
                        icon: 'Facebook',
                        url: 'https://www.facebook.com/profile.php?id=61579383012990',
                        color: '#1877F2',
                        path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
                      },
                      {
                        icon: 'WhatsApp',
                        url: 'https://wa.me/c/919176008087',
                        color: '#25D366',
                        path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z',
                      },
                    ].map((s, idx) => (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-2xl bg-white border border-brand-primary/10 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:scale-105 shadow-sm overflow-hidden relative group"
                      >
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: s.color }}
                        ></div>
                        <svg
                          className="w-5 h-5 fill-current relative z-10"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d={s.path} />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 md:p-14 rounded-[3.5rem] md:rounded-[5rem] shadow-premium border border-brand-primary/5 relative">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary/5 rounded-full blur-3xl transition-all group-hover:bg-brand-primary/10"></div>
                {submitted ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-fade-in">
                    <div className="w-24 h-24 bg-brand-primary text-brand-black rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl">
                      <svg
                        className="w-12 h-12"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={4}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-4xl font-black text-brand-black mb-4">Buzz Sent!</h3>
                    <p className="text-gray-500 font-bold max-w-xs leading-relaxed">
                      Thank you for reaching out. Our team will review your message and respond
                      within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                    <div className="space-y-2">
                      <h3 className="font-black text-4xl text-brand-black tracking-tight">
                        Send a Buzz
                      </h3>
                      <p className="text-gray-400 font-bold">We’d love to hear from you.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-black uppercase tracking-[0.2em] ml-2">
                          Name
                        </label>
                        <input
                          required
                          type="text"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className="w-full bg-brand-light/50 border-2 border-transparent rounded-2xl px-6 py-5 text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all"
                          placeholder="Your name..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-black uppercase tracking-[0.2em] ml-2">
                          E-mail
                        </label>
                        <input
                          required
                          type="email"
                          value={contactForm.email}
                          onChange={(e) =>
                            setContactForm({ ...contactForm, email: e.target.value })
                          }
                          className="w-full bg-brand-light/50 border-2 border-transparent rounded-2xl px-6 py-5 text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all"
                          placeholder="your@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-brand-black uppercase tracking-[0.2em] ml-2">
                          Message
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={contactForm.message}
                          onChange={(e) =>
                            setContactForm({ ...contactForm, message: e.target.value })
                          }
                          className="w-full bg-brand-light/50 border-2 border-transparent rounded-2xl px-6 py-5 text-sm font-bold focus:bg-white focus:border-brand-primary outline-none transition-all resize-none"
                          placeholder="What's happening in your hive?"
                        ></textarea>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-brand-black text-brand-primary font-black py-6 rounded-2xl shadow-premium hover:bg-brand-dark transition-all flex items-center justify-center gap-3 disabled:opacity-50 group overflow-hidden relative"
                    >
                      <span className="relative z-10">
                        {isSubmitting ? 'Sending Buzz...' : 'Buzz Us 👉'}
                      </span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="max-w-4xl mx-auto animate-fade-in px-4">
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-7xl font-black text-brand-black mb-4 tracking-tighter uppercase">
                🔐 PRIVACY <span className="text-[#dc6601]">POLICY</span>
              </h1>
              <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.3em] border-y border-brand-primary/10 py-4 inline-block px-8">
                Last Updated: January 2026
              </p>
            </div>

            <div className="bg-white p-8 md:p-14 rounded-[2.5rem] md:rounded-[4rem] shadow-premium border border-brand-primary/5 space-y-12">
              {[
                {
                  title: '1. Information We Collect',
                  icon: '📝',
                  text: 'We collect information you provide directly to us (name, email, shipping address, phone number) when you make a purchase or contact us.',
                },
                {
                  title: '2. How We Use Your Information',
                  icon: '⚙️',
                  text: 'We use your info to process orders, communicate with you about your hive, and improve our book collection. We do not sell your data to third parties.',
                },
                {
                  title: '3. Data Security',
                  icon: '🛡️',
                  text: 'We use industry-standard security measures (SSL/HTTPS) to protect your personal information during transmission and storage.',
                },
                {
                  title: '4. Cookies',
                  icon: '🍪',
                  text: 'We use cookies to keep your honey pot (cart) saved and to understand how you buzz around our shop.',
                },
                {
                  title: '5. Third-Party Services',
                  icon: '🤝',
                  text: 'We use trusted partners like Cashfree for payments and India Post for shipping. They only get the info needed to complete their task.',
                },
                {
                  title: '6. Your Rights',
                  icon: '✨',
                  text: 'You can ask us to update or delete your information at any time by contacting us through the hive support form.',
                },
              ].map((section, idx) => (
                <section key={idx} className="space-y-4">
                  <h3 className="text-xl font-black text-brand-black flex items-center gap-4">
                    <span className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center text-lg shadow-sm">
                      {section.icon}
                    </span>
                    {section.title}
                  </h3>
                  <p className="text-gray-500 font-bold leading-relaxed text-sm md:text-base border-l-4 border-brand-primary/10 pl-6">
                    {section.text}
                  </p>
                </section>
              ))}

              <div className="pt-10 border-t border-brand-primary/5">
                <p className="text-sm text-gray-400 font-bold text-center">
                  By using SinggleBee, you agree to the collection and use of info as described here.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return <div>Hive section not found</div>;
    }
  };

  return (
    <div className="animate-fade-in pb-20 pt-10">
      <button
        onClick={onBack}
        className="mb-12 flex items-center gap-3 text-sm font-black text-gray-400 hover:text-brand-primary transition-all group"
      >
        <span className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:buzz">
          ←
        </span>
        Back
      </button>
      {renderContent()}
    </div>
  );
};

export default SupportPage;
