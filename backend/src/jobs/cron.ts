import cron from 'node-cron';
import { prisma } from '../config/db';
import { ReservationStatus } from '@prisma/client';
import { EmailService } from '../services/emailService';

/**
 * Initializes background cron jobs for the application.
 * Runs every 5 minutes.
 */
export function initCronJobs() {
  console.log('Initializing background cron jobs...');

  // Self-pinging job to keep Render instance active (prevent cold start)
  cron.schedule('*/10 * * * *', async () => {
    const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
    if (selfUrl) {
      console.log(`[PING] Pinging self at ${selfUrl} to keep instance alive...`);
      try {
        const response = await fetch(selfUrl);
        console.log(`[PING] Response status: ${response.status}`);
      } catch (error: any) {
        console.error('[PING ERROR] Failed to ping self:', error.message || error);
      }
    }
  });

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    if (process.env.MOCK_MODE === 'true') {
      console.log('[CRON] MOCK_MODE is enabled. Skipping Prisma database check.');
      return;
    }
    console.log('[CRON] Checking reservations status updates...');
    const now = new Date();

    try {
      // 1. Transition CONFIRMED -> ACTIVE where startTime <= now
      const pendingStart = await prisma.reservation.findMany({
        where: {
          status: ReservationStatus.CONFIRMED,
          startTime: { lte: now },
        },
        include: { user: true, lot: true, spot: true },
      });

      if (pendingStart.length > 0) {
        console.log(`[CRON] Transitioning ${pendingStart.length} reservations from CONFIRMED to ACTIVE.`);
        
        await prisma.reservation.updateMany({
          where: {
            id: { in: pendingStart.map((r) => r.id) },
          },
          data: { status: ReservationStatus.ACTIVE },
        });

        // Send check-in reminders/notifications
        for (const res of pendingStart) {
          await prisma.notification.create({
            data: {
              userId: res.userId,
              type: 'RESERVATION_STARTED',
              message: `Your reservation at ${res.lot.name} (Spot: ${res.spot.spotNumber}) is now active!`,
            },
          });
        }
      }

      // 2. Transition ACTIVE -> COMPLETED where endTime <= now
      const pendingEnd = await prisma.reservation.findMany({
        where: {
          status: ReservationStatus.ACTIVE,
          endTime: { lte: now },
        },
        include: { user: true, lot: true, spot: true },
      });

      if (pendingEnd.length > 0) {
        console.log(`[CRON] Transitioning ${pendingEnd.length} reservations from ACTIVE to COMPLETED.`);
        
        await prisma.reservation.updateMany({
          where: {
            id: { in: pendingEnd.map((r) => r.id) },
          },
          data: { status: ReservationStatus.COMPLETED },
        });

        // Notify users
        for (const res of pendingEnd) {
          await prisma.notification.create({
            data: {
              userId: res.userId,
              type: 'RESERVATION_COMPLETED',
              message: `Your reservation at ${res.lot.name} has ended. Thank you for using ParkEase!`,
            },
          });
        }
      }

      // 3. Optional: Send a 15-minute warning before a reservation starts
      // Find CONFIRMED reservations starting in the next 15 minutes (specifically, between now + 10m and now + 15m)
      const fifteenMinsLater = new Date(now.getTime() + 15 * 60 * 1000);
      const tenMinsLater = new Date(now.getTime() + 10 * 60 * 1000);

      const warningReservations = await prisma.reservation.findMany({
        where: {
          status: ReservationStatus.CONFIRMED,
          startTime: {
            gte: tenMinsLater,
            lte: fifteenMinsLater,
          },
        },
        include: { user: true, lot: true, spot: true },
      });

      for (const res of warningReservations) {
        // We can check if a warning notification was already sent to prevent duplicate emails
        const existingWarning = await prisma.notification.findFirst({
          where: {
            userId: res.userId,
            type: 'START_WARNING_15M',
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // within last 24h
          }
        });

        if (!existingWarning) {
          console.log(`[CRON] Sending 15-minute warning email to ${res.user.email} for Reservation: ${res.id}`);
          
          await EmailService.sendStartWarning(
            res.user.email,
            res.user.name,
            res.lot.name,
            res.spot.spotNumber
          );

          await prisma.notification.create({
            data: {
              userId: res.userId,
              type: 'START_WARNING_15M',
              message: `Reminder: Your reservation at ${res.lot.name} starts in 15 minutes.`,
            },
          });
        }
      }

    } catch (error) {
      console.error('[CRON ERROR] Failed checking reservation updates:', error);
    }
  });
}
