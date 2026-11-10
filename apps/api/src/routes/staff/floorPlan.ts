// Floor plan & seating routes (docs/floor_plan_seating.md).
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { PrismaClient } from '../../generated/prisma/client'
import { FLOOR_PLAN_DEFAULT_HEIGHT, FLOOR_PLAN_WIDTH, type AdminFloorPlan, type FloorObject, type FloorTable, type PublicFloorPlan } from '@gioi/domain'
import { requireAuth, requireAdmin, requireVenueAccess } from '../../lib/middleware'
import { userRole, type AuthedSession } from '../../lib/auth'
import { conflict, forbidden, notFound, unprocessable } from '../../lib/errors'

const IMAGE_MAX_CHARS = 4_000_000 // data URL; Vercel caps request bodies at 4.5 MB
const IMAGE_RE = /^data:image\/(svg\+xml|png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/

type LayoutArea = { id: string; name: string; bookable: boolean; minParty?: number | null; maxParty?: number | null }

const position = {
	x: { type: 'number' },
	y: { type: 'number' },
	rotation: { type: 'integer', minimum: 0, maximum: 359 },
}

// The seating layout is the venue's own setting: only that venue's admins edit it (super admin is NOT exempt).
function requireVenueAdmin(session: AuthedSession, venueId: string): void {
	if (userRole(session, venueId) !== 'admin') throw forbidden('venue admin required')
}

export function registerFloorPlanRoutes(app: FastifyInstance, prisma: PrismaClient): void {
	async function loadPlan(venueId: string): Promise<PublicFloorPlan> {
		const [plan, areas, tables, objects] = await Promise.all([
			prisma.floorPlan.findUnique({ where: { venueId } }),
			prisma.seatingArea.findMany({ where: { venueId }, orderBy: { name: 'asc' }, select: { id: true, name: true, bookable: true, minParty: true, maxParty: true } }),
			prisma.floorTable.findMany({
				where: { venueId },
				orderBy: { id: 'asc' },
				select: { id: true, seatingAreaId: true, seats: true, x: true, y: true, rotation: true },
			}),
			prisma.floorObject.findMany({
				where: { venueId },
				orderBy: { id: 'asc' },
				select: { id: true, label: true, width: true, height: true, color: true, x: true, y: true, rotation: true },
			}),
		])
		return {
			width: plan?.width ?? FLOOR_PLAN_WIDTH,
			height: plan?.height ?? FLOOR_PLAN_DEFAULT_HEIGHT,
			image: plan?.image ?? null,
			areas,
			tables,
			objects,
		}
	}
	const loadAdminPlan = async (session: AuthedSession, venueId: string): Promise<AdminFloorPlan> =>
		({ ...(await loadPlan(venueId)), canEdit: userRole(session, venueId) === 'admin' })

	app.get('/admin/venues/:id/floor-plan', async (request: FastifyRequest<{ Params: { id: string } }>) => {
		const session = await requireAuth(prisma, request.cookies as Record<string, string>)
		requireVenueAccess(session, request.params.id)
		requireAdmin(session, request.params.id)
		return loadAdminPlan(session, request.params.id)
	})

	app.put(
		'/admin/venues/:id/floor-plan/layout',
		{
			schema: {
				body: {
					type: 'object',
					required: ['areas', 'tables', 'objects'],
					properties: {
						areas: {
							type: 'array',
							maxItems: 50,
							items: {
								type: 'object',
								required: ['id', 'name', 'bookable'],
								properties: {
									id: { type: 'string', format: 'uuid' }, // client-made for new areas
									name: { type: 'string', maxLength: 80 },
									bookable: { type: 'boolean' },
									minParty: { type: ['integer', 'null'], minimum: 1 },
									maxParty: { type: ['integer', 'null'], minimum: 1 },
								},
							},
						},
						tables: {
							type: 'array',
							maxItems: 500,
							items: {
								type: 'object',
								required: ['seatingAreaId', 'seats', 'x', 'y', 'rotation'],
								properties: {
									seatingAreaId: { type: 'string', format: 'uuid' },
									id: { type: 'string', format: 'uuid' },
									seats: { type: 'integer', minimum: 1, maximum: 16 },
									...position,
								},
							},
						},
						objects: {
							type: 'array',
							maxItems: 200,
							items: {
								type: 'object',
								required: ['label', 'width', 'height', 'color', 'x', 'y', 'rotation'],
								properties: {
									label: { type: 'string', maxLength: 24 },
									width: { type: 'integer', minimum: 20, maximum: 600 },
									height: { type: 'integer', minimum: 20, maximum: 600 },
									color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
									...position,
								},
							},
						},
					},
				},
			},
		},
		async (request: FastifyRequest<{ Params: { id: string }; Body: { areas: LayoutArea[]; tables: FloorTable[]; objects: FloorObject[] } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const venueId = request.params.id
			requireVenueAccess(session, venueId)
			requireVenueAdmin(session, venueId)
			const { areas, tables, objects } = request.body

			const plan = await prisma.floorPlan.findUnique({ where: { venueId }, select: { width: true, height: true } })
			const w = plan?.width ?? FLOOR_PLAN_WIDTH
			const h = plan?.height ?? FLOOR_PLAN_DEFAULT_HEIGHT
			if ([...tables, ...objects].some((i) => i.x < 0 || i.y < 0 || i.x > w || i.y > h)) {
				throw unprocessable('item is outside the floor plan')
			}
			const names = areas.map((a) => a.name.trim().toLowerCase())
			if (names.some((n) => !n)) throw unprocessable('area name is required')
			if (new Set(names).size !== names.length) throw unprocessable('area names must be unique')
			if (areas.some((a) => a.minParty != null && a.maxParty != null && a.minParty > a.maxParty)) {
				throw unprocessable('minParty must not exceed maxParty')
			}
			const areaIds = new Set(areas.map((a) => a.id))
			if (tables.some((t) => !areaIds.has(t.seatingAreaId))) throw unprocessable('unknown seating area')
			// A client-made id must not already belong to another venue.
			const taken = await prisma.seatingArea.findFirst({ where: { id: { in: [...areaIds] }, NOT: { venueId } }, select: { id: true } })
			if (taken) throw unprocessable('unknown seating area')

			// Capacity is what the booking engine checks: every area's capacity is its seat count (0 with no tables).
			const seats = new Map<string, number>()
			for (const t of tables) seats.set(t.seatingAreaId, (seats.get(t.seatingAreaId) ?? 0) + t.seats)

			await prisma.$transaction(async (tx) => {
				const current = await tx.seatingArea.findMany({ where: { venueId }, select: { id: true, name: true, capacity: true } })
				const gone = current.filter((a) => !areaIds.has(a.id))
				if (gone.length) {
					const used = await tx.reservation.findFirst({ where: { venueId, seatingAreaId: { in: gone.map((a) => a.id) } }, select: { seatingAreaId: true } })
					if (used) throw conflict(`${gone.find((a) => a.id === used.seatingAreaId)?.name} has reservations and cannot be deleted`)
				}
				// Tables are upserted by id so reservations keep their table; unsent tables are deleted (reservations fall back to no table).
				await tx.floorTable.deleteMany({ where: { venueId, id: { notIn: tables.flatMap((t) => t.id ?? []) } } })
				await tx.floorObject.deleteMany({ where: { venueId } })
				await tx.seatingArea.deleteMany({ where: { venueId, id: { in: gone.map((a) => a.id) } } })

				// The row update takes the same lock booking transactions take (SELECT … FOR UPDATE).
				const before = new Map(current.map((a) => [a.id, a.capacity]))
				const capacity: Record<string, { from: number | undefined; to: number }> = {}
				for (const a of areas) {
					const data = { name: a.name.trim(), bookable: a.bookable, minParty: a.minParty ?? null, maxParty: a.maxParty ?? null, capacity: seats.get(a.id) ?? 0 }
					if (before.has(a.id)) await tx.seatingArea.update({ where: { id: a.id }, data })
					else await tx.seatingArea.create({ data: { id: a.id, venueId, ...data } })
					if (before.get(a.id) !== data.capacity) capacity[a.id] = { from: before.get(a.id), to: data.capacity }
				}

				const known = new Set((await tx.floorTable.findMany({ where: { venueId }, select: { id: true } })).map((t) => t.id))
				const fresh: typeof tables = []
				for (const t of tables) {
					const data = { seatingAreaId: t.seatingAreaId, seats: t.seats, x: t.x, y: t.y, rotation: t.rotation }
					if (!t.id) fresh.push(t)
					else if (known.has(t.id)) await tx.floorTable.update({ where: { id: t.id }, data })
					else throw unprocessable('unknown table')
				}
				await tx.floorTable.createMany({
					data: fresh.map((t) => ({ venueId, seatingAreaId: t.seatingAreaId, seats: t.seats, x: t.x, y: t.y, rotation: t.rotation })),
				})
				await tx.floorObject.createMany({
					data: objects.map((o) => ({ venueId, label: o.label, width: o.width, height: o.height, color: o.color, x: o.x, y: o.y, rotation: o.rotation })),
				})

				await tx.auditEvent.create({
					data: {
						venueId,
						actorType: 'user',
						actorUserId: session.user.id,
						action: 'floor_plan.updated',
						entityType: 'seating_area',
						entityId: venueId,
						changes: { tables: tables.length, objects: objects.length, capacity, areasDeleted: gone.map((a) => a.name) },
					},
				})
			})
			return loadAdminPlan(session, venueId)
		},
	)

	app.put(
		'/admin/venues/:id/floor-plan/image',
		{
			bodyLimit: 4_500_000,
			schema: {
				body: {
					type: 'object',
					required: ['image'],
					properties: {
						image: { type: ['string', 'null'] },
						width: { type: 'number', exclusiveMinimum: 0 }, // drawing's natural size, for the aspect ratio
						height: { type: 'number', exclusiveMinimum: 0 },
					},
				},
			},
		},
		async (request: FastifyRequest<{ Params: { id: string }; Body: { image: string | null; width?: number; height?: number } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			if (!session.user.isSuperAdmin) throw forbidden('super admin required')
			const venueId = request.params.id
			if (!(await prisma.venue.findUnique({ where: { id: venueId }, select: { id: true } }))) throw notFound('venue not found')

			const { image, width, height } = request.body
			let planHeight: number | undefined // undefined: keep the current plan size (removing the drawing)
			if (image !== null) {
				if (image.length > IMAGE_MAX_CHARS || !IMAGE_RE.test(image)) {
					throw unprocessable('drawing must be an SVG, PNG, JPEG or WebP under 3 MB')
				}
				if (!width || !height) throw unprocessable('width and height are required with an image')
				planHeight = Math.min(4000, Math.max(100, Math.round((FLOOR_PLAN_WIDTH * height) / width)))
			}

			await prisma.$transaction(async (tx) => {
				await tx.floorPlan.upsert({
					where: { venueId },
					create: { venueId, image, width: FLOOR_PLAN_WIDTH, height: planHeight ?? FLOOR_PLAN_DEFAULT_HEIGHT },
					update: { image, ...(planHeight ? { height: planHeight } : {}) },
				})
				await tx.auditEvent.create({
					data: {
						venueId,
						actorType: 'user',
						actorUserId: session.user.id,
						action: image ? 'floor_plan.image_uploaded' : 'floor_plan.image_removed',
						entityType: 'settings',
						entityId: venueId,
					},
				})
			})
			return loadAdminPlan(session, venueId)
		},
	)

	// ---- Public: read-only map for the booking page ----------------------------
	app.get('/public/venues/:slug/floor-plan', async (request: FastifyRequest<{ Params: { slug: string } }>) => {
		const venue = await prisma.venue.findUnique({ where: { slug: request.params.slug }, select: { id: true } })
		if (!venue) throw notFound('venue not found')
		return loadPlan(venue.id)
	})
}
