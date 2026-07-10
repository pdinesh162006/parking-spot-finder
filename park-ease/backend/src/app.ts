import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { json, urlencoded } from 'body-parser';

import authRouter from './routes/auth';
import lotRouter from './routes/lots';
import spotRouter from './routes/spots';
import reservationRouter from './routes/reservations';
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';

const app: Application = express();

// Global middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(json());
app.use(urlencoded({ extended: true }));

// Public auth routes
app.use('/api/auth', authRouter);

// Protect subsequent routes
app.use(authenticate);
app.use('/api/lots', lotRouter);
app.use('/api/spots', spotRouter);
app.use('/api/reservations', reservationRouter);

// Error handling (must be last)
app.use(errorHandler);

export default app;
