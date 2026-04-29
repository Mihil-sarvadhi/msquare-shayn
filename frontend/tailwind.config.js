module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        /* Surfaces (token-driven via CSS vars) */
        bg:        'var(--bg)',
        'bg-2':    'var(--bg-2)',
        surface:   'var(--surface)',
        'surface-2': 'var(--surface-2)',

        /* Text */
        'ink-1':   'var(--ink)',
        'ink-2':   'var(--ink-2)',
        'ink-3':   'var(--ink-3)',
        'muted-1': 'var(--muted)',
        'muted-2': 'var(--muted-2)',

        /* Borders */
        line:    'var(--line)',
        'line-2': 'var(--line-2)',
        'line-3': 'var(--line-3)',

        /* Accent */
        accent: {
          DEFAULT: 'var(--accent)',
          2:       'var(--accent-2)',
          soft:    'var(--accent-soft)',
          'soft-2': 'var(--accent-soft-2)',
        },

        /* Chart palette */
        c1: 'var(--c1)',
        c2: 'var(--c2)',
        c3: 'var(--c3)',
        c4: 'var(--c4)',
        c5: 'var(--c5)',

        /* Legacy palette retained for backwards compatibility */
        gold:    { DEFAULT: '#B8893E', light: '#D4A017', pale: '#FEF9EE' },
        ivory:   '#F6F4EE',
        ink:     '#14130E',
        muted:   '#6E6A5C',
        parch:   '#EFEDE5',
        emerald: { DEFAULT: '#1F8A4C', light: '#ECFDF5' },
        ruby:    { DEFAULT: '#C4361F', light: '#FEF2F2' },
        amber:   { DEFAULT: '#C8780B', light: '#FFFBEB' },
      },
      fontFamily: {
        sans:  ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono:  ['Geist Mono', 'ui-monospace', 'monospace'],
        serif: ['Fraunces', 'serif'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '14px',
        lg: '22px',
      },
      boxShadow: {
        card:  'var(--shadow-sm)',
        soft:  'var(--shadow-sm)',
        lift:  'var(--shadow-md)',
        deep:  'var(--shadow-lg)',
      },
      backdropBlur: {
        header: '18px',
      },
      letterSpacing: {
        tightish: '-0.005em',
        tightx:   '-0.025em',
        widish:   '0.06em',
      },
    },
  },
  plugins: [],
};
