import { Router, Request, Response } from 'express';
import { stripe } from '../config/stripe';
import { prisma } from '../config/db';
import { RedisService } from '../services/redisService';
import { EmailService } from '../services/emailService';
import { ReservationStatus } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_secret';

// POST /webhook - Listens to Stripe events
// Note: This endpoint must receive the RAW body. We will configure this in app.ts.
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    if (process.env.STRIPE_SECRET_KEY === 'sk_test_mock_secret' && req.headers['x-mock-webhook'] === 'true') {
      // Allow testing bypass in development if mock header is set
      event = req.body;
      console.log('[MOCK WEBHOOK] Bypassed Stripe Signature Verification.');
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const reservationId = session.client_reference_id;
      const paymentIntentId = session.payment_intent;
      const isExtension = session.metadata?.type === 'extension';

      console.log(`Processing checkout.session.completed for Reservation: ${reservationId}. Extension: ${isExtension}`);

      if (reservationId) {
        // Fetch reservation
        const reservation = await prisma.reservation.findUnique({
          where: { id: reservationId },
          include: { lot: true, user: true, spot: true },
        });

        if (reservation) {
          if (isExtension) {
            // Handle Extension
            // Retrieve new end time from Redis
            const redisKey = `extension:${reservationId}`;
            const newEndTimeStr = await RedisService.getSpotLockHolder(redisKey);
            
            if (newEndTimeStr) {
              const newEndTime = new Date(newEndTimeStr);
              const extraHours = Math.ceil((newEndTime.getTime() - new Date(reservation.endTime).getTime()) / (1000 * 60 * 60));
              const extraPrice = Number(session.amount_total) / 100;

              await prisma.reservation.update({
                where: { id: reservationId },
                data: {
                  endTime: newEndTime,
                  totalPrice: { increment: extraPrice },
                },
              });

              // Release locks
              await RedisService.releaseSpotLock(reservation.spotId);
              await RedisService.releaseSpotLock(redisKey);

              // Notify User
              await prisma.notification.create({
                data: {
                  userId: reservation.userId,
                  type: 'EXTENSION',
                  message: `Your reservation at ${reservation.lot.name} was extended to ${newEndTime.toLocaleString()}`,
                },
              });
              
              console.log(`[EXTENSION SUCCESS] Updated reservation ${reservationId} to end at ${newEndTime}`);
            }
          } else {
            // Handle New Booking
            const updatedRes = await prisma.reservation.update({
              where: { id: reservationId },
              data: {
                status: ReservationStatus.CONFIRMED,
                stripePaymentIntentId: paymentIntentId,
              },
            });

            // Release the checkout lock
            await RedisService.releaseSpotLock(reservation.spotId);

            // Send Confirmation Email
            await EmailService.sendConfirmation(reservation.user.email, reservation.user.name, {
              id: reservation.id,
              lotName: reservation.lot.name,
              spotNumber: reservation.spot.spotNumber,
              startTime: reservation.startTime,
              endTime: reservation.endTime,
              totalPrice: reservation.totalPrice,
            });

            // Create notification
            await prisma.notification.create({
              data: {
                userId: reservation.userId,
                type: 'BOOKING_CONFIRMED',
                message: `Reservation confirmed for ${reservation.lot.name}, spot ${reservation.spot.spotNumber}.`,
              },
            });

            // Notify owner
            await prisma.notification.create({
              data: {
                userId: reservation.lot.ownerId,
                type: 'NEW_BOOKING',
                message: `New booking at ${reservation.lot.name} for spot ${reservation.spot.spotNumber}.`,
              },
            });

            console.log(`[BOOKING SUCCESS] Confirmed reservation ${reservationId} for user ${reservation.userId}`);
          }
        }
      }
    } else if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
      const session = event.data.object as any;
      const reservationId = session.client_reference_id || session.metadata?.reservationId;

      if (reservationId) {
        const reservation = await prisma.reservation.findUnique({
          where: { id: reservationId },
        });

        if (reservation && reservation.status === ReservationStatus.PENDING) {
          // Update reservation status to CANCELLED
          await prisma.reservation.update({
            where: { id: reservationId },
            data: { status: ReservationStatus.CANCELLED },
          });

          // Release Redis lock
          await RedisService.releaseSpotLock(reservation.spotId);
          console.log(`[PAYMENT FAILED] Released spot lock and cancelled reservation ${reservationId}`);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return res.status(500).json({ message: 'Error processing webhook event' });
  }
});

export default router;
