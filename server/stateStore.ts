import { Pool } from 'pg';
import type { StoredDemoState } from '../api/_server.js';
export const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 5000, statement_timeout: 8000 }) : null;
const local = new Map<string, { version: number; data: StoredDemoState }>();
export class StateConflict extends Error {}
export class StateStoreUnavailable extends Error {}
export async function loadState(owner: string, seed: StoredDemoState) {
  if (!pool) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new StateStoreUnavailable('Хранилище состояния не настроено.');
    if (!local.has(owner)) local.set(owner, { version: 0, data: structuredClone(seed) });
    return structuredClone(local.get(owner)!);
  }
  try {
    await pool.query('INSERT INTO student_state(owner_id,data) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING', [owner, JSON.stringify(seed)]);
    const result = await pool.query('SELECT version,data FROM student_state WHERE owner_id=$1', [owner]);
    return result.rows[0] as { version: number; data: StoredDemoState };
  } catch (error) {
    console.error('State store load failed:', error instanceof Error ? error.message : 'unknown error');
    throw new StateStoreUnavailable('Хранилище состояния временно недоступно.');
  }
}
export async function persistState(owner: string, version: number, data: StoredDemoState) {
  if (!pool) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new StateStoreUnavailable('Хранилище состояния не настроено.');
    if (local.get(owner)?.version !== version) throw new StateConflict('Concurrent update');
    local.set(owner, { version: version + 1, data: structuredClone(data) });
    return;
  }
  try {
    const result = await pool.query('UPDATE student_state SET data=$1::jsonb, version=version+1, updated_at=now() WHERE owner_id=$2 AND version=$3', [JSON.stringify(data), owner, version]);
    if (result.rowCount !== 1) throw new StateConflict('Concurrent update');
  } catch (error) {
    if (error instanceof StateConflict) throw error;
    console.error('State store persist failed:', error instanceof Error ? error.message : 'unknown error');
    throw new StateStoreUnavailable('Хранилище состояния временно недоступно.');
  }
}

/** Replay only the requested operation against the latest revision; never merge snapshots. */
export async function mutateState<T>(owner: string, seed: StoredDemoState, operation: (state: StoredDemoState) => T) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const loaded = await loadState(owner, seed);
    const data = structuredClone(loaded.data);
    const result = operation(data);
    try {
      await persistState(owner, loaded.version, data);
      return { data, result };
    } catch (error) {
      if (!(error instanceof StateConflict) || attempt === 5) throw error;
    }
  }
  throw new StateConflict('Concurrent update');
}
