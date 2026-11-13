import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CircleCheck, Inbox, Send, TriangleAlert, Undo2 } from 'lucide-react';
import type { RequestItem, UserProfile } from '../types';
import { Badge, CountUp, EmptyState, PageHeader, SectionTitle } from './ui/primitives';
import { REQUEST_STATUS_TONE, SPRING } from './ui/tokens';

interface AdminDashboardProps {
  requests: RequestItem[];
  students: UserProfile[];
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string, comment: string) => void;
  onSendNotification: (studentId: string, message: string) => void;
}

const RISK_STUDENTS = [
  {
    name: 'Соколов Дмитрий Игоревич',
    studentId: '24-18205',
    group: 'МЭ-201',
    brsAverage: 51,
    subject: 'Микроэкономика',
    subjectPoints: 38,
  },
];

export const AdminDashboard = ({ requests, onApproveRequest, onRejectRequest, onSendNotification }: AdminDashboardProps) => {
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [pushFor, setPushFor] = useState<string | null>(null);
  const [pushMessage, setPushMessage] = useState('');
  const [sentTo, setSentTo] = useState<string[]>([]);

  const pending = requests.filter((r) => r.stage < 5);
  const awaiting = requests.filter((r) => r.stage === 2 || r.stage === 3);
  const signing = requests.filter((r) => r.stage === 3);
  const completed = requests.filter((r) => r.stage === 5);

  const kpis = [
    { label: 'Всего заявок', value: requests.length, dot: 'bg-slate-300' },
    { label: 'В обработке', value: pending.length, dot: 'bg-amber-400' },
    { label: 'На подписи', value: signing.length, dot: 'bg-blue-400' },
    { label: 'Выдано', value: completed.length, dot: 'bg-emerald-400' },
  ];

  const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="pb-24">
      <PageHeader title="Пульт деканата" subtitle={today.charAt(0).toUpperCase() + today.slice(1)}>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl bg-white/[0.06] px-3.5 py-3 ring-1 ring-inset ring-white/10">
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className={`h-1.5 w-1.5 rounded-full ${kpi.dot}`} />
                {kpi.label}
              </p>
              <CountUp value={kpi.value} className="mt-1 block text-[28px] font-semibold leading-none tracking-tight" duration={0.6} />
            </div>
          ))}
        </div>
      </PageHeader>

      <div className="space-y-6 px-4 pt-5">
        <section className="space-y-3">
          <SectionTitle action={<span className="tabular text-[13px] text-slate-500">{awaiting.length}</span>}>Ждут решения</SectionTitle>
          {awaiting.length === 0 ? (
            <EmptyState icon={Inbox} title="Очередь пуста" hint="Новые заявки студентов появятся здесь" />
          ) : (
            <motion.ul layout className="space-y-2.5">
              <AnimatePresence initial={false} mode="popLayout">
                {awaiting.map((req) => (
                  <motion.li
                    key={req.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                    transition={{ layout: SPRING }}
                    className="card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold leading-snug tracking-tight text-slate-900">{req.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {req.category}, от {req.createdAt}
                        </p>
                      </div>
                      <Badge className={REQUEST_STATUS_TONE[req.status]}>{req.status}</Badge>
                    </div>
                    {req.comment && <p className="mt-2.5 border-l-2 border-slate-200 pl-2.5 text-[13px] text-slate-600">{req.comment}</p>}

                    <div className="mt-3.5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onApproveRequest(req.id)}
                        className="pressable flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                        Подписать ЭЦП
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectFor(rejectFor === req.id ? null : req.id)}
                        aria-expanded={rejectFor === req.id}
                        className={`pressable flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                          rejectFor === req.id ? 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Undo2 className="h-4 w-4" />
                        Вернуть
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {rejectFor === req.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2 pt-3">
                            <label htmlFor={`reject-${req.id}`} className="block text-[13px] font-medium text-slate-700">
                              Что исправить студенту
                            </label>
                            <textarea
                              id={`reject-${req.id}`}
                              value={rejectComment}
                              onChange={(e) => setRejectComment(e.target.value)}
                              rows={2}
                              placeholder="Например, приложите скан приказа о стажировке"
                              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10"
                            />
                            <button
                              type="button"
                              disabled={!rejectComment.trim()}
                              onClick={() => {
                                onRejectRequest(req.id, rejectComment.trim());
                                setRejectFor(null);
                                setRejectComment('');
                              }}
                              className="pressable w-full rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:bg-rose-600/40"
                            >
                              Вернуть на доработку
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle>Группа риска</SectionTitle>
          <p className="-mt-1 px-0.5 text-[13px] text-slate-500">ИИ отмечает студентов, которым грозит недопуск к сессии</p>
          {RISK_STUDENTS.map((student) => {
            const sent = sentTo.includes(student.studentId);
            const open = pushFor === student.studentId;
            return (
              <div key={student.studentId} className="card overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <TriangleAlert className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold leading-snug tracking-tight text-slate-900">{student.name}</p>
                    <p className="tabular mt-0.5 text-xs text-slate-500">
                      № {student.studentId}, группа {student.group}, БРС {student.brsAverage}
                    </p>
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-100">
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span className="text-slate-700">{student.subject}</span>
                        <span className="tabular font-semibold text-amber-700">{student.subjectPoints}/100</span>
                      </div>
                      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <motion.div
                          className="h-full rounded-full bg-amber-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${student.subjectPoints}%` }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        />
                        <span className="absolute inset-y-0 w-px bg-slate-500" style={{ left: '70%' }} />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">До допуска не хватает {70 - student.subjectPoints} баллов</p>
                    </div>
                  </div>
                </div>

                <AnimatePresence initial={false} mode="wait">
                  {sent ? (
                    <motion.p
                      key="sent"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 border-t border-slate-100 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-700"
                    >
                      <CircleCheck className="h-4 w-4" />
                      Уведомление отправлено в кабинет студента
                    </motion.p>
                  ) : open ? (
                    <motion.div
                      key="compose"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden border-t border-slate-100"
                    >
                      <div className="space-y-2 p-4">
                        <textarea
                          value={pushMessage}
                          onChange={(e) => setPushMessage(e.target.value)}
                          rows={3}
                          autoFocus
                          placeholder="Например, приходите на консультацию по микроэкономике в среду в 15:00"
                          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <button
                            type="button"
                            disabled={!pushMessage.trim()}
                            onClick={() => {
                              onSendNotification(student.studentId, pushMessage.trim());
                              setPushMessage('');
                              setPushFor(null);
                              setSentTo((prev) => [...prev, student.studentId]);
                            }}
                            className="pressable flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-600/40"
                          >
                            <Send className="h-4 w-4" />
                            Отправить
                          </button>
                          <button
                            type="button"
                            onClick={() => setPushFor(null)}
                            className="pressable rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="cta"
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setPushFor(student.studentId)}
                      className="flex w-full items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      <Send className="h-4 w-4" />
                      Написать студенту
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </section>

        <p className="px-0.5 text-xs leading-relaxed text-slate-400">
          Демо-режим: подписанная здесь заявка сразу меняет статус в кабинете студента, а сообщение приходит ему в уведомления.
        </p>
      </div>
    </div>
  );
};
