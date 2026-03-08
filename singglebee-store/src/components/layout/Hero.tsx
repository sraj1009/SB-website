"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import InteractiveBee from '../ui/InteractiveBee';
import BeeCharacter from '../ui/BeeCharacter';

interface FloatingAssetProps {
  icon: React.ReactNode;
  delay: number;
  scale: number;
  x: string;
  y: string;
  parallaxFactor: number;
  baseRotation?: number;
  floatDuration?: number;
}

const FloatingAsset: React.FC<FloatingAssetProps> = ({
  icon, delay, scale, x, y, parallaxFactor, baseRotation = 0, floatDuration = 5
}) => {
  const { scrollY } = useScroll();
  const yOffset = useTransform(scrollY, [0, 1000], [0, 1000 * parallaxFactor]);
  const springY = useSpring(yOffset, { damping: 25, stiffness: 100 });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: Math.min(0.25, 0.05 + (parallaxFactor * 0.1)), scale: 1 }}
      transition={{ duration: 1.5, delay: delay / 1000, ease: "easeOut" }}
      className="absolute pointer-events-none select-none sm:block"
      style={{
        left: x,
        top: y,
        fontSize: `${scale}rem`,
        y: springY,
        zIndex: Math.floor(parallaxFactor * 10),
      }}
    >
      <motion.div
        animate={{
          y: [0, -15, 0],
          rotate: [baseRotation, baseRotation + 5, baseRotation],
        }}
        transition={{
          duration: floatDuration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {icon}
      </motion.div>
    </motion.div>
  );
};

const Hero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const contentScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-[600px] md:min-h-[850px] flex flex-col items-center overflow-hidden rounded-[3rem] md:rounded-[6rem] mb-12 md:mb-24 shadow-premium border-[8px] md:border-[16px] border-white bg-white transition-all"
    >
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 0.5, type: "spring" }}
        className="absolute top-52 sm:top-36 right-4 sm:right-16 z-50 inline-flex items-center gap-2 sm:gap-3 py-2 sm:py-3 px-4 sm:px-8 rounded-full bg-brand-black/95 backdrop-blur-xl border border-white/10 shadow-honey group cursor-default"
      >
        <span className="group-hover:animate-buzz inline-block text-xs sm:text-base">✨</span>
        <span className="text-white text-[9px] sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">
          Glow and Growth Assured
        </span>
      </motion.div>

      {/* Dynamic Background Atmosphere */}
      <motion.div style={{ y: backgroundY }} className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 via-white to-brand-accent/20"></div>

        {/* Organic Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-5%] w-[400px] md:w-[900px] h-[400px] md:h-[900px] bg-brand-primary/10 rounded-full blur-[80px] md:blur-[120px] pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, -40, 0],
            y: [0, 60, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-15%] left-[-10%] w-[350px] md:w-[800px] h-[350px] md:h-[800px] bg-brand-secondary/10 rounded-full blur-[70px] md:blur-[100px] pointer-events-none"
        />

        {/* Honeycomb Texture Overlays */}
        <div className="absolute inset-0 honeycomb-pattern opacity-[0.03]" />

        {/* Parallax Assets (Hidden on small mobile for clarity) */}
        <div className="hidden sm:block">
          <FloatingAsset icon="📚" x="8%" y="15%" scale={4} delay={200} parallaxFactor={0.2} baseRotation={-10} floatDuration={8} />
          <FloatingAsset icon="🖋️" x="82%" y="70%" scale={3} delay={400} parallaxFactor={0.15} baseRotation={15} floatDuration={9} />
          <FloatingAsset icon="🍯" x="75%" y="10%" scale={5} delay={600} parallaxFactor={0.6} baseRotation={10} floatDuration={6} />
          <FloatingAsset icon="🍎" x="15%" y="80%" scale={3.5} delay={800} parallaxFactor={0.4} baseRotation={-15} floatDuration={7} />
          <FloatingAsset icon="🌻" x="30%" y="5%" scale={4} delay={1000} parallaxFactor={0.3} baseRotation={20} floatDuration={5} />
        </div>
      </motion.div>

      {/* Hero Content Wrapper */}
      <motion.div
        style={{ opacity: contentOpacity, scale: contentScale }}
        className="container mx-auto px-6 md:px-12 relative z-30 flex flex-col lg:flex-row items-center justify-center gap-10 sm:gap-16 py-28 sm:py-20 lg:py-0 h-full min-h-[inherit]"
      >
        {/* Text Content */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left pt-14 lg:pt-0">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl sm:text-7xl md:text-8xl xl:text-9xl font-black text-brand-black mb-6 sm:mb-8 leading-[1] tracking-tighter">
              Learn <br className="hidden sm:block" />& <span className="text-brand-secondary relative inline-block whitespace-nowrap">
                Buzz
                <motion.svg
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.2, delay: 1, ease: "easeInOut" }}
                  className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-2 sm:h-4 text-brand-primary"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                >
                  <path d="M 0 5 Q 25 0, 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </motion.svg>
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="text-base sm:text-lg md:text-2xl text-brand-black/70 font-bold mb-8 sm:mb-12 max-w-lg leading-relaxed px-4 md:px-0"
          >
            Premium educational treasures and sweet delights, uniquely curated for young minds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
            className="w-full sm:w-auto"
          >
            <Link href="/products">
              <button className="group relative w-full sm:w-auto bg-brand-black text-brand-primary font-black py-4 sm:py-6 px-10 sm:px-16 rounded-2xl sm:rounded-[2rem] shadow-premium hover:shadow-honey-hover transition-all overflow-hidden active:scale-95">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <span className="relative z-10 text-lg sm:text-xl md:text-2xl flex items-center justify-center gap-3 sm:gap-4">
                  Start Shopping 🚀
                </span>
              </button>
            </Link>
          </motion.div>
        </div>

        {/* Character Visual */}
        <div className="w-full lg:w-1/2 flex justify-center items-center relative pb-10 sm:pb-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, type: "spring", bounce: 0.4 }}
            className="relative z-10 scale-[0.65] sm:scale-90 md:scale-105 lg:scale-115 origin-center"
          >
            <div className="absolute inset-0 bg-brand-primary/20 blur-[50px] sm:blur-[100px] rounded-full animate-pulse-soft -z-10" />
            <InteractiveBee />
          </motion.div>

          {/* Scroll Hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3, duration: 1 }}
            className="absolute -bottom-10 sm:-bottom-24 md:-bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 sm:gap-4"
          >
            <span className="text-brand-black/20 font-black text-[8px] sm:text-[10px] uppercase tracking-[0.4em] sm:tracking-[0.5em] animate-pulse">
              Scroll to explore
            </span>
            <div className="w-[1px] h-8 sm:h-12 bg-gradient-to-b from-brand-primary to-transparent" />
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom Wave/Nectar Flow - Improved Transition */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none translate-y-2">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full scale-x-110 sm:scale-x-100">
          <motion.path
            initial={{ d: "M 0 40 Q 360 80 720 40 T 1440 40 V 120 H 0 Z" }}
            animate={{
              d: [
                "M 0 40 Q 360 80 720 40 T 1440 40 V 120 H 0 Z",
                "M 0 40 Q 360 0 720 40 T 1440 40 V 120 H 0 Z",
                "M 0 40 Q 360 80 720 40 T 1440 40 V 120 H 0 Z"
              ]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            fill="#FFFDF7"
          />
          <path d="M 0 40 Q 360 80 720 40 T 1440 40" stroke="#FFC107" strokeWidth="2" strokeOpacity="0.2" />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
