export default defineNuxtConfig({
	compatibilityDate: '2026-11-07',
	devtools: { enabled: true },
	runtimeConfig: {
		public: {
			apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '',
			turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY ?? '',
		},
	},
	routeRules: {
		'/': { redirect: '/bali' },
		'/bali': { prerender: true },
		'/bali/book/**': { ssr: false },
		'/login': { ssr: false },
		'/host': { ssr: false },
		'/guests/**': { ssr: false },
		'/admin/**': { ssr: false },
	},
	// Local only: production rewrites /api to the API project in vercel.json.
	$development: {
		// Nitro supports `proxy`; Nuxt's RouteRules type omits it.
		routeRules: { '/api/**': { proxy: 'http://127.0.0.1:3001/**' } as never },
	},
	css: ['@/assets/css/style.css'],
	modules: [
		'@pinia/nuxt',
		'@nuxtjs/tailwindcss',
	],
	tailwindcss: {
		configPath: 'tailwind.config.js',
	},
	vue: {
		compilerOptions: {
			isCustomElement: (tag) => tag.startsWith('icon-'),
		},
	},
})
