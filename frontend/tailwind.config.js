module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: '#B8860B', light: '#D4A017', pale: '#FEF9EE' },
        ivory: '#FDFAF4',
        surface: '#F7F5F2',
        ink: '#1A1208',
        muted: '#6B5E4E',
        parch: '#E8E4DF',
        stone: '#A09070',
        emerald: { DEFAULT: '#2D7D46', light: '#ECFDF5' },
        ruby: { DEFAULT: '#C62828', light: '#FFEBEE' },
        amber: { DEFAULT: '#B45309', light: '#FFFBEB' },
        info: { DEFAULT: '#1565C0', light: '#E3F2FD' },
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      borderRadius: { card: '12px' },
      boxShadow: { card: '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' },
    },
  },
  plugins: [],
};
