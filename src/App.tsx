import { useEffect, useState } from 'react';
import { CalendarDays, ChartColumn, ClipboardList, House, Sparkles, UserRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { getCurrentUser, isAuthenticated, logout } from './auth/authService';
import type { StoredAccount } from './auth/types';

const TABS: { id: TabType; label: string; icon: typeof House }[] = [
  { id: 'dashboard', label: 'Главная', icon: House },
  { id: 'schedule', label: 'Расписание', icon: CalendarDays },
  { id: 'grades', label: 'БРС', icon: ChartColumn },
  { id: 'requests', label: 'Заявки', icon: ClipboardList },
  { id: 'ai', label: 'ИИ-бот', icon: Sparkles },
  { id: 'profile', label: 'Профиль', icon: UserRound },
];

function BottomNav({ activeTab, onChange }: { activeTab: TabType; onChange: (tab: TabType) => void }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="grid grid-cols-6 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 px-0.5 py-2 text-[10px] font-medium leading-tight ${
                active ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

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
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
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

  function handleSendNotification(_studentId: string, message: string) {
    setNotifications((current) => [
      {
        id: `nt-${crypto.randomUUID()}`,
        title: '📬 Сообщение от деканата',
        message,
        date: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date()),
        type: 'warning',
        isRead: false,
      },
      ...current,
    ]);
  }

  const userProfile = currentAccount ? accountToUserProfile(currentAccount) : null;

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 shadow-2xl relative">
        {isLoggedIn && currentAccount && userProfile ? (
          <>
            {/* Admin Mode Toggle */}
            <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">{userProfile.name}</p>
                <p className="text-[10px] text-slate-400">{isAdminMode ? '🏛️ Режим администратора' : '👨‍🎓 Режим студента'}</p>
              </div>
              <AdminModeToggle isAdminMode={isAdminMode} onToggle={setIsAdminMode} />
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              {isAdminMode ? (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 pt-4"
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
                  key="student"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
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

            {!isAdminMode && <BottomNav activeTab={activeTab} onChange={setActiveTab} />}
          </>
        ) : (
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
        )}
      </div>
    </div>
  );
}
