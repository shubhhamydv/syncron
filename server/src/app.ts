import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();

const rawClientUrls = process.env.CLIENT_URL || 'http://localhost:3000';
const allowedOrigins = rawClientUrls.split(',').map((u) => u.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// API root routes
app.use('/api', routes);

// Centralized error handler
app.use(errorHandler);

export default app;
