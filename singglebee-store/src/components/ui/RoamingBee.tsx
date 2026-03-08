"use client";

import React, { useState, useEffect, useRef } from 'react';

const RoamingBee: React.FC<{ isCheckoutOpen?: boolean }> = ({ isCheckoutOpen = false }) => {
    const [isVisible, setIsVisible] = useState(false);
    const flyTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (isCheckoutOpen) {
            setIsVisible(false);
            if (flyTimeoutRef.current) window.clearTimeout(flyTimeoutRef.current);
            return;
        }

        const triggerBee = () => {
            if (isCheckoutOpen) return;
            setIsVisible(true);
            flyTimeoutRef.current = window.setTimeout(() => {
                setIsVisible(false);
            }, 16000);
        };

        const interval = setInterval(triggerBee, 90000);

        const initialTimer = setTimeout(() => {
            if (!isCheckoutOpen) triggerBee();
        }, 15000);

        return () => {
            clearInterval(interval);
            clearTimeout(initialTimer);
            if (flyTimeoutRef.current) window.clearTimeout(flyTimeoutRef.current);
        };
    }, [isCheckoutOpen]);

    if (!isVisible || isCheckoutOpen) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
            <div className="animate-fly-across flex items-center gap-2 w-max">
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_10px_15px_rgba(0,0,0,0.2)]">
                        <ellipse cx="50" cy="50" rx="22" ry="18" fill="#FFC107" />
                        <path d="M40 38 Q 50 32 60 38" fill="none" stroke="#2D1B18" strokeWidth="6" strokeLinecap="round" />
                        <path d="M35 50 Q 50 45 65 50" fill="none" stroke="#2D1B18" strokeWidth="8" strokeLinecap="round" />
                        <path d="M40 62 Q 50 68 60 62" fill="none" stroke="#2D1B18" strokeWidth="6" strokeLinecap="round" />
                        <circle cx="65" cy="45" r="3" fill="#2D1B18" />
                        <g className="animate-wing-left origin-[50px_42px]">
                            <ellipse cx="40" cy="35" rx="14" ry="7" fill="rgba(255,255,255,0.7)" stroke="#FFC107" strokeWidth="1" />
                        </g>
                        <g className="animate-wing-right origin-[50px_42px]">
                            <ellipse cx="60" cy="35" rx="14" ry="7" fill="rgba(255,255,255,0.7)" stroke="#FFC107" strokeWidth="1" />
                        </g>
                    </svg>
                    <div className="absolute -top-6 -right-10 bg-brand-primary text-[9px] font-black uppercase px-3 py-1.5 rounded-2xl text-brand-black border-2 border-white shadow-xl animate-bounce">
                        Bzz-bzz! 🍯
                    </div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 flex gap-1 -translate-x-full opacity-40">
                        <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-ping"></div>
                        <div className="w-1 h-1 bg-brand-primary rounded-full animate-ping delay-75"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoamingBee;
