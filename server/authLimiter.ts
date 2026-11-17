import { createHash } from 'node:crypto';
import { pool, StateStoreUnavailable } from './stateStore.js';

export class LoginLimitError extends Error {
  constructor(readonly retryAfter: number) { super('Слишком много попыток входа. Попробуйте позже.'); }
}
const local = new Map<string, { attempts: number; resetAt: number }>();

/** Shared fixed windows. Keys contain hashes, never submitted login identifiers. */
export async function consumeLoginAttempt(identity: string, now = Date.now()): Promise<void> {
  const scopes = [
    { key: 'global', max: 300, window: 60_000 },
    { key: createHash('sha256').update(identity).digest('hex'), max: 30, window: 15 * 60_000 },
  ];
  if (!pool && (process.env.VERCEL || process.env.NODE_ENV === 'production')) {
    throw new StateStoreUnavailable('Защита входа временно недоступна.');
  }
  for (const scope of scopes) {
    const resetAt = (Math.floor(now / scope.window) + 1) * scope.window;
    let attempts: number;
    if (pool) {
      try {
        const result = await pool.query(`INSERT INTO auth_attempts(key, attempts, reset_at)
          VALUES ($1, 1, $2) ON CONFLICT(key) DO UPDATE SET
          attempts = CASE WHEN auth_attempts.reset_at <= $3 THEN 1 ELSE auth_attempts.attempts + 1 END,
          reset_at = CASE WHEN auth_attempts.reset_at <= $3 THEN $2 ELSE auth_attempts.reset_at END
          RETURNING attempts`, [scope.key, resetAt, now]);
        attempts = Number(result.rows[0].attempts);
        // Global window first also bounds the number of newly inserted account keys.
        if (scope.key === 'global') await pool.query('DELETE FROM auth_attempts WHERE reset_at <= $1', [now]);
      } catch {
        throw new StateStoreUnavailable('Защита входа временно недоступна.');
      }
    } else {
      for (const [key, value] of local) if (value.resetAt <= now) local.delete(key);
      const previous = local.get(scope.key);
      attempts = (previous?.attempts ?? 0) + 1;
      local.set(scope.key, { attempts, resetAt });
    }
    if (attempts > scope.max) throw new LoginLimitError(Math.max(1, Math.ceil((resetAt - now) / 1000)));
  }
}
