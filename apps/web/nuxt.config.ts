export default defineNuxtConfig({
	compatibilityDate: '2026-11-07',
	devtools: { enabled: true },
	runtimeConfig: {
		public: {
			apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '',
		},
	},
	routeRules: {
		'/bali': { prerender: true },
		'/bali/book/**': { ssr: false },
		'/admin/**': { ssr: false },
		'/host/**': { ssr: false },
		'/guests/**': { ssr: false },
	},
	vue: {
		compilerOptions: {
			isCustomElement: (tag) => tag.startsWith('icon-'),
		},
	},
})
