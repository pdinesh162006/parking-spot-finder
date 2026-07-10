import { prisma } from '../prisma/client';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Validation schemas for spot creation and update
const spotCreateSchema = z.object({
  lotId: z.string().uuid(),
  spotNumber: z.string(),
  type: z.enum(['STANDARD', 'HANDICAP', 'EV', 'COMPACT', 'LARGE']).optional(),
  floor: z.number().int().optional(),
});

const spotUpdateSchema = spotCreateSchema.partial();

export class SpotService {
  async listSpots(lotId: string) {
    return prisma.parkingSpot.findMany({ where: { lotId, isActive: true } });
  }

  async getSpot(id: string) {
    const spot = await prisma.parkingSpot.findUnique({ where: { id } });
    if (!spot) throw { status: 404, message: 'Spot not found' };
    return spot;
  }

  async createSpot(ownerId: string, data: unknown) {
    const parsed = spotCreateSchema.parse(data);
    // Verify ownership of the lot
    const lot = await prisma.parkingLot.findUnique({ where: { id: parsed.lotId } });
    if (!lot) throw { status: 404, message: 'Lot not found' };
    if (lot.ownerId !== ownerId) throw { status: 403, message: 'Forbidden' };
    return prisma.parkingSpot.create({ data: { ...parsed, isActive: true } });
  }

  async updateSpot(ownerId: string, id: string, data: unknown) {
    const parsed = spotUpdateSchema.parse(data);
    const spot = await prisma.parkingSpot.findUnique({ where: { id } });
    if (!spot) throw { status: 404, message: 'Spot not found' };
    const lot = await prisma.parkingLot.findUnique({ where: { id: spot.lotId } });
    if (!lot) throw { status: 404, message: 'Parent lot not found' };
    if (lot.ownerId !== ownerId) throw { status: 403, message: 'Forbidden' };
    return prisma.parkingSpot.update({ where: { id }, data: parsed });
  }

  async deactivateSpot(ownerId: string, id: string) {
    const spot = await prisma.parkingSpot.findUnique({ where: { id } });
    if (!spot) throw { status: 404, message: 'Spot not found' };
    const lot = await prisma.parkingLot.findUnique({ where: { id: spot.lotId } });
    if (!lot) throw { status: 404, message: 'Parent lot not found' };
    if (lot.ownerId !== ownerId) throw { status: 403, message: 'Forbidden' };
    return prisma.parkingSpot.update({ where: { id }, data: { isActive: false } });
  }
}

export const spotService = new SpotService();
