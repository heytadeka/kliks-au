import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0e0d1a',
        bg2: '#1a1828',
        purple: '#644bff',
        'purple-dark': '#3d2dcf',
        orange: '#ff4315',
        'orange-dark': '#c42f08',
        muted: 'rgba(255,255,255,0.55)',
      },
      fontFamily: {
        clash: ['"Clash Display"', 'sans-serif'],
        satoshi: ['Satoshi', 'sans-serif'],
      },
      borderColor: {
        subtle: 'rgba(100,75,255,0.12)',
      },
    },
  },
  plugins: [],
}
export default config
