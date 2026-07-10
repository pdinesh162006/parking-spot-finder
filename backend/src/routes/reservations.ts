import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { RedisService } from '../services/redisService';
import { PaymentService } from '../services/paymentService';
import { QRService } from '../services/qrService';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';
import { getLotPricing } from './lots';
import { ReservationStatus } from '@prisma/client';

const router = Router();

// Validation Schemas
const createReservationSchema = z.object({
  lotId: z.string().uuid(),
  spotId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

const extendReservationSchema = z.object({
  newEndTime: z.string().datetime(),
});

/**
 * Checks if a spot is available for a given time range
 */
async function checkSpotAvailability(spotId: string, start: Date, end: Date): Promise<boolean> {
  // 1. Check if spot is active
  const spot = await prisma.parkingSpot.findUnique({
    where: { id: spotId },
  });
  if (!spot || !spot.isActive) return false;

  // 2. Check for overlapping CONFIRMED or ACTIVE bookings
  const overlapping = await prisma.reservation.findFirst({
    where: {
      spotId,
      status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE] },
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });

  return overlapping === null;
}

// POST / - Create a reservation (Locks spot, generates Stripe session)
router.post('/', requireAuth, validateBody(createReservationSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { lotId, spotId, startTime, endTime } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ message: 'Start time must be before end time.' });
    }

    if (start < new Date(Date.now() - 5 * 60 * 1000)) { // 5 min grace period for clock skew
      return res.status(400).json({ message: 'Start time cannot be in the past.' });
    }

    // 1. Check spot availability
    const isAvailable = await checkSpotAvailability(spotId, start, end);
    if (!isAvailable) {
      return res.status(400).json({ message: 'The parking spot is already reserved during this time slot.' });
    }

    // 2. Check Redis locks
    const currentLockHolder = await RedisService.getSpotLockHolder(spotId);
    if (currentLockHolder && currentLockHolder !== userId) {
      return res.status(423).json({ message: 'This spot is temporarily locked by another user completing checkout. Try again in a few minutes.' });
    }

    // 3. Lock the spot in Redis for 10 minutes
    const lockAcquired = await RedisService.lockSpot(spotId, userId, 600);
    if (!lockAcquired) {
      return res.status(423).json({ message: 'Could not acquire lock on spot. It is locked by another checkout session.' });
    }

    // 4. Calculate pricing (with surge pricing check)
    const lot = await prisma.parkingLot.findUnique({ where: { id: lotId } });
    if (!lot) {
      await RedisService.releaseSpotLock(spotId);
      return res.status(404).json({ message: 'Parking lot not found.' });
    }

    const { pricePerHour } = await getLotPricing(lotId, Number(lot.pricePerHour));
    const durationHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    const totalPrice = Number((pricePerHour * durationHours).toFixed(2));

    // 5. Create reservation record in PENDING state
    // Temporarily set qrCode to a placeholder, it will be populated below
    const reservation = await prisma.reservation.create({
      data: {
        userId,
        lotId,
        spotId,
        startTime: start,
        endTime: end,
        status: ReservationStatus.PENDING,
        totalPrice,
        qrCode: 'PENDING_JWT',
      },
    });

    // 6. Generate RS256 JWT encoded QR Code
    const { token, qrCodeDataUrl } = await QRService.generateQRCode({
      reservationId: reservation.id,
      userId,
      spotId,
      lotId,
    });

    // Update reservation with actual QR code token
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { qrCode: token },
    });

    // 7. Create Stripe Checkout Session
    const sessionUrl = await PaymentService.createCheckoutSession(
      reservation.id,
      totalPrice,
      lot.name
    );

    return res.status(201).json({
      message: 'Reservation created. Please proceed to payment.',
      reservation: {
        ...updatedReservation,
        qrCodeImage: qrCodeDataUrl, // base64 representation for display
      },
      paymentUrl: sessionUrl,
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET / - List user's reservations (paginated)
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page, limit } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;

    const reservations = await prisma.reservation.findMany({
      where: { userId },
      include: {
        lot: { select: { name: true, address: true, city: true, state: true } },
        spot: { select: { spotNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limitNum,
    });

    const total = await prisma.reservation.count({ where: { userId } });

    return res.status(200).json({
      reservations,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('List reservations error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /:id - Reservation detail + QR code image
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: {
        lot: true,
        spot: true,
      },
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    // Ensure driver owns this, or admin/owner is accessing
    const isOwner = reservation.userId === req.user!.id || req.user!.role === 'ADMIN' || reservation.lot.ownerId === req.user!.id;
    if (!isOwner) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Generate QR code base64 image dynamically for verification
    const qrCodeDataUrl = await QRCode.toDataURL(reservation.qrCode).catch(() => '');

    return res.status(200).json({
      ...reservation,
      qrCodeImage: qrCodeDataUrl,
    });
  } catch (error) {
    console.error('Get reservation detail error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /:id/cancel - Cancel & trigger Stripe refund if eligible
router.post('/:id/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { lot: true, user: true },
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    if (reservation.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    if (reservation.status === ReservationStatus.CANCELLED || reservation.status === ReservationStatus.COMPLETED) {
      return res.status(400).json({ message: 'Reservation cannot be cancelled in its current state.' });
    }

    const now = new Date();
    const startTime = new Date(reservation.startTime);

    // Eligible for refund if status is CONFIRMED and cancel time is > 2 hours before start
    const hoursToStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const eligibleForRefund = reservation.status === ReservationStatus.CONFIRMED && hoursToStart > 2.0;

    let refundSuccess = false;
    if (eligibleForRefund && reservation.stripePaymentIntentId) {
      refundSuccess = await PaymentService.createRefund(reservation.stripePaymentIntentId);
    }

    // Update reservation status
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.CANCELLED },
    });

    // Unlock spot if lock exists in Redis
    await RedisService.releaseSpotLock(reservation.spotId);

    // Send notifications
    await prisma.notification.create({
      data: {
        userId: reservation.userId,
        type: 'CANCELLATION',
        message: `Your reservation at ${reservation.lot.name} has been cancelled. ${
          eligibleForRefund
            ? refundSuccess
              ? 'Your Stripe refund has been processed.'
              : 'Stripe refund is being processed.'
            : 'Non-refundable (cancelled within 2 hours of reservation start).'
        }`,
      },
    });

    return res.status(200).json({
      message: 'Reservation cancelled successfully.',
      reservation: updated,
      refunded: eligibleForRefund && refundSuccess,
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /:id/extend - Extend booking duration
router.post('/:id/extend', requireAuth, validateBody(extendReservationSchema), async (req: AuthRequest, res: Response) => {
  try {
    const reservationId = req.params.id;
    const { newEndTime } = req.body;
    const newEnd = new Date(newEndTime);

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { lot: true },
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    if (reservation.userId !== req.user!.id) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    if (reservation.status !== ReservationStatus.ACTIVE && reservation.status !== ReservationStatus.CONFIRMED) {
      return res.status(400).json({ message: 'Only active or confirmed reservations can be extended.' });
    }

    const currentEnd = new Date(reservation.endTime);
    if (newEnd <= currentEnd) {
      return res.status(400).json({ message: 'New end time must be after the current end time.' });
    }

    // Check if spot is available for the extended duration [currentEnd, newEnd]
    const isAvailable = await checkSpotAvailability(reservation.spotId, currentEnd, newEnd);
    if (!isAvailable) {
      return res.status(400).json({ message: 'The spot is booked by another driver immediately following your reservation. Cannot extend.' });
    }

    // Calculate duration difference and price
    const hoursDifference = Math.ceil((newEnd.getTime() - currentEnd.getTime()) / (1000 * 60 * 60));
    const pricing = await getLotPricing(reservation.lotId, Number(reservation.lot.pricePerHour));
    const extPrice = Number((pricing.pricePerHour * hoursDifference).toFixed(2));

    // Lock the spot again temporarily in Redis for checkout
    await RedisService.lockSpot(reservation.spotId, req.user!.id, 600);

    // Create a checkout session for the price difference
    const checkoutUrl = await PaymentService.createCheckoutSession(
      reservation.id,
      extPrice,
      reservation.lot.name,
      true // isExtension flag
    );

    // Store extension details in temporary Redis metadata or handle it in Stripe metadata (handled above)
    // We will save the planned newEnd inside Redis metadata for the payment webhook to retrieve:
    // Key: `extension:reservation:${reservationId}`
    await RedisService.lockSpot(`extension:${reservationId}`, newEnd.toISOString(), 600);

    return res.status(200).json({
      message: 'Extension invoice generated. Please pay the price difference.',
      checkoutUrl,
      priceDifference: extPrice,
    });
  } catch (error) {
    console.error('Extend reservation error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Dynamic dependency for loading QRCode
import QRCode from 'qrcode';

export default router;
