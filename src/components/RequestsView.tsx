import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  FileCheck2,
  FileText,
  Plus,
  Search,
  X,
  Download,
  Eye,
} from 'lucide-react';
import type { RequestItem, UserProfile } from '../types';
import { LiveRequestTracker } from './LiveRequestTracker';
import { OfficialCertificateGenerator } from './OfficialCertificateGenerator';

type RequestFormData = Pick<RequestItem, 'title' | 'category' | 'deliveryFormat'>;
type RequestsViewProps = {
  user: UserProfile;
  requests: RequestItem[];
  onAddRequest: (request: RequestFormData) => void;
  onUpdateRequest?: (request: RequestItem) => void;
};

const STATUS_BADGE: Record<RequestItem['status'], string> = {
  'Зарегистрирована в СЭД': 'bg-blue-100 text-blue-700 border-blue-200',
  'На проверке': 'bg-amber-100 text-amber-700 border-amber-200',
  'На подписи': 'bg-purple-100 text-purple-700 border-purple-200',
  'Подписано': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Готово к выдаче': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

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

export default function RequestsView({
  user,
  requests,
  onAddRequest,
  onUpdateRequest,
}: RequestsViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<RequestItem['status'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RequestItem['category']>('Справки');
  const [deliveryFormat, setDeliveryFormat] = useState<RequestItem['deliveryFormat']>(
    deliveryFormats[0],
  );
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [certificateRequest, setCertificateRequest] = useState<RequestItem | null>(null);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return requests.filter((req) => {
      const matchesFilter = selectedFilter === 'all' || req.status === selectedFilter;
      const haystack = `${req.title} ${req.id} ${req.category} ${req.comment ?? ''}`.toLowerCase();
      return matchesFilter && (!query || haystack.includes(query));
    });
  }, [requests, selectedFilter, searchQuery]);

  const inProgress = requests.filter((item) => item.stage !== 5).length;
  const done = requests.filter((item) => item.stage === 5).length;

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

  const handleUpdateRequest = (updatedRequest: RequestItem) => {
    if (onUpdateRequest) {
      onUpdateRequest(updatedRequest);
      setSelectedRequest(updatedRequest);
    }
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl px-4 pb-6 pt-6 shadow-md sticky top-0 z-10">
        <h1 className="font-semibold tracking-tight text-xl">Электронный документооборот</h1>
        <p className="mt-1 text-xs text-slate-300">
          {user.course} курс · {user.group} · {user.studentId}
        </p>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-2 py-3 text-center">
            <p className="font-semibold tracking-tight text-xl text-white">{requests.length}</p>
            <p className="mt-1 text-[11px] text-slate-300">Заявок</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="px-2 py-3 text-center">
            <p className="font-semibold tracking-tight text-xl text-amber-400">{inProgress}</p>
            <p className="mt-1 text-[11px] text-slate-300">В обработке</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="px-2 py-3 text-center">
            <p className="font-semibold tracking-tight text-xl text-emerald-400">{done}</p>
            <p className="mt-1 text-[11px] text-slate-300">Готово</p>
          </motion.div>
        </div>

        {/* Create Request Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setIsFormOpen((open) => !open)}
          className="mt-4 flex w-full items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm"
        >
          <Plus className="h-4 w-4" />
          {isFormOpen ? 'Свернуть форму' : 'Новая заявка'}
        </motion.button>
      </header>

      <div className="space-y-4 px-4 py-4">
        {/* Create Form */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.form
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={submitRequest}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3"
            >
              <h2 className="font-semibold tracking-tight text-slate-900">Оформить документ</h2>

              <div>
                <label htmlFor="request-title" className="mb-1.5 block text-xs font-medium text-slate-500">
                  Название документа
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

              <div className="grid grid-cols-2 gap-3">
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
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="request-format" className="mb-1.5 block text-xs font-medium text-slate-500">
                    Способ получения
                  </label>
                  <select
                    id="request-format"
                    value={deliveryFormat}
                    onChange={(event) =>
                      setDeliveryFormat(event.target.value as RequestItem['deliveryFormat'])
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    {deliveryFormats.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm"
              >
                Создать заявку
              </motion.button>

              <p className="text-xs leading-relaxed text-slate-500">
                💡 Совет: данные из профиля автоматически подставятся в документ. Все данные защищены
                (152-ФЗ).
              </p>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Search */}
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-400">
          <Search className="h-4 w-4" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по номеру или названию"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </label>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', ...Object.keys(STATUS_BADGE)].map((filter) => {
            const isActive = filter === selectedFilter;
            const label =
              filter === 'all' ? 'Все' : (filter as RequestItem['status']).split(' ').join('\n');

            return (
              <motion.button
                key={filter}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setSelectedFilter(filter as any)}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-100 hover:border-slate-300'
                }`}
              >
                {label}
              </motion.button>
            );
          })}
        </div>

        {/* Requests List */}
        <AnimatePresence mode="popLayout">
          {filteredRequests.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center"
            >
              <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Заявок по выбранным критериям не найдено</p>
              <p className="text-xs text-slate-400 mt-1">
                Создайте новую заявку, чтобы начать
              </p>
            </motion.div>
          ) : (
            <motion.ul
              className="space-y-3"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                  },
                },
              }}
            >
              {filteredRequests.map((req) => {
                const Icon = CATEGORY_ICON[req.category];
                const isReady = req.stage === 5;

                return (
                  <motion.li
                    key={req.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    variants={{
                      visible: { opacity: 1, x: 0 },
                    }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setSelectedRequest(req)}
                      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-left transition-all hover:border-blue-300"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Icon className="h-5 w-5" />
                        </span>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold tracking-tight text-sm text-slate-900">
                              {req.title}
                            </h3>
                            <span
                              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                STATUS_BADGE[req.status]
                              }`}
                            >
                              {req.stage}/5
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mb-2">
                            {req.category} • {req.deliveryFormat}
                          </p>

                          {/* Progress Bar */}
                          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-2">
                            <motion.div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                              initial={{ width: 0 }}
                              animate={{ width: `${(req.stage / 5) * 100}%` }}
                              transition={{ duration: 0.6 }}
                            />
                          </div>

                          <p className="text-xs text-slate-400">
                            {req.id} • {req.createdAt}
                          </p>
                        </div>

                        {/* Ready Badge */}
                        {isReady && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            className="text-emerald-500"
                          >
                            ✓
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Request Detail Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
                <div>
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[selectedRequest.status]}`}>
                    {selectedRequest.status}
                  </span>
                  <h2 className="mt-2 font-semibold tracking-tight text-lg text-slate-900">
                    {selectedRequest.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Info */}
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500 font-medium">Номер заявки</dt>
                    <dd className="font-mono text-xs font-medium text-slate-900">
                      {selectedRequest.id}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500 font-medium">Категория</dt>
                    <dd className="font-medium text-slate-900">{selectedRequest.category}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500 font-medium">Способ получения</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {selectedRequest.deliveryFormat}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500 font-medium">Создана</dt>
                    <dd className="font-medium text-slate-900">{selectedRequest.createdAt}</dd>
                  </div>
                </dl>

                {/* Live Tracker */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Жизненный цикл заявки</h3>
                  <LiveRequestTracker
                    request={selectedRequest}
                    onStageChange={handleUpdateRequest}
                  />
                </div>

                {/* Comment */}
                {selectedRequest.comment && (
                  <div className="rounded-xl bg-slate-50 px-4 py-3 border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-1">Примечание</p>
                    <p className="text-sm text-slate-700">{selectedRequest.comment}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setCertificateRequest(selectedRequest);
                      setSelectedRequest(null);
                    }}
                    disabled={selectedRequest.stage < 5}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-2.5 transition-all"
                  >
                    <Eye className="h-4 w-4" />
                    Просмотреть документ
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    disabled={selectedRequest.stage < 5}
                    className="flex items-center justify-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-medium px-4 py-2.5 transition-all"
                  >
                    <Download className="h-4 w-4" />
                    Скачать
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Certificate Modal */}
      <AnimatePresence>
        {certificateRequest && (
          <OfficialCertificateGenerator
            user={user}
            request={certificateRequest}
            onClose={() => setCertificateRequest(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
