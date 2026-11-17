import { DEMO_STAFF } from '../server/demoStaff.js';
import { availableSlots, academicResults, directionFor, requestDetails } from '../src/portalDomain.js';
import type { RequestDetails, Consultation } from '../src/portalDomain.js';
import { loadState } from '../server/stateStore.js';
import { env } from 'node:process';
import { createHmac, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ACCOUNTS_DATABASE } from '../src/auth/accountsDatabase.js';
import type { ChatMessage, NotificationItem, RequestItem } from '../src/types.js';
import type { StoredAccount } from '../src/auth/types.js';

export type ApiRequest = IncomingMessage & { body?: unknown; cookies?: Record<string, string> };
export type ApiResponse = ServerResponse & {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
};

const SESSION_COOKIE = 'mgimo_session';
const STATE_COOKIE = 'mgimo_state';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
if ((env.VERCEL || env.NODE_ENV === 'production') && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || env.SESSION_SECRET === 'replace-with-a-long-random-secret')) {
  throw new Error('SESSION_SECRET must contain at least 32 random characters');
}
const SECRET = env.SESSION_SECRET || 'local-development-only-change-this-secret';

const PASSWORD_HASHES: Record<string, string> = {
  'dean.demo@my.mgimo.ru': 'b02bb122b9d36441824dd0ebc3a3dfb2087d272a1974e13661266d637e31baea4e07047d59135545ffff4a4a83f33a91cfe5835c5e466adc7e84f3e27787d246',
  'a.volkov@my.mgimo.ru': '9b074d04acd3dbee379be3247115d302ae00ebfca888d6eab3e94422be4b3b3c2d6406206a25cc159c52e9302c4d7c024a890d12008d184569364a2ea542316e',
  'd.sokolov@my.mgimo.ru': 'c1c6e7d14ec3502a3ba50085c33cb39e5719eff31066bb3e6529b22d5c03e9eefad512b8b0ac268fb4d069af7df4f4adcf7b5434a0d1a8cc566046dcbeed1262',
  's.chen@my.mgimo.ru': 'c6ab04938030869ad2d3e5107ab49218c68a791500f2cbc7ef651cf75cedc81004c7a698613bcaf8537d6c811070bc38aae85a6eaa8799643390e0d7b9f4d9f1',
};

export type StoredDemoState = {
  requests: RequestItem[];
  notifications: NotificationItem[];
  chatHistory: ChatMessage[];
  chatGeneration?: number;
  requestDetails?: Record<string, RequestDetails>;
  consultations?: Consultation[];
};

function cookieHeader(request: ApiRequest): string {
  return request.headers.cookie || '';
}

export function readCookies(request: ApiRequest): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of cookieHeader(request).split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) { try { result[key] = decodeURIComponent(value); } catch { /* Ignore malformed cookies. */ } }
  }
  return result;
}

function signSession(userId: string, expiresAt: number): string {
  const payload = `${userId}.${expiresAt}`;
  const signature = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySession(token: string | undefined): { userId: string; expiresAt: number } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiryText, signature] = parts;
  const expiresAt = Number(expiryText);
  if (!userId || !signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  const expected = createHmac('sha256', SECRET).update(`${userId}.${expiresAt}`).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return { userId, expiresAt };
}

function cookieOptions(request: ApiRequest, maxAge: number): string {
  const host = String(request.headers.host || '');
  const secure = env.NODE_ENV === 'production' || env.VERCEL || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? '; Secure' : '';
  return `Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

export function setCookie(response: ApiResponse, name: string, value: string, options: string): void {
  const current = response.getHeader('Set-Cookie');
  const cookies = Array.isArray(current) ? current : current ? [String(current)] : [];
  response.setHeader('Set-Cookie', [...cookies, `${name}=${encodeURIComponent(value)}; ${options}`]);
}

export function clearAuthCookies(request: ApiRequest, response: ApiResponse): void {
  const options = cookieOptions(request, 0);
  setCookie(response, SESSION_COOKIE, '', options);
  setCookie(response, STATE_COOKIE, '', options);
}

export function issueSession(request: ApiRequest, response: ApiResponse, userId: string): void {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  setCookie(response, SESSION_COOKIE, signSession(userId, expiresAt), cookieOptions(request, SESSION_TTL_MS / 1000));
}

export function findAccount(login: string): StoredAccount | undefined {
  const query = login.trim().toLowerCase();
  const digits = query.replace(/\D/g, '');
  return [...ACCOUNTS_DATABASE, DEMO_STAFF].find((account) => {
    const emailMatch = account.email.toLowerCase() === query;
    const snils = account.profile.snils.replace(/\D/g, '');
    const phone = account.profile.phone.replace(/\D/g, '');
    const identityMatch = digits.length >= 9 && ((snils && snils === digits) || (phone.length >= 10 && phone.slice(-10) === digits.slice(-10)));
    return emailMatch || identityMatch;
  });
}

const derivePassword = promisify(scrypt);
export async function verifyPassword(account: StoredAccount | undefined, password: string): Promise<boolean> {
  // Unknown accounts perform the same expensive operation to avoid a timing oracle.
  const email = account?.email.toLowerCase() ?? 'unknown-demo-account';
  const expectedText = PASSWORD_HASHES[email] ?? '00'.repeat(64);
  const actual = await derivePassword(password, email, 64) as Buffer;
  const expected = Buffer.from(expectedText, 'hex');
  return timingSafeEqual(actual, expected) && Boolean(account);
}

export function getAuthenticatedAccount(request: ApiRequest): StoredAccount | null {
  const session = verifySession(readCookies(request)[SESSION_COOKIE]);
  if (!session) return null;
  return [...ACCOUNTS_DATABASE, DEMO_STAFF].find((account) => account.id === session.userId) || null;
}

export function publicAccount(account: StoredAccount, state?: StoredDemoState): Omit<StoredAccount, 'passwordHash'> {
  const safe = { ...account } as Omit<StoredAccount, 'passwordHash'>;
  delete (safe as StoredAccount).passwordHash;
  safe.accessRole = account.accessRole ?? 'student';
  safe.direction = directionFor(account.profile.group);
  safe.academicResultsData = academicResults(account.gradesData, account.profile.course, account.id);
  safe.consultationsData = state?.consultations ?? [];
  const now = new Date();
  safe.consultationSlotsData = Object.fromEntries(account.gradesData.map(g => [g.id, availableSlots(g.id, now, account.scheduleData, state?.consultations ?? [])]));
  safe.requestDetailsData = Object.fromEntries((state?.requests ?? account.requestsData).map(r => [r.id, requestDetails(r, state?.requestDetails?.[r.id])]));
  if (state) {
    safe.requestsData = state.requests;
    safe.notificationsData = state.notifications;
    safe.chatHistoryData = state.chatHistory;
    safe.chatGeneration = state.chatGeneration ?? 0;
  }
  return safe;
}

export function defaultState(account: StoredAccount): StoredDemoState {
  return {
    requestDetails: {},
    consultations: [],
    requests: account.requestsData,
    notifications: account.notificationsData,
    chatHistory: account.chatHistoryData,
  };
}

export async function getState(_request: ApiRequest, account: StoredAccount): Promise<StoredDemoState> {
  return (await loadState(account.id, defaultState(account))).data;
}

export function responseHelpers(response: ApiResponse): void {
  response.status = (code: number) => {
    response.statusCode = code;
    return response;
  };
  response.json = (data: unknown) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(data));
  };
}

export async function readBody(request: ApiRequest): Promise<Record<string, unknown>> {
  const limit = 256 * 1024;
  function validate(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid JSON body');
    if (Buffer.byteLength(JSON.stringify(value)) > limit) throw new Error('Body too large');
    return value as Record<string, unknown>;
  }
  if (request.body !== undefined) return validate(typeof request.body === 'string' ? JSON.parse(request.body) : request.body);
  if (Number(request.headers['content-length']) > limit) throw new Error('Body too large');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > limit) throw new Error('Body too large');
    chunks.push(bytes);
  }
  if (!chunks.length) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  return validate(parsed);
}

export { SESSION_COOKIE, STATE_COOKIE, SESSION_TTL_MS };

export function isAllowedOrigin(req: ApiRequest): boolean {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
  const host = String(req.headers.host || '');
  if (allowed.includes(origin)) return true;
  return origin === `https://${host}` || (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) && origin === `http://${host}`);
}
