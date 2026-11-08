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
	app: {
		head: {
			htmlAttrs: { lang: 'en' },
			link: [
				{ rel: 'icon', type: 'image/jpeg', href: '/logo.jpg' },
				{ rel: 'preconnect', href: 'https://api.fontshare.com', crossorigin: '' },
				// ponytail: Fontshare CDN; self-host Cabinet Grotesk + Satoshi before launch
				{ rel: 'stylesheet', href: 'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800&f[]=satoshi@400,500,700&display=optional' },
			],
			script: [
				{ innerHTML: "try{var t=localStorage.getItem('gioi-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}", tagPosition: 'head' },
			],
		},
	},
	css: ['@/assets/css/style.css'],
	modules: [
		'@pinia/nuxt',
		'@nuxtjs/tailwindcss',
		'@vercel/analytics/nuxt',
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
