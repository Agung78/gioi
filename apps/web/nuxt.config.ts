import { VENUE_SEO } from './utils/venueSeo'

export default defineNuxtConfig({
	compatibilityDate: '2026-11-07',
	// Dev server serves source/@fs; keep it local. NUXT_DEV_HOST overrides (e.g. Docker scanner).
	devServer: { host: process.env.NUXT_DEV_HOST ?? '127.0.0.1' },
	devtools: { enabled: true },
	runtimeConfig: {
		public: {
			// Server-only (prerender/SSR fetch of venue data); same origin as the /api rewrite in vercel.json.
			apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'https://gioi-api.vercel.app',
			siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'https://gioigroup.com',
			// Booking flow host. Empty in dev so links stay on localhost.
			bookUrl: process.env.NUXT_PUBLIC_BOOK_URL ?? 'https://book.gioigroup.com',
			turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY ?? '',
		},
	},
	nitro: {
		prerender: {
			routes: Object.keys(VENUE_SEO).map((s) => `/${s}`),
		},
	},
	routeRules: {
		// / is the group landing page now; prerendered.
		'/': { prerender: true },
		// Booking flow stays out of search results. Header (not robots.txt Disallow) so Google can crawl and see it.
		// `as never`: keys that match a page pattern get Nuxt's narrow page-rule type, which omits `headers`; Nitro applies them (verified via curl).
		'/*/book/**': { ssr: false, headers: { 'X-Robots-Tag': 'noindex' } } as never,
		'/*/confirmation/**': { headers: { 'X-Robots-Tag': 'noindex' } } as never,
		'/*/feedback/**': { headers: { 'X-Robots-Tag': 'noindex' } } as never,
		'/privacy': { prerender: true },
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
		runtimeConfig: { public: { bookUrl: '' } },
		// Nitro supports `proxy`; Nuxt's RouteRules type omits it.
		routeRules: { '/api/**': { proxy: 'http://127.0.0.1:3001/**' } as never },
	},
	app: {
		head: {
			htmlAttrs: { lang: 'en' },
			link: [
				{ rel: 'icon', type: 'image/jpeg', href: '/logo.jpg', key: 'favicon' },
				{ rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: '/fonts/cabinet-grotesk-800.woff2' },
				{ rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: '/fonts/satoshi-400.woff2' },
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
	vite: {
		build: {
			target: 'es2022',
		},
	},
	vue: {
		compilerOptions: {
			isCustomElement: (tag) => tag.startsWith('icon-'),
		},
	},
})
