import type { RequestItem } from '../types';
import type { AuthCredentials, RegisterData, StoredAccount } from './types.js';
import { requestJson, ApiError } from './requestJson';
export { ApiError } from './requestJson';

type ApiResult = {
  authenticated?: boolean;
  account?: StoredAccount;
  error?: string;
  createdRequest?: RequestItem;
};

async function api<T extends ApiResult>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(path, init);
}

export async function login(credentials: AuthCredentials): Promise<{ success: boolean; account?: StoredAccount; error?: string }> {
  try {
    const result = await api<{ authenticated?: boolean; account?: StoredAccount; error?: string }>('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ login: credentials.email, password: credentials.password }),
    });
    return result.account ? { success: true, account: result.account } : { success: false, error: result.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Не удалось войти' };
  }
}

export async function getCurrentUser(): Promise<StoredAccount | null> {
  try {
    const result = await api<ApiResult>('/api/auth');
    return result.authenticated && result.account ? result.account : null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
export async function logout(): Promise<void> {
  await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
}
export async function performStudentAction(action: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<{ account: StoredAccount; createdRequest?: RequestItem }> {
  const result = await api<ApiResult>('/api/student', {
    method: action === 'refresh' ? 'GET' : 'POST', signal, ...(action === 'refresh' ? {} : { body: JSON.stringify({ action, ...payload }) }),
  });
  if (!result.account) throw new Error(result.error || 'Не удалось обновить данные');
  // Cookies are shared between tabs. A GET refresh must not silently replace
  // the account bound to this tab after another tab signs into a different user.
  if (result.account.id !== payload.ownerId) {
    throw new ApiError('Аккаунт изменился в другой вкладке. Обновите страницу и войдите снова.', 409);
  }
  return { account: result.account, createdRequest: result.createdRequest };
}

export async function registerAccount(_data: RegisterData): Promise<{ success: boolean; error?: string }> {
  void _data;
  return {
    success: false,
    error: 'Регистрация доступна после подключения реестра студентов. Используйте один из демо-аккаунтов.',
  };
}
