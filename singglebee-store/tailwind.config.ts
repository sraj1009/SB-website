import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Quicksand"', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          black: '#1F120F',
          dark: '#2D1B18',
          primary: '#FFC107',
          secondary: '#E65100',
          accent: '#FFF8E1',
          light: '#FFFDF7',
          meadow: '#2E7D32',
          rose: '#BE123C'
        }
      },
      boxShadow: {
        'honey': '0 12px 40px -10px rgba(62, 39, 35, 0.08)',
        'honey-hover': '0 20px 50px -12px rgba(62, 39, 35, 0.15)',
        'premium': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-up': 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-out-up': 'slideOutUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 5s ease-in-out infinite',
        'buzz': 'buzz 0.5s ease-in-out infinite',
        'pop': 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'wing-left': 'wingLeft 0.15s ease-in-out infinite alternate',
        'wing-right': 'wingRight 0.15s ease-in-out infinite alternate',
        'spin-3d': 'spin3D 1s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'wiggle-playful': 'wigglePlayful 0.6s ease-in-out infinite',
        'honey-pulse': 'honeyPulse 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'blink': 'blink 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'progress-grow': 'progressGrow 4s ease-out forwards',
        'fly-across': 'flyAcross 15s linear forwards',
        'nectar-flow': 'nectarFlow 3s infinite linear',
        'nectar-drip-v2': 'nectarDripV2 4s infinite ease-in',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(30px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideOutUp: { '0%': { transform: 'translateY(0)', opacity: '1' }, '100%': { transform: 'translateY(-30px)', opacity: '0' } },
        slideInRight: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        slideInLeft: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(0)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-25px)' } },
        buzz: { '0%, 100%': { transform: 'rotate(0deg)' }, '25%': { transform: 'rotate(-4deg)' }, '75%': { transform: 'rotate(4deg)' } },
        pop: { '0%': { transform: 'scale(0.95)' }, '50%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)' } },
        wingLeft: { 'from': { transform: 'rotate(-10deg) skewX(-10deg)' }, 'to': { transform: 'rotate(35deg) skewX(12deg)' } },
        wingRight: { 'from': { transform: 'rotate(10deg) skewX(10deg)' }, 'to': { transform: 'rotate(-35deg) skewX(-12deg)' } },
        spin3D: { '0%': { transform: 'rotateY(0deg)' }, '100%': { transform: 'rotateY(360deg)' } },
        wigglePlayful: { '0%, 100%': { transform: 'rotate(0deg) scale(1.1)' }, '25%': { transform: 'rotate(12deg) scale(1.15)' }, '75%': { transform: 'rotate(-12deg) scale(1.15)' } },
        honeyPulse: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '30%': { opacity: '0.2' },
          '100%': { transform: 'scale(2.2)', opacity: '0' }
        },
        blink: {
          '0%, 94%, 100%': { transform: 'scaleY(1)' },
          '96%': { transform: 'scaleY(0.1)' }
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        },
        progressGrow: {
          '0%': { width: '0%' },
          '100%': { width: '100%' }
        },
        flyAcross: {
          '0%': { transform: 'translateX(-10vw) translateY(10vh) rotate(15deg)' },
          '25%': { transform: 'translateX(25vw) translateY(-10vh) rotate(-15deg)' },
          '50%': { transform: 'translateX(50vw) translateY(5vh) rotate(15deg)' },
          '75%': { transform: 'translateX(75vw) translateY(-5vh) rotate(-15deg)' },
          '100%': { transform: 'translateX(110vw) translateY(10vh) rotate(15deg)' }
        },
        nectarFlow: {
          '0%': { 'backgroundPosition': '0% 50%' },
          '100%': { 'backgroundPosition': '200% 50%' }
        },
        nectarDripV2: {
          '0%': { transform: 'translateY(0) scaleY(0)', opacity: '0' },
          '10%': { transform: 'translateY(0) scaleY(1)', opacity: '1' },
          '60%': { transform: 'translateY(12px) scaleY(1.5)', opacity: '0.8' },
          '100%': { transform: 'translateY(24px) scaleY(0.5)', opacity: '0' }
        }
      }
    },
  },
  plugins: [],
};
export default config;
