import plugin from 'tailwindcss/plugin'
import { colors, cssVariables, fonts, motion, radius } from './src/design/tokens.js'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors,
      fontFamily: fonts,
      borderRadius: radius,
      transitionTimingFunction: { out: motion.easeOut, 'in-out': motion.easeInOut },
      transitionDuration: { fast: `${motion.fast}ms`, base: `${motion.base}ms`, slow: `${motion.slow}ms` },
      boxShadow: {
        // One elevation system: a soft, offset shadow for floating layers only (menus, modals, palette).
        float: '0 18px 48px -12px rgba(4, 5, 20, 0.75), 0 2px 6px rgba(4, 5, 20, 0.5)',
        // Soft violet lift for the one primary action per view.
        glow: '0 8px 28px -8px rgba(118, 84, 246, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        panel: '0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 12px 32px -16px rgba(4, 5, 20, 0.8)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6847F0 0%, #7A58F7 100%)',
        'signal-gradient': 'linear-gradient(90deg, #45D9E8 0%, #7654F6 100%)',
      },
      keyframes: {
        'page-enter': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-in': { from: { opacity: '0', transform: 'translateY(12px) scale(0.985)' }, to: { opacity: '1', transform: 'none' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        scan: { '0%': { transform: 'translateY(-10%)' }, '100%': { transform: 'translateY(110%)' } },
        'pulse-soft': { '0%, 100%': { opacity: '0.45' }, '50%': { opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        orbit: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
      animation: {
        'page-enter': `page-enter ${motion.base}ms ${motion.easeOut} both`,
        'fade-in': `fade-in ${motion.base}ms ${motion.easeOut} both`,
        'sheet-in': `sheet-in ${motion.slow}ms ${motion.easeOut} both`,
        'toast-in': `toast-in ${motion.base}ms ${motion.easeOut} both`,
        scan: `scan 2.8s ${motion.easeInOut} infinite`,
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        orbit: 'orbit 60s linear infinite',
        float: 'float 7s ease-in-out infinite',
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ':root': cssVariables() })
    }),
  ],
}
