// backend/src/routes/spots.ts
import { Router } from 'express';
import { z } from 'zod';
import { authGuard, AuthRequest } from '../middleware/auth';
import { spotService } from '../services/spotService';

const router = Router();

// Validation schemas
const createSchema = z.object({
  lotId: z.string().uuid(),
  spotNumber: z.string(),
  type: z.enum(['STANDARD', 'HANDICAP', 'EV', 'COMPACT', 'LARGE']).optional(),
  floor: z.number().int().optional()
});

const updateSchema = createSchema.partial();

// List spots for a given lot (query param lotId)
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const lotId = req.query.lotId as string;
    if (!lotId) return res.status(400).json({ message: 'lotId query param required' });
    const spots = await spotService.listSpots(lotId);
    res.json(spots);
  } catch (err) {
    next(err);
  }
});

// Get spot detail
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const spot = await spotService.getSpot(req.params.id);
    res.json(spot);
  } catch (err) {
    next(err);
  }
});

// Create spot – only lot owner can create
router.post('/', authGuard, async (req: AuthRequest, res, next) => {
  try {
    const parsed = createSchema.parse(req.body);
    const spot = await spotService.createSpot(req.user!.userId, parsed);
    res.status(201).json(spot);
  } catch (err) {
    next(err);
  }
});

// Update spot – only owner can update
router.put('/:id', authGuard, async (req: AuthRequest, res, next) => {
  try {
    const parsed = updateSchema.parse(req.body);
    const spot = await spotService.updateSpot(req.user!.userId, req.params.id, parsed);
    res.json(spot);
  } catch (err) {
    next(err);
  }
});

// Deactivate spot – soft delete
router.delete('/:id', authGuard, async (req: AuthRequest, res, next) => {
  try {
    const spot = await spotService.deactivateSpot(req.user!.userId, req.params.id);
    res.json(spot);
  } catch (err) {
    next(err);
  }
});

export default router;
