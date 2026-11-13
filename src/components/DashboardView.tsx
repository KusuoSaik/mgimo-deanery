import { useEffect, useState } from 'react';
import {
  Building,
  CircleCheck,
  Clock,
  FileText,
  GraduationCap,
  IdCard,
  Info,
  Sparkles,
  TriangleExclamationPoint,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { findUpcomingClass, formatCountdown } from '../scheduleUtils';
import type { NotificationItem, RequestItem, ScheduleItem, TabType, UserProfile } from '../types';

type DashboardViewProps = {
  user: UserProfile;
  schedule: ScheduleItem[];
  notifications: NotificationItem[];
  requests: RequestItem[];
  onNavigate: (tab: TabType) => void;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onDemoCompleteRequest: () => void;
};

const REQUEST_STATUS: Record<RequestItem['status'], string> = {
  'Зарегистрирована в СЭД': 'bg-blue-100 text-blue-700 border-blue-200',
  'На проверке': 'bg-amber-100 text-amber-700 border-amber-200',
  'На подписи': 'bg-purple-100 text-purple-700 border-purple-200',
  'Подписано': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Готово к выдаче': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const NOTIFICATION_STYLE: Record<NotificationItem['type'], { icon: LucideIcon; wrap: string }> = {
  info: { icon: Info, wrap: 'bg-blue-50 text-blue-700' },
  warning: { icon: TriangleExclamationPoint, wrap: 'bg-amber-50 text-amber-700' },
  success: { icon: CircleCheck, wrap: 'bg-emerald-50 text-emerald-700' },
};

const CLASS_TYPE: Record<ScheduleItem['type'], string> = {
  Лекция: 'bg-blue-50 text-blue-700 border-blue-200',
  Семинар: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Язык: 'bg-amber-50 text-amber-700 border-amber-200',
  Экзамен: 'bg-rose-50 text-rose-700 border-rose-200',
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DashboardView({
  user,
  schedule,
  notifications,
  requests,
  onNavigate,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onDemoCompleteRequest,
}: DashboardViewProps) {
  const [now, setNow] = useState(() => new Date());
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [studakOpen, setStudakOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'Все' | 'Непрочитанные'>('Все');
  const [serviceSearch, setServiceSearch] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const upcoming = findUpcomingClass(schedule, now);
  const unread = notifications.filter((item) => !item.isRead).length;
  const visibleNotifications = notifications.filter((item) => notificationFilter === 'Все' || !item.isRead);
  const quickServices = [
    { label: 'Заявки', tab: 'requests' as const, icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: 'ИИ-ассистент', tab: 'ai' as const, icon: Sparkles, color: 'bg-amber-50 text-amber-600' },
    { label: 'Зачётка', tab: 'grades' as const, icon: GraduationCap, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Профиль', tab: 'profile' as const, icon: IdCard, color: 'bg-slate-900 text-amber-400' },
  ].filter((item) => item.label.toLowerCase().includes(serviceSearch.toLowerCase()));
  const activeRequests = requests.filter((item) => item.stage !== 5);
  const live = upcoming ? now.getTime() >= upcoming.start.getTime() : false;
  const countdown = upcoming
    ? formatCountdown((live ? upcoming.end.getTime() : upcoming.start.getTime()) - now.getTime())
    : '';

  return (
    <div className="pb-24">
      <header className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl px-4 pb-6 pt-6 shadow-md">
        <p className="text-xs text-slate-300">Цифровой деканат МГИМО</p>
        <div className="mt-4 flex items-center gap-3">
          {avatarFailed ? (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold">
              {initials(user.name)}
            </div>
          ) : (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-white/15"
              onError={() => setAvatarFailed(true)}
            />
          )}
          <div className="min-w-0">
            <h1 className="font-semibold tracking-tight text-lg leading-tight">{user.name}</h1>
            <p className="mt-1 truncate text-xs text-slate-300">{user.faculty}</p>
            <span className="mt-2 inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              {user.course} курс · {user.group}
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold tracking-tight text-slate-900">Ближайшая пара</h2>
            <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          {upcoming ? (
            <div className="mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${CLASS_TYPE[upcoming.item.type]}`}>
                  {upcoming.item.type}
                </span>
                <span className="text-xs text-slate-500">
                  {sameDay(upcoming.start, now)
                    ? 'Сегодня'
                    : upcoming.start.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {' · '}
                  {upcoming.item.time}
                </span>
              </div>
              <p className="mt-2 font-semibold tracking-tight text-slate-900">{upcoming.item.subject}</p>
              <p className="mt-1 text-xs text-slate-500">{upcoming.item.professor}</p>
              <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                <Building className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span>
                  {upcoming.item.building}, ауд. {upcoming.item.room}
                </span>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3">
                <p className="text-xs text-slate-500">{live ? 'Идёт сейчас · до конца' : 'До начала'}</p>
                <p className="mt-1 font-semibold tracking-tight text-2xl tabular-nums text-slate-900">{countdown}</p>
              </div>
              <button type="button" onClick={() => setRouteOpen(true)} className="mt-3 w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm">Маршрут по кампусу</button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">На ближайшие дни пар в расписании нет.</p>
          )}
        </section>

        <section>
          <h2 className="font-semibold tracking-tight text-slate-900">Быстрые действия</h2>
          <label className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-400"><Info className="h-4 w-4" aria-hidden="true" /><input value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder="Найти услугу" className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" /></label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {quickServices.map(({ label, tab, icon: Icon, color }) => <button key={tab} type="button" onClick={() => onNavigate(tab)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 text-left transition-all active:scale-[0.99]"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="text-sm font-medium text-slate-900">{label}</span></button>)}
            {quickServices.length === 0 && <p className="col-span-2 py-3 text-sm text-slate-500">Услуги не найдены.</p>}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-2"><h2 className="font-semibold tracking-tight text-slate-900">Уведомления деканата</h2>{unread > 0 && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">{unread} новых</span>}</div>
          <div className="mt-3 flex items-center gap-2">{(['Все', 'Непрочитанные'] as const).map((filter) => <button key={filter} type="button" onClick={() => setNotificationFilter(filter)} className={`rounded-xl px-3 py-2 text-sm font-medium ${notificationFilter === filter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>{filter}</button>)}<button type="button" disabled={unread === 0} onClick={onMarkAllNotificationsRead} className="ml-auto text-xs font-medium text-blue-600 disabled:text-slate-400">Прочитать все</button></div>
          <div className="mt-3 space-y-2">
            {visibleNotifications.map((item) => {
              const style = NOTIFICATION_STYLE[item.type];
              const Icon = style.icon;
              return (
                <article
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 ${item.isRead ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.wrap}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold tracking-tight text-sm text-slate-900">{item.title}</h3>
                        <span className="shrink-0 text-xs text-slate-500">{item.date}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                      {item.isRead ? (
                        <p className="mt-2 text-xs text-slate-400">Прочитано</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onMarkNotificationRead(item.id)}
                          className="mt-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl px-3.5 py-2 text-sm transition-colors"
                        >
                          Отметить прочитанным
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            {visibleNotifications.length === 0 && <p className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">Непрочитанных уведомлений нет.</p>}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold tracking-tight text-slate-900">Активные заявки</h2>
            <button
              type="button"
              onClick={() => onNavigate('requests')}
              className="text-xs font-medium text-blue-600"
            >
              Все
            </button>
          </div>
          {activeRequests.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Сейчас нет заявок в работе.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {activeRequests.slice(0, 3).map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.category} · {item.createdAt}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${REQUEST_STATUS[item.status]}`}>
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {activeRequests.length > 0 && <button type="button" onClick={onDemoCompleteRequest} className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700">Демо: перевести заявку в «Готово»</button>}
      {routeOpen && <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"><button type="button" aria-label="Закрыть маршрут" onClick={() => setRouteOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" /><section role="dialog" aria-modal="true" aria-labelledby="route-title" className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl sm:rounded-2xl"><div className="flex items-start justify-between"><div><span className="text-xs font-medium text-blue-600">МАРШРУТ ПО КАМПУСУ</span><h2 id="route-title" className="mt-1 font-semibold tracking-tight text-xl text-slate-900">До аудитории {upcoming?.item.room}</h2></div><button type="button" onClick={() => setRouteOpen(false)} aria-label="Закрыть" className="rounded-full bg-slate-100 p-2 text-slate-600"><X className="h-4 w-4" /></button></div><div className="mt-5 rounded-2xl bg-slate-900 p-4 text-white"><Building className="h-6 w-6 text-amber-400" /><p className="mt-3 font-semibold">{upcoming?.item.building ?? 'Главный корпус'}</p><p className="mt-1 text-sm text-slate-300">Аудитория {upcoming?.item.room ?? '214'}</p></div><ol className="mt-5 space-y-4"><li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">1</span><div><p className="text-sm font-medium text-slate-900">Войдите через центральный вход</p><p className="mt-0.5 text-xs text-slate-500">Ориентир: стойка информации в холле</p></div></li><li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">2</span><div><p className="text-sm font-medium text-slate-900">Поднимитесь на нужный этаж</p><p className="mt-0.5 text-xs text-slate-500">Следуйте указателям к аудитории {upcoming?.item.room}</p></div></li></ol><div className="mt-5 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3"><span className="text-sm font-medium text-emerald-800">Время в пути</span><span className="font-semibold text-emerald-800">4 мин</span></div></section></div>}

      {studakOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center">
          <div className="relative flex w-full max-w-md items-end">
            <button
              type="button"
              aria-label="Закрыть студенческий билет"
              className="absolute inset-0 bg-slate-900/60"
              onClick={() => setStudakOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Цифровой студенческий билет"
              className="relative w-full px-4 pb-24"
            >
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-medium tracking-[0.18em] text-amber-400">MGIMO</p>
                    <p className="mt-1 font-semibold tracking-tight">Студенческий билет</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStudakOpen(false)}
                    className="rounded-full bg-white/10 p-1.5 text-white"
                    aria-label="Закрыть"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-5 flex gap-3">
                  {avatarFailed ? (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 font-semibold">
                      {initials(user.name)}
                    </div>
                  ) : (
                    <img src={user.avatarUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold tracking-tight leading-snug">{user.name}</p>
                    <p className="mt-1 text-xs text-slate-300">{user.faculty}</p>
                    <p className="mt-2 text-xs text-amber-300">
                      {user.course} курс · {user.group} · № {user.studentId}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-5 gap-1.5" aria-hidden="true">
                  {user.studentId.split('').concat(user.group.split('')).slice(0, 15).map((symbol, index) => (
                    <span
                      key={`${symbol}-${index}`}
                      className={`h-3 rounded-sm ${(symbol.charCodeAt(0) + index) % 2 === 0 ? 'bg-white' : 'bg-white/15'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
