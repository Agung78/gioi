// Editorial SEO data that has no DB column yet. Add one entry per venue; unknown slugs fall back to DB-only metadata.
// ponytail: static map, move to Venue columns when venues are managed from admin.
export interface VenueSeo {
  title: string
  description: string
  city: string
  region: string
  image: { url: string; width: number; height: number }
  geo: { lat: number; lng: number }
  priceRange: string
  cuisine: string[]
  sameAs: string[]
  menus?: { label: string; path: string }[]
}

export const VENUE_SEO: Record<string, VenueSeo> = {
  bali: {
    title: 'GIOI Ocean Gourmet Bali | Beachfront Seafood in Kuta',
    description: 'Beachfront seafood and modern Asian dining at Discovery Mall, Kuta Beach, Bali. Reserve a table online at GIOI Ocean Gourmet.',
    city: 'Kuta',
    region: 'Bali',
    image: { url: '/images/venues/bali/outlet-06.webp', width: 1600, height: 900 },
    geo: { lat: -8.7283604, lng: 115.1668197 },
    priceRange: 'IDR 250,000 - 300,000',
    cuisine: ['Seafood', 'Asian'],
    sameAs: ['https://www.instagram.com/gioioceangourmet/'],
    menus: [
      { label: 'Menu (PDF)', path: '/menus/bali-menu.pdf' },
      { label: 'Drinks menu (PDF)', path: '/menus/bali-alcohol-menu.pdf' },
    ],
  },
}
