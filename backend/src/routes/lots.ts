import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { RedisService } from '../services/redisService';
import { requireAuth, requireRole, AuthRequest } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';
import { Role } from '@prisma/client';

const router = Router();

// Validation Schemas
const createLotSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  address: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2),
  zipCode: z.string().min(4),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  totalSpots: z.number().int().positive(),
  pricePerHour: z.number().positive(),
  amenities: z.array(z.string()).optional(),
  imageUrls: z.array(z.string()).optional(),
});

const updateLotSchema = createLotSchema.partial();

/**
 * Calculates dynamic surge pricing for a lot in the next 2 hours
 */
export async function getLotPricing(lotId: string, basePrice: number) {
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  // 1. Get all active spots in this lot
  const totalActiveSpots = await prisma.parkingSpot.count({
    where: { lotId, isActive: true },
  });

  if (totalActiveSpots === 0) {
    return { pricePerHour: basePrice, isSurge: false, occupancy: 0 };
  }

  // 2. Get reservations overlapping the next 2 hours
  const activeReservationsCount = await prisma.reservation.count({
    where: {
      lotId,
      status: { in: ['CONFIRMED', 'ACTIVE'] },
      startTime: { lt: twoHoursLater },
      endTime: { gt: now },
    },
  });

  const occupancy = activeReservationsCount / totalActiveSpots;
  const isSurge = occupancy > 0.8;
  const pricePerHour = isSurge ? Number((basePrice * 1.2).toFixed(2)) : basePrice;

  return {
    pricePerHour,
    isSurge,
    occupancy
  };
}

// GET / - List all lots (with search filters)
router.get('/', async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius,
      city,
      state,
      minPrice,
      maxPrice,
      amenities,
      page,
      limit,
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;

    let lotIdsFromGeospatial: string[] = [];
    const distancesMap = new Map<string, number>();

    // 1. If lat/lng provided, run raw Haversine SQL to find nearby lots
    if (lat && lng) {
      const latVal = parseFloat(lat as string);
      const lngVal = parseFloat(lng as string);
      const radVal = parseFloat(radius as string) || 10.0; // default 10km

      // Run raw PostgreSQL geospatial query using Haversine formula
      const nearbyLots: any[] = await prisma.$queryRaw`
        SELECT id, (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians(${latVal})) * cos(radians(latitude::double precision)) * cos(radians(longitude::double precision) - radians(${lngVal})) +
              sin(radians(${latVal})) * sin(radians(latitude::double precision))
            ))
          )
        ) AS distance
        FROM "ParkingLot"
        WHERE "isActive" = true
      `;

      const filteredLots = nearbyLots
        .map((l) => ({ ...l, distance: Number(l.distance) }))
        .filter((l) => !isNaN(l.distance) && l.distance < radVal)
        .sort((a, b) => a.distance - b.distance);

      lotIdsFromGeospatial = filteredLots.map((l) => l.id);
      filteredLots.forEach((l) => distancesMap.set(l.id, l.distance));

      // Dynamic parking lot generator fallback: if no parking lots are found within 3km of the queried coordinates,
      // dynamically seed 3 parking lots near the query location in the database!
      if (filteredLots.filter(l => l.distance < 3.0).length === 0) {
        const owner = await prisma.user.findFirst({
          where: { role: 'OWNER' },
        });
        const ownerId = owner?.id;

        if (ownerId) {
          const fallbackAddress = (req.query.address as string) || 'Nearby Area';
          const dynamicLots = [
            {
              name: `${fallbackAddress} East Parking`,
              description: `Convenient parking lot located East of ${fallbackAddress}. Secure and monitored.`,
              address: `${fallbackAddress} East`,
              city: 'Dynamic City',
              state: 'TN',
              zipCode: '600001',
              latitude: latVal + 0.003,
              longitude: lngVal + 0.003,
              totalSpots: 15,
              pricePerHour: 25.00,
              amenities: ['CCTV', 'COVERED'],
              imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
            },
            {
              name: `${fallbackAddress} Central Plaza`,
              description: `Premium multi-story parking near the center of ${fallbackAddress} with EV charging.`,
              address: `${fallbackAddress} Center`,
              city: 'Dynamic City',
              state: 'TN',
              zipCode: '600001',
              latitude: latVal - 0.002,
              longitude: lngVal + 0.002,
              totalSpots: 20,
              pricePerHour: 35.00,
              amenities: ['CCTV', 'EV_CHARGING', 'COVERED', 'HANDICAP_ACCESS'],
              imageUrls: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600'],
            },
            {
              name: `${fallbackAddress} West Lot`,
              description: `Spacious outdoor parking lot West of ${fallbackAddress} with handicap access.`,
              address: `${fallbackAddress} West`,
              city: 'Dynamic City',
              state: 'TN',
              zipCode: '600001',
              latitude: latVal - 0.004,
              longitude: lngVal - 0.004,
              totalSpots: 10,
              pricePerHour: 20.00,
              amenities: ['CCTV', 'HANDICAP_ACCESS'],
              imageUrls: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'],
            },
          ];

          for (const dl of dynamicLots) {
            const createdLot = await prisma.parkingLot.create({
              data: {
                ownerId,
                name: dl.name,
                description: dl.description,
                address: dl.address,
                city: dl.city,
                state: dl.state,
                zipCode: dl.zipCode,
                latitude: dl.latitude,
                longitude: dl.longitude,
                totalSpots: dl.totalSpots,
                pricePerHour: dl.pricePerHour,
                amenities: dl.amenities,
                imageUrls: dl.imageUrls,
                isActive: true,
              },
            });

            // Create spots
            const spotTypes = ['STANDARD', 'COMPACT', 'LARGE', 'HANDICAP', 'EV'];
            for (let i = 0; i < dl.totalSpots; i++) {
              await prisma.parkingSpot.create({
                data: {
                  lotId: createdLot.id,
                  spotNumber: `${String.fromCharCode(65 + Math.floor(i / 10))}-${(i % 10) + 1}`,
                  type: (i === dl.totalSpots - 1 && dl.amenities.includes('EV_CHARGING')) ? 'EV' : (spotTypes[i % spotTypes.length] as any),
                  floor: 1,
                  isActive: true,
                },
              });
            }
          }

          // Re-query the raw SQL
          const reQueriedLots: any[] = await prisma.$queryRaw`
            SELECT id, (
              6371 * acos(
                LEAST(1.0, GREATEST(-1.0,
                  cos(radians(${latVal})) * cos(radians(latitude::double precision)) * cos(radians(longitude::double precision) - radians(${lngVal})) +
                  sin(radians(${latVal})) * sin(radians(latitude::double precision))
                ))
              )
            ) AS distance
            FROM "ParkingLot"
            WHERE "isActive" = true
          `;

          const refiltered = reQueriedLots
            .map((l) => ({ ...l, distance: Number(l.distance) }))
            .filter((l) => !isNaN(l.distance) && l.distance < radVal)
            .sort((a, b) => a.distance - b.distance);

          lotIdsFromGeospatial = refiltered.map((l) => l.id);
          refiltered.forEach((l) => distancesMap.set(l.id, l.distance));
        }
      }
    }

    // 2. Build where filter for Prisma
    const where: Prisma.ParkingLotWhereInput = {
      isActive: true,
    };

    if (lat && lng && lotIdsFromGeospatial.length > 0) {
      where.id = { in: lotIdsFromGeospatial };
    }

    if (city) {
      where.city = { contains: city as string, mode: 'insensitive' };
    }

    if (state) {
      where.state = { contains: state as string, mode: 'insensitive' };
    }

    if (minPrice || maxPrice) {
      where.pricePerHour = {
        ...(minPrice && { gte: parseFloat(minPrice as string) }),
        ...(maxPrice && { lte: parseFloat(maxPrice as string) }),
      };
    }

    if (amenities) {
      const amList = (amenities as string).split(',');
      where.amenities = { hasEvery: amList };
    }

    // 3. Query lots with Prisma
    const lots = await prisma.parkingLot.findMany({
      where,
      skip: offset,
      take: limitNum,
      include: {
        reviews: {
          select: { rating: true },
        },
      },
    });

    const total = await prisma.parkingLot.count({ where });

    // 4. Compute dynamic pricing & ratings, and inject distance
    const processedLots = await Promise.all(
      lots.map(async (lot) => {
        const pricing = await getLotPricing(lot.id, Number(lot.pricePerHour));
        
        const avgRating = lot.reviews.length > 0
          ? lot.reviews.reduce((acc, r) => acc + r.rating, 0) / lot.reviews.length
          : null;

        return {
          ...lot,
          pricePerHour: pricing.pricePerHour,
          isSurge: pricing.isSurge,
          avgRating,
          distance: distancesMap.get(lot.id) !== undefined ? distancesMap.get(lot.id) : null,
        };
      })
    );

    // Sort by distance again if lat/lng were provided
    if (lat && lng) {
      processedLots.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return res.status(200).json({
      lots: processedLots,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('List lots error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /:id - Retrieve detailed lot details
router.get('/:id', async (req, res) => {
  try {
    const lot = await prisma.parkingLot.findUnique({
      where: { id: req.params.id },
      include: {
        spots: {
          where: { isActive: true },
        },
        reviews: {
          include: {
            user: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lot || !lot.isActive) {
      return res.status(404).json({ message: 'Parking lot not found' });
    }

    // Dynamic pricing check
    const pricing = await getLotPricing(lot.id, Number(lot.pricePerHour));

    // Available spot count right now (no active reservation overlapping current hour)
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    const reservedSpotIds = await prisma.reservation.findMany({
      where: {
        lotId: lot.id,
        status: { in: ['CONFIRMED', 'ACTIVE'] },
        startTime: { lt: oneHourLater },
        endTime: { gt: now },
      },
      select: { spotId: true },
    }).then((resList) => resList.map((r) => r.spotId));

    const totalActiveSpots = lot.spots.length;
    const availableSpotsCount = lot.spots.filter((s) => !reservedSpotIds.includes(s.id)).length;

    const avgRating = lot.reviews.length > 0
      ? lot.reviews.reduce((acc, r) => acc + r.rating, 0) / lot.reviews.length
      : null;

    return res.status(200).json({
      ...lot,
      pricePerHour: pricing.pricePerHour,
      isSurge: pricing.isSurge,
      avgRating,
      totalActiveSpots,
      availableSpotsCount,
    });
  } catch (error) {
    console.error('Get lot detail error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST / - Create a new parking lot (Owner/Admin)
router.post('/', requireAuth, requireRole([Role.OWNER, Role.ADMIN]), validateBody(createLotSchema), async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const lot = await prisma.parkingLot.create({
      data: {
        ownerId,
        name: req.body.name,
        description: req.body.description,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        zipCode: req.body.zipCode,
        latitude: new Prisma.Decimal(req.body.latitude),
        longitude: new Prisma.Decimal(req.body.longitude),
        totalSpots: req.body.totalSpots,
        pricePerHour: new Prisma.Decimal(req.body.pricePerHour),
        amenities: req.body.amenities || [],
        imageUrls: req.body.imageUrls || [],
        isActive: true,
      },
    });

    // Automatically create spots in the lot based on totalSpots
    const spotsData = [];
    for (let i = 1; i <= req.body.totalSpots; i++) {
      spotsData.push({
        lotId: lot.id,
        spotNumber: `A-${i}`,
        type: 'STANDARD' as any,
        floor: 1,
        isActive: true,
      });
    }

    await prisma.parkingSpot.createMany({ data: spotsData });

    return res.status(201).json({
      message: 'Parking lot created successfully along with spots.',
      lot,
    });
  } catch (error) {
    console.error('Create lot error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /:id - Update a lot (owner only)
router.put('/:id', requireAuth, requireRole([Role.OWNER, Role.ADMIN]), validateBody(updateLotSchema), async (req: AuthRequest, res: Response) => {
  try {
    const lotId = req.params.id;
    const lot = await prisma.parkingLot.findUnique({ where: { id: lotId } });

    if (!lot) {
      return res.status(404).json({ message: 'Parking lot not found' });
    }

    // Ensure user is the owner (or Admin)
    if (lot.ownerId !== req.user!.id && req.user!.role !== Role.ADMIN) {
      return res.status(403).json({ message: 'Forbidden. You do not own this parking lot.' });
    }

    const updatedData: any = {};
    const fields = ['name', 'description', 'address', 'city', 'state', 'zipCode', 'totalSpots', 'amenities', 'imageUrls'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        updatedData[f] = req.body[f];
      }
    });

    if (req.body.latitude !== undefined) updatedData.latitude = new Prisma.Decimal(req.body.latitude);
    if (req.body.longitude !== undefined) updatedData.longitude = new Prisma.Decimal(req.body.longitude);
    if (req.body.pricePerHour !== undefined) updatedData.pricePerHour = new Prisma.Decimal(req.body.pricePerHour);

    const updatedLot = await prisma.parkingLot.update({
      where: { id: lotId },
      data: updatedData,
    });

    return res.status(200).json({
      message: 'Parking lot updated successfully',
      lot: updatedLot,
    });
  } catch (error) {
    console.error('Update lot error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /:id - Soft-delete parking lot (owner only)
router.delete('/:id', requireAuth, requireRole([Role.OWNER, Role.ADMIN]), async (req: AuthRequest, res: Response) => {
  try {
    const lotId = req.params.id;
    const lot = await prisma.parkingLot.findUnique({ where: { id: lotId } });

    if (!lot) {
      return res.status(404).json({ message: 'Parking lot not found' });
    }

    if (lot.ownerId !== req.user!.id && req.user!.role !== Role.ADMIN) {
      return res.status(403).json({ message: 'Forbidden. You do not own this parking lot.' });
    }

    await prisma.parkingLot.update({
      where: { id: lotId },
      data: { isActive: false },
    });

    return res.status(200).json({ message: 'Parking lot deactivated successfully.' });
  } catch (error) {
    console.error('Deactivate lot error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /:id/spots - List all spots in a lot with real-time availability for a given duration
router.get('/:id/spots', async (req, res) => {
  try {
    const lotId = req.params.id;
    const { startTime, endTime } = req.query;

    const start = startTime ? new Date(startTime as string) : new Date();
    const end = endTime ? new Date(endTime as string) : new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour

    // Fetch all spots in the lot
    const spots = await prisma.parkingSpot.findMany({
      where: { lotId, isActive: true },
      orderBy: { spotNumber: 'asc' },
    });

    // Fetch overlapping confirmed/active reservations
    const overlappingReservations = await prisma.reservation.findMany({
      where: {
        lotId,
        status: { in: ['CONFIRMED', 'ACTIVE'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
      select: { spotId: true, status: true },
    });

    const reservedSpotIds = overlappingReservations.map((r) => r.spotId);

    // Fetch and check Redis locks for each spot
    const spotsWithAvailability = await Promise.all(
      spots.map(async (spot) => {
        let isAvailable = true;
        let isLocked = false;
        let status: 'free' | 'taken' | 'locked' = 'free';

        if (reservedSpotIds.includes(spot.id)) {
          isAvailable = false;
          status = 'taken';
        } else {
          // Check Redis lock
          const lockHolder = await RedisService.getSpotLockHolder(spot.id);
          if (lockHolder) {
            isAvailable = false;
            isLocked = true;
            status = 'locked';
          }
        }

        return {
          ...spot,
          isAvailable,
          isLocked,
          status, // free | taken | locked
        };
      })
    );

    return res.status(200).json(spotsWithAvailability);
  } catch (error) {
    console.error('List spots availability error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
