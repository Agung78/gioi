// Nuxt hardcodes `x-powered-by: Nuxt` (no config switch); strip it. Header only, no SEO effect.
export default defineNitroPlugin((nitro) => {
	nitro.hooks.hook('render:response', (response) => {
		delete response.headers['x-powered-by']
	})
})
