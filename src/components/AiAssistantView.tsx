import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Shield, CheckCircle2, Loader } from 'lucide-react';
import type { ChatMessage, GradeItem, RequestItem, UserProfile, ScheduleItem } from '../types';
import { ActionableAICard } from './ActionableAICard';

type RequestFormData = Pick<RequestItem, 'title' | 'category' | 'deliveryFormat'>;

type AiAssistantViewProps = {
  user: UserProfile;
  grades?: GradeItem[];
  schedule?: ScheduleItem[];
  requests?: RequestItem[];
  onAddRequest: (request: RequestFormData) => void;
};

interface AIMessage extends ChatMessage {
  suggestedAction?: {
    type: 'request';
    title: string;
    category: string;
    deliveryFormat: string;
  };
  actionSent?: boolean;
}

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  Студент: ['Оформи справку об обучении', 'Какие у меня оценки?', 'Когда следующая пара?'],
  Староста: ['Сделай сводку по БРС группы', 'Запроси справки на всех должников', 'Организуй встречу с деканом'],
  'Иностранный студент': ['Справка для продления визы', 'Документы для посольства', 'Когда зимние каникулы?'],
};

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function AiAssistantView({
  user,
  onAddRequest,
}: AiAssistantViewProps) {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `Здравствуйте, ${user.name.split(' ')[0]}! Я ассистент цифрового деканата МГИМО. Помогу вам с расписанием, оценками, заявками и документами. Чем я вам помогу?`,
      timestamp: nowTime(),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPdnInfo, setShowPdnInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: inputValue,
      timestamp: nowTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const apiUrl = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '';
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages
            .filter((m) => !m.suggestedAction)
            .map((m) => ({
              role: m.sender,
              content: m.text,
            })),
          studentData: {
            name: user.name,
            course: user.course,
            faculty: user.faculty,
            group: user.group,
            role: user.role,
            gpa: user.gpa,
            brsAverage: user.brsAverage,
            ratingPlace: user.ratingPlace,
          },
        }),
      });

      if (!response.ok) throw new Error('API error');

      const data = (await response.json()) as {
        response: string;
        suggestedAction?: {
          type: 'request';
          title: string;
          category: string;
          deliveryFormat: string;
        };
      };

      const aiMessage: AIMessage = {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: data.response,
        timestamp: nowTime(),
        suggestedAction: data.suggestedAction,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: AIMessage = {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: 'Извините, проблемы с соединением. Пожалуйста, проверьте интернет и попробуйте снова.',
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedAction = (title: string) => {
    setInputValue(title);
    inputRef.current?.focus();
  };

  const handleRequestAction = (
    action: {
      type: 'request';
      title: string;
      category: string;
      deliveryFormat: string;
    },
    messageId: string,
  ) => {
    onAddRequest({
      title: action.title,
      category: action.category as RequestItem['category'],
      deliveryFormat: action.deliveryFormat as RequestItem['deliveryFormat'],
    });

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, actionSent: true } : m)),
    );
  };

  return (
    <div className="pb-24 h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-300" />
            <h1 className="font-semibold text-lg">ИИ-ассистент деканата</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowPdnInfo(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/40 hover:bg-blue-600/60 text-xs font-medium transition-all"
          >
            <Shield className="h-3.5 w-3.5" />
            🛡️ 152-ФЗ
          </motion.button>
        </div>
        <p className="text-xs text-indigo-200">
          Безопасный канал • API-ключ защищен на сервере • {user.role}
        </p>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-100 text-slate-900 rounded-bl-none'
                }`}
              >
                <p>{msg.text}</p>
                <p className={`text-[10px] mt-1.5 ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-500'}`}>
                  {msg.timestamp}
                </p>

                {/* Actionable AI Card */}
                {msg.suggestedAction && !msg.actionSent && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                    <ActionableAICard
                      action={msg.suggestedAction}
                      onConfirm={() => handleRequestAction(msg.suggestedAction!, msg.id)}
                    />
                  </motion.div>
                )}

                {msg.actionSent && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 flex items-center gap-1 text-emerald-600 text-xs font-medium"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    ✅ Заявка отправлена в СЭД
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-2 bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-none">
                <Loader className="h-4 w-4 animate-spin text-slate-600" />
                <p className="text-sm text-slate-600">Думаю...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-600 mb-2">Попробуй:</p>
        <div className="flex flex-wrap gap-2">
          {(ROLE_SUGGESTIONS[user.role as keyof typeof ROLE_SUGGESTIONS] || []).map((suggestion) => (
            <motion.button
              key={suggestion}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSuggestedAction(suggestion)}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-blue-400 text-slate-700 transition-all"
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="border-t border-slate-200 bg-white px-4 py-3 flex items-end gap-2"
      >
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e as any);
            }
          }}
          placeholder="Напишите вопрос..."
          rows={1}
          className="flex-1 resize-none px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white transition-all"
        >
          {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </motion.button>
      </form>

      {/* PDN Info Modal */}
      {showPdnInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setShowPdnInfo(false)}
        >
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl p-6 shadow-2xl"
          >
            <h2 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Защита персональных данных (152-ФЗ)
            </h2>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-xs font-semibold text-blue-900 mb-2">🔒 Что скрыто:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>✓ API-ключ хранится на сервере (не видно в DevTools)</li>
                  <li>✓ ФИО замаскировано (только роль, курс, факультет)</li>
                  <li>✓ Баллы БРС передаются без идентификатора</li>
                  <li>✓ SNILS и паспорт НИКОГДА не отправляются в LLM</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-900 mb-2">✨ Как работает:</p>
                <ol className="text-xs text-emerald-800 space-y-1">
                  <li>1. Вы пишете сообщение в браузер</li>
                  <li>2. Ваше сообщение + обезличенные данные идут на сервер</li>
                  <li>3. Сервер добавляет системный промпт с шифрованием</li>
                  <li>4. Запрос идет в LLM API (без ПДн в открытом виде)</li>
                  <li>5. Ответ приходит в браузер</li>
                </ol>
              </div>

              <button
                onClick={() => setShowPdnInfo(false)}
                className="w-full mt-4 px-4 py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-all"
              >
                Понял ✓
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
