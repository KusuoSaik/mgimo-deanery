import express from 'express';
import authHandler from '../api/auth.js';
import studentHandler from '../api/student.js';
import chatHandler from '../api/chat.js';
import staffHandler from '../api/staff.js';
import type { ApiRequest, ApiResponse } from '../api/_server.js';
import { pool } from './stateStore.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    });
    next();
  });
  app.use(express.json({ limit: '256kb', strict: true }));
  const handlers = { auth: authHandler, student: studentHandler, chat: chatHandler, staff: staffHandler };
  for (const [name, handler] of Object.entries(handlers)) {
    app.all(`/api/${name}`, (req, res) => {
      void handler(req as unknown as ApiRequest, res as unknown as ApiResponse).catch(() => {
        if (!res.headersSent) res.status(500).json({ error: 'Сервер временно недоступен' });
      });
    });
  }
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'Метод API не найден' }); });
  app.get('/healthz', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!pool) { res.status(503).json({ status: 'unavailable' }); return; }
    void pool.query('SELECT 1 FROM student_state LIMIT 1; SELECT 1 FROM ai_rate_limits LIMIT 1; SELECT 1 FROM ai_leases LIMIT 1; SELECT 1 FROM auth_attempts LIMIT 1')
      .then(() => res.json({ status: 'ok' }))
      .catch(() => res.status(503).json({ status: 'unavailable' }));
  });
  app.use((error: { type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    void _next;
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Проверьте размер и формат запроса' });
  });
  return app;
}
