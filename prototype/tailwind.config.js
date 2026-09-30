/** @type {import('tailwindcss').Config} */
const t = (name) => `rgb(var(--${name}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  darkMode: ['variant', [':root[data-theme="dark"] &', '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) & }']],
  theme: {
    extend: {
      colors: {
        surface: t('surface'),
        raised: t('surface-raised'),
        ink: t('ink'),
        muted: t('ink-muted'),
        line: t('line'),
        accent: t('accent'),
        'accent-ink': t('accent-ink'),
        sand: t('brand-sand'),
        sun: t('brand-sun'),
        navy: t('brand-navy'),
        danger: t('danger'),
        // legacy names, remapped onto tokens so untouched views follow the theme
        gioi: {
          cream: t('surface'),
          sand: t('line'),
          olive: t('accent-hover'),
          moss: t('accent'),
          clay: t('accent'),
          ink: t('ink'),
        },
      },
      fontFamily: {
        display: ['"Cabinet Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Satoshi', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { input: '12px', surface: '16px' },
      boxShadow: { soft: '0 1px 2px rgb(var(--ink) / 0.06), 0 8px 24px -8px rgb(var(--ink) / 0.10)' },
    },
  },
  plugins: [],
}
