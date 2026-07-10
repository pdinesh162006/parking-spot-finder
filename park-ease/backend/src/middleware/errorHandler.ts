import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Invalid request data',
      issues: err.errors.map(e => ({ path: e.path, message: e.message })),
    });
  }

  // JWT auth errors (generic unauthorized)
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({ message: err.message || 'Unauthorized' });
  }

  // Prisma not found errors (resource missing)
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Resource not found' });
  }

  // Fallback – internal server error
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
};
