import type { ApiRequest, ApiResponse } from './_server.js';
import { clearAuthCookies, findAccount, getAuthenticatedAccount, getState, issueSession, publicAccount, readBody, responseHelpers, isAllowedOrigin, verifyPassword } from './_server.js';
import { StateStoreUnavailable } from '../server/stateStore.js';
import { consumeLoginAttempt, LoginLimitError } from '../server/authLimiter.js';

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  responseHelpers(res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST' && !isAllowedOrigin(req)) { res.status(403).json({ error: 'Origin not allowed' }); return; }

  try {
  if (req.method === 'GET') {
    const account = getAuthenticatedAccount(req);
    if (!account) {
      res.status(401).json({ authenticated: false });
      return;
    }
    const state = await getState(req, account);
    res.status(200).json({ authenticated: true, account: publicAccount(account, state) });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Метод не поддерживается' });
    return;
  }

    const body = await readBody(req);
    const action = typeof body.action === 'string' ? body.action : 'login';

    if (action === 'logout') {
      clearAuthCookies(req, res);
      res.status(200).json({ authenticated: false });
      return;
    }

    const login = typeof body.login === 'string' ? body.login : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const account = findAccount(login);
    if (action !== 'login' || login.length > 254 || !login.trim() || !password || password.length > 256) {
      res.status(400).json({ error: 'Проверьте логин и пароль' });
      return;
    }
    await consumeLoginAttempt(account?.id ?? login.trim().toLowerCase());
    if (!await verifyPassword(account, password) || !account) {
      res.status(401).json({ error: 'Неверный логин или пароль' });
      return;
    }

    const state = await getState(req, account);
    issueSession(req, res, account.id);
    res.status(200).json({ authenticated: true, account: publicAccount(account, state) });
  } catch (error) {
    if (error instanceof LoginLimitError) {
      res.setHeader('Retry-After', String(error.retryAfter));
      res.status(429).json({ error: error.message });
      return;
    }
    if (error instanceof StateStoreUnavailable) {
      res.status(503).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: 'Некорректный запрос' });
  }
}
