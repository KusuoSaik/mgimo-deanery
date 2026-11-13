import { useEffect, useRef, useState } from 'react';
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
import { AdminModeToggle } from './components/AdminModeToggle';
import { AdminDashboard } from './components/AdminDashboard';
import type { NotificationItem, RequestItem, TabType, UserProfile, ScheduleItem, GradeItem, ChatMessage } from './types';
import { getCurrentUser, getAllAccounts, isAuthenticated, logout } from './auth/authService';
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
    <motion.nav
      aria-label="Разделы"
      initial={{ y: 90 }}
      animate={{ y: 0 }}
      exit={{ y: 90 }}
      transition={{ type: 'spring', stiffness: 400, damping: 36 }}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-slate-200/70 bg-white/85 backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="grid grid-cols-6 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          const badge = badges[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex flex-col items-center gap-1 rounded-xl px-0.5 py-1 text-[10.5px] font-medium leading-tight transition-colors duration-200 ${
                active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="relative flex h-8 w-12 items-center justify-center">
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 rounded-full bg-blue-600/10"
                  />
                )}
                <motion.span
                  animate={{ y: active ? -1 : 0, scale: active ? 1.06 : 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="relative"
                >
                  <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" />
                </motion.span>
                <AnimatePresence>
                  {badge > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 26 }}
                      className="tabular absolute right-1.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white"
                    >
                      {badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}

const pageVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -20 }),
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Конвертер StoredAccount в UserProfile
function accountToUserProfile(account: StoredAccount): UserProfile {
  return account.profile;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => isAuthenticated());
  const [activeTab, setActiveTabState] = useState<TabType>('dashboard');
  const [direction, setDirection] = useState(1);
  const activeTabRef = useRef<TabType>('dashboard');

  function setActiveTab(tab: TabType) {
    const from = TABS.findIndex((item) => item.id === activeTabRef.current);
    const to = TABS.findIndex((item) => item.id === tab);
    if (from === to) return;
    setDirection(to > from ? 1 : -1);
    activeTabRef.current = tab;
    setActiveTabState(tab);
    window.scrollTo({ top: 0 });
  }
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<StoredAccount | null>(() => getCurrentUser());
  const [requests, setRequests] = useState<RequestItem[]>(() => {
    const account = getCurrentUser();
    if (account) {
      return loadStored(`mgimo_requests_${account.id}`, account.requestsData);
    }
    return [];
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const account = getCurrentUser();
    if (account) {
      return loadStored(`mgimo_notifications_${account.id}`, account.notificationsData);
    }
    return [];
  });
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    const account = getCurrentUser();
    if (account) {
      return loadStored(`mgimo_schedule_${account.id}`, account.scheduleData);
    }
    return [];
  });
  const [grades, setGrades] = useState<GradeItem[]>(() => {
    const account = getCurrentUser();
    if (account) {
      return loadStored(`mgimo_grades_${account.id}`, account.gradesData);
    }
    return [];
  });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const account = getCurrentUser();
    if (account) {
      return loadStored(`mgimo_chat_${account.id}`, account.chatHistoryData);
    }
    return [];
  });

  // Синхронизация данных при смене аккаунта
  useEffect(() => {
    const account = getCurrentUser();
    if (account) {
      setCurrentAccount(account);
      setIsLoggedIn(true);
      setRequests(loadStored(`mgimo_requests_${account.id}`, account.requestsData));
      setNotifications(loadStored(`mgimo_notifications_${account.id}`, account.notificationsData));
      setSchedule(loadStored(`mgimo_schedule_${account.id}`, account.scheduleData));
      setGrades(loadStored(`mgimo_grades_${account.id}`, account.gradesData));
      setChatHistory(loadStored(`mgimo_chat_${account.id}`, account.chatHistoryData));
    } else {
      setCurrentAccount(null);
      setIsLoggedIn(false);
    }
  }, [isLoggedIn]);

  // Сохранение данных в localStorage
  useEffect(() => {
    if (currentAccount) {
      localStorage.setItem(`mgimo_requests_${currentAccount.id}`, JSON.stringify(requests));
    }
  }, [requests, currentAccount]);

  useEffect(() => {
    if (currentAccount) {
      localStorage.setItem(`mgimo_notifications_${currentAccount.id}`, JSON.stringify(notifications));
    }
  }, [notifications, currentAccount]);

  useEffect(() => {
    if (currentAccount) {
      localStorage.setItem(`mgimo_schedule_${currentAccount.id}`, JSON.stringify(schedule));
    }
  }, [schedule, currentAccount]);

  useEffect(() => {
    if (currentAccount) {
      localStorage.setItem(`mgimo_grades_${currentAccount.id}`, JSON.stringify(grades));
    }
  }, [grades, currentAccount]);

  useEffect(() => {
    if (currentAccount) {
      localStorage.setItem(`mgimo_chat_${currentAccount.id}`, JSON.stringify(chatHistory));
    }
  }, [chatHistory, currentAccount]);

  function handleMarkAllNotificationsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
  }

  function handleResetDemoData() {
    if (!window.confirm('Сбросить все данные к исходным для текущего аккаунта?')) return;

    if (currentAccount) {
      setRequests(currentAccount.requestsData);
      setNotifications(currentAccount.notificationsData);
      setSchedule(currentAccount.scheduleData);
      setGrades(currentAccount.gradesData);
      setChatHistory(currentAccount.chatHistoryData);
    }
  }

  function handleDemoCompleteRequest() {
    setRequests((current) => {
      const target = current.find((item) => item.stage !== 5);
      return target ? current.map((item) => item.id === target.id ? { ...item, stage: 5, status: 'Готово к выдаче' } : item) : current;
    });
  }

  function handleAddRequest(req: Pick<RequestItem, 'title' | 'category' | 'deliveryFormat'>) {
    const now = new Date();
    const created: RequestItem = {
      ...req,
      id: `req-${crypto.randomUUID()}`,
      createdAt: new Intl.DateTimeFormat('ru-RU').format(now),
      stage: 1,
      status: 'Зарегистрирована в СЭД',
    };
    setRequests((current) => [created, ...current]);
    setNotifications((current) => [{
      id: `nt-${crypto.randomUUID()}`,
      title: 'Заявка зарегистрирована в СЭД',
      message: `Заявка «${created.title}» зарегистрирована в системе электронного документооборота.`,
      date: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(now),
      type: 'success',
      isRead: false,
    }, ...current]);
  }

  function handleUpdateRequest(updatedRequest: RequestItem) {
    setRequests((current) =>
      current.map((item) => (item.id === updatedRequest.id ? updatedRequest : item)),
    );
  }

  function handleMarkNotificationRead(id: string) {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
  }

  function handleLogout() {
    logout();
    setIsLoggedIn(false);
    setCurrentAccount(null);
    setActiveTab('dashboard');
  }

  function handleSwitchAccount(newAccount: StoredAccount) {
    // Сохраняем текущие данные перед переключением
    if (currentAccount) {
      localStorage.setItem(`mgimo_requests_${currentAccount.id}`, JSON.stringify(requests));
      localStorage.setItem(`mgimo_notifications_${currentAccount.id}`, JSON.stringify(notifications));
    }

    // Загружаем данные нового аккаунта
    setCurrentAccount(newAccount);
    setRequests(loadStored(`mgimo_requests_${newAccount.id}`, newAccount.requestsData));
    setNotifications(loadStored(`mgimo_notifications_${newAccount.id}`, newAccount.notificationsData));
    setSchedule(loadStored(`mgimo_schedule_${newAccount.id}`, newAccount.scheduleData));
    setGrades(loadStored(`mgimo_grades_${newAccount.id}`, newAccount.gradesData));
    setChatHistory(loadStored(`mgimo_chat_${newAccount.id}`, newAccount.chatHistoryData));
  }

  function handleApproveRequest(id: string) {
    setRequests((current) =>
      current.map((item) =>
        item.id === id ? { ...item, stage: 4, status: 'Подписано' as const } : item,
      ),
    );
  }

  function handleRejectRequest(id: string, comment: string) {
    setRequests((current) =>
      current.map((item) =>
        item.id === id ? { ...item, stage: 2, status: 'На проверке' as const, comment } : item,
      ),
    );
  }

  function handleSendNotification(studentId: string, message: string) {
    const notification: NotificationItem = {
      id: `nt-${crypto.randomUUID()}`,
      title: 'Сообщение от деканата',
      message,
      date: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date()),
      type: 'warning',
      isRead: false,
    };
    const recipient = getAllAccounts().find((account) => account.profile.studentId === studentId);

    if (!recipient) return;

    const storageKey = `mgimo_notifications_${recipient.id}`;
    const currentNotifications = loadStored<NotificationItem[]>(storageKey, recipient.notificationsData);
    localStorage.setItem(storageKey, JSON.stringify([notification, ...currentNotifications]));

    if (currentAccount?.id === recipient.id) {
      setNotifications([notification, ...currentNotifications]);
    }
  }

  const userProfile = currentAccount ? accountToUserProfile(currentAccount) : null;

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-slate-200">
        <div className="relative mx-auto min-h-dvh max-w-md bg-slate-50 shadow-2xl shadow-slate-900/20">
          <AnimatePresence mode="wait" initial={false}>
            {isLoggedIn && currentAccount && userProfile ? (
              <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-slate-900 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-white">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminMode(false);
                      setActiveTab('profile');
                    }}
                    className="flex min-w-0 items-center gap-2.5 rounded-xl text-left"
                  >
                    <Avatar src={userProfile.avatarUrl} name={userProfile.name} size={32} className="rounded-[10px]" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium leading-tight">{firstName(userProfile.name)}</span>
                      <span className="block truncate text-[11px] leading-tight text-slate-400">
                        {isAdminMode ? 'Пульт деканата' : `Группа ${userProfile.group}`}
                      </span>
                    </span>
                  </button>
                  <AdminModeToggle isAdminMode={isAdminMode} onToggle={setIsAdminMode} />
                </div>

                <AnimatePresence mode="wait" initial={false} custom={direction}>
                  {isAdminMode ? (
                    <motion.div
                      key="admin"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <AdminDashboard
                        requests={requests}
                        students={[userProfile]}
                        onApproveRequest={handleApproveRequest}
                        onRejectRequest={handleRejectRequest}
                        onSendNotification={handleSendNotification}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={activeTab}
                      custom={direction}
                      variants={pageVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ x: { type: 'spring', stiffness: 420, damping: 40 }, opacity: { duration: 0.18 } }}
                    >
                      {activeTab === 'dashboard' && (
                        <DashboardView
                          user={userProfile}
                          schedule={schedule}
                          notifications={notifications}
                          requests={requests}
                          onNavigate={setActiveTab}
                          onMarkNotificationRead={handleMarkNotificationRead}
                          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                          onDemoCompleteRequest={handleDemoCompleteRequest}
                        />
                      )}
                      {activeTab === 'schedule' && <ScheduleView schedule={schedule} />}
                      {activeTab === 'grades' && <GradesView user={userProfile} grades={grades} />}
                      {activeTab === 'requests' && (
                        <RequestsView user={userProfile} requests={requests} onAddRequest={handleAddRequest} onUpdateRequest={handleUpdateRequest} />
                      )}
                      {activeTab === 'ai' && (
                        <AiAssistantView
                          user={userProfile}
                          grades={grades}
                          schedule={schedule}
                          requests={requests}
                          onAddRequest={handleAddRequest}
                        />
                      )}
                      {activeTab === 'profile' && (
                        <ProfileView
                          user={userProfile}
                          account={currentAccount}
                          onLogout={handleLogout}
                          onSwitchAccount={handleSwitchAccount}
                          onResetDemoData={handleResetDemoData}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {!isAdminMode && <BottomNav key="nav" activeTab={activeTab} onChange={setActiveTab} badges={{ dashboard: unreadCount }} />}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35 }}>
                <LoginScreen
                  onLoginSuccess={() => {
                    const user = getCurrentUser();
                    if (user) {
                      setCurrentAccount(user);
                      setIsLoggedIn(true);
                      setActiveTab('dashboard');
                    }
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
