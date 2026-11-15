import { useUI } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { motion } from '../motion';
import { AnimatePresence } from 'framer-motion';
import { ArrowUp, CircleCheck, KeyRound, RotateCcw, ServerCog, ShieldCheck, Sparkles, UserX } from 'lucide-react';
import type { ChatMessage, RequestItem, UserProfile, SuggestedAction } from '../types';
import { ActionableAICard } from './ActionableAICard';
import { BottomSheet } from './BottomSheet';

type RequestFormData = Pick<RequestItem, 'title' | 'category' | 'deliveryFormat'>;
type AiAssistantViewProps = {
    ownerId: string;
    language: string;
    user: UserProfile;
    messages: ChatMessage[];
    onMessagesChange: Dispatch<SetStateAction<ChatMessage[]>>;
    onAddRequest: (request: RequestFormData) => Promise<RequestItem>;
    onClearChat?: () => void;
};

const ROLE_SUGGESTIONS: Record<string, string[]> = {
    Студент: ['Какие у меня оценки по БРС?', 'Когда следующая пара?', 'Оформи справку об обучении'],
    Староста: ['Какие у меня баллы БРС?', 'Когда следующая пара и есть ли переносы?', 'Оформи справку об успеваемости'],
    'Иностранный студент': ['Оформи справку для продления визы', 'Какие у меня оценки?', 'Когда следующая пара?'],
};

let messageSeq = 0;
function makeId(): string {
    messageSeq += 1;
    return `msg-${crypto.randomUUID()}-${messageSeq}`;
}
function nowTime(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function TypingDots() {
    const uiT = useUI();
    return (<span className="flex items-center gap-1 py-1" aria-label={uiT("Ассистент печатает")}>
      {uiT([0, 1, 2].map((dot) => (<motion.span key={dot} className="h-1.5 w-1.5 rounded-full bg-slate-400" animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}/>)))}
    </span>);
}

function AiMark() {
    return (<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-amber-300 ring-2 ring-white">
      <Sparkles className="h-3.5 w-3.5"/>
    </span>);
}

export default function AiAssistantView({ user, ownerId, language, messages, onMessagesChange, onAddRequest, onClearChat }: AiAssistantViewProps) {
    const uiT = useUI();
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPdnInfo, setShowPdnInfo] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const pendingRef = useRef(false);
    const requestRef = useRef<AbortController | null>(null);
    const aliveRef = useRef(true);

    useEffect(() => {
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
            requestRef.current?.abort();
        };
    }, []);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const hasUserMessages = messages.some((m) => m.sender === 'user');
    const suggestions = ROLE_SUGGESTIONS[user.role ?? 'Студент'] ?? ROLE_SUGGESTIONS['Студент'];

    useEffect(() => {
        const node = scrollRef.current;
        if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        const node = inputRef.current;
        if (!node) return;
        node.style.height = 'auto';
        node.style.height = `${Math.min(node.scrollHeight, 120)}px`;
    }, [inputValue]);

    function handleClear() {
        requestRef.current?.abort();
        requestRef.current = null;
        pendingRef.current = false;
        setIsLoading(false);
        setInputValue('');
        if (onClearChat) {
            onClearChat();
        } else {
            const firstAi = messages.find((m) => m.sender === 'ai');
            onMessagesChange(firstAi ? [firstAi] : []);
        }
    }

    async function send(text: string) {
        const trimmed = text.trim();
        if (!trimmed || pendingRef.current) return;
        pendingRef.current = true;
        const userMessage: ChatMessage = { id: makeId(), sender: 'user', text: trimmed, timestamp: nowTime() };
        const history = [...messages, userMessage];
        onMessagesChange(history);
        setInputValue('');
        setIsLoading(true);
        const controller = new AbortController();
        requestRef.current = controller;
        const timer = setTimeout(() => controller.abort(), 55000);
        try {
            const response = await fetch('/api/chat', {
                credentials: 'include',
                signal: controller.signal,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ownerId,
                    language,
                    messages: history
                        .filter((_, idx) => idx > 0 || history[0]?.sender === 'user')
                        .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
                }),
            });
            const data = (await response.json().catch(() => ({}))) as {
                response?: string;
                suggestedAction?: SuggestedAction;
            };
            if (!response.ok)
                throw new Error(data.response || (response.status === 429 ? 'Лимит запросов к ИИ исчерпан. Попробуйте через минуту.' : 'Сервер временно недоступен'));
            if (!data.response?.trim())
                throw new Error('ИИ вернул пустой ответ. Попробуйте сократить вопрос.');
            if (!aliveRef.current) return;
            onMessagesChange((prev) => [
                ...prev,
                { id: makeId(), sender: 'ai', text: data.response!, timestamp: nowTime(), suggestedAction: data.suggestedAction },
            ]);
        } catch (error) {
            if (!aliveRef.current) return;
            onMessagesChange((prev) => [
                ...prev,
                {
                    id: makeId(),
                    sender: 'ai',
                    text: error instanceof Error && !['AbortError', 'TypeError'].includes(error.name) ? error.message : 'ИИ-сервис не ответил вовремя.',
                    timestamp: nowTime(),
                },
            ]);
        } finally {
            clearTimeout(timer);
            requestRef.current = null;
            pendingRef.current = false;
            if (aliveRef.current) setIsLoading(false);
        }
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        void send(inputValue);
    }

    async function handleRequestAction(action: SuggestedAction, messageId: string) {
        try {
            await onAddRequest({
                title: action.title,
                category: action.category,
                deliveryFormat: action.deliveryFormat,
            });
            if (!aliveRef.current) return;
            onMessagesChange((prev) => prev.map((m) => (m.id === messageId ? { ...m, actionSent: true } : m)));
        } catch {
            if (!aliveRef.current) return;
            onMessagesChange((prev) => [...prev, { id: makeId(), sender: 'ai', text: 'Не удалось создать заявку. Попробуйте ещё раз.', timestamp: nowTime() }]);
        }
    }

    return (<div className="flex h-[calc(100dvh-52px)] flex-col pb-24">
      <header className="relative shrink-0 overflow-hidden rounded-b-3xl bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pb-4 pt-3 text-white shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/25">
            <Sparkles className="h-5 w-5"/>
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-semibold leading-tight tracking-tight">{uiT("ИИ-ассистент деканата")}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"/>
              <span className="truncate">{uiT("Учебный помощник · Демо-данные")}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {uiT(messages.length > 1 && (
              <button
                type="button"
                onClick={handleClear}
                aria-label={uiT("Очистить диалог")}
                title={uiT("Очистить диалог")}
                className="pressable flex items-center gap-1 rounded-xl bg-white/[0.08] px-2.5 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/10 hover:bg-white/[0.14]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-amber-300"/>
                <span>{uiT("Очистить")}</span>
              </button>
            ))}
            <button type="button" onClick={() => setShowPdnInfo(true)} className="pressable flex items-center gap-1 rounded-xl bg-white/[0.08] px-2.5 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/10 hover:bg-white/[0.14]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400"/>
              <span>{uiT("Приватность")}</span>
            </button>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
        <AnimatePresence initial={false}>
          {uiT(messages.map((msg) => {
            const mine = msg.sender === 'user';
            return (<motion.div key={msg.id} layout="position" initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }} style={{ originX: mine ? 1 : 0, originY: 1 }} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                {uiT(!mine && <AiMark />)}
                <div className={`max-w-[80%] px-3.5 py-2.5 text-[14px] leading-relaxed ${mine
                    ? 'rounded-[20px] rounded-br-md bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'rounded-[20px] rounded-bl-md bg-white text-slate-800 shadow-[var(--shadow-card)] ring-1 ring-slate-200/70'}`}>
                  <p className="whitespace-pre-wrap">{msg.sender === 'user' ? msg.text : uiT(msg.text)}</p>
                  <p className={`tabular mt-1 text-right text-[10.5px] ${mine ? 'text-blue-200' : 'text-slate-400'}`}>{uiT(msg.timestamp)}</p>

                  {uiT(msg.suggestedAction && !msg.actionSent && (<ActionableAICard action={msg.suggestedAction} onConfirm={() => handleRequestAction(msg.suggestedAction!, msg.id)}/>))}
                  {uiT(msg.actionSent && (<motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
                      <CircleCheck className="h-3.5 w-3.5"/>{uiT("Заявка отправлена в СЭД")}</motion.p>))}
                </div>
              </motion.div>);
        }))}

          {uiT(isLoading && (<motion.div key="typing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="flex items-end gap-2">
              <AiMark />
              <div className="rounded-[20px] rounded-bl-md bg-white px-4 py-2.5 shadow-[var(--shadow-card)] ring-1 ring-slate-200/70">
                <TypingDots />
              </div>
            </motion.div>))}
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-slate-200/70 bg-slate-50/95 pt-2.5 backdrop-blur">
        <AnimatePresence initial={false}>
          {uiT(!hasUserMessages && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-2.5">
                {uiT(suggestions.map((suggestion, index) => (<motion.button key={suggestion} type="button" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + index * 0.05 }} onClick={() => void send(uiT(suggestion))} className="pressable shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] text-slate-700 hover:border-blue-300 hover:text-blue-700">
                    {uiT(suggestion)}
                  </motion.button>)))}
              </div>
            </motion.div>))}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="px-4 pb-3">
          <div className="flex items-end gap-2 rounded-[22px] border border-slate-200 bg-white py-1.5 pl-4 pr-1.5 shadow-[var(--shadow-card)] transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10">
            <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(inputValue);
            }
        }} placeholder={uiT("Спросите что-нибудь")} rows={1} aria-label={uiT("Сообщение ассистенту")} className="max-h-[120px] min-h-[24px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400"/>
            <motion.button type="submit" aria-label={uiT("Отправить")} disabled={isLoading || !inputValue.trim()} animate={{ scale: inputValue.trim() ? 1 : 0.85, opacity: inputValue.trim() ? 1 : 0.5 }} transition={{ type: 'spring', stiffness: 500, damping: 28 }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white disabled:bg-slate-300">
              <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5}/>
            </motion.button>
          </div>
        </form>
      </div>

      <BottomSheet isOpen={showPdnInfo} onClose={() => setShowPdnInfo(false)} title={uiT("Как защищены ваши данные")} subtitle={uiT("Конкурсный прототип с вымышленными данными")}>
        <ul className="space-y-4">
          {uiT([
            { icon: KeyRound, title: 'Ключ API хранится на сервере', text: 'В браузере и DevTools его не видно.' },
            { icon: UserX, title: 'ФИО заменяется на роль', text: 'Модель получает вымышленные учебные данные текущего аккаунта и сообщения чата.' },
            { icon: ShieldCheck, title: 'Паспорт и СНИЛС не уходят в модель', text: 'Не вводите реальные документы или пароли в чат: сообщения отправляются внешнему ИИ-провайдеру.' },
            { icon: ServerCog, title: 'Запросы идут через прокси деканата', text: 'Ключ хранится на сервере. ИИ не подключён к настоящим системам вуза.' },
        ].map(({ icon: Icon, title, text }, index) => (<motion.li key={title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.06 }} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Icon className="h-4 w-4"/>
              </span>
              <div>
                <p className="text-sm font-medium text-slate-900">{uiT(title)}</p>
                <p className="mt-0.5 text-[13px] text-slate-500">{uiT(text)}</p>
              </div>
            </motion.li>)))}
        </ul>
        <button type="button" onClick={() => setShowPdnInfo(false)} className="pressable mt-6 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{uiT("Понятно")}</button>
      </BottomSheet>
    </div>);
}
