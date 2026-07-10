import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { requireAuth, requireRole, AuthRequest } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';
import { Role, SpotType } from '@prisma/client';

const router = Router();

// Validation Schemas
const createSpotSchema = z.object({
  lotId: z.string().uuid(),
  spotNumber: z.string().min(1),
  type: z.nativeEnum(SpotType).default(SpotType.STANDARD),
  floor: z.number().int().optional(),
});

const updateSpotSchema = z.object({
  spotNumber: z.string().min(1).optional(),
  type: z.nativeEnum(SpotType).optional(),
  floor: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// Helper to check lot ownership
async function checkLotOwnership(userId: string, lotId: string, userRole: Role): Promise<boolean> {
  if (userRole === Role.ADMIN) return true;
  const lot = await prisma.parkingLot.findUnique({ where: { id: lotId } });
  return lot !== null && lot.ownerId === userId;
}

// POST / - Add a spot to a lot (Owner/Admin)
router.post('/', requireAuth, requireRole([Role.OWNER, Role.ADMIN]), validateBody(createSpotSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { lotId, spotNumber, type, floor } = req.body;
    const isOwner = await checkLotOwnership(req.user!.id, lotId, req.user!.role);

    if (!isOwner) {
      return res.status(403).json({ message: 'Forbidden. You do not own this parking lot.' });
    }

    // Check for duplicate spot number in this lot
    const duplicate = await prisma.parkingSpot.findFirst({
      where: { lotId, spotNumber },
    });

    if (duplicate) {
      return res.status(400).json({ message: `Spot number "${spotNumber}" already exists in this lot.` });
    }

    const spot = await prisma.parkingSpot.create({
      data: {
        lotId,
        spotNumber,
        type,
        floor: floor || 1,
        isActive: true,
      },
    });

    // Update lot totalSpots count
    await prisma.parkingLot.update({
      where: { id: lotId },
      data: { totalSpots: { increment: 1 } },
    });

    return res.status(201).json({
      message: 'Parking spot added successfully',
      spot,
    });
  } catch (error) {
    console.error('Add spot error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /:id - Update spot details
router.put('/:id', requireAuth, requireRole([Role.OWNER, Role.ADMIN]), validateBody(updateSpotSchema), async (req: AuthRequest, res: Response) => {
  try {
    const spotId = req.params.id;
    const spot = await prisma.parkingSpot.findUnique({
      where: { id: spotId },
      include: { lot: true },
    });

    if (!spot) {
      return res.status(404).json({ message: 'Parking spot not found.' });
    }

    const isOwner = spot.lot.ownerId === req.user!.id || req.user!.role === Role.ADMIN;
    if (!isOwner) {
      return res.status(403).json({ message: 'Forbidden. You do not own the parking lot for this spot.' });
    }

    // Check duplicate if changing spot number
    if (req.body.spotNumber && req.body.spotNumber !== spot.spotNumber) {
      const duplicate = await prisma.parkingSpot.findFirst({
        where: { lotId: spot.lotId, spotNumber: req.body.spotNumber },
      });
      if (duplicate) {
        return res.status(400).json({ message: `Spot number "${req.body.spotNumber}" already exists in this lot.` });
      }
    }

    const updatedSpot = await prisma.parkingSpot.update({
      where: { id: spotId },
      data: {
        ...(req.body.spotNumber && { spotNumber: req.body.spotNumber }),
        ...(req.body.type && { type: req.body.type }),
        ...(req.body.floor !== undefined && { floor: req.body.floor }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
      },
    });

    return res.status(200).json({
      message: 'Parking spot updated successfully',
      spot: updatedSpot,
    });
  } catch (error) {
    console.error('Update spot error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /:id - Deactivate a spot
router.delete('/:id', requireAuth, requireRole([Role.OWNER, Role.ADMIN]), async (req: AuthRequest, res: Response) => {
  try {
    const spotId = req.params.id;
    const spot = await prisma.parkingSpot.findUnique({
      where: { id: spotId },
      include: { lot: true },
    });

    if (!spot) {
      return res.status(404).json({ message: 'Parking spot not found.' });
    }

    const isOwner = spot.lot.ownerId === req.user!.id || req.user!.role === Role.ADMIN;
    if (!isOwner) {
      return res.status(403).json({ message: 'Forbidden. You do not own the parking lot for this spot.' });
    }

    // Soft deactivate spot
    await prisma.parkingSpot.update({
      where: { id: spotId },
      data: { isActive: false },
    });

    // Decrement totalSpots count
    await prisma.parkingLot.update({
      where: { id: spot.lotId },
      data: { totalSpots: { decrement: 1 } },
    });

    return res.status(200).json({ message: 'Parking spot deactivated successfully.' });
  } catch (error) {
    console.error('Deactivate spot error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
