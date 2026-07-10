import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

/**
 * Middleware factory to validate Express request bodies using Zod schemas.
 */
export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed;
      next();
    } catch (error: any) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.errors || error.message || error,
      });
    }
  };
};
