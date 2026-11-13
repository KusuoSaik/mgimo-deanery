import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, Banknote, Download, Eye, FileSearch, FileText, GraduationCap, Plus, Search, ShieldCheck, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RequestItem, UserProfile } from '../types';
import { BottomSheet } from './BottomSheet';
import { LiveRequestTracker } from './LiveRequestTracker';
import { OfficialCertificateGenerator } from './OfficialCertificateGenerator';
import { Badge, Chips, CountUp, EmptyState, PageHeader, Segmented } from './ui/primitives';
import { REQUEST_STAGES, REQUEST_STATUS_TONE, SPRING } from './ui/tokens';

type RequestFormData = Pick<RequestItem, 'title' | 'category' | 'deliveryFormat'>;
type RequestsViewProps = {
  user: UserProfile;
  requests: RequestItem[];
  onAddRequest: (request: RequestFormData) => void;
  onUpdateRequest?: (request: RequestItem) => void;
};

type StatusFilter = RequestItem['status'] | 'all';

const CATEGORY_META: Record<RequestItem['category'], { icon: LucideIcon; tone: string }> = {
  Справки: { icon: FileText, tone: 'bg-blue-50 text-blue-600' },
  Военкомат: { icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-600' },
  'Финансы и матпомощь': { icon: Banknote, tone: 'bg-amber-500/10 text-amber-600' },
  Академические: { icon: GraduationCap, tone: 'bg-indigo-50 text-indigo-600' },
};

const CATEGORIES = Object.keys(CATEGORY_META) as RequestItem['category'][];

const FORMAT_SHORT: Record<RequestItem['deliveryFormat'], string> = {
  'Электронная с ЭЦП (PDF)': 'PDF с ЭЦП',
  'Бумажный оригинал в деканате': 'Бумажный оригинал',
};

const FORMAT_INLINE: Record<RequestItem['deliveryFormat'], string> = {
  'Электронная с ЭЦП (PDF)': 'PDF с ЭЦП',
  'Бумажный оригинал в деканате': 'бумажный оригинал',
};

const FILTER_LABEL: Record<StatusFilter, string> = {
  all: 'Все',
  'Зарегистрирована в СЭД': 'В СЭД',
  'На проверке': 'На проверке',
  'На подписи': 'На подписи',
  Подписано: 'Подписано',
  'Готово к выдаче': 'Готово',
};

export default function RequestsView({ user, requests, onAddRequest, onUpdateRequest }: RequestsViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RequestItem['category']>('Справки');
  const [deliveryFormat, setDeliveryFormat] = useState<RequestItem['deliveryFormat']>('Электронная с ЭЦП (PDF)');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [certificateRequest, setCertificateRequest] = useState<RequestItem | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  const selectedRequest = requests.find((item) => item.id === selectedId) ?? null;

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

  const filterOptions = (['all', ...REQUEST_STAGES.map((stage) => stage.status)] as StatusFilter[])
    .map((value) => ({
      value,
      label: FILTER_LABEL[value],
      count: value === 'all' ? requests.length : requests.filter((req) => req.status === value).length,
    }))
    .filter((option) => option.value === 'all' || option.count > 0 || option.value === selectedFilter);

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onAddRequest({ title: trimmedTitle, category, deliveryFormat });
    setTitle('');
    setCategory('Справки');
    setDeliveryFormat('Электронная с ЭЦП (PDF)');
    setSelectedFilter('all');
    setSearchQuery('');
    setIsFormOpen(false);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  }

  return (
    <div className="pb-24">
      <PageHeader title="Заявки и справки" subtitle="Электронный документооборот деканата">
        <div className="mt-4 grid grid-cols-3 rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10">
          {[
            { label: 'Всего', value: requests.length, accent: 'text-white' },
            { label: 'В работе', value: inProgress, accent: 'text-amber-300' },
            { label: 'Готово', value: done, accent: 'text-emerald-400' },
          ].map((stat, index) => (
            <div key={stat.label} className={`px-2 py-3 text-center ${index > 0 ? 'border-l border-white/10' : ''}`}>
              <CountUp value={stat.value} className={`text-2xl font-semibold tracking-tight ${stat.accent}`} duration={0.6} />
              <p className="mt-0.5 text-[11px] text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="pressable mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Новая заявка
        </button>
      </PageHeader>

      <div className="space-y-3 px-4 pt-4">
        <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-400 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по номеру или названию"
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                type="button"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={() => setSearchQuery('')}
                aria-label="Очистить поиск"
                className="rounded-full bg-slate-200 p-0.5 text-slate-500"
              >
                <X className="h-3 w-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </label>

        <Chips id="req-status" value={selectedFilter} onChange={setSelectedFilter} options={filterOptions} />

        <motion.ul layout className="space-y-2.5 pt-1">
          <AnimatePresence initial={false} mode="popLayout">
            {filteredRequests.map((req, index) => {
              const meta = CATEGORY_META[req.category];
              const Icon = meta.icon;
              const highlight = justAdded && index === 0;
              return (
                <motion.li
                  key={req.id}
                  layout
                  initial={{ opacity: 0, y: -12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                  transition={{ layout: SPRING, duration: 0.3 }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(req.id);
                      setDetailOpen(true);
                    }}
                    className={`card pressable w-full p-4 text-left transition-shadow hover:border-slate-300/80 ${highlight ? 'ring-2 ring-blue-500/60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}>
                        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-slate-900">{req.title}</h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {req.category}, {FORMAT_INLINE[req.deliveryFormat]}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3.5 flex gap-1" aria-label={`Этап ${req.stage} из 5`}>
                      {[1, 2, 3, 4, 5].map((step) => (
                        <span key={step} className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <motion.span
                            className={`block h-full ${req.stage === 5 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                            initial={false}
                            animate={{ width: step <= req.stage ? '100%' : '0%' }}
                            transition={{ duration: 0.35, delay: step * 0.04, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </span>
                      ))}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <Badge className={REQUEST_STATUS_TONE[req.status]}>{req.status}</Badge>
                      <span className="tabular text-xs text-slate-400">{req.createdAt}</span>
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>

        {filteredRequests.length === 0 && (
          <EmptyState
            icon={FileSearch}
            title={requests.length === 0 ? 'Заявок пока нет' : 'Ничего не нашлось'}
            hint={requests.length === 0 ? 'Справки, документы для военкомата и матпомощь оформляются здесь' : 'Измените запрос или сбросьте фильтр'}
            action={
              requests.length === 0 ? (
                <button type="button" onClick={() => setIsFormOpen(true)} className="pressable rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">
                  Создать заявку
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFilter('all');
                  }}
                  className="pressable rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Сбросить фильтры
                </button>
              )
            }
          />
        )}
      </div>

      <BottomSheet isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Новая заявка" subtitle="ФИО, группа и паспортные данные подставятся из профиля">
        <form onSubmit={submitRequest} className="space-y-5">
          <div>
            <label htmlFor="request-title" className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Какой документ нужен
            </label>
            <input
              id="request-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={120}
              placeholder="Например, справка об обучении для стажировки"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-slate-700">Категория</legend>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((item) => {
                const active = item === category;
                const meta = CATEGORY_META[item];
                const Icon = meta.icon;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    aria-pressed={active}
                    className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                      active ? 'text-blue-700' : 'text-slate-700 ring-1 ring-inset ring-slate-200 hover:ring-slate-300'
                    }`}
                  >
                    {active && <motion.span layoutId="category-pill" transition={SPRING} className="absolute inset-0 rounded-xl bg-blue-50 ring-2 ring-inset ring-blue-600" />}
                    <Icon className={`relative h-4 w-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="relative leading-tight">{item}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <p className="mb-1.5 text-[13px] font-medium text-slate-700">Как получить</p>
            <Segmented
              id="delivery"
              value={deliveryFormat}
              onChange={setDeliveryFormat}
              options={[
                { value: 'Электронная с ЭЦП (PDF)', label: 'PDF с ЭЦП' },
                { value: 'Бумажный оригинал в деканате', label: 'Бумажный' },
              ]}
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className="pressable w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400"
          >
            Отправить в деканат
          </button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Данные передаются по 152-ФЗ
          </p>
        </form>
      </BottomSheet>

      <BottomSheet
        isOpen={detailOpen && selectedRequest !== null}
        onClose={() => setDetailOpen(false)}
        title={selectedRequest?.title}
        subtitle={selectedRequest && <Badge className={REQUEST_STATUS_TONE[selectedRequest.status]}>{selectedRequest.status}</Badge>}
      >
        {selectedRequest && (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-inset ring-slate-100">
              <div>
                <dt className="text-xs text-slate-500">Номер</dt>
                <dd className="tabular mt-0.5 font-medium text-slate-900">{selectedRequest.id.toUpperCase()}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Создана</dt>
                <dd className="tabular mt-0.5 font-medium text-slate-900">{selectedRequest.createdAt}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Категория</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{selectedRequest.category}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Получение</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{FORMAT_SHORT[selectedRequest.deliveryFormat]}</dd>
              </div>
            </dl>

            {selectedRequest.comment && (
              <div className="border-l-2 border-slate-200 pl-3">
                <p className="text-xs text-slate-500">Комментарий</p>
                <p className="mt-0.5 text-sm text-slate-700">{selectedRequest.comment}</p>
              </div>
            )}

            <section>
              <h3 className="mb-3 text-[15px] font-semibold tracking-tight text-slate-900">Ход заявки</h3>
              <LiveRequestTracker request={selectedRequest} onStageChange={(updated) => onUpdateRequest?.(updated)} />
            </section>

            <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setCertificateRequest(selectedRequest);
                  setDetailOpen(false);
                }}
                disabled={selectedRequest.stage < 5}
                className="pressable flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <Eye className="h-4 w-4" />
                {selectedRequest.stage < 5 ? 'Документ ещё готовится' : 'Открыть документ'}
              </button>
              <button
                type="button"
                disabled={selectedRequest.stage < 5}
                aria-label="Скачать"
                onClick={() => {
                  setCertificateRequest(selectedRequest);
                  setDetailOpen(false);
                }}
                className="pressable flex items-center justify-center rounded-xl bg-slate-100 px-3.5 py-2.5 text-slate-700 hover:bg-slate-200 disabled:text-slate-300"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      <AnimatePresence>
        {certificateRequest && <OfficialCertificateGenerator user={user} request={certificateRequest} onClose={() => setCertificateRequest(null)} />}
      </AnimatePresence>
    </div>
  );
}
