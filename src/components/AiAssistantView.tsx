import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, RotateCcw, Send, Sparkles, AlertCircle } from 'lucide-react';
import type { ChatMessage, GradeItem, RequestItem, UserProfile, ScheduleItem } from '../types';
import { AISettingsModal } from './AISettingsModal';
import { ActionableAICard } from './ActionableAICard';
import {
  sendAIMessage,
  hasAPIKey,
  type ActionableAIAction,
  type AIMessage as AIMessageType,
} from '../services/aiService';

type RequestFormData = Pick<RequestItem, 'title' | 'category' | 'deliveryFormat'>;
type AiAssistantViewProps = {
  user: UserProfile;
  grades: GradeItem[];
  schedule: ScheduleItem[];
  requests: RequestItem[];
  onAddRequest: (request: RequestFormData) => void;
};

const SUGGESTIONS = [
  'Оформи справку об обучении',
  'Какие у меня оценки?',
  'Что с моими заявками?',
];

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function AiAssistantView({
  user,
  grades,
  schedule,
  requests,
  onAddRequest,
}: AiAssistantViewProps) {
  const [messages, setMessages] = useState<(ChatMessage & { actions?: ActionableAIAction[] })[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `Здравствуйте, ${user.name.split(' ')[0]}! Я ассистент цифрового деканата МГИМО. Помогу вам с расписанием, оценками, заявками и документами. Чем я вам помогу?`,
      timestamp: nowTime(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);

    // Добавляем сообщение пользователя
    setMessages((prev) => [
      ...prev,
      { id: `msg-u-${Date.now()}`, sender: 'user', text: trimmed, timestamp: nowTime() },
    ]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (!hasAPIKey()) {
        throw new Error(
          'AI API не подключен. Нажмите на ⚙️ в шапке чата и добавьте API-ключ.',
        );
      }

      // Преобразуем сообщения в формат AI API
      const aiMessages: AIMessageType[] = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      // Отправляем запрос в AI
      const { response, actions } = await sendAIMessage(
        trimmed,
        aiMessages,
        user,
        grades,
        schedule,
        requests,
        [],
      );

      // Добавляем ответ ассистента
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-ai-${Date.now()}`,
          sender: 'ai',
          text: response,
          timestamp: nowTime(),
          actions: actions.length > 0 ? actions : undefined,
        },
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при подключении к AI';
      setError(errorMessage);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-error-${Date.now()}`,
          sender: 'ai',
          text: `❌ ${errorMessage}`,
          timestamp: nowTime(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(inputValue);
  }

  function handleExecuteAction(action: ActionableAIAction) {
    if (action.type === 'CREATE_REQUEST' && action.docType) {
      onAddRequest({
        title: action.docType,
        category: (action.docType.includes('Справк') ? 'Справки' : 'Академические') as any,
        deliveryFormat: action.format || 'Электронная с ЭЦП (PDF)',
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-confirm-${Date.now()}`,
          sender: 'ai',
          text: '✓ Заявка создана и отправлена в деканат. Отслеживайте статус в разделе «Заявки».',
          timestamp: nowTime(),
        },
      ]);
    } else if (action.type === 'BOOK_CONSULTATION') {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-consult-${Date.now()}`,
          sender: 'ai',
          text: `✓ Вы записаны на консультацию по ${action.subject} на ${action.consultDate}. Преподаватель отправит подтверждение.`,
          timestamp: nowTime(),
        },
      ]);
    } else if (action.type === 'CHECK_IN') {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-checkin-${Date.now()}`,
          sender: 'ai',
          text: '✓ Вы отмечены на паре. Посещение зафиксировано.',
          timestamp: nowTime(),
        },
      ]);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl px-4 pb-5 pt-6 shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
              <Bot className="h-5 w-5" />
            </span>
            {hasAPIKey() && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-slate-900"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-semibold tracking-tight text-lg">Ассистент деканата</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-300">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasAPIKey() ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              {hasAPIKey() ? '🟢 AI Online' : '🔴 Требуется настройка'}
            </p>
          </div>

          <AISettingsModal onClose={() => {}} />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setMessages([messages[0]])}
            className="rounded-full bg-white/10 p-2 text-slate-200 transition-colors hover:bg-white/20"
            title="Очистить чат"
          >
            <RotateCcw className="h-4 w-4" />
          </motion.button>
        </div>
      </header>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    isUser
                      ? 'rounded-br-none bg-blue-600 text-white'
                      : 'rounded-bl-none border border-slate-100 bg-white text-slate-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                  <span
                    className={`mt-1 block text-right text-[10px] ${
                      isUser ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>

                  {/* Actionable AI Cards */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                      {msg.actions.map((action, idx) => (
                        <ActionableAICard
                          key={idx}
                          action={action}
                          onExecute={handleExecuteAction}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Loading Indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-none border border-slate-100 bg-white px-4 py-3 shadow-sm">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
                    className="h-2 w-2 rounded-full bg-slate-400"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestions */}
        {messages.length === 1 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 pt-2"
          >
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Возможные вопросы
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <motion.button
                  key={suggestion}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-500/20"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="sticky bottom-0 flex gap-2 border-t border-slate-200 bg-white px-4 py-3"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={hasAPIKey() ? 'Спросите про справку, БРС или расписание' : 'Требуется API-ключ'}
          disabled={!hasAPIKey() || isLoading}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
        />
        <motion.button
          whileHover={hasAPIKey() && inputValue.trim() ? { scale: 1.05 } : {}}
          whileTap={hasAPIKey() && inputValue.trim() ? { scale: 0.95 } : {}}
          type="submit"
          disabled={isLoading || !inputValue.trim() || !hasAPIKey()}
          className="flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </motion.button>
      </form>
    </div>
  );
}
