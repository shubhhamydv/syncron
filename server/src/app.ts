import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();

const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: clientUrl === '*' ? true : clientUrl,
    credentials: true,
  })
);

app.use(express.json());

// API root routes
app.use('/api', routes);

// Centralized error handler
app.use(errorHandler);

export default app;
