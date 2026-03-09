import React, { useState, useEffect, useRef } from 'react';

const InteractiveBee: React.FC = () => {
  const [tapCount, setTapCount] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [bubbles, setBubbles] = useState<{ id: number; x: number; y: number }[]>([]);
  const tapTimeoutRef = useRef<number | null>(null);
  const longPressRef = useRef<number | null>(null);
  const beeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (beeRef.current) {
        const rect = beeRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) / 15;
        const deltaY = (e.clientY - centerY) / 20;
        setMousePos({
          x: Math.max(-12, Math.min(12, deltaX)),
          y: Math.max(-10, Math.min(10, deltaY)),
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const triggerBubble = () => {
    const id = Date.now();
    setBubbles((prev) => [
      ...prev,
      { id, x: Math.random() * 160 - 80, y: Math.random() * 120 - 60 },
    ]);
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, 1500);
  };

  const handleInteraction = () => {
    triggerBubble();

    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 2) setIsWiggling(true);
      return next;
    });

    if (tapTimeoutRef.current) window.clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = window.setTimeout(() => {
      setTapCount(0);
      setIsWiggling(false);
    }, 1200);
  };

  const handleMouseDown = () => {
    longPressRef.current = window.setTimeout(() => {
      setIsSpinning(true);
      triggerBubble();
      setTimeout(() => setIsSpinning(false), 800);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
    }
    handleInteraction();
  };

  return (
    <div
      ref={beeRef}
      className="relative w-80 h-80 md:w-[550px] md:h-[550px] flex items-center justify-center cursor-pointer perspective-1000 select-none group"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      <div
        className="absolute bottom-12 w-48 h-12 bg-brand-black/20 rounded-[100%] blur-3xl transition-all duration-700 ease-out"
        style={{
          transform: `translateX(${mousePos.x * 2.5}px) scale(${1.15 - Math.abs(mousePos.y) / 50})`,
          opacity: 0.35,
        }}
      />

      {bubbles.map((b) => (
        <div
          key={b.id}
          className="honey-bubble"
          style={{
            left: `calc(50% + ${b.x}px)`,
            top: `calc(50% + ${b.y}px)`,
            width: '28px',
            height: '28px',
          }}
        />
      ))}

      <div
        className={`preserve-3d transition-transform duration-1000 ease-out animate-float
          ${isSpinning ? 'animate-spin-3d' : ''}
          ${isWiggling ? 'animate-wiggle-playful' : ''}
        `}
        style={{
          transform: `rotateY(${mousePos.x}deg) rotateX(${-mousePos.y}deg) rotateZ(${mousePos.x / 1.8}deg)`,
        }}
      >
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full drop-shadow-[0_45px_75px_rgba(62,39,35,0.35)] transition-all duration-500 group-hover:drop-shadow-[0_55px_90px_rgba(255,193,7,0.4)]"
        >
          <defs>
            <filter id="softMatteVinyl" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
              <feSpecularLighting
                in="blur"
                surfaceScale="5"
                specularConstant="0.3"
                specularExponent="50"
                lightingColor="#FFECB3"
                result="spec"
              >
                <fePointLight x="80" y="60" z="400" />
              </feSpecularLighting>
              <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut" />
              <feComposite
                in="SourceGraphic"
                in2="specOut"
                operator="arithmetic"
                k1="0"
                k2="1"
                k3="0.5"
                k4="0"
              />
            </filter>

            <radialGradient id="honeyBodyGradient" cx="45%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#FFC107" />
              <stop offset="45%" stopColor="#FFA000" />
              <stop offset="85%" stopColor="#E65100" />
              <stop offset="100%" stopColor="#3E2723" stopOpacity="0.7" />
            </radialGradient>

            <radialGradient id="iridescentWingGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFF9E6" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#E0F2F1" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#F3E5F5" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFECB3" stopOpacity="0.2" />
            </radialGradient>

            <clipPath id="beeBodyClipPath">
              <ellipse cx="120" cy="120" rx="85" ry="78" />
            </clipPath>
          </defs>

          <g className="animate-wing-left origin-[120px_80px]">
            <path
              d="M120 80 Q 30 -10 15 70 Q 15 130 120 80"
              fill="url(#iridescentWingGradient)"
              stroke="#FFB300"
              strokeWidth="0.5"
            />
            <g stroke="#E65100" strokeWidth="0.3" fill="none" opacity="0.4">
              <path d="M120 80 C 100 60, 60 40, 30 55" />
              <path d="M120 80 C 100 80, 50 85, 25 90" />
              <path d="M120 80 C 100 100, 70 115, 45 120" />
            </g>
          </g>
          <g className="animate-wing-right origin-[120px_80px]">
            <path
              d="M120 80 Q 210 -10 225 70 Q 225 130 120 80"
              fill="url(#iridescentWingGradient)"
              stroke="#FFB300"
              strokeWidth="0.5"
            />
            <g stroke="#E65100" strokeWidth="0.3" fill="none" opacity="0.4">
              <path d="M120 80 C 140 60, 180 40, 210 55" />
              <path d="M120 80 C 140 80, 190 85, 215 90" />
              <path d="M120 80 C 140 100, 170 115, 195 120" />
            </g>
          </g>

          <g filter="url(#softMatteVinyl)">
            <ellipse cx="120" cy="120" rx="85" ry="78" fill="url(#honeyBodyGradient)" />
            <g clipPath="url(#beeBodyClipPath)" opacity="0.95">
              <path
                d="M30 75 Q 120 50 210 75"
                fill="none"
                stroke="#2D1B18"
                strokeWidth="24"
                strokeLinecap="round"
              />
              <path
                d="M15 120 Q 120 95 225 120"
                fill="none"
                stroke="#2D1B18"
                strokeWidth="28"
                strokeLinecap="round"
              />
              <path
                d="M30 165 Q 120 155 210 165"
                fill="none"
                stroke="#2D1B18"
                strokeWidth="18"
                strokeLinecap="round"
              />
            </g>
          </g>

          <g filter="url(#softMatteVinyl)">
            <g
              style={{
                transform: `rotate(${mousePos.x / 4}deg) translateY(${isWiggling ? -3 : 0}px)`,
                transformOrigin: '105px 55px',
                transition: 'transform 0.3s ease-out',
              }}
            >
              <path
                d="M105 55 C 100 40, 85 20, 60 28"
                stroke="#3E2723"
                strokeWidth="6.5"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="60" cy="28" r="8.5" fill="#3E2723" />
            </g>
            <g
              style={{
                transform: `rotate(${mousePos.x / 4}deg) translateY(${isWiggling ? -3 : 0}px)`,
                transformOrigin: '135px 55px',
                transition: 'transform 0.3s ease-out',
              }}
            >
              <path
                d="M135 55 C 140 40, 155 20, 180 28"
                stroke="#3E2723"
                strokeWidth="6.5"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="180" cy="28" r="8.5" fill="#3E2723" />
            </g>
          </g>

          <g style={{ transform: `translate(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px)` }}>
            <circle cx="68" cy="130" r="12" fill="#FFAB91" opacity="0.2" filter="blur(7px)" />
            <circle cx="172" cy="130" r="12" fill="#FFAB91" opacity="0.2" filter="blur(7px)" />

            <g className="animate-blink origin-center">
              <g transform="translate(85, 105)">
                <ellipse
                  cx="0"
                  cy="0"
                  rx={tapCount > 0 ? 12 : 10.5}
                  ry={tapCount > 0 ? 14 : 12.5}
                  fill="#2D1B18"
                  className="transition-all duration-300"
                />
                <circle cx="2.5" cy="-4.5" r="3" fill="white" />
                <circle cx="-3.5" cy="3.5" r="1.5" fill="white" opacity="0.5" />
              </g>
              <g transform="translate(155, 105)">
                <ellipse
                  cx="0"
                  cy="0"
                  rx={tapCount > 0 ? 12 : 10.5}
                  ry={tapCount > 0 ? 14 : 12.5}
                  fill="#2D1B18"
                  className="transition-all duration-300"
                />
                <circle cx="2.5" cy="-4.5" r="3" fill="white" />
                <circle cx="-3.5" cy="3.5" r="1.5" fill="white" opacity="0.5" />
              </g>
            </g>

            <path
              d={
                tapCount > 0 || isWiggling
                  ? 'M108 142 Q 120 165 132 142'
                  : 'M112 145 Q 120 156 128 145'
              }
              fill="none"
              stroke="#2D1B18"
              strokeWidth="5.5"
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </g>

          <g transform="translate(120, 165)" opacity="0.85">
            <path
              d="M-52 5 Q-42 22 -32 12"
              stroke="#3E2723"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-500 group-hover:stroke-brand-secondary"
            />
            <path
              d="M52 5 Q42 22 32 12"
              stroke="#3E2723"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-500 group-hover:stroke-brand-secondary"
            />
          </g>
        </svg>

        <div className="absolute inset-0 bg-brand-primary/10 rounded-full blur-[140px] -z-10 group-hover:bg-brand-primary/25 transition-all duration-1000" />
        {tapCount > 0 && (
          <div className="absolute inset-0 bg-brand-primary/15 rounded-full blur-[90px] animate-honey-pulse" />
        )}
      </div>
    </div>
  );
};

export default InteractiveBee;
