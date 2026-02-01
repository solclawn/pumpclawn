import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: '#fafafa',
        surface: '#ffffff',
        border: '#e0e0e0',
        text: {
          primary: '#1a1a1b',
          secondary: '#7c7c7c'
        },
        accent: {
          red: '#e01b24',
          redHover: '#ff3b3b',
          teal: '#00d4aa',
          tealHover: '#00b894',
          blue: '#4a9eff',
          gold: '#ffd700'
        }
      },
      fontFamily: {
        sans: ['IBM Plex Mono', ...fontFamily.mono],
        display: ['IBM Plex Mono', ...fontFamily.mono],
        mono: ['IBM Plex Mono', ...fontFamily.mono]
      },
      borderRadius: {
        xl: '8px'
      },
      boxShadow: {
        card: 'none',
        glow: '0 0 24px rgba(224,27,36,0.2)'
      }
    }
  },
  plugins: []
};

export default config;
