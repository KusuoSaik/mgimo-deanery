import 'dotenv/config';
import express from 'express';
import { resolve } from 'node:path';
import { createApp } from './app.js';
import { pool } from './stateStore.js';

if (process.env.NODE_ENV !== 'production') throw new Error('Set NODE_ENV=production');
if (!pool || !process.env.ALLOWED_ORIGIN?.startsWith('https://')) throw new Error('DATABASE_URL and HTTPS ALLOWED_ORIGIN are required');
const app = createApp();
const dist = resolve('dist');
app.use(express.static(dist, { index: false, setHeaders(res, path) {
  res.setHeader('Cache-Control', path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
} }));
app.get('*', (_req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(resolve(dist, 'index.html')); });
const server = app.listen(Number(process.env.PORT || 3001), '0.0.0.0', () => console.log('Deanery production server ready'));
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => {
  server.close(() => { void pool?.end().finally(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 10_000).unref();
});
