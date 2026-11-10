// Editorial SEO data that has no DB column yet. Add one entry per venue; unknown slugs fall back to DB-only metadata.
// ponytail: static map, move to Venue columns when venues are managed from admin.
export interface VenueSeo {
  title: string
  description: string
  city: string
  region: string
  image: { url: string; width: number; height: number; og?: { url: string; width: number; height: number } } // og: 1.91:1 share card
  geo: { lat: number; lng: number }
  priceRange: string
  cuisine: string[]
  sameAs: string[]
  menus?: { label: string; path: string }[]
  tzLabel: string
  languages?: string[] // bilingual copy only; defaults to en
  // default [venue] template only; custom-designed venue pages omit it
  page?: {
    badge: string
    heroLines: [string, string, string]
    intro: string
    imageAlt: string
    experienceTitle: string
    scenes: { time: string; title: string; copy: string; img: string; alt: string; feature?: boolean }[]
    visitTitle: string
    ctaTitle: string
    ctaNote: string
  }
}

export const VENUE_SEO: Record<string, VenueSeo> = {
  bali: {
    title: 'GIOI Ocean Gourmet Bali | Seafood & Reservasi Meja di Kuta',
    description: 'Beachfront seafood and modern Asian dining at Discovery Mall, Kuta Beach, Bali. Reserve a table online. Reservasi meja online di GIOI Ocean Gourmet, restoran seafood tepi pantai Kuta.',
    city: 'Kuta',
    region: 'Bali',
    image: { url: '/images/venues/bali/outlet-06.webp', width: 1600, height: 1600, og: { url: '/images/venues/bali/outlet-06-og.jpg', width: 1200, height: 630 } },
    geo: { lat: -8.7283604, lng: 115.1668197 },
    priceRange: 'IDR 250,000 - 300,000',
    cuisine: ['Seafood', 'Asian'],
    sameAs: ['https://www.instagram.com/gioioceangourmet/'],
    menus: [
      { label: 'Food and Beverage Menu', path: '/menus/bali-menu.pdf' },
      { label: 'Alcohol Menu', path: '/menus/bali-alcohol-menu.pdf' },
    ],
    tzLabel: 'WITA',
    languages: ['en', 'id'],
    page: {
      badge: 'Beachfront dining in Kuta',
      heroLines: ['Fresh from', 'the coast.', 'Made for sunset.'],
      intro: 'A beachfront restaurant for seafood, modern Asian flavours and long afternoons beside Kuta Beach.',
      imageAlt: 'GIOI Ocean Gourmet beachfront dining area in Kuta, Bali',
      experienceTitle: 'Come for the view. Stay for the flavour.',
      scenes: [
        { time: '10 AM', title: '10 AM — Breakfast', copy: 'Fresh coffee, delicious breakfast, and ocean breeze to start your day right. Your perfect morning escape awaits at GIOI.', img: '/images/venues/bali/outlet-02.webp', alt: 'Morning coffee and fruit overlooking Kuta Beach at GIOI Ocean Gourmet' },
        { time: 'Sunset', title: 'SUNSET — Golden Hour', copy: 'Golden skies, chilled beers, and signature cocktails by the sea. Catch the sunset, sip, and let the good times roll.', img: '/images/venues/bali/outlet-07.webp', alt: 'Beachfront tables facing the sunset at GIOI Ocean Gourmet, Kuta', feature: true },
        { time: 'Dinner', title: 'DINNER — Evening Experience', copy: 'Warm ambience, indulgent seafood platters, and perfectly juicy steaks. Make tonight a little more special at GIOI.', img: '/images/venues/bali/outlet-05.webp', alt: 'Evening dinner setting at GIOI Ocean Gourmet, Kuta Beach' },
      ],
      visitTitle: 'On the beach at Discovery Mall.',
      ctaTitle: 'Make sunset your reservation.',
      ctaNote: 'For sunset seating, booking ahead is recommended. Reservasi online gratis, disarankan booking lebih awal untuk sunset.',
    },
  },
}
