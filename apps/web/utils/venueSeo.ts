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
  reviewUrl?: string // Google "write a review" link, offered to every guest after feedback (no gating by rating: Google policy)
  tzLabel: string
  // default [venue] template only; custom-designed venue pages omit it
  page?: {
    badge: string
    heroLines: [string, string, string]
    intro: string
    imageAlt: string
    experienceTitle: string
    scenes: { time: string; title: string; copy: string; img: string; alt: string; feature?: boolean }[]
    about: string[]
    signaturesTitle: string
    signaturesNote: string
    signatures: { name: string; price: string; copy: string; img: string; alt: string }[]
    faqs: { q: string; a: string }[]
    visitTitle: string
    ctaTitle: string
    ctaNote: string
  }
}

export const VENUE_SEO: Record<string, VenueSeo> = {
  bali: {
    title: 'GIOI Ocean Gourmet Bali | Beachfront Seafood in Kuta',
    description: 'Beachfront seafood restaurant at Discovery Mall Bali, Kuta Beach. See the menu, enjoy sunset dining and reserve a table online.',
    city: 'Kuta',
    region: 'Bali',
    image: { url: '/images/venues/bali/outlet-06.webp', width: 1600, height: 1600, og: { url: '/images/venues/bali/outlet-06-og.jpg', width: 1200, height: 630 } },
    geo: { lat: -8.7283604, lng: 115.1668197 },
    priceRange: 'IDR 250,000 - 300,000',
    cuisine: ['Seafood', 'Asian', 'Indonesian'],
    sameAs: [
      'https://www.instagram.com/gioioceangourmet/',
      'https://maps.google.com/?cid=3840486500794243861',
      'https://www.tripadvisor.com/Restaurant_Review-g297697-d27093249-Reviews-Gioi_Ocean_Gourmet-Kuta_Kuta_District_Badung_Regency_Bali.html',
    ],
    reviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJraC4OABH0i0RFRuG7B8mTDU',
    menus: [
      { label: 'Food and Beverage Menu', path: '/menus/bali-menu.pdf' },
      { label: 'Alcohol Menu', path: '/menus/bali-alcohol-menu.pdf' },
    ],
    tzLabel: 'WITA',
    page: {
      badge: 'Beachfront dining in Kuta',
      heroLines: ['Fresh from', 'the coast.', 'Made for sunset.'],
      intro: 'A beachfront restaurant for seafood, modern Asian flavours and long afternoons beside Kuta Beach.',
      imageAlt: 'GIOI Ocean Gourmet beachfront dining area in Kuta, Bali',
      experienceTitle: 'Come for the view. Stay for the flavour.',
      scenes: [
        { time: '10 AM', title: 'Breakfast', copy: 'Fresh coffee, delicious breakfast, and ocean breeze to start your day right. Your perfect morning escape awaits at GIOI.', img: '/images/venues/bali/outlet-02.webp', alt: 'Morning coffee and fruit overlooking Kuta Beach at GIOI Ocean Gourmet' },
        { time: 'Sunset', title: 'Golden Hour', copy: 'Golden skies, chilled beers, and signature cocktails by the sea. Catch the sunset, sip, and let the good times roll.', img: '/images/venues/bali/outlet-07.webp', alt: 'Beachfront tables facing the sunset at GIOI Ocean Gourmet, Kuta', feature: true },
        { time: 'Dinner', title: 'Evening Experience', copy: 'Warm ambience, indulgent seafood platters, and perfectly juicy steaks. Make tonight a little more special at GIOI.', img: '/images/venues/bali/outlet-05.webp', alt: 'Evening dinner setting at GIOI Ocean Gourmet, Kuta Beach' },
      ],
      about: [
        'GIOI Ocean Gourmet is the Bali outlet of GIOI Group, which has served Jakarta since 2016. It sits on the ground floor of Discovery Mall Bali, on the beach side of Jl. Kartika Plaza in Kuta, with views over Kuta Beach and the sunset.',
        'The menu mixes fresh seafood with Thai, Japanese, Balinese and Indonesian dishes, from all-day brunch and small plates to sharing platters, grilled prawns and steaks. Menu prices are in thousand rupiah and are subject to service charge and government tax.',
      ],
      signaturesTitle: 'Signature dishes',
      signaturesNote: 'Prices come from the current menu, before service charge and tax, and may change.',
      signatures: [
        { name: 'OG Seafood Platter', price: 'IDR 455,000', copy: 'Grilled seasonal fresh fish and seafood with grilled corn and three kinds of sambal, made for sharing.', img: '/images/venues/bali/dish-og-seafood-platter.webp', pos: 84, alt: 'OG Seafood Platter with grilled prawns, corn and sambal at GIOI Ocean Gourmet Bali' },
        { name: 'Salmon Lodeh', price: 'IDR 200,000', copy: "Crispy-skin salmon served with GIOI's creamy twist on the traditional lodeh.", img: '/images/venues/bali/dish-salmon-lodeh.webp', pos: 51, alt: 'Crispy-skin salmon in lodeh curry at GIOI Ocean Gourmet Bali' },
        { name: 'Jimbaran King Prawn', price: 'IDR 185,000', copy: 'Balinese-style grilled king prawn brushed with Jimbaran sauce, with plecing kangkung.', img: '/images/venues/bali/dish-jimbaran-king-prawn.webp', pos: 54, alt: 'Grilled Jimbaran king prawn with rice and plecing kangkung at GIOI Ocean Gourmet Bali' },
        { name: 'Crispy Duck', price: 'IDR 190,000 (half)', copy: "Marinated crispy duck served with GIOI's rice and jukut kalasan.", img: '/images/venues/bali/dish-crispy-duck.webp', pos: 82, alt: 'Crispy duck on banana leaf with sambal at GIOI Ocean Gourmet Bali' },
      ],
      faqs: [
        { q: 'What are your opening hours?', a: 'We serve breakfast from 10 AM and are open through dinner. See the hours block on this page for daily open and close times.' },
        { q: 'Where are you located?', a: 'GIOI Ocean Gourmet is beachfront at Discovery Mall, Kuta Beach, Bali.' },
        { q: 'Can I reserve a table online?', a: 'Yes. Use the Reserve a table button to book online for your chosen date and party size.' },
        { q: 'Are menus available as PDF?', a: 'Yes. Food & beverage and alcohol menus are available as downloadable PDFs from the Visit section.' },
        { q: 'What food do you serve?', a: 'Fresh seafood and grilled dishes alongside Thai, Japanese, Balinese and Indonesian plates, plus all-day brunch and cocktails.' },
        { q: 'What are your signature dishes?', a: 'The OG Seafood Platter, Salmon Lodeh, Jimbaran King Prawn and Crispy Duck. See the menu for current prices.' },
        { q: 'Does the menu contain pork, and are there vegetarian options?', a: 'The menu includes dishes made with pork, and alcohol is served. Pork, seafood and plant-based dishes are marked on the menu; ask the team if you need options.' },
      ],
      visitTitle: 'On the beach at Discovery Mall.',
      ctaTitle: 'Make sunset your reservation.',
      ctaNote: 'For sunset seating, booking ahead is recommended.',
    },
  },
}
