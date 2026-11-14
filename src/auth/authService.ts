import type { AuthCredentials, RegisterData, StoredAccount } from './types.js';

type ApiResult = {
  authenticated?: boolean;
  account?: StoredAccount;
  error?: string;
};

async function api<T extends ApiResult>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw new Error(data.error || 'Сервер временно недоступен');
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
    const result = await api<{ authenticated?: boolean; account?: StoredAccount }>('/api/auth');
    return result.authenticated && result.account ? result.account : null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
}

export async function performStudentAction(action: string, payload: Record<string, unknown> = {}): Promise<StoredAccount> {
  const result = await api<{ account?: StoredAccount; error?: string }>('/api/student', {
    method: 'POST',
    body: JSON.stringify({ action, ...payload }),
  });
  if (!result.account) throw new Error(result.error || 'Не удалось обновить данные');
  return result.account;
}

export async function registerAccount(_data: RegisterData): Promise<{ success: boolean; error?: string }> {
  void _data;
  return {
    success: false,
    error: 'Регистрация доступна после подключения реестра студентов. Используйте один из демо-аккаунтов.',
  };
}
