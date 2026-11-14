import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { CalendarDays, ChartColumn, ClipboardList, House, Sparkles, UserRound } from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Avatar } from './components/ui/primitives';
import { firstName } from './components/ui/tokens';
import AiAssistantView from './components/AiAssistantView';
import DashboardView from './components/DashboardView';
import GradesView from './components/GradesView';
import { LoginScreen } from './components/auth/LoginScreen';
import { ProfileView } from './components/ProfileView';
import RequestsView from './components/RequestsView';
import ScheduleView from './components/ScheduleView';
import type { NotificationItem, RequestItem, TabType, UserProfile, ScheduleItem, GradeItem, ChatMessage } from './types';
import { getCurrentUser, logout, performStudentAction } from './auth/authService';
import type { StoredAccount } from './auth/types';

const TABS: { id: TabType; label: string; icon: typeof House }[] = [
  { id: 'dashboard', label: 'Главная', icon: House },
  { id: 'schedule', label: 'Расписание', icon: CalendarDays },
  { id: 'grades', label: 'БРС', icon: ChartColumn },
  { id: 'requests', label: 'Заявки', icon: ClipboardList },
  { id: 'ai', label: 'ИИ-бот', icon: Sparkles },
  { id: 'profile', label: 'Профиль', icon: UserRound },
];

function BottomNav({ activeTab, onChange, badges }: { activeTab: TabType; onChange: (tab: TabType) => void; badges: Partial<Record<TabType, number>> }) {
  return (
    <motion.nav aria-label="Разделы" initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90 }} transition={{ type: 'spring', stiffness: 400, damping: 36 }} className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-slate-200/70 bg-white/85 backdrop-blur-xl backdrop-saturate-150">
      <div className="grid grid-cols-6 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          const badge = badges[tab.id] ?? 0;
          return <button key={tab.id} type="button" onClick={() => onChange(tab.id)} aria-current={active ? 'page' : undefined} className={`group relative flex flex-col items-center gap-1 rounded-xl px-0.5 py-1 text-[10.5px] font-medium leading-tight transition-colors duration-200 ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><span className="relative flex h-8 w-12 items-center justify-center">{active && <motion.span layoutId="nav-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} className="absolute inset-0 rounded-full bg-blue-600/10" />}<motion.span animate={{ y: active ? -1 : 0, scale: active ? 1.06 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="relative"><Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" /></motion.span>{badge > 0 && <motion.span key="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} className="tabular absolute right-1.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">{badge}</motion.span>}</span>{tab.label}</button>;
        })}
      </div>
    </motion.nav>
  );
}

const pageVariants = { enter: (direction: number) => ({ opacity: 0, x: direction * 28 }), center: { opacity: 1, x: 0 }, exit: (direction: number) => ({ opacity: 0, x: direction * -20 }) };

function accountToUserProfile(account: StoredAccount): UserProfile { return account.profile; }

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [activeTab, setActiveTabState] = useState<TabType>('dashboard');
  const [direction, setDirection] = useState(1);
  const activeTabRef = useRef<TabType>('dashboard');
  const [currentAccount, setCurrentAccount] = useState<StoredAccount | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  function applyAccount(account: StoredAccount) {
    setCurrentAccount(account);
    setRequests(account.requestsData || []);
    setNotifications(account.notificationsData || []);
    setSchedule(account.scheduleData || []);
    setGrades(account.gradesData || []);
    setChatHistory(account.chatHistoryData || []);
  }

  useEffect(() => {
    void getCurrentUser().then((account) => {
      if (account) {
        applyAccount(account);
        setIsLoggedIn(true);
      }
    }).finally(() => setIsLoadingSession(false));
  }, []);

  function setActiveTab(tab: TabType) {
    const from = TABS.findIndex((item) => item.id === activeTabRef.current);
    const to = TABS.findIndex((item) => item.id === tab);
    if (from === to) return;
    setDirection(to > from ? 1 : -1);
    activeTabRef.current = tab;
    setActiveTabState(tab);
    window.scrollTo({ top: 0 });
  }

  function applyServerAction(action: string, payload: Record<string, unknown> = {}) {
    void performStudentAction(action, payload).then(applyAccount).catch((error: unknown) => console.error('Student API error:', error));
  }

  function handleMarkAllNotificationsRead() { applyServerAction('mark_all_notifications_read'); }
  function handleMarkNotificationRead(id: string) { applyServerAction('mark_notification_read', { id }); }
  function handleResetDemoData() {
    if (!window.confirm('Сбросить все данные к исходным для текущего аккаунта?')) return;
    applyServerAction('reset_demo');
  }
  function handleDemoCompleteRequest() { applyServerAction('advance_demo_request'); }
  function handleAddRequest(req: Pick<RequestItem, 'title' | 'category' | 'deliveryFormat'>) { applyServerAction('create_request', req); }
  function handleUpdateRequest(updatedRequest: RequestItem) {
    applyServerAction('update_request', { id: updatedRequest.id, patch: { comment: updatedRequest.comment, reason: updatedRequest.reason } });
  }
  function handleLogout() {
    void logout().finally(() => {
      setIsLoggedIn(false);
      setCurrentAccount(null);
      setRequests([]); setNotifications([]); setSchedule([]); setGrades([]); setChatHistory([]);
      setActiveTab('dashboard');
    });
  }
  function handleMessagesChange(next: SetStateAction<ChatMessage[]>) {
    setChatHistory((current) => {
      const updated = typeof next === 'function' ? next(current) : next;
      void performStudentAction('update_chat', { messages: updated }).catch((error: unknown) => console.error('Chat persistence error:', error));
      return updated;
    });
  }

  const userProfile = currentAccount ? accountToUserProfile(currentAccount) : null;
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  if (isLoadingSession) {
    return <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-sm text-slate-300"><span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />Проверяем защищённую сессию</span></div>;
  }

  return <MotionConfig reducedMotion="user"><div className="min-h-dvh bg-slate-200"><div className="relative mx-auto min-h-dvh max-w-md bg-slate-50 shadow-2xl shadow-slate-900/20"><AnimatePresence mode="wait" initial={false}>{isLoggedIn && currentAccount && userProfile ? <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
    <div className="sticky top-0 z-30 flex items-center gap-3 bg-slate-900 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-white"><button type="button" onClick={() => setActiveTab('profile')} className="flex min-w-0 items-center gap-2.5 rounded-xl text-left"><Avatar src={userProfile.avatarUrl} name={userProfile.name} size={32} className="rounded-[10px]" /><span className="min-w-0"><span className="block truncate text-[13px] font-medium leading-tight">{firstName(userProfile.name)}</span><span className="block truncate text-[11px] leading-tight text-slate-400">Группа {userProfile.group} • Защищённый демо-кабинет</span></span></button></div>
    <AnimatePresence mode="wait" initial={false} custom={direction}><motion.div key={activeTab} custom={direction} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ x: { type: 'spring', stiffness: 420, damping: 40 }, opacity: { duration: 0.18 } }}>
      {activeTab === 'dashboard' && <DashboardView user={userProfile} schedule={schedule} notifications={notifications} requests={requests} onNavigate={setActiveTab} onMarkNotificationRead={handleMarkNotificationRead} onMarkAllNotificationsRead={handleMarkAllNotificationsRead} onDemoCompleteRequest={handleDemoCompleteRequest} />}
      {activeTab === 'schedule' && <ScheduleView schedule={schedule} />}
      {activeTab === 'grades' && <GradesView user={userProfile} grades={grades} />}
      {activeTab === 'requests' && <RequestsView user={userProfile} requests={requests} onAddRequest={handleAddRequest} onUpdateRequest={handleUpdateRequest} />}
      {activeTab === 'ai' && <AiAssistantView user={userProfile} messages={chatHistory} onMessagesChange={handleMessagesChange} onAddRequest={handleAddRequest} />}
      {activeTab === 'profile' && <ProfileView user={userProfile} onLogout={handleLogout} onResetDemoData={handleResetDemoData} />}
    </motion.div></AnimatePresence>
    <AnimatePresence><BottomNav key="nav" activeTab={activeTab} onChange={setActiveTab} badges={{ dashboard: unreadCount }} /></AnimatePresence>
  </motion.div> : <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35 }}><LoginScreen onLoginSuccess={(account) => { applyAccount(account); setIsLoggedIn(true); setActiveTab('dashboard'); }} /></motion.div>}</AnimatePresence></div></div></MotionConfig>;
}
