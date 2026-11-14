import type { ApiRequest, ApiResponse } from './_server.js';
import { clearAuthCookies, findAccount, getAuthenticatedAccount, getState, issueSession, publicAccount, readBody, responseHelpers, verifyPassword } from './_server.js';
import { StateStoreUnavailable } from '../server/stateStore.js';

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  responseHelpers(res);
  res.setHeader('Cache-Control', 'no-store');

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

  try {
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
    if (!account || !password) {
      res.status(401).json({ error: 'Неверный логин или пароль' });
      return;
    }

    if (!verifyPassword(account, password)) {
      res.status(401).json({ error: 'Неверный логин или пароль' });
      return;
    }

    issueSession(req, res, account.id);
    const state = await getState(req, account);
    res.status(200).json({ authenticated: true, account: publicAccount(account, state) });
  } catch (error) {
    if (error instanceof StateStoreUnavailable) {
      res.status(503).json({ error: error.message });
      return;
    }
    res.status(400).json({ error: 'Некорректный запрос' });
  }
}
