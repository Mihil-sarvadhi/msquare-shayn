module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: '#B8860B', light: '#D4A017', pale: '#FEF9EE' },
        ivory: '#FDFAF4',
        ink: '#1A1208',
        muted: '#8C7B64',
        parch: '#F0EBE0',
        emerald: { DEFAULT: '#2D7D46', light: '#ECFDF5' },
        ruby: { DEFAULT: '#9B2235', light: '#FEF2F2' },
        amber: { DEFAULT: '#B45309', light: '#FFFBEB' },
      },
      fontFamily: { sans: ['DM Sans', 'sans-serif'] },
      boxShadow: { card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' },
    },
  },
  plugins: [],
};
