// Floor plan & seating routes (docs/floor_plan_seating.md).
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { PrismaClient } from '../../generated/prisma/client'
import { FLOOR_PLAN_DEFAULT_HEIGHT, FLOOR_PLAN_WIDTH, type AdminFloorPlan, type FloorObject, type FloorTable, type PublicFloorPlan } from '@gioi/domain'
import { requireAuth, requireAdmin, requireVenueAccess } from '../../lib/middleware'
import { userRole, type AuthedSession } from '../../lib/auth'
import { forbidden, notFound, unprocessable } from '../../lib/errors'

const IMAGE_MAX_CHARS = 4_000_000 // data URL; Vercel caps request bodies at 4.5 MB
const IMAGE_RE = /^data:image\/(svg\+xml|png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/

type Db = Pick<PrismaClient, 'floorTable' | 'seatingArea'>

const position = {
	x: { type: 'number' },
	y: { type: 'number' },
	rotation: { type: 'integer', minimum: 0, maximum: 359 },
}

/** Seats on the plan per seating area. An area with tables takes this sum as its capacity. */
export async function planSeatsByArea(db: Pick<PrismaClient, 'floorTable'>, venueId: string): Promise<Map<string, number>> {
	const rows = await db.floorTable.groupBy({ by: ['seatingAreaId'], where: { venueId }, _sum: { seats: true } })
	return new Map(rows.map((r) => [r.seatingAreaId, r._sum.seats ?? 0]))
}

/** Seating areas plus `planSeats`: null when the area has no tables (capacity stays manual). */
export async function areasWithPlanSeats(db: Db, venueId: string) {
	const [areas, seats] = await Promise.all([
		db.seatingArea.findMany({ where: { venueId }, orderBy: { name: 'asc' } }),
		planSeatsByArea(db, venueId),
	])
	return areas.map((a) => ({ ...a, planSeats: seats.get(a.id) ?? null }))
}

// The seating layout is the venue's own setting: only that venue's admins edit it (super admin is NOT exempt).
function requireVenueAdmin(session: AuthedSession, venueId: string): void {
	if (userRole(session, venueId) !== 'admin') throw forbidden('venue admin required')
}

export function registerFloorPlanRoutes(app: FastifyInstance, prisma: PrismaClient): void {
	async function loadPlan(venueId: string): Promise<PublicFloorPlan> {
		const [plan, areas, tables, objects] = await Promise.all([
			prisma.floorPlan.findUnique({ where: { venueId } }),
			prisma.seatingArea.findMany({ where: { venueId }, orderBy: { name: 'asc' }, select: { id: true, name: true, bookable: true } }),
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
					required: ['tables', 'objects'],
					properties: {
						tables: {
							type: 'array',
							maxItems: 500,
							items: {
								type: 'object',
								required: ['seatingAreaId', 'seats', 'x', 'y', 'rotation'],
								properties: {
									seatingAreaId: { type: 'string', format: 'uuid' },
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
		async (request: FastifyRequest<{ Params: { id: string }; Body: { tables: FloorTable[]; objects: FloorObject[] } }>) => {
			const session = await requireAuth(prisma, request.cookies as Record<string, string>)
			const venueId = request.params.id
			requireVenueAccess(session, venueId)
			requireVenueAdmin(session, venueId)
			const { tables, objects } = request.body

			const [plan, areas] = await Promise.all([
				prisma.floorPlan.findUnique({ where: { venueId }, select: { width: true, height: true } }),
				prisma.seatingArea.findMany({ where: { venueId }, select: { id: true } }),
			])
			const w = plan?.width ?? FLOOR_PLAN_WIDTH
			const h = plan?.height ?? FLOOR_PLAN_DEFAULT_HEIGHT
			if ([...tables, ...objects].some((i) => i.x < 0 || i.y < 0 || i.x > w || i.y > h)) {
				throw unprocessable('item is outside the floor plan')
			}
			const areaIds = new Set(areas.map((a) => a.id))
			if (tables.some((t) => !areaIds.has(t.seatingAreaId))) throw unprocessable('unknown seating area')

			await prisma.$transaction(async (tx) => {
				// ponytail: replace-all keeps saves simple; switch to per-id upsert once reservations reference tables.
				await tx.floorTable.deleteMany({ where: { venueId } })
				await tx.floorObject.deleteMany({ where: { venueId } })
				await tx.floorTable.createMany({
					data: tables.map((t) => ({ venueId, seatingAreaId: t.seatingAreaId, seats: t.seats, x: t.x, y: t.y, rotation: t.rotation })),
				})
				await tx.floorObject.createMany({
					data: objects.map((o) => ({ venueId, label: o.label, width: o.width, height: o.height, color: o.color, x: o.x, y: o.y, rotation: o.rotation })),
				})

				// Capacity is what the booking engine checks; areas with tables follow their seat count.
				// The row update takes the same lock booking transactions take (SELECT … FOR UPDATE).
				const before = new Map((await tx.seatingArea.findMany({ where: { venueId }, select: { id: true, capacity: true } })).map((a) => [a.id, a.capacity]))
				const capacity: Record<string, { from: number | undefined; to: number }> = {}
				for (const [areaId, seats] of await planSeatsByArea(tx, venueId)) {
					if (before.get(areaId) === seats) continue
					await tx.seatingArea.update({ where: { id: areaId }, data: { capacity: seats } })
					capacity[areaId] = { from: before.get(areaId), to: seats }
				}

				await tx.auditEvent.create({
					data: {
						venueId,
						actorType: 'user',
						actorUserId: session.user.id,
						action: 'floor_plan.updated',
						entityType: 'seating_area',
						entityId: venueId,
						changes: { tables: tables.length, objects: objects.length, capacity },
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
