// Usage: DATABASE_URL=<neon> [ADMIN_PASSWORD=<pw>] [ADMIN_LOGIN=admin] [VENUE_SLUG=bali] [VENUE_NAME="..."] tsx prisma/create-super-admin.ts
// Creates a placeholder venue (only if the slug is missing) and links the admin to it. Edit venue details in Settings.
// With ADMIN_PASSWORD it also creates/resets the super admin; without it the admin must already exist and keeps its password.
import { hash } from '@node-rs/argon2'
import { prisma } from '../src/db'

const login = (process.env.ADMIN_LOGIN ?? 'admin').toLowerCase()
const password = process.env.ADMIN_PASSWORD
if (password !== undefined && password.length < 12) throw new Error('ADMIN_PASSWORD must be >=12 chars')
const slug = process.env.VENUE_SLUG ?? 'bali'
const venueName = process.env.VENUE_NAME ?? 'GIOI Ocean Gourmet'

const venue = await prisma.venue.upsert({
	where: { slug },
	update: {},
	create: {
		slug,
		name: venueName,
		timeZone: 'Asia/Makassar',
		tagline: '',
		intro: '',
		address: '',
		phone: '',
		whatsapp: '',
		email: '',
		mapsUrl: '',
		cancellationPolicy: '',
		feedbackMessageTemplate: "Hi {{guestName}}, thank you for dining with us at {{restaurantName}}. We'd love to hear about your experience: {{feedbackUrl}}",
	},
})

const user = password
	? await prisma.user.upsert({
			where: { login },
			update: { passwordHash: await hash(password), isSuperAdmin: true, active: true },
			create: { login, name: 'Super Admin', passwordHash: await hash(password), isSuperAdmin: true, active: true },
		})
	: await prisma.user.findUnique({ where: { login } })
if (!user) throw new Error(`user "${login}" not found; pass ADMIN_PASSWORD to create it`)
await prisma.userVenue.upsert({
	where: { userId_venueId: { userId: user.id, venueId: venue.id } },
	update: {},
	create: { userId: user.id, venueId: venue.id, role: 'admin' },
})
console.log(`super admin ready: ${user.login}, venue: ${venue.slug}`)
process.exit(0)
