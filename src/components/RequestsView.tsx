import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BadgeCheck,
  FileCheck2,
  FileText,
  Plus,
  QrCode,
  Search,
  X,
} from 'lucide-react';
import type { RequestItem, UserProfile } from '../types';

type RequestFormData = Pick<RequestItem, 'title' | 'category' | 'deliveryFormat'>;
type RequestsViewProps = {
  user: UserProfile;
  requests: RequestItem[];
  onAddRequest: (request: RequestFormData) => void;
};

const STATUS_BADGE: Record<RequestItem['status'], string> = {
  Создано: 'bg-slate-100 text-slate-600 border-slate-200',
  'Проверка деканатом': 'bg-amber-50 text-amber-700 border-amber-200',
  'Подписано ЭЦП': 'bg-blue-50 text-blue-700 border-blue-200',
  Готово: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const STATUS_STEP: Record<RequestItem['status'], number> = {
  Создано: 1,
  'Проверка деканатом': 2,
  'Подписано ЭЦП': 3,
  Готово: 4,
};

const STEPS = ['Создано', 'Проверка', 'ЭЦП', 'Готово'];

const CATEGORY_ICON: Record<RequestItem['category'], typeof FileText> = {
  Справки: FileText,
  Военкомат: BadgeCheck,
  'Финансы и матпомощь': FileCheck2,
  Академические: FileCheck2,
};

const requestCategories: RequestItem['category'][] = [
  'Справки',
  'Военкомат',
  'Финансы и матпомощь',
  'Академические',
];
const deliveryFormats: RequestItem['deliveryFormat'][] = [
  'Электронная с ЭЦП (PDF)',
  'Бумажный оригинал в деканате',
];

const FILTERS: { id: 'all' | RequestItem['status']; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'Создано', label: 'Создано' },
  { id: 'Проверка деканатом', label: 'Проверка' },
  { id: 'Подписано ЭЦП', label: 'ЭЦП' },
  { id: 'Готово', label: 'Готово' },
];

export default function RequestsView({ user, requests, onAddRequest }: RequestsViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | RequestItem['status']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RequestItem['category']>('Справки');
  const [deliveryFormat, setDeliveryFormat] = useState<RequestItem['deliveryFormat']>(deliveryFormats[0]);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('ru');
    return requests.filter((req) => {
      const matchesFilter = selectedFilter === 'all' || req.status === selectedFilter;
      const haystack = `${req.title} ${req.id} ${req.category} ${req.comment ?? ''}`.toLocaleLowerCase('ru');
      return matchesFilter && (!query || haystack.includes(query));
    });
  }, [requests, selectedFilter, searchQuery]);

  const inProgress = requests.filter((item) => item.status !== 'Готово').length;
  const done = requests.filter((item) => item.status === 'Готово').length;

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onAddRequest({ title: trimmedTitle, category, deliveryFormat });
    setTitle('');
    setCategory('Справки');
    setDeliveryFormat(deliveryFormats[0]);
    setIsFormOpen(false);
  }

  return (
    <div className="pb-24">
      <header className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl px-4 pb-6 pt-6 shadow-md">
        <h1 className="font-semibold tracking-tight text-xl">Заявки в деканат</h1>
        <p className="mt-1 text-xs text-slate-300">
          {user.course} курс · {user.group} · {user.studentId}
        </p>
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5">
          <div className="px-2 py-3 text-center">
            <p className="font-semibold tracking-tight text-xl text-white">{requests.length}</p>
            <p className="mt-1 text-[11px] text-slate-300">Всего заявок</p>
          </div>
          <div className="px-2 py-3 text-center">
            <p className="font-semibold tracking-tight text-xl text-amber-400">{inProgress}</p>
            <p className="mt-1 text-[11px] text-slate-300">В работе</p>
          </div>
          <div className="px-2 py-3 text-center">
            <p className="font-semibold tracking-tight text-xl text-emerald-400">{done}</p>
            <p className="mt-1 text-[11px] text-slate-300">Готово</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen((open) => !open)}
          aria-expanded={isFormOpen}
          className="mt-4 flex w-full items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {isFormOpen ? 'Свернуть форму' : 'Создать заявку'}
        </button>
      </header>

      <div className="space-y-4 px-4 py-4">
        {isFormOpen && (
          <form
            onSubmit={submitRequest}
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3"
          >
            <h2 className="font-semibold tracking-tight text-slate-900">Новая заявка</h2>
            <div>
              <label htmlFor="request-title" className="mb-1.5 block text-xs font-medium text-slate-500">
                Тема заявки
              </label>
              <input
                id="request-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={120}
                placeholder="Например: справка об обучении для стажировки"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label htmlFor="request-category" className="mb-1.5 block text-xs font-medium text-slate-500">
                Категория
              </label>
              <select
                id="request-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as RequestItem['category'])}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                {requestCategories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="request-format" className="mb-1.5 block text-xs font-medium text-slate-500">
                Формат получения
              </label>
              <select
                id="request-format"
                value={deliveryFormat}
                onChange={(event) => setDeliveryFormat(event.target.value as RequestItem['deliveryFormat'])}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                {deliveryFormats.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm"
            >
              Отправить заявку
            </button>
            <p className="text-xs leading-relaxed text-slate-500">
              Персональные данные подставляются из профиля автоматически и передаются по защищённому каналу (152-ФЗ).
            </p>
          </form>
        )}

        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-400">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по номеру или теме"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </label>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((filter) => {
            const active = filter.id === selectedFilter;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedFilter(filter.id)}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-100'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Заявок по выбранным критериям не найдено.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredRequests.map((req) => {
              const Icon = CATEGORY_ICON[req.category];
              const step = STATUS_STEP[req.status];
              return (
                <li key={req.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(req)}
                    className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-left transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="font-semibold tracking-tight text-sm leading-snug text-slate-900">
                            {req.title}
                          </h2>
                          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[req.status]}`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {req.category} · {req.deliveryFormat}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
                          {STEPS.map((label, index) => (
                            <span
                              key={label}
                              title={label}
                              className={`h-1.5 flex-1 rounded-full ${
                                index + 1 <= step ? 'bg-blue-600' : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          {req.id} · создана {req.createdAt}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Закрыть детали заявки"
            onClick={() => setSelectedRequest(null)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-detail-title"
            className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[selectedRequest.status]}`}>
                  {selectedRequest.status}
                </span>
                <h2 id="request-detail-title" className="mt-3 font-semibold tracking-tight text-xl text-slate-900">
                  {selectedRequest.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                aria-label="Закрыть"
                className="rounded-full bg-slate-100 p-2 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Номер заявки</dt>
                <dd className="font-mono text-xs font-medium text-slate-900">{selectedRequest.id}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Категория</dt>
                <dd className="font-medium text-slate-900">{selectedRequest.category}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Формат</dt>
                <dd className="text-right font-medium text-slate-900">{selectedRequest.deliveryFormat}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-500">Создана</dt>
                <dd className="font-medium text-slate-900">{selectedRequest.createdAt}</dd>
              </div>
            </dl>

            {selectedRequest.comment && (
              <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3">
                <p className="text-xs font-medium text-slate-500">Комментарий</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{selectedRequest.comment}</p>
              </div>
            )}

            {selectedRequest.verificationQrCode ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <QrCode className="mx-auto h-12 w-12 text-emerald-700" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-emerald-900">Код проверки подлинности</p>
                <p className="mt-1 font-mono text-sm text-emerald-800">{selectedRequest.verificationQrCode}</p>
                <p className="mt-2 text-xs leading-relaxed text-emerald-700">
                  Проверьте код на портале деканата — он подтверждает выданную справку.
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Текущий этап</p>
                <ol className="mt-2 space-y-1.5">
                  {STEPS.map((label, index) => {
                    const passed = index + 1 <= STATUS_STEP[selectedRequest.status];
                    return (
                      <li key={label} className="flex items-center gap-2 text-sm">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                            passed ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className={passed ? 'font-medium text-slate-900' : 'text-slate-400'}>{label}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedRequest(null)}
              className="mt-5 w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm"
            >
              Закрыть
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
