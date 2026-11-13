import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  CalendarDays,
  CircleCheck,
  Clock,
  DoorOpen,
  FileText,
  Footprints,
  GraduationCap,
  IdCard,
  Info,
  MapPin,
  Sparkles,
  TriangleExclamationPoint,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { findUpcomingClass, formatCountdown } from '../scheduleUtils';
import type { NotificationItem, RequestItem, ScheduleItem, TabType, UserProfile } from '../types';
import { BottomSheet } from './BottomSheet';
import { Avatar, Badge, EmptyState, PageHeader, RollingText, SectionTitle, Segmented } from './ui/primitives';
import { Guilloche } from './ui/Guilloche';
import { PseudoQr } from './ui/PseudoQr';
import { CLASS_TYPE_TONE, REQUEST_STATUS_TONE, firstName, greeting } from './ui/tokens';

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

const NOTIFICATION_STYLE: Record<NotificationItem['type'], { icon: LucideIcon; wrap: string }> = {
  info: { icon: Info, wrap: 'bg-blue-50 text-blue-600' },
  warning: { icon: TriangleExclamationPoint, wrap: 'bg-amber-50 text-amber-600' },
  success: { icon: CircleCheck, wrap: 'bg-emerald-50 text-emerald-600' },
};

let ornamentDrawn = false;

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(date: Date, now: Date): string {
  if (sameDay(date, now)) return 'Сегодня';
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (sameDay(date, tomorrow)) return 'Завтра';
  const text = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  const [studakOpen, setStudakOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const [drawOrnament] = useState(() => {
    const first = !ornamentDrawn;
    ornamentDrawn = true;
    return first;
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const upcoming = findUpcomingClass(schedule, now);
  const unread = notifications.filter((item) => !item.isRead).length;
  const visibleNotifications = notifications.filter((item) => notificationFilter === 'all' || !item.isRead);
  const activeRequests = requests.filter((item) => item.stage !== 5);
  const live = upcoming ? now.getTime() >= upcoming.start.getTime() : false;
  const countdown = upcoming
    ? formatCountdown((live ? upcoming.end.getTime() : upcoming.start.getTime()) - now.getTime())
    : '';
  const liveProgress = upcoming && live
    ? ((now.getTime() - upcoming.start.getTime()) / (upcoming.end.getTime() - upcoming.start.getTime())) * 100
    : 0;

  const quickServices: { label: string; hint: string; tab: TabType; icon: LucideIcon; color: string }[] = [
    {
      label: 'Заявки',
      hint: activeRequests.length > 0 ? `${activeRequests.length} в работе` : 'Заказать справку',
      tab: 'requests',
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
    },
    { label: 'ИИ-ассистент', hint: 'Спросить о чём угодно', tab: 'ai', icon: Sparkles, color: 'bg-amber-500/10 text-amber-600' },
    { label: 'Зачётка', hint: `Средний балл ${user.gpa.toFixed(2).replace('.', ',')}`, tab: 'grades', icon: GraduationCap, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Расписание', hint: 'Неделя целиком', tab: 'schedule', icon: CalendarDays, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="pb-24">
      <PageHeader drawOrnament={drawOrnament} className="pb-14">
        <div className="flex items-start justify-between gap-4 pt-2">
          <div className="min-w-0">
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="text-[13px] text-slate-300"
            >
              {greeting(now)},
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="mt-0.5 text-[30px] font-semibold leading-none tracking-tight"
            >
              {firstName(user.name)}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-3"
            >
              <p className="truncate text-[13px] text-slate-300">{user.faculty}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Badge className="border-white/10 bg-white/[0.07] text-slate-200">{user.course} курс</Badge>
                <Badge className="border-white/10 bg-white/[0.07] text-slate-200">{user.group}</Badge>
                {user.role && user.role !== 'Студент' && (
                  <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-300">{user.role}</Badge>
                )}
              </div>
            </motion.div>
          </div>
          <button
            type="button"
            onClick={() => setStudakOpen(true)}
            aria-label="Открыть студенческий билет"
            className="pressable group relative shrink-0 rounded-2xl"
          >
            <Avatar src={user.avatarUrl} name={user.name} size={60} className="ring-2 ring-white/15 transition group-hover:ring-amber-300/40" />
            <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-slate-900 shadow-md">
              <IdCard className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
          </button>
        </div>
      </PageHeader>

      <div className="relative -mt-9 space-y-6 px-4">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="card overflow-hidden p-0 shadow-[var(--shadow-lift)]"
        >
          {upcoming ? (
            <>
              <div className="p-4 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {live ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-600">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                        </span>
                        Идёт сейчас
                      </span>
                    ) : (
                      <span className="text-[13px] font-medium text-slate-500">Ближайшая пара</span>
                    )}
                  </div>
                  <Badge className={CLASS_TYPE_TONE[upcoming.item.type].badge}>{upcoming.item.type}</Badge>
                </div>

                <h2 className="mt-2.5 text-[17px] font-semibold leading-snug tracking-tight text-slate-900 text-balance">{upcoming.item.subject}</h2>
                <p className="mt-1 text-[13px] text-slate-500">{upcoming.item.professor}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    {dayLabel(upcoming.start, now)}, {upcoming.item.time}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Ауд. {upcoming.item.room}, {upcoming.item.building.toLowerCase()}
                  </span>
                </div>
              </div>

              <div className="mx-4 rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-inset ring-slate-100">
                <p className="text-xs text-slate-500">{live ? 'До конца пары' : 'До начала'}</p>
                <RollingText text={countdown} className="mt-0.5 text-[32px] font-semibold leading-none tracking-tight text-slate-900" />
                {live && (
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-rose-500 transition-[width] duration-1000 ease-linear" style={{ width: `${liveProgress}%` }} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2 p-4">
                <button
                  type="button"
                  onClick={() => setRouteOpen(true)}
                  className="pressable inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
                >
                  <Footprints className="h-4 w-4" aria-hidden="true" />
                  Маршрут по кампусу
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('schedule')}
                  className="pressable rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Неделя
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-900">Пар на ближайшие дни нет</p>
                <p className="text-[13px] text-slate-500">Можно выдохнуть</p>
              </div>
            </div>
          )}
        </motion.section>

        <section className="grid grid-cols-2 gap-2.5">
          {quickServices.map(({ label, hint, tab, icon: Icon, color }) => (
            <button
              key={tab}
              type="button"
              onClick={() => onNavigate(tab)}
              className="card pressable flex flex-col items-start gap-3 p-3.5 text-left hover:border-slate-300/80"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-900">{label}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{hint}</span>
              </span>
            </button>
          ))}
        </section>

        <section className="space-y-3">
          <SectionTitle
            action={
              <button
                type="button"
                disabled={unread === 0}
                onClick={onMarkAllNotificationsRead}
                className="text-[13px] font-medium text-blue-600 transition-colors hover:text-blue-700 disabled:text-slate-300"
              >
                Прочитать все
              </button>
            }
          >
            Уведомления деканата
          </SectionTitle>

          <Segmented
            id="notif-filter"
            value={notificationFilter}
            onChange={setNotificationFilter}
            options={[
              { value: 'all', label: 'Все' },
              {
                value: 'unread',
                label: (
                  <>
                    Новые
                    {unread > 0 && (
                      <span className="tabular rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold leading-[18px] text-white">{unread}</span>
                    )}
                  </>
                ),
              },
            ]}
          />

          <motion.div layout className="card overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              {visibleNotifications.map((item, index) => {
                const style = NOTIFICATION_STYLE[item.type];
                const Icon = style.icon;
                return (
                  <motion.article
                    key={item.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
                    transition={{ layout: { type: 'spring', stiffness: 500, damping: 40 } }}
                    className={`relative flex gap-3 p-4 ${index > 0 ? 'border-t border-slate-100' : ''}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.wrap} ${item.isRead ? 'opacity-60' : ''}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`text-sm leading-snug tracking-tight ${item.isRead ? 'font-medium text-slate-600' : 'font-semibold text-slate-900'}`}>
                          {item.title}
                        </h3>
                        <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
                          {item.date}
                          <AnimatePresence>
                            {!item.isRead && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="h-2 w-2 rounded-full bg-blue-600"
                              />
                            )}
                          </AnimatePresence>
                        </span>
                      </div>
                      <p className={`mt-1 text-[13px] leading-relaxed ${item.isRead ? 'text-slate-400' : 'text-slate-600'}`}>{item.message}</p>
                      <AnimatePresence initial={false}>
                        {!item.isRead && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => onMarkNotificationRead(item.id)}
                              className="pressable mt-2.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-200"
                            >
                              Отметить прочитанным
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
            {visibleNotifications.length === 0 && (
              <div className="flex items-center gap-3 p-4 text-[13px] text-slate-500">
                <Bell className="h-4 w-4 text-slate-300" />
                Новых уведомлений нет
              </div>
            )}
          </motion.div>
        </section>

        <section className="space-y-3">
          <SectionTitle
            action={
              <button type="button" onClick={() => onNavigate('requests')} className="text-[13px] font-medium text-blue-600 hover:text-blue-700">
                Все заявки
              </button>
            }
          >
            Активные заявки
          </SectionTitle>
          {activeRequests.length === 0 ? (
            <EmptyState icon={FileText} title="Сейчас нет заявок в работе" hint="Новую справку можно заказать в разделе «Заявки»" />
          ) : (
            <ul className="card divide-y divide-slate-100 overflow-hidden">
              {activeRequests.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('requests')}
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                      <div className="mt-2 flex gap-1" aria-label={`Этап ${item.stage} из 5`}>
                        {[1, 2, 3, 4, 5].map((step) => (
                          <motion.span
                            key={step}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.05 * step, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className={`h-1 flex-1 origin-left rounded-full ${step <= item.stage ? 'bg-blue-600' : 'bg-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <Badge className={REQUEST_STATUS_TONE[item.status]}>{item.status}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {activeRequests.length > 0 && (
            <button
              type="button"
              onClick={onDemoCompleteRequest}
              className="pressable w-full rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-[13px] font-medium text-slate-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Демо: перевести заявку в «Готово к выдаче»
            </button>
          )}
        </section>
      </div>

      <BottomSheet
        isOpen={routeOpen}
        onClose={() => setRouteOpen(false)}
        title={`До аудитории ${upcoming?.item.room ?? ''}`}
        subtitle={`${upcoming?.item.building ?? 'Главный корпус'}, около 4 минут пешком`}
      >
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-4 text-white">
          <Guilloche className="absolute -right-14 -top-14 h-44 w-44 text-amber-300/15" />
          <DoorOpen className="relative h-6 w-6 text-amber-400" />
          <p className="relative mt-3 text-[15px] font-semibold">{upcoming?.item.building ?? 'Главный корпус'}</p>
          <p className="relative mt-0.5 text-[13px] text-slate-300">Аудитория {upcoming?.item.room ?? '214'}, {upcoming?.item.subject}</p>
        </div>
        <ol className="relative mt-5 space-y-5 pl-1">
          <span className="absolute bottom-3 left-[17px] top-3 w-px bg-slate-200" aria-hidden="true" />
          {[
            { title: 'Войдите через центральный вход', hint: 'Ориентир: стойка информации в холле' },
            { title: 'Поднимитесь на нужный этаж', hint: `Этаж ${(upcoming?.item.room ?? '2')[0]}, лестница справа от гардероба` },
            { title: `Аудитория ${upcoming?.item.room ?? ''}`, hint: 'Следуйте указателям вдоль коридора' },
          ].map((step, index) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + index * 0.08 }}
              className="relative flex gap-3"
            >
              <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white ring-4 ring-white">
                {index + 1}
              </span>
              <div className="pt-0.5">
                <p className="text-sm font-medium text-slate-900">{step.title}</p>
                <p className="mt-0.5 text-[13px] text-slate-500">{step.hint}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </BottomSheet>

      <BottomSheet isOpen={studakOpen} onClose={() => setStudakOpen(false)} tone="dark" title="Студенческий билет" subtitle="Покажите на входе в корпус">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-5 ring-1 ring-white/10">
          <Guilloche draw className="absolute -right-24 -top-20 h-80 w-80 text-amber-300/20" />
          <div className="relative flex items-start justify-between">
            <p className="text-[13px] font-semibold text-amber-300">МГИМО МИД России</p>
            <span className="tabular text-xs text-slate-400">№ {user.studentId}</span>
          </div>
          <div className="relative mt-5 flex gap-3.5">
            <Avatar src={user.avatarUrl} name={user.name} size={64} />
            <div className="min-w-0">
              <p className="font-semibold leading-snug tracking-tight">{user.name}</p>
              <p className="mt-1 text-xs text-slate-300">{user.faculty}</p>
              <p className="mt-1.5 text-xs text-slate-400">{user.course} курс, группа {user.group}</p>
            </div>
          </div>
          <div className="relative mt-5 flex items-center gap-4 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-inset ring-white/10">
            <div className="rounded-xl bg-white p-1.5">
              <PseudoQr token={`${user.studentId}-${user.group}`} className="h-20 w-20" />
            </div>
            <p className="text-xs leading-relaxed text-slate-300">Код обновляется каждую минуту. Подробнее и с таймером в профиле.</p>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
