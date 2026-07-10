import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { requireAuth, requireRole, AuthRequest } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';
import { Role, ReservationStatus } from '@prisma/client';

const router = Router();

// Validation Schema
const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

// Apply admin access check to all routes in this file
router.use(requireAuth);
router.use(requireRole([Role.ADMIN]));

// GET /users - List all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(users);
  } catch (error) {
    console.error('Admin list users error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /users/:id/role - Change user role
router.put('/users/:id/role', validateBody(updateRoleSchema), async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    return res.status(200).json({
      message: 'User role updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Admin change role error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /lots - List all lots (including inactive)
router.get('/lots', async (req: AuthRequest, res: Response) => {
  try {
    const lots = await prisma.parkingLot.findMany({
      include: {
        owner: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(lots);
  } catch (error) {
    console.error('Admin list lots error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /stats - KPI Dashboard stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalLots = await prisma.parkingLot.count();
    const totalSpots = await prisma.parkingSpot.count();
    
    // Reservations stats
    const totalReservations = await prisma.reservation.count();
    const activeReservations = await prisma.reservation.count({
      where: { status: ReservationStatus.ACTIVE },
    });

    // Revenue calculations
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const validStatuses = [ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE, ReservationStatus.COMPLETED];

    // Total Revenue (all time)
    const totalRevResult = await prisma.reservation.aggregate({
      where: { status: { in: validStatuses } },
      _sum: { totalPrice: true },
    });

    // Revenue Today
    const todayRevResult = await prisma.reservation.aggregate({
      where: {
        status: { in: validStatuses },
        createdAt: { gte: startOfToday },
      },
      _sum: { totalPrice: true },
    });

    // Revenue Week
    const weekRevResult = await prisma.reservation.aggregate({
      where: {
        status: { in: validStatuses },
        createdAt: { gte: startOfWeek },
      },
      _sum: { totalPrice: true },
    });

    // Revenue Month
    const monthRevResult = await prisma.reservation.aggregate({
      where: {
        status: { in: validStatuses },
        createdAt: { gte: startOfMonth },
      },
      _sum: { totalPrice: true },
    });

    return res.status(200).json({
      metrics: {
        totalUsers,
        totalLots,
        totalSpots,
        totalReservations,
        activeReservations,
      },
      revenue: {
        total: Number(totalRevResult._sum.totalPrice || 0).toFixed(2),
        today: Number(todayRevResult._sum.totalPrice || 0).toFixed(2),
        week: Number(weekRevResult._sum.totalPrice || 0).toFixed(2),
        month: Number(monthRevResult._sum.totalPrice || 0).toFixed(2),
      },
    });
  } catch (error) {
    console.error('Admin get stats error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
