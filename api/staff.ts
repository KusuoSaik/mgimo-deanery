import { randomUUID } from 'node:crypto';
import type { ApiRequest, ApiResponse } from './_server.js';
import { defaultState, getAuthenticatedAccount, getState, isAllowedOrigin, readBody, responseHelpers } from './_server.js';
import { ACCOUNTS_DATABASE } from '../src/auth/accountsDatabase.js';
import { requestDetails, requestLabel, moscowDay } from '../src/portalDomain.js';
import { mutateState, StateConflict, StateStoreUnavailable } from '../server/stateStore.js';
import type { StaffStudent } from '../src/portalDomain.js';
import type { RequestItem } from '../src/types.js';

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  responseHelpers(res); res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST' && !isAllowedOrigin(req)) { res.status(403).json({ error: 'Origin not allowed' }); return; }
  const actor = getAuthenticatedAccount(req);
  if (!actor) { res.status(401).json({ error: 'Войдите в кабинет.' }); return; }
  if (actor.accessRole !== 'staff') { res.status(403).json({ error: 'Доступ только сотруднику деканата.' }); return; }
  try {
    if (req.method === 'GET') {
      const students: StaffStudent[] = await Promise.all(ACCOUNTS_DATABASE.map(async account => {
        const state = await getState(req, account);
        return { id: account.id, name: account.profile.name, group: account.profile.group, requests: state.requests, details: Object.fromEntries(state.requests.map(r => [r.id, requestDetails(r, state.requestDetails?.[r.id])])) };
      }));
      res.status(200).json({ students }); return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Метод не поддерживается.' }); return; }
    const body = await readBody(req);
    const account = ACCOUNTS_DATABASE.find(a => a.id === body.studentId);
    if (!account) { res.status(404).json({ error: 'Студент не найден.' }); return; }
    if (!['advance', 'needs_info', 'comment'].includes(String(body.action))) { res.status(400).json({ error: 'Неизвестное действие.' }); return; }
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if ((body.action !== 'advance' && !text) || text.length > 600) { res.status(400).json({ error: 'Введите комментарий до 600 символов.' }); return; }
    const operationId = typeof body.operationId === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(body.operationId) ? body.operationId : randomUUID();
    const now = new Date(), stamp = now.toISOString(), date = moscowDay(now).split('-').reverse().join('.');
    const result = await mutateState(account.id, defaultState(account), state => {
      const target = state.requests.find(r => r.id === body.id);
      if (!target) throw new StaffError('Заявка не найдена.', 404);
      state.requestDetails ??= {};
      const details = state.requestDetails[target.id] ??= requestDetails(target);
      if (details.events.some(e => e.id === operationId)) return;
      if (body.expectedRevision !== details.revision) throw new StaffError('Заявка изменилась. Обновите очередь.', 409);
      if (details.lifecycle === 'cancelled' || target.stage === 5) throw new StaffError('Обработка завершена.', 409);
      let eventText = text;
      if (body.action === 'advance') {
        if (details.lifecycle === 'needs_info') throw new StaffError('Дождитесь уточнения от студента.', 409);
        target.stage = (target.stage + 1) as RequestItem['stage'];
        target.status = (['Зарегистрирована в СЭД', 'На проверке', 'На подписи', 'Подписано', 'Готово к выдаче'] as const)[target.stage - 1];
        target.timestamps = { ...target.timestamps, [(['registered', 'inReview', 'inSigning', 'signed', 'ready'] as const)[target.stage - 1]]: stamp };
        if (target.stage === 5) target.verificationQrCode = `DEMO-${target.id}`;
        eventText = target.status;
      } else if (body.action === 'needs_info') {
        details.lifecycle = 'needs_info';
        target.comment = text;
      } else { target.comment = text; }
      details.revision++; details.events.push({ id: operationId, at: stamp, actor: 'staff', text: eventText });
      target.updatedAt = stamp;
      state.notifications = [{ id: `nt-${operationId}`, title: requestLabel(target, details), message: `${target.title}: ${eventText}`, date, type: details.lifecycle === 'needs_info' ? 'warning' as const : 'success' as const, isRead: false }, ...state.notifications].slice(0, 100);
    });
    res.status(200).json({ student: { id: account.id, name: account.profile.name, group: account.profile.group, requests: result.data.requests, details: Object.fromEntries(result.data.requests.map(r => [r.id, requestDetails(r, result.data.requestDetails?.[r.id])])) } });
  } catch (error) {
    if (error instanceof StaffError) { res.status(error.status).json({ error: error.message }); return; }
    if (error instanceof StateConflict) { res.status(409).json({ error: 'Заявка изменилась. Обновите очередь.' }); return; }
    if (error instanceof StateStoreUnavailable) { res.status(503).json({ error: error.message }); return; }
    res.status(400).json({ error: 'Некорректный запрос.' });
  }
}
class StaffError extends Error { readonly status: number; constructor(message: string, status: number) { super(message); this.status = status; } }
