import type { RequestItem } from '../types';
import type { AuthCredentials, RegisterData, StoredAccount } from './types.js';

type ApiResult = {
  authenticated?: boolean;
  account?: StoredAccount;
  error?: string;
  createdRequest?: RequestItem;
};

export class ApiError extends Error { readonly status: number; constructor(message: string, status: number) { super(message); this.status = status; } }

async function api<T extends ApiResult>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw new ApiError(data.error || 'Сервер временно недоступен', response.status);
  return data;
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
    method: 'POST', signal, body: JSON.stringify({ action, ...payload }),
  });
  if (!result.account) throw new Error(result.error || 'Не удалось обновить данные');
  return { account: result.account, createdRequest: result.createdRequest };
}

export async function registerAccount(_data: RegisterData): Promise<{ success: boolean; error?: string }> {
  void _data;
  return {
    success: false,
    error: 'Регистрация доступна после подключения реестра студентов. Используйте один из демо-аккаунтов.',
  };
}
