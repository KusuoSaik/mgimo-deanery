import type { ApiRequest, ApiResponse } from './_server.js';
import { getAuthenticatedAccount, getState, publicAccount, readBody, responseHelpers, saveState } from './_server.js';
import type { NotificationItem, RequestItem } from '../src/types.js';

const categories: RequestItem['category'][] = ['Справки', 'Военкомат', 'Финансы и матпомощь', 'Академические'];
const deliveryFormats: RequestItem['deliveryFormat'][] = ['Электронная с ЭЦП (PDF)', 'Бумажный оригинал в деканате'];

function isCategory(value: unknown): value is RequestItem['category'] {
  return typeof value === 'string' && categories.includes(value as RequestItem['category']);
}

function isDeliveryFormat(value: unknown): value is RequestItem['deliveryFormat'] {
  return typeof value === 'string' && deliveryFormats.includes(value as RequestItem['deliveryFormat']);
}

function snapshot(account: ReturnType<typeof getAuthenticatedAccount>, request: ApiRequest) {
  if (!account) return null;
  return publicAccount(account, getState(request, account));
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  responseHelpers(res);
  res.setHeader('Cache-Control', 'no-store');

  const account = getAuthenticatedAccount(req);
  if (!account) {
    res.status(401).json({ error: 'Сессия истекла. Войдите снова.' });
    return;
  }

  const state = getState(req, account);
  if (req.method === 'GET') {
    res.status(200).json({ account: snapshot(account, req) });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Метод не поддерживается' });
    return;
  }

  try {
    const body = await readBody(req);
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'create_request') {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const category = body.category;
      const deliveryFormat = body.deliveryFormat;
      if (!title || title.length > 160 || !isCategory(category) || !isDeliveryFormat(deliveryFormat)) {
        res.status(400).json({ error: 'Проверьте название, категорию и формат получения заявки.' });
        return;
      }
      const now = new Date();
      const created: RequestItem = {
        id: `req-${crypto.randomUUID()}`,
        title,
        category,
        deliveryFormat,
        createdAt: new Intl.DateTimeFormat('ru-RU').format(now),
        stage: 1,
        status: 'Зарегистрирована в СЭД',
      };
      state.requests = [created, ...state.requests].slice(0, 12);
      state.notifications = [
        {
          id: `nt-${crypto.randomUUID()}`,
          title: 'Заявка зарегистрирована в СЭД',
          message: `Заявка «${created.title}» зарегистрирована в системе электронного документооборота.`,
          date: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(now),
          type: 'success',
          isRead: false,
        } as NotificationItem,
        ...state.notifications,
      ].slice(0, 20);
    } else if (action === 'update_request') {
      const id = typeof body.id === 'string' ? body.id : '';
      const patch = body.patch && typeof body.patch === 'object' ? body.patch as Partial<RequestItem> : {};
      const existing = state.requests.find((item) => item.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Заявка не найдена.' });
        return;
      }
      const allowedPatch: Partial<RequestItem> = {};
      if (typeof patch.comment === 'string') allowedPatch.comment = patch.comment.slice(0, 600);
      if (typeof patch.reason === 'string') allowedPatch.reason = patch.reason.slice(0, 600);
      state.requests = state.requests.map((item) => item.id === id ? { ...item, ...allowedPatch, updatedAt: new Date().toLocaleDateString('ru-RU') } : item);
    } else if (action === 'mark_notification_read') {
      const id = typeof body.id === 'string' ? body.id : '';
      state.notifications = state.notifications.map((item) => item.id === id ? { ...item, isRead: true } : item);
    } else if (action === 'mark_all_notifications_read') {
      state.notifications = state.notifications.map((item) => ({ ...item, isRead: true }));
    } else if (action === 'reset_demo') {
      state.requests = account.requestsData;
      state.notifications = account.notificationsData;
      state.chatHistory = account.chatHistoryData;
    } else if (action === 'update_chat') {
      const messages = Array.isArray(body.messages) ? body.messages : [];
      state.chatHistory = messages.slice(-40) as typeof state.chatHistory;
    } else if (action === 'advance_demo_request') {
      const target = state.requests.find((item) => item.stage !== 5);
      if (target) {
        state.requests = state.requests.map((item) => item.id === target.id ? { ...item, stage: 5, status: 'Готово к выдаче' } : item);
      }
    } else {
      res.status(400).json({ error: 'Неизвестное действие.' });
      return;
    }

    saveState(req, res, state);
    res.status(200).json({ account: publicAccount(account, state) });
  } catch {
    res.status(400).json({ error: 'Некорректный запрос.' });
  }
}
