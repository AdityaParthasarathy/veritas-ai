/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        veritas: {
          bg: '#090D18',
          secondary: '#101827',
          card: '#141E30',
          'card-hover': '#18243A',
          border: '#1F2C44',
          'border-subtle': 'rgba(154, 168, 188, 0.12)',
          primary: '#8B7CFF',
          'primary-hover': '#7A69FA',
          'primary-solid': '#6A5BEF', // button fill: white text 4.8:1
          'primary-solid-hover': '#5B4CE0',
          'primary-light': 'rgba(139, 124, 255, 0.15)',
          cyan: '#42D9E8',
          'cyan-light': 'rgba(66, 217, 232, 0.15)',
          text: '#F5F7FF',
          muted: '#9AA8BC',
          dim: '#7C8BA3', // 4.8:1 on card background (WCAG AA)
          success: '#38C995',
          'success-light': 'rgba(56, 201, 149, 0.15)',
          warning: '#F2B95C',
          'warning-light': 'rgba(242, 185, 92, 0.15)',
          error: '#F07183',
          'error-light': 'rgba(240, 113, 131, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      },
      boxShadow: {
        'subtle-glow': '0 0 20px -5px rgba(139, 124, 255, 0.25)',
        'cyan-glow': '0 0 20px -5px rgba(66, 217, 232, 0.25)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.35)',
      }
    },
  },
  plugins: [],
}
