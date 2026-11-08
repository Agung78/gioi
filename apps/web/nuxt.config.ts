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
		// PostHog first-party proxy. vercel.json rewrites miss trailing-slash URLs (/ingest/i/v0/e/ -> Nuxt 404), so Nitro handles them.
		'/ingest/static/**': { proxy: 'https://us-assets.i.posthog.com/static/**' } as never,
		'/ingest/**': { proxy: 'https://us.i.posthog.com/**' } as never,
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
		'@posthog/nuxt',
	],
	posthogConfig: {
		publicKey: process.env.NUXT_PUBLIC_POSTHOG_KEY ?? '',
		host: process.env.NUXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
		clientConfig: {
			autocapture: false,
			capture_pageleave: false,
			person_profiles: 'identified_only',
			disable_session_recording: true,
			opt_out_capturing_by_default: !process.env.NUXT_PUBLIC_POSTHOG_KEY, // no key (dev/CI): capture() is a silent no-op
			ui_host: 'https://us.posthog.com',
			// Prod: first-party proxy (see vercel.json) so ad blockers don't drop events. Conditional spread: clientConfig overrides api_host.
			...(process.env.NODE_ENV === 'production' ? { api_host: '/ingest' } : {}),
		},
	},
	tailwindcss: {
		configPath: 'tailwind.config.js',
	},
	vue: {
		compilerOptions: {
			isCustomElement: (tag) => tag.startsWith('icon-'),
		},
	},
})
