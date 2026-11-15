import type { RequestItem, UserProfile } from './types';
export function certificateDate(request: RequestItem): Date {
  const ready = request.timestamps?.ready;
  if (ready && Number.isFinite(Date.parse(ready))) return new Date(ready);
  const [d, m, y] = request.createdAt.split('.').map(Number);
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1, 9));
}
export function certificateLines(user: UserProfile, request: RequestItem, en: boolean): string[] {
  return en ? [
    `Request: ${request.title}`, `Student: ${user.name}`, `Faculty: ${user.faculty}`, `Year: ${user.course}. Group: ${user.group}.`,
    'This file demonstrates the outcome of a fictional student request in a competition prototype.',
    'This is not a document issued by MGIMO. The signature is simulated; no electronic signature or external verification is attached.',
  ] : [
    `Заявка: ${request.title}`, `Студент: ${user.name}`, `Факультет: ${user.faculty}`, `Курс: ${user.course}. Группа: ${user.group}.`,
    'Этот файл показывает результат обработки вымышленной заявки в конкурсном прототипе личного кабинета.',
    'Не является документом МГИМО. Подпись имитируется: электронная подпись и внешняя проверка не подключены.',
  ];
}
