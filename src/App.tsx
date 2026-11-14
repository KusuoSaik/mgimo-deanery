import { useUI } from './i18n';
import { SessionWork, isCancelled } from './auth/sessionWork';
import { usePreferences } from './preferences';
import StudentHub from './components/StudentHub';
import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { CalendarDays, ChartColumn, ClipboardList, House, Sparkles, UserRound } from 'lucide-react';
import { motion } from './motion';
import { AnimatePresence, MotionConfig } from 'framer-motion';
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
const TABS: {
    id: TabType;
    label: string;
    icon: typeof House;
}[] = [
    { id: 'dashboard', label: 'Главная', icon: House },
    { id: 'schedule', label: 'Расписание', icon: CalendarDays },
    { id: 'grades', label: 'БРС', icon: ChartColumn },
    { id: 'requests', label: 'Заявки', icon: ClipboardList },
    { id: 'ai', label: 'ИИ-бот', icon: Sparkles },
    { id: 'profile', label: 'Профиль', icon: UserRound },
];
function BottomNav({ activeTab, onChange, badges, english }: {
    english: boolean;
    activeTab: TabType;
    onChange: (tab: TabType) => void;
    badges: Partial<Record<TabType, number>>;
}) {
    const uiT = useUI();
    return (<motion.nav aria-label={uiT("Разделы")} initial={{ y: 90 }} animate={{ y: 0 }} exit={{ y: 90 }} transition={{ type: 'spring', stiffness: 400, damping: 36 }} className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-slate-200/70 bg-white/85 backdrop-blur-xl backdrop-saturate-150">
      <div className="grid grid-cols-6 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
        {uiT(TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeTab;
            const badge = badges[tab.id] ?? 0;
            const labels: Record<TabType, string> = { dashboard: 'Home', schedule: 'Schedule', grades: 'Grades', requests: 'Requests', ai: 'Assistant', profile: 'Profile' };
            return <button key={tab.id} aria-label={english ? labels[tab.id] : tab.label} aria-description={badge > 0 ? (english ? `Unread: ${badge}` : `Непрочитанных: ${badge}`) : undefined} type="button" onClick={() => onChange(tab.id)} aria-current={active ? 'page' : undefined} className={`group relative flex flex-col items-center gap-1 rounded-xl px-0.5 py-1 text-[10.5px] font-medium leading-tight transition-colors duration-200 ${active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><span className="relative flex h-8 w-12 items-center justify-center">{uiT(active && <motion.span layoutId="nav-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} className="absolute inset-0 rounded-full bg-blue-600/10"/>)}<motion.span animate={{ y: active ? -1 : 0, scale: active ? 1.06 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="relative"><Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.3 : 1.9} aria-hidden="true"/></motion.span>{uiT(badge > 0 && <motion.span key="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} className="tabular absolute right-1.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">{uiT(badge)}</motion.span>)}</span>{uiT(english ? labels[tab.id] : tab.label)}</button>;
        }))}
      </div>
    </motion.nav>);
}
const pageVariants = { enter: (direction: number) => ({ opacity: 0, x: direction * 28 }), center: { opacity: 1, x: 0 }, exit: (direction: number) => ({ opacity: 0, x: direction * -20 }) };
function accountToUserProfile(account: StoredAccount): UserProfile { return account.profile; }
export default function App() {
    const uiT = useUI();
    const { english, setEnglish, still } = usePreferences();
    const work = useRef(new SessionWork());
    const [sessionError, setSessionError] = useState('');
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [actionError, setActionError] = useState('');
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
                work.current.begin(account.id);
                applyAccount(account);
                setIsLoggedIn(true);
            }
        }).catch(error => setSessionError(error instanceof Error ? error.message : 'Сервер временно недоступен')).finally(() => setIsLoadingSession(false));
    }, []);
    function setActiveTab(tab: TabType) {
        const from = TABS.findIndex((item) => item.id === activeTabRef.current);
        const to = TABS.findIndex((item) => item.id === tab);
        if (from === to)
            return;
        setDirection(to > from ? 1 : -1);
        activeTabRef.current = tab;
        setActiveTabState(tab);
        window.scrollTo({ top: 0 });
    }
    const chatRef = useRef<ChatMessage[]>([]);
    const chatGeneration = useRef(0);
    useEffect(() => { chatRef.current = chatHistory; }, [chatHistory]);
    useEffect(() => { chatGeneration.current = currentAccount?.chatGeneration ?? 0; }, [currentAccount]);
    async function applyServerAction(action: string, payload: Record<string, unknown> = {}) {
        const operationId = crypto.randomUUID();
        try {
            const result = await work.current.run((ownerId, signal) => performStudentAction(action, { ...payload, ownerId, operationId }, signal));
            // A response to another action must not overwrite a locally pending chat response.
            const { chatHistoryData: _chat, ...account } = result.account;
            void _chat;
            applyAccount({ ...account, chatHistoryData: chatRef.current });
            if (action === 'reset_demo') {
                chatGeneration.current = result.account.chatGeneration ?? 0;
                chatRef.current = result.account.chatHistoryData;
                setChatHistory(chatRef.current);
            }
            return result;
        }
        catch (error) {
            if (!isCancelled(error))
                setActionError(error instanceof Error ? error.message : 'Не удалось сохранить');
            throw error;
        }
    }
    function background(action: string, payload: Record<string, unknown> = {}) { void applyServerAction(action, payload).catch(() => undefined); }
    function handleMarkAllNotificationsRead() { background('mark_all_notifications_read'); }
    function handleMarkNotificationRead(id: string) { background('mark_notification_read', { id }); }
    function handleResetDemoData() {
        if (window.confirm('Сбросить все данные к исходным для текущего аккаунта?'))
            background('reset_demo');
    }
    function handleDemoCompleteRequest() {
        const target = requests.find(item => item.stage < 5);
        if (target)
            background('advance_demo_request', { id: target.id, expectedStage: target.stage });
    }
    async function handleAddRequest(req: Pick<RequestItem, 'title' | 'category' | 'deliveryFormat'>): Promise<RequestItem> {
        const result = await applyServerAction('create_request', req);
        if (!result.createdRequest)
            throw new Error('Сервер не вернул созданную заявку.');
        return result.createdRequest;
    }
    function handleUpdateRequest(updatedRequest: RequestItem) {
        const existing = requests.find(item => item.id === updatedRequest.id);
        if (existing)
            background('advance_demo_request', { id: existing.id, expectedStage: existing.stage });
    }
    function handleLogout() {
        work.current.cancel();
        void logout().then(() => {
            setIsLoggedIn(false);
            setCurrentAccount(null);
            setActionError('');
            setRequests([]);
            setNotifications([]);
            setSchedule([]);
            setGrades([]);
            setChatHistory([]);
            chatRef.current = [];
            setSelectedRequestId(null);
            setActiveTab('dashboard');
        }).catch(error => {
            setActionError(error instanceof Error ? error.message : 'Не удалось выйти');
            if (currentAccount)
                work.current.begin(currentAccount.id);
        });
    }
    function handleMessagesChange(next: SetStateAction<ChatMessage[]>) {
        const updated = typeof next === 'function' ? next(chatRef.current) : next;
        chatRef.current = updated;
        setChatHistory(updated);
        const generation = chatGeneration.current;
        void work.current.run((ownerId, signal) => performStudentAction('update_chat', { ownerId, messages: updated, chatGeneration: generation }, signal))
            .catch((error: unknown) => {
            if (!isCancelled(error))
                setActionError(error instanceof Error ? error.message : 'Не удалось сохранить чат');
        });
    }
    function openRequest(id: string) { setSelectedRequestId(id); setActiveTab('requests'); }
    const userProfile = currentAccount ? accountToUserProfile(currentAccount) : null;
    const unreadCount = notifications.filter((item) => !item.isRead).length;
    if (sessionError)
        return <div role="alert" className="mx-auto min-h-dvh max-w-md space-y-4 bg-slate-950 px-4 py-16 text-white"><p>{uiT(sessionError)}</p><button className="rounded-xl bg-blue-600 px-4 py-3" onClick={() => location.reload()}>{uiT("Повторить")}</button></div>;
    if (isLoadingSession) {
        return <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-sm text-slate-300"><span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-400"/>{uiT("Проверяем защищённую сессию")}</span></div>;
    }
    return <MotionConfig reducedMotion={still ? "always" : "user"}><div className="min-h-dvh bg-slate-200"><div className="relative mx-auto min-h-dvh max-w-md overflow-x-clip bg-slate-50 shadow-2xl shadow-slate-900/20"><AnimatePresence mode="wait" initial={false}>{uiT(isLoggedIn && currentAccount && userProfile ? <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
    <div className="sticky top-0 z-30 flex items-center gap-3 bg-slate-900 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-white"><button type="button" onClick={() => setActiveTab('profile')} className="flex min-w-0 items-center gap-2.5 rounded-xl text-left"><Avatar src={userProfile.avatarUrl} name={userProfile.name} size={32} className="rounded-[10px]"/><span className="min-w-0"><span className="block truncate text-[13px] font-medium leading-tight">{uiT(firstName(userProfile.name))}</span><span className="block truncate text-[11px] leading-tight text-slate-400">{uiT("Группа ")}{uiT(userProfile.group)}{uiT(" • Защищённый демо-кабинет")}</span></span></button></div>
    {uiT(actionError && <p role="alert" className="bg-rose-50 p-4 text-rose-800">{uiT(actionError)}<button onClick={() => setActionError('')} className="ml-3 underline">{uiT("OK")}</button></p>)}
    {uiT((activeTab === 'dashboard') && <StudentHub user={userProfile} grades={grades} schedule={schedule} requests={requests} onNavigate={setActiveTab} onRequest={handleAddRequest} onOpenRequest={openRequest} english={english} setEnglish={setEnglish}/>)}
    <AnimatePresence mode="wait" initial={false} custom={direction}><motion.div key={activeTab} custom={direction} variants={pageVariants} initial="enter" animate="center" exit="exit" transition={{ x: { type: 'spring', stiffness: 420, damping: 40 }, opacity: { duration: 0.18 } }}>
      {uiT(activeTab === 'dashboard' && <DashboardView user={userProfile} schedule={schedule} notifications={notifications} requests={requests} onNavigate={setActiveTab} onMarkNotificationRead={handleMarkNotificationRead} onMarkAllNotificationsRead={handleMarkAllNotificationsRead} onDemoCompleteRequest={handleDemoCompleteRequest}/>)}
      {uiT(activeTab === 'schedule' && <ScheduleView schedule={schedule}/>)}
      {uiT(activeTab === 'grades' && <GradesView user={userProfile} grades={grades}/>)}
      {uiT(activeTab === 'requests' && <RequestsView key={selectedRequestId ?? 'requests-list'} initialRequestId={selectedRequestId} onConsumeInitialRequest={() => setSelectedRequestId(null)} user={userProfile} requests={requests} onAddRequest={handleAddRequest} onUpdateRequest={handleUpdateRequest}/>)}
      {uiT(activeTab === 'profile' && <ProfileView user={userProfile} onLogout={handleLogout} onResetDemoData={handleResetDemoData}/>)}
    </motion.div></AnimatePresence>
    <div hidden={activeTab !== 'ai'}><AiAssistantView key={`${currentAccount.id}-${currentAccount.chatGeneration ?? 0}`} ownerId={currentAccount.id} language={english ? 'en' : 'ru'} user={userProfile} messages={chatHistory} onMessagesChange={handleMessagesChange} onAddRequest={handleAddRequest}/></div>
    <AnimatePresence><BottomNav english={english} key="nav" activeTab={activeTab} onChange={setActiveTab} badges={{ dashboard: unreadCount }}/></AnimatePresence>
  </motion.div> : <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35 }}><LoginScreen onLoginSuccess={(account) => { work.current.begin(account.id); chatRef.current = account.chatHistoryData; chatGeneration.current = account.chatGeneration ?? 0; applyAccount(account); setIsLoggedIn(true); setActiveTab('dashboard'); }}/></motion.div>)}</AnimatePresence></div></div></MotionConfig>;
}
