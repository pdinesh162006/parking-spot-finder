import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';
import { ReservationStatus } from '@prisma/client';

const router = Router();

// Validation Schemas
const createReviewSchema = z.object({
  lotId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

// POST / - Create review after COMPLETED reservation
router.post('/', requireAuth, validateBody(createReviewSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { lotId, rating, comment } = req.body;

    // 1. Verify user had at least one COMPLETED reservation for this lot
    const completedBooking = await prisma.reservation.findFirst({
      where: {
        userId,
        lotId,
        status: ReservationStatus.COMPLETED,
      },
    });

    if (!completedBooking) {
      return res.status(403).json({
        message: 'Only drivers with completed reservations at this parking lot can leave a review.',
      });
    }

    // 2. Optional: check if they already reviewed it (limit 1 review per user per lot, or allow multiples)
    // Let's check if they already reviewed this lot
    const existingReview = await prisma.review.findFirst({
      where: { userId, lotId },
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this parking lot.' });
    }

    const review = await prisma.review.create({
      data: {
        userId,
        lotId,
        rating,
        comment,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    return res.status(201).json({
      message: 'Review submitted successfully',
      review,
    });
  } catch (error) {
    console.error('Submit review error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /lot/:lotId - Get reviews for a lot (paginated)
router.get('/lot/:lotId', async (req, res) => {
  try {
    const lotId = req.params.lotId;
    const { page, limit } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;

    const reviews = await prisma.review.findMany({
      where: { lotId },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limitNum,
    });

    const total = await prisma.review.count({ where: { lotId } });

    return res.status(200).json({
      reviews,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
