import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authHandler from '../api/auth';
import studentHandler from '../api/student';
import chatHandler from '../api/chat';
import type { ApiRequest, ApiResponse } from '../api/_server';

dotenv.config();

const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '256kb' }));

function invoke(handler: (req: ApiRequest, res: ApiResponse) => Promise<void>) {
  return (req: express.Request, res: express.Response) => {
    void handler(req as unknown as ApiRequest, res as unknown as ApiResponse);
  };
}

app.all('/api/auth', invoke(authHandler));
app.all('/api/student', invoke(studentHandler));
app.all('/api/chat', invoke(chatHandler));

const PORT = Number(process.env.VITE_API_PORT || 3001);
app.listen(PORT, () => console.log(`Secure demo API running on :${PORT}`));
