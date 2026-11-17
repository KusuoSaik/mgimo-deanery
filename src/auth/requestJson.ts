export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

/** Bound both headers and body reading; preserve caller cancellation and never retry writes. */
export async function requestJson<T>(path: string, init: RequestInit = {}, timeoutMs = 20_000): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(path, {
      ...init, credentials: 'include',
      headers,
      signal: controller.signal,
    });
    let data: unknown;
    try { data = await response.json(); }
    catch (error) {
      if (controller.signal.aborted) throw error;
      throw new ApiError('Сервер вернул некорректный ответ. Обновите данные перед повторной отправкой.', response.ok ? 502 : response.status);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ApiError('Сервер вернул некорректный ответ. Обновите данные перед повторной отправкой.', 502);
    if (!response.ok) {
      const message = (data as Record<string, unknown>).error;
      throw new ApiError(typeof message === 'string' ? message : 'Сервер временно недоступен', response.status);
    }
    return data as T;
  } catch (error) {
    if (init.signal?.aborted) throw new DOMException('Session changed', 'AbortError');
    if (timedOut) throw new ApiError('Сервер не ответил вовремя. Обновите данные перед повторной отправкой: действие могло сохраниться.', 504);
    if (error instanceof TypeError) throw new ApiError('Не удалось связаться с сервером. Проверьте соединение и обновите данные перед повторной отправкой.', 0);
    throw error;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', abort);
  }
}
