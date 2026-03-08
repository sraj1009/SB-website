import React from "react";

interface MarqueeProps {
    text: string;
    speed?: number;
    className?: string;
}

export default function Marquee({ text, className = "" }: MarqueeProps) {
    return (
        <div className={`relative flex overflow-x-hidden bg-amber-500 text-white font-semibold py-2 text-sm ${className}`}>
            <div className="animate-marquee whitespace-nowrap flex items-center">
                {[...Array(10)].map((_, i) => (
                    <span key={i} className="mx-4">
                        {text} •
                    </span>
                ))}
            </div>

            <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex items-center py-2 h-full">
                {[...Array(10)].map((_, i) => (
                    <span key={i} className="mx-4">
                        {text} •
                    </span>
                ))}
            </div>
        </div>
    );
}
