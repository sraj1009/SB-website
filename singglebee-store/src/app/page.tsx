"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Hero from "@/components/layout/Hero";
import AutoScrollProductBand from "@/components/ui/AutoScrollProductBand";
import TestimonialMarquee from "@/components/ui/TestimonialMarquee";
import BeeCharacter from "@/components/ui/BeeCharacter";

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  category: string;
  language?: string;
  bestseller?: boolean;
  isComingSoon?: boolean;
  isOutOfStock?: boolean;
  rating?: number;
  reviewCount?: number;
  stock: {
    available: number;
    isLowStock: boolean;
  };
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.success) {
          setProducts(data.data.products);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const tamilBooks = products.filter(p => p.language === 'Tamil');
  const englishBooks = products.filter(p => p.language === 'English');

  return (
    <div className="animate-fade-in pb-24">
      {/* Hero Section */}
      <Hero />

      {/* Tamil Books Band */}
      <AutoScrollProductBand
        title="Tamil Books"
        products={tamilBooks}
        bgColor="bg-white"
        direction="left"
        onViewAll={() => window.location.href = '/products?language=Tamil'}
      />

      {/* English Books Band */}
      <AutoScrollProductBand
        title="English Books"
        products={englishBooks}
        bgColor="bg-gray-50/30"
        direction="right"
        onViewAll={() => window.location.href = '/products?language=English'}
      />

      {/* Testimonials Band */}
      <TestimonialMarquee />

      {/* About Section */}
      <section id="about" className="py-24 relative overflow-hidden bg-white/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-black font-black uppercase tracking-widest text-[10px]">
                <span>🍯</span> Our Mission
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-brand-black leading-tight tracking-tighter">
                Crafting Exceptional <br /><span className="nectar-text-flow">Educational</span> Experiences
              </h2>
              <p className="text-gray-600 text-lg md:text-xl font-medium leading-relaxed max-w-xl">
                SinggleBee was born from a simple mission: to make premium educational resources
                accessible to every curious mind. We believe that quality learning should
                be a journey of joy, not a burden.
              </p>
              <div className="nectar-underline w-32" />
            </div>
            <div className="flex-1 relative">
              <div className="glass p-12 rounded-[3rem] border-2 border-brand-primary/10 shadow-premium relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10 space-y-6">
                  <div className="p-6 bg-white/60 rounded-3xl border border-white/40 shadow-sm">
                    <h4 className="text-4xl font-black text-brand-primary mb-1">10k+</h4>
                    <p className="text-brand-black/60 font-black text-[10px] uppercase tracking-widest">Happy Learners</p>
                  </div>
                  <div className="p-6 bg-white/60 rounded-3xl border border-white/40 shadow-sm">
                    <h4 className="text-4xl font-black text-brand-primary mb-1">500+</h4>
                    <p className="text-brand-black/60 font-black text-[10px] uppercase tracking-widest">Curated Titles</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-brand-light relative">
        <div className="absolute inset-0 honeycomb-pattern opacity-[0.05]"></div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="bg-brand-black rounded-[3rem] shadow-premium overflow-hidden border-[12px] border-white/50 glass">
            <div className="flex flex-col lg:flex-row">
              <div className="lg:w-[40%] p-12 md:p-16 bg-zinc-900 border-r border-white/5">
                <h2 className="text-4xl font-black text-white mb-8 tracking-tighter">Contact the Hive 🐝</h2>
                <p className="text-gray-400 font-medium text-lg mb-12 leading-relaxed">
                  Have questions? Our team of busy bees is here to help you find the perfect resources.
                </p>

                <div className="space-y-8">
                  <div className="flex items-center gap-5 group">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:bg-brand-primary/20 transition-all">
                      📧
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Email</p>
                      <a href="mailto:singglebee.rsventures@gmail.com" className="text-sm font-black text-white hover:text-brand-primary transition-colors">
                        singglebee.rsventures@gmail.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 group">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:bg-brand-primary/20 transition-all">
                      📱
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">WhatsApp</p>
                      <a href="https://wa.me/919176008087" target="_blank" className="text-sm font-black text-white hover:text-brand-primary transition-colors">
                        +91 9176008087
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-grow p-12 md:p-16 bg-white/5 backdrop-blur-sm">
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-primary outline-none text-white font-bold transition-all placeholder:text-gray-600" placeholder="Name" />
                    <input type="email" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-primary outline-none text-white font-bold transition-all placeholder:text-gray-600" placeholder="Email" />
                  </div>
                  <textarea rows={4} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-primary outline-none text-white font-bold transition-all placeholder:text-gray-600" placeholder="How can we help?"></textarea>
                  <button type="submit" className="w-full py-4 bg-brand-primary text-brand-black font-black rounded-2xl hover:bg-brand-accent transition-all shadow-honey uppercase tracking-widest text-sm">
                    Send Message 🚀
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
