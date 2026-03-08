"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "next-auth/react";

export default function Navbar() {
    const pathname = usePathname();
    const isHomePage = pathname === '/';
    const { totalItems: cartCount } = useCart();
    const { user, isAuthenticated, isAdmin } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navLinks = [
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/products' },
        { label: 'Wishlist', href: '/wishlist' },
        { label: 'Contact Us', href: '/#contact' },
        { label: 'About Us', href: '/#about' },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            window.location.href = `/products?search=${encodeURIComponent(searchTerm)}`;
        }
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-[60] font-sans">
            {/* Top Marquee */}
            <div className="bg-brand-black text-brand-primary text-[10px] md:text-xs font-bold py-1.5 overflow-hidden relative border-b border-white/10">
                <div className="w-full h-full flex items-center">
                    <span className="whitespace-nowrap animate-marquee-one">
                        🚚 Delivery is free for purchase above ₹1499 ✨ For outside India orders contact our whatsapp no. 9176008087 or gmail singglebee.rsventures@gmail.com ✨
                    </span>
                </div>
            </div>

            <nav className={`w-full transition-all duration-500 ${scrolled || !isHomePage ? 'bg-white/95 backdrop-blur-xl shadow-sm py-1 md:py-1.5 border-b border-brand-primary/10' : 'bg-transparent py-3 md:py-4'}`}>
                <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-screen-2xl">
                    <div className="flex items-center justify-between gap-4 md:gap-6">

                        {/* Logo Container */}
                        <Link href="/" className="flex items-center cursor-pointer group shrink-0 relative">
                            <Image
                                src="/assets/brand-logo.png"
                                alt="SINGGLEBEE Logo"
                                width={160}
                                height={100}
                                className={`${scrolled || !isHomePage ? 'h-10 md:h-16' : 'h-16 md:h-24'} w-auto transition-all duration-500 group-hover:scale-105`}
                                priority
                            />
                        </Link>

                        {/* Centered Navigation */}
                        <div className="hidden lg:flex items-center justify-center">
                            <div className="flex items-center bg-white/60 backdrop-blur-xl p-1 rounded-[2rem] border border-white/40 shadow-premium transition-all hover:bg-white/80 hover:shadow-honey">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.label}
                                        href={link.href}
                                        className="px-3 py-2 rounded-2xl text-[10px] xl:text-[11px] font-black text-brand-black transition-all hover:bg-brand-primary hover:text-brand-black whitespace-nowrap tracking-widest uppercase"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-5 shrink-0">
                            {/* Search Desktop */}
                            <form onSubmit={handleSearch} className="relative hidden xl:block group">
                                <input
                                    type="text"
                                    className="w-48 pl-10 pr-4 py-2.5 rounded-2xl bg-white border-2 border-transparent focus:border-brand-primary outline-none text-xs font-bold shadow-premium transition-all focus:w-64"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <svg className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </form>

                            {/* Profile / Account */}
                            <div className="relative" ref={profileRef}>
                                {isAuthenticated ? (
                                    <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl border-[3px] border-white overflow-hidden bg-white shadow-honey active:scale-95 transition-all">
                                        <Image src={user?.image || '/assets/bee-character.png'} alt="Profile" width={48} height={48} className="w-full h-full rounded-xl object-cover" />
                                    </button>
                                ) : (
                                    <Link href="/login" className="flex h-9 md:h-11 px-4 md:px-6 items-center justify-center bg-white rounded-xl border-2 border-amber-200 text-[10px] font-black text-gray-800 hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm uppercase tracking-widest">
                                        Sign In
                                    </Link>
                                )}

                                {isProfileOpen && isAuthenticated && (
                                    <div className="absolute top-full right-0 mt-4 w-60 bg-white rounded-[2rem] shadow-honey-hover border border-brand-primary/5 overflow-hidden p-2 animate-slide-up origin-top-right">
                                        <div className="px-5 py-4 border-b border-brand-light bg-brand-light/20 rounded-t-[1.5rem]">
                                            <p className="text-[9px] font-black text-brand-secondary uppercase tracking-widest mb-1">Bee Account</p>
                                            <p className="text-sm font-black text-brand-black truncate">{user?.name}</p>
                                        </div>
                                        {isAdmin && (
                                            <Link href="/admin" className="w-full text-left px-5 py-3 text-xs font-black text-brand-black hover:bg-brand-light transition-all flex items-center gap-3">
                                                🛠️ Admin Dashboard
                                            </Link>
                                        )}
                                        <button onClick={() => signOut()} className="w-full text-left px-5 py-3 text-xs font-black text-brand-rose hover:bg-rose-50 transition-all flex items-center gap-3 rounded-b-[1.5rem]">
                                            🚪 Log Out
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Cart Button */}
                            <Link
                                href="/cart"
                                className="relative w-9 h-9 md:w-11 md:h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-zinc-900 text-amber-400 shadow-lg hover:scale-105 active:scale-95 transition-all"
                                aria-label="Open Cart"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                {cartCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                        </div>
                    </div>

                    {/* Mobile Navigation */}
                    <div className="lg:hidden mt-2 overflow-x-auto no-scrollbar -mx-6 px-4 pb-2">
                        <div className="flex items-center gap-1 w-max mx-auto bg-white/80 backdrop-blur-md p-1 rounded-full border border-amber-100 shadow-sm">
                            {navLinks.map((link, idx) => (
                                <Link
                                    key={link.label}
                                    href={link.href}
                                    className="px-3 py-1.5 rounded-full text-[10px] font-black transition-all text-brand-black hover:bg-brand-primary active:bg-brand-primary whitespace-nowrap uppercase tracking-tighter"
                                >
                                    {idx === 0 ? '🏠' : idx === 1 ? '🛍️' : idx === 2 ? '❤️' : idx === 3 ? '💬' : '📖'} {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </nav>
            {/* Animation Styles */}
            <style>{`
        @keyframes marquee-one {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee-one {
          animation: marquee-one 35s linear infinite;
          display: inline-block;
        }
      `}</style>
        </div>
    );
}
