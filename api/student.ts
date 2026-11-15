import { availableSlots, requestDetails, moscowDay, prettyDate } from '../src/portalDomain.js';
import { randomUUID } from 'node:crypto';
import { StateConflict, StateStoreUnavailable, mutateState } from '../server/stateStore.js';
import type { ApiRequest, ApiResponse } from './_server.js';
import { defaultState, getAuthenticatedAccount, getState, publicAccount, readBody, responseHelpers, isAllowedOrigin } from './_server.js';
import type { ChatMessage, RequestItem } from '../src/types.js';

const categories = ['Справки', 'Военкомат', 'Финансы и матпомощь', 'Академические'];
const formats = ['Электронная с ЭЦП (PDF)', 'Бумажный оригинал в деканате'];
class ActionError extends Error { constructor(message: string, readonly status: number) { super(message); } }
function cleanMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) throw new ActionError('Некорректная история чата.', 400);
  return value.slice(-40).map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new ActionError('Некорректная история чата.', 400);
    const m = item as Record<string, unknown>;
    if (typeof m.id !== 'string' || m.id.length > 100 || !['user', 'ai'].includes(String(m.sender)) || typeof m.text !== 'string' || typeof m.timestamp !== 'string') throw new ActionError('Некорректная история чата.', 400);
    const message: ChatMessage = { id: m.id, sender: m.sender as ChatMessage['sender'], text: m.text.slice(0, 12000), timestamp: m.timestamp.slice(0, 30) };
    if (m.actionSent === true) message.actionSent = true;
    const a = m.suggestedAction as Record<string, unknown> | undefined;
    if (a && a.type === 'request' && typeof a.title === 'string' && categories.includes(String(a.category)) && formats.includes(String(a.deliveryFormat))) {
      message.suggestedAction = { type: 'request', title: a.title.slice(0, 160), category: a.category as RequestItem['category'], deliveryFormat: a.deliveryFormat as RequestItem['deliveryFormat'] };
    }
    return message;
  });
}
export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  responseHelpers(res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST' && !isAllowedOrigin(req)) { res.status(403).json({ error: 'Origin not allowed' }); return; }
  try {
    if (!['GET', 'POST'].includes(req.method || '')) throw new ActionError('Метод не поддерживается', 405);
    const account = getAuthenticatedAccount(req);
    if (!account) throw new ActionError('Сессия истекла. Войдите снова.', 401);
    if (account.accessRole === 'staff') throw new ActionError('Откройте кабинет сотрудника.', 403);
    if (req.method === 'GET') { res.status(200).json({ account: publicAccount(account, await getState(req, account)) }); return; }
    const body = await readBody(req);
    // Bind queued browser work to its original account, even after a cookie changes.
    if (body.ownerId !== account.id) throw new ActionError('Аккаунт изменился. Обновите страницу.', 409);
    const action = body.action;
    const operationId = typeof body.operationId === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(body.operationId) ? body.operationId : randomUUID();
    const createdId = `req-${operationId}`;
    const now = new Date();
    const date = moscowDay(now).split('-').reverse().join('.');
    const stamp = now.toLocaleString('ru-RU');
    if (action === 'advance_demo_request' || action === 'update_request') throw new ActionError('Изменять этап и комментарии может только сотрудник деканата.', 403);
    const result = await mutateState(account.id, defaultState(account), (state): RequestItem | undefined => {
      if (action === 'create_request') {
        const existing = state.requests.find(item => item.id === createdId);
        if (existing) return existing;
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!title || title.length > 160 || !categories.includes(String(body.category)) || !formats.includes(String(body.deliveryFormat))) throw new ActionError('Проверьте название, категорию и формат получения заявки.', 400);
        const created: RequestItem = { id: createdId, title, category: body.category as RequestItem['category'], deliveryFormat: body.deliveryFormat as RequestItem['deliveryFormat'], createdAt: date, stage: 1, status: 'Зарегистрирована в СЭД', timestamps: { registered: stamp } };
        // Do not discard active requests when a new one is created.
        if (state.requests.length >= 200) throw new ActionError('Достигнут лимит демо-заявок. Сбросьте демо-данные в профиле.', 409);
        state.requests.unshift(created);
        state.requestDetails ??= {};
        state.requestDetails[created.id] = requestDetails(created);
        state.notifications = [{ id: `nt-${operationId}`, title: 'Заявка зарегистрирована в СЭД', message: `Заявка «${title}» зарегистрирована в системе электронного документооборота.`, date, type: 'success' as const, isRead: false }, ...state.notifications].slice(0, 100);
        return created;
      }
      if (action === 'cancel_request' || action === 'reply_request') {
        const target = state.requests.find(item => item.id === body.id);
        if (!target) throw new ActionError('Заявка не найдена.', 404);
        state.requestDetails ??= {};
        const details = state.requestDetails[target.id] ??= requestDetails(target);
        if (body.expectedRevision !== details.revision) throw new ActionError('Заявка изменилась. Обновите данные.', 409);
        if (action === 'cancel_request') {
          if (target.stage !== 1 || details.lifecycle !== 'active') throw new ActionError('Отмена доступна только до начала обработки.', 409);
          details.lifecycle = 'cancelled';
          details.events.push({ id: operationId, at: now.toISOString(), actor: 'student', text: 'Заявка отменена студентом' });
        } else {
          if (details.lifecycle !== 'needs_info') throw new ActionError('Уточнение сейчас не требуется.', 409);
          const text = typeof body.text === 'string' ? body.text.trim() : '';
          if (!text || text.length > 600) throw new ActionError('Введите уточнение до 600 символов.', 400);
          details.lifecycle = 'active';
          details.events.push({ id: operationId, at: now.toISOString(), actor: 'student', text });
        }
        details.revision++;
        target.updatedAt = stamp;
      } else if (action === 'book_consultation') {
        const grade = account.gradesData.find(g => g.id === body.gradeId);
        if (!grade) throw new ActionError('Дисциплина не найдена.', 404);
        const slot = availableSlots(grade.id, now).find(s => s.id === body.slotId);
        if (!slot || Date.parse(slot.startsAt) <= now.getTime()) throw new ActionError('Окно устарело. Обновите список.', 409);
        state.consultations ??= [];
        if (state.consultations.some(c => c.gradeId === grade.id && c.status === 'booked' && Date.parse(c.startsAt) > now.getTime())) throw new ActionError('У вас уже есть запись по этому предмету.', 409);
        if (state.consultations.some(c => c.status === 'booked' && c.startsAt === slot.startsAt)) throw new ActionError('На это время уже есть другая консультация.', 409);
        state.consultations = state.consultations.slice(-49);
        state.consultations.push({ id: `consult-${operationId}`, gradeId: grade.id, startsAt: slot.startsAt, status: 'booked' });
        state.notifications.unshift({ id: `nt-${operationId}`, title: 'Консультация запланирована', message: `${grade.subject} · ${prettyDate(slot.startsAt)} МСК. Демо-запись сохранена в кабинете.`, date, type: 'success', isRead: false });
        state.notifications = state.notifications.slice(0, 100);
      } else if (action === 'cancel_consultation') {
        const consultation = state.consultations?.find(c => c.id === body.id);
        if (!consultation) throw new ActionError('Запись не найдена.', 404);
        if (Date.parse(consultation.startsAt) <= now.getTime()) throw new ActionError('Консультация уже началась.', 409);
        consultation.status = 'cancelled';
      } else if (action === 'mark_notification_read') {
        state.notifications = state.notifications.map(item => item.id === body.id ? { ...item, isRead: true } : item);
      } else if (action === 'mark_all_notifications_read') {
        state.notifications = state.notifications.map(item => ({ ...item, isRead: true }));
      } else if (action === 'clear_chat') {
        const initial = structuredClone(defaultState(account));
        state.chatHistory = initial.chatHistory;
        state.chatGeneration = (state.chatGeneration ?? 0) + 1;
      } else if (action === 'reset_demo') {
        const initial = structuredClone(defaultState(account));
        state.requestDetails = {}; state.consultations = [];
        state.requests = initial.requests; state.notifications = initial.notifications; state.chatHistory = initial.chatHistory;
        state.chatGeneration = (state.chatGeneration ?? 0) + 1;
      } else if (action === 'update_chat') {
        if (body.chatGeneration !== (state.chatGeneration ?? 0)) throw new ActionError('История чата была сброшена. Обновите страницу.', 409);
        const messages = cleanMessages(body.messages);
        const merged = new Map(state.chatHistory.map(item => [item.id, item]));
        for (const item of messages) {
          const previous = merged.get(item.id);
          merged.set(item.id, { ...item, ...(previous?.actionSent ? { actionSent: true } : {}) });
        }
        state.chatHistory = [...merged.values()].slice(-40);
      } else throw new ActionError('Неизвестное действие.', 400);
    });
    res.status(200).json({ account: publicAccount(account, result.data), createdRequest: result.result });
  } catch (error) {
    if (error instanceof ActionError) { res.status(error.status).json({ error: error.message }); return; }
    if (error instanceof StateConflict) { res.status(409).json({ error: 'Данные изменились. Повторите действие.' }); return; }
    if (error instanceof StateStoreUnavailable) { res.status(503).json({ error: error.message }); return; }
    res.status(400).json({ error: 'Некорректный запрос.' });
  }
}
