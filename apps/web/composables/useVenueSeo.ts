import { useRoute, useRuntimeConfig, useSeoMeta, useHead, useNuxtApp, createError } from '#app'
import { useVenue } from '@/composables/useVenue'
import { bookingSource } from '@/utils/bookingSource'
import { VENUE_SEO, type VenueSeo } from '@/utils/venueSeo'

const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function useVenueSeo(venue = (useRoute().params.venue as string)) {
  // Nuxt context is lost after the first await in a plain .ts composable: grab everything context-bound first.
  const nuxtApp = useNuxtApp()
  const route = useRoute()
  const { siteUrl, bookUrl: bookBase } = useRuntimeConfig().public
  const { venue: venueData, error: venueError } = await useVenue()
  // Unknown slug -> real 404 (no soft-404 pages); API outage -> 503 so Google retries instead of dropping the page.
  if (!venueData.value) throw createError({ statusCode: venueError.value?.statusCode === 404 ? 404 : 503, statusMessage: 'Venue not found', fatal: true })

  const info = venueData.value
  const hours = info.openingHours ?? {}
  const seo: VenueSeo = VENUE_SEO[venue]
  if (!seo) throw createError({ statusCode: 404, statusMessage: 'Venue not found', fatal: true })

  // (siteUrl, bookBase hoisted above)
  const pageUrl = `${siteUrl}/${venue}`
  const bookUrl = `${bookBase || siteUrl}/${venue}/book`
  const src = bookingSource(route.query.src)
  const bookPath = `${bookBase}/${venue}/book` // relative in dev
  const bookHref = src === 'website' ? bookPath : `${bookPath}?src=${src}` // the booking host is another origin, so the link carries the source
  const name = info?.name ?? 'GIOI'
  const title = seo?.title ?? name
  const description = seo?.description ?? info?.tagline ?? ''
  const image = siteUrl + seo.image.url
  const phoneE164 = info?.phone ? '+' + info.phone.replace(/^0/, '62').replace(/\D/g, '') : ''
  const wa = info ? `https://wa.me/${info.whatsapp.replace(/^0/, '62').replace(/\D/g, '')}` : '#'

  nuxtApp.runWithContext(() => {
  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    ogUrl: pageUrl,
    ogImage: image,
    ogImageAlt: seo.page?.imageAlt ?? seo.title,
    ogSiteName: 'GIOI Group',
    twitterImage: image,
    ogLocale: 'en_US',
    ogImageWidth: seo?.image.width,
    ogImageHeight: seo?.image.height,
    twitterCard: 'summary_large_image',
  })

  useHead({
    link: [{ rel: 'canonical', href: pageUrl }, ...(seo ? [{ rel: 'preload', as: 'image', href: seo.image.url, fetchpriority: 'high' }] : [])],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@id': `${pageUrl}#restaurant`,
          '@type': 'Restaurant',
          name,
          url: pageUrl,
          parentOrganization: { '@type': 'Organization', name: 'GIOI Group', url: siteUrl, logo: `${siteUrl}/logo.jpg`, '@id': `${siteUrl}#organization`, ...(seo ? { sameAs: seo.sameAs } : {}) },
          ...(image ? { image } : {}),
          ...(info?.phone ? { telephone: phoneE164 } : {}),
          address: {
            '@type': 'PostalAddress',
            ...(info?.address ? { streetAddress: info.address.trim() } : {}),
            ...(seo ? { addressLocality: seo.city, addressRegion: seo.region } : {}),
            addressCountry: 'ID',
          },
          ...(seo
            ? {
                geo: { '@type': 'GeoCoordinates', latitude: seo.geo.lat, longitude: seo.geo.lng },
                priceRange: seo.priceRange,
                servesCuisine: seo.cuisine,
                sameAs: seo.sameAs,
                ...(seo.menus ? { hasMenu: seo.menus.map((m) => siteUrl + m.path) } : {}),
              }
            : {}),
          ...(info?.mapsUrl ? { hasMap: info.mapsUrl } : {}),
          acceptsReservations: bookUrl,
          potentialAction: {
            '@type': 'ReserveAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: bookUrl,
              inLanguage: seo.languages ?? 'en',
              actionPlatform: [
                'http://schema.org/DesktopWebPlatform',
                'http://schema.org/MobileWebPlatform',
              ],
            },
          },
          ...(Object.keys(hours).length
            ? {
                openingHoursSpecification: Object.entries(hours)
                  .filter(([, h]) => h != null)
                  .map(([day, h]) => ({
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: `https://schema.org/${dayName[Number(day)]}`,
                    opens: h.open,
                    closes: h.close,
                  })),
                openingHours: Object.entries(hours)
                  .filter(([, h]) => h != null)
                  .map(([day, h]) => `${['Su','Mo','Tu','We','Th','Fr','Sa'][Number(day)]} ${h.open}-${h.close}`),
              }
            : {}),
        }),
      },
    ],
  })
  })

  return { venue, info, hours, seo, name, pageUrl, bookHref, bookPath, phoneE164, wa, src }
}
