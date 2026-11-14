import { env } from 'node:process';
type Waiter = {
  resolve: (release: () => void) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const WINDOW_MS = 60_000;
const requestsByKey = new Map<string, number[]>();
const waiters: Waiter[] = [];
let activeRequests = 0;

export class AiLimitError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'AiLimitError';
  }
}

function positiveInteger(name: string, fallback: number): number {
  const value = Number(env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function consumeRateLimit(key: string): void {
  const now = Date.now();
  const recent = (requestsByKey.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= positiveInteger('AI_REQUESTS_PER_MINUTE', 12)) {
    requestsByKey.set(key, recent);
    throw new AiLimitError('Слишком много запросов к ИИ. Попробуйте позже.', 429);
  }

  recent.push(now);
  requestsByKey.set(key, recent);

  if (requestsByKey.size > 5000) {
    for (const [entryKey, timestamps] of requestsByKey) {
      if (!timestamps.some((timestamp) => now - timestamp < WINDOW_MS)) requestsByKey.delete(entryKey);
    }
  }
}

function createRelease(): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = waiters.shift();
    if (next) {
      clearTimeout(next.timer);
      next.resolve(createRelease());
    } else {
      activeRequests -= 1;
    }
  };
}

function acquireSlot(): Promise<() => void> {
  const maxConcurrency = positiveInteger('AI_MAX_CONCURRENCY', 2);
  if (activeRequests < maxConcurrency) {
    activeRequests += 1;
    return Promise.resolve(createRelease());
  }

  return new Promise((resolve, reject) => {
    const waiter: Waiter = {
      resolve,
      reject,
      timer: setTimeout(() => {
        const index = waiters.indexOf(waiter);
        if (index !== -1) waiters.splice(index, 1);
        reject(new AiLimitError('Очередь ИИ занята. Повторите запрос позже.', 503));
      }, positiveInteger('AI_QUEUE_TIMEOUT_MS', 10_000)),
    };
    waiters.push(waiter);
  });
}

async function withTimeout<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new AiLimitError('ИИ-сервис не ответил вовремя.', 504));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function runLimitedAi<T>(key: string, task: (signal: AbortSignal) => Promise<T>): Promise<T> {
  consumeRateLimit(key);
  const release = await acquireSlot();
  const maxAttempts = positiveInteger('AI_MAX_ATTEMPTS', 3);
  const timeoutMs = positiveInteger('AI_REQUEST_TIMEOUT_MS', 25_000);

  try {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await withTimeout(task, timeoutMs);
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) throw error;
        await new Promise((resolve) => setTimeout(resolve, Math.min(250 * 2 ** (attempt - 1), 1500)));
      }
    }
    throw lastError;
  } finally {
    release();
  }
}
