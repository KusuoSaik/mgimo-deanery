import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ACCOUNTS_DATABASE } from '../src/auth/accountsDatabase';
import type { ChatMessage, NotificationItem, RequestItem } from '../src/types';
import type { StoredAccount } from '../src/auth/types';

export type ApiRequest = IncomingMessage & { body?: unknown; cookies?: Record<string, string> };
export type ApiResponse = ServerResponse & {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
};

const SESSION_COOKIE = 'mgimo_session';
const STATE_COOKIE = 'mgimo_state';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
if (process.env.VERCEL && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be configured in the deployment environment');
}
const SECRET = process.env.SESSION_SECRET || 'local-development-only-change-this-secret';
const KEY = createHash('sha256').update(SECRET).digest();

const PASSWORD_HASHES: Record<string, string> = {
  'a.volkov@my.mgimo.ru': '9b074d04acd3dbee379be3247115d302ae00ebfca888d6eab3e94422be4b3b3c2d6406206a25cc159c52e9302c4d7c024a890d12008d184569364a2ea542316e',
  'd.sokolov@my.mgimo.ru': 'c1c6e7d14ec3502a3ba50085c33cb39e5719eff31066bb3e6529b22d5c03e9eefad512b8b0ac268fb4d069af7df4f4adcf7b5434a0d1a8cc566046dcbeed1262',
  's.chen@my.mgimo.ru': 'c6ab04938030869ad2d3e5107ab49218c68a791500f2cbc7ef651cf75cedc81004c7a698613bcaf8537d6c811070bc38aae85a6eaa8799643390e0d7b9f4d9f1',
};

export type StoredDemoState = {
  requests: RequestItem[];
  notifications: NotificationItem[];
  chatHistory: ChatMessage[];
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
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

function seal(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const compressed = deflateRawSync(Buffer.from(JSON.stringify(payload), 'utf8'));
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

function unseal<T>(token: string | undefined): T | null {
  if (!token) return null;
  try {
    const [ivText, tagText, encryptedText] = token.split('.');
    if (!ivText || !tagText || !encryptedText) return null;
    const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    const compressed = Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]);
    return JSON.parse(inflateRawSync(compressed).toString('utf8')) as T;
  } catch {
    return null;
  }
}

function signSession(userId: string, expiresAt: number): string {
  const payload = `${userId}.${expiresAt}`;
  const signature = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySession(token: string | undefined): { userId: string; expiresAt: number } | null {
  if (!token) return null;
  const [userId, expiryText, signature] = token.split('.');
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
  const secure = host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1') ? '; Secure' : '';
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
  return ACCOUNTS_DATABASE.find((account) => {
    const emailMatch = account.email.toLowerCase() === query;
    const snils = account.profile.snils.replace(/\D/g, '');
    const phone = account.profile.phone.replace(/\D/g, '');
    const identityMatch = digits.length >= 9 && ((snils && snils === digits) || (phone.length >= 10 && phone.slice(-10) === digits.slice(-10)));
    return emailMatch || identityMatch;
  });
}

export function verifyPassword(account: StoredAccount, password: string): boolean {
  const expectedText = PASSWORD_HASHES[account.email.toLowerCase()];
  if (!expectedText) return false;
  const actual = scryptSync(password, account.email.toLowerCase(), 64);
  const expected = Buffer.from(expectedText, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function getAuthenticatedAccount(request: ApiRequest): StoredAccount | null {
  const session = verifySession(readCookies(request)[SESSION_COOKIE]);
  if (!session) return null;
  return ACCOUNTS_DATABASE.find((account) => account.id === session.userId) || null;
}

export function publicAccount(account: StoredAccount, state?: StoredDemoState): Omit<StoredAccount, 'passwordHash'> {
  const safe = { ...account } as Omit<StoredAccount, 'passwordHash'>;
  delete (safe as StoredAccount).passwordHash;
  if (state) {
    safe.requestsData = state.requests;
    safe.notificationsData = state.notifications;
    safe.chatHistoryData = state.chatHistory;
  }
  return safe;
}

export function defaultState(account: StoredAccount): StoredDemoState {
  return {
    requests: account.requestsData,
    notifications: account.notificationsData,
    chatHistory: account.chatHistoryData,
  };
}

export function getState(request: ApiRequest, account: StoredAccount): StoredDemoState {
  return unseal<StoredDemoState>(readCookies(request)[STATE_COOKIE]) || defaultState(account);
}

export function saveState(request: ApiRequest, response: ApiResponse, state: StoredDemoState): void {
  const safeState: StoredDemoState = {
    requests: state.requests.slice(0, 12),
    notifications: state.notifications.slice(0, 20),
    chatHistory: state.chatHistory.slice(-40),
  };
  setCookie(response, STATE_COOKIE, seal(safeState), cookieOptions(request, SESSION_TTL_MS / 1000));
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
  if (request.body && typeof request.body === 'object') return request.body as Record<string, unknown>;
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON body');
  return parsed as Record<string, unknown>;
}

export { SESSION_COOKIE, STATE_COOKIE, SESSION_TTL_MS };
