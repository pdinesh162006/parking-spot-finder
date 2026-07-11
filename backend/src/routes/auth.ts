import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/db';
import { privateKey, publicKey, JWT_ACCESS_EXPIRY, JWT_REFRESH_EXPIRY_DAYS } from '../config/jwt';
import { validateBody } from '../middlewares/validation';
import { Role } from '@prisma/client';

const router = Router();

// Validation Schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().min(8),
  role: z.nativeEnum(Role).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const googleLoginSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  role: z.nativeEnum(Role).optional(),
});

/**
 * Generate Access Token (RS256)
 */
const generateAccessToken = (user: { id: string; email: string; role: Role }) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    privateKey,
    { algorithm: 'RS256', expiresIn: JWT_ACCESS_EXPIRY }
  );
};

/**
 * Generate Refresh Token (RS256)
 */
const generateRefreshToken = (user: { id: string; email: string; role: Role }) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    privateKey,
    { algorithm: 'RS256', expiresIn: `${JWT_REFRESH_EXPIRY_DAYS}d` }
  );
};

/**
 * Set httpOnly Cookie
 */
const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

// POST /register
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone,
        role: role || Role.DRIVER,
      },
    });

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /login
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /google-login
router.post('/google-login', validateBody(googleLoginSchema), async (req: Request, res: Response) => {
  try {
    const { email, name, role } = req.body;

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create user on the fly if registering via Google
      const saltRounds = 12;
      const secureRandomPassword = Math.random().toString(36) + Math.random().toString(36);
      const passwordHash = await bcrypt.hash(secureRandomPassword, saltRounds);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone: '',
          role: role || Role.DRIVER,
        },
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token missing.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] }) as {
      id: string;
      email: string;
      role: Role;
    };

    // Make sure user still exists
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ message: 'User does not exist.' });
    }

    // Rotate tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    setRefreshTokenCookie(res, newRefreshToken);

    return res.status(200).json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(401).json({ message: 'Invalid or expired refresh token.' });
  }
});

// POST /logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return res.status(200).json({ message: 'Logout successful' });
});

export default router;
