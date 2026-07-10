import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../config/db';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';

const router = Router();

// Validation Schemas
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

// GET /me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /me
router.put('/me', requireAuth, validateBody(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, phone } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /me/password
router.put('/me/password', requireAuth, validateBody(changePasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
