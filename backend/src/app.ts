import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { apiRateLimiter } from './middlewares/rateLimiter';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import lotsRouter from './routes/lots';
import spotsRouter from './routes/spots';
import reservationsRouter from './routes/reservations';
import paymentsRouter from './routes/payments';
import reviewsRouter from './routes/reviews';
import adminRouter from './routes/admin';
import { mockMiddleware } from './middlewares/mockMiddleware';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Stripe Webhook needs the RAW request buffer for signature validation.
// Configure this route BEFORE the global express.json() middleware.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Global Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(apiRateLimiter);

// API Routes
app.use(mockMiddleware);

// Serve built frontend assets (production mode)
app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/lots', lotsRouter);
app.use('/api/spots', spotsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/admin', adminRouter);

// Catch‑all route for SPA (must be after API routes)
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../frontend/dist/index.html'));
});








app.get('/', (req, res) => {
  res.status(200).json({ message: 'ParkEase API is online.' });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    message: 'An unexpected error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
