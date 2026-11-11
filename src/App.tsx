import { useEffect, useState } from 'react';
import { CalendarDays, ChartColumn, ClipboardList, House, Sparkles, UserRound } from 'lucide-react';
import AiAssistantView from './components/AiAssistantView';
import DashboardView from './components/DashboardView';
import GradesView from './components/GradesView';
import { LoginScreen } from './components/LoginScreen';
import { ProfileView } from './components/ProfileView';
import RequestsView from './components/RequestsView';
import ScheduleView from './components/ScheduleView';
import { mockGrades, mockNotifications, mockRequests, mockSchedule, mockUser } from './mockData';
import type { NotificationItem, RequestItem, TabType } from './types';

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

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [requests, setRequests] = useState<RequestItem[]>(() => loadStored('mgimo-requests', mockRequests));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadStored('mgimo-notifications', mockNotifications));

  useEffect(() => {
    localStorage.setItem('mgimo-requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('mgimo-notifications', JSON.stringify(notifications));
  }, [notifications]);

  function handleMarkAllNotificationsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
  }

  function handleDemoCompleteRequest() {
    setRequests((current) => {
      const target = current.find((item) => item.status !== 'Готово');
      return target ? current.map((item) => item.id === target.id ? { ...item, status: 'Готово' } : item) : current;
    });
  }

  function handleAddRequest(req: Omit<RequestItem, 'id' | 'createdAt' | 'status'>) {
    const created: RequestItem = {
      ...req,
      id: `req-${crypto.randomUUID()}`,
      createdAt: new Intl.DateTimeFormat('ru-RU').format(new Date()),
      status: 'Создано',
    };
    setRequests((current) => [created, ...current]);
  }

  function handleMarkNotificationRead(id: string) {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
  }

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 shadow-2xl relative">
        {isLoggedIn ? (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                user={mockUser}
                schedule={mockSchedule}
                notifications={notifications}
                requests={requests}
                onNavigate={setActiveTab}
                onMarkNotificationRead={handleMarkNotificationRead}
                onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                onDemoCompleteRequest={handleDemoCompleteRequest}
              />
            )}
            {activeTab === 'schedule' && <ScheduleView schedule={mockSchedule} />}
            {activeTab === 'grades' && <GradesView user={mockUser} grades={mockGrades} />}
            {activeTab === 'requests' && (
              <RequestsView user={mockUser} requests={requests} onAddRequest={handleAddRequest} />
            )}
            {activeTab === 'ai' && (
              <AiAssistantView
                user={mockUser}
                grades={mockGrades}
                requests={requests}
                onAddRequest={handleAddRequest}
                onNavigateToRequests={() => setActiveTab('requests')}
              />
            )}
            {activeTab === 'profile' && <ProfileView user={mockUser} onLogout={() => setIsLoggedIn(false)} />}
            <BottomNav activeTab={activeTab} onChange={setActiveTab} />
          </>
        ) : (
          <LoginScreen
            onLoginSuccess={() => {
              setIsLoggedIn(true);
              setActiveTab('dashboard');
            }}
          />
        )}
      </div>
    </div>
  );
}
