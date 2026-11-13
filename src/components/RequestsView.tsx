import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { RequestItem } from '../types';
import type { UserProfile } from '../types';

type RequestFormData = Pick<RequestItem, 'title' | 'category' | 'deliveryFormat'>;
type RequestsViewProps = {
  user: UserProfile;
  requests: RequestItem[];
  onAddRequest: (request: RequestFormData) => void;
};

const statusLabels: Record<RequestItem['status'], { text: string; classes: string }> = {
  Создано: { text: 'Создано', classes: 'bg-slate-100 text-slate-700' },
  'Проверка деканатом': { text: 'Проверка деканатом', classes: 'bg-amber-100 text-amber-800' },
  'Подписано ЭЦП': { text: 'Подписано ЭЦП', classes: 'bg-blue-100 text-blue-800' },
  Готово: { text: 'Готово', classes: 'bg-emerald-100 text-emerald-800' },
};

const requestCategories: RequestItem['category'][] = ['Справки', 'Военкомат', 'Финансы и матпомощь', 'Академические'];
const deliveryFormats: RequestItem['deliveryFormat'][] = [
  'Электронная с ЭЦП (PDF)',
  'Бумажный оригинал в деканате',
];

export default function RequestsView({ user, requests, onAddRequest }: RequestsViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | RequestItem['status']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RequestItem['category']>('Справки');
  const [deliveryFormat, setDeliveryFormat] = useState<RequestItem['deliveryFormat']>(deliveryFormats[0]);

  const filteredRequests = useMemo(() => requests.filter((req) => {
    const matchesFilter = selectedFilter === 'all' || req.status === selectedFilter;
    const query = searchQuery.toLocaleLowerCase('ru');
    const matchesSearch = req.title.toLocaleLowerCase('ru').includes(query)
      || req.id.toLocaleLowerCase('ru').includes(query)
      || req.category.toLocaleLowerCase('ru').includes(query);
    return matchesFilter && matchesSearch;
  }), [requests, selectedFilter, searchQuery]);

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onAddRequest({ title: trimmedTitle, category, deliveryFormat });
    setTitle('');
    setIsFormOpen(false);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Центр обработки заявок</h1>
          <p className="text-sm text-slate-500">Заявки студента {user.name}</p>
        </div>
        <button type="button" onClick={() => setIsFormOpen((open) => !open)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
          {isFormOpen ? 'Закрыть форму' : 'Создать заявку'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={submitRequest} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid gap-3">
          <h2 className="font-semibold text-slate-900">Новая заявка</h2>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} placeholder="Что вам нужно?" className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          <div className="grid sm:grid-cols-2 gap-3">
            <select value={category} onChange={(event) => setCategory(event.target.value as RequestItem['category'])} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              {requestCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={deliveryFormat} onChange={(event) => setDeliveryFormat(event.target.value as RequestItem['deliveryFormat'])} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              {deliveryFormats.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <button type="submit" className="justify-self-start px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">Отправить заявку</button>
        </form>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <input type="text" placeholder="Поиск по номеру, теме..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value as typeof selectedFilter)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">Все статусы</option>
          {(Object.keys(statusLabels) as RequestItem['status'][]).map((status) => <option key={status} value={status}>{statusLabels[status].text}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Тема и комментарий</th><th className="px-4 py-3">Категория</th><th className="px-4 py-3">Формат</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3">Создано</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length ? filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{req.id}</td>
                  <td className="px-4 py-3 max-w-xs"><div className="font-medium text-slate-900">{req.title}</div><div className="text-xs text-slate-500">{req.comment ?? '—'}</div></td>
                  <td className="px-4 py-3 text-slate-700">{req.category}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{req.deliveryFormat}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusLabels[req.status].classes}`}>{statusLabels[req.status].text}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{req.createdAt}</td>
                </tr>
              )) : <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Заявок по выбранным критериям не найдено</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
