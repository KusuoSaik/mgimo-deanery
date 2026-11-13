import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Bot, FileText, RotateCcw, Send, Sparkles } from 'lucide-react';
import type { ChatMessage, GradeItem, RequestItem, UserProfile } from '../types';
import { initialChatMessages } from '../mockData';

type RequestFormData = Pick<RequestItem, 'title' | 'category' | 'deliveryFormat'>;
type AiAssistantViewProps = {
  user: UserProfile;
  grades: GradeItem[];
  requests: RequestItem[];
  onAddRequest: (request: RequestFormData) => void;
  onNavigateToRequests: () => void;
};

const SUGGESTIONS = [
  'Оформи справку об обучении',
  'Где у меня самый низкий БРС?',
  'Что с моими заявками?',
];

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function AiAssistantView({
  user,
  grades,
  requests,
  onAddRequest,
  onNavigateToRequests,
}: AiAssistantViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  function buildReply(text: string): ChatMessage {
    const firstName = user.name.split(' ')[0];
    const id = `msg-${Date.now()}`;
    const timestamp = nowTime();

    if (/справк|военкомат|документ|эцп/i.test(text)) {
      return {
        id,
        sender: 'ai',
        text: `Понял, ${firstName}. Могу оформить справку об обучении с электронной подписью (ЭЦП) — документ придёт в личный кабинет с кодом проверки подлинности.`,
        timestamp,
        suggestedRequest: {
          title: 'Справка об обучении с ЭЦП',
          category: 'Справки',
          deliveryFormat: 'Электронная с ЭЦП (PDF)',
        },
      };
    }

    if (/брс|балл|оцен|зачёт|зачет|успеваем/i.test(text)) {
      const weakest = [...grades].sort((a, b) => a.brsPoints - b.brsPoints)[0];
      const strongest = [...grades].sort((a, b) => b.brsPoints - a.brsPoints)[0];
      const attention = grades.filter((item) => item.status === 'Требует внимания');
      if (!weakest) {
        return { id, sender: 'ai', text: 'Баллы БРС пока не выставлены — уточните у преподавателя.', timestamp };
      }
      const attentionNote = attention.length
        ? ` Сейчас требует внимания: «${attention.map((item) => item.subject).join(', ')}».`
        : ' Все дисциплины в зелёной зоне.';
      return {
        id,
        sender: 'ai',
        text: `Средний БРС — ${user.brsAverage} баллов из 100, средний балл — ${user.gpa.toFixed(2)}. Сильнее всего: «${strongest.subject}» (${strongest.brsPoints}). Слабее всего: «${weakest.subject}» (${weakest.brsPoints}).${attentionNote}`,
        timestamp,
      };
    }

    if (/заявк|статус|справк.*готов/i.test(text)) {
      const active = requests.filter((item) => item.status !== 'Готово');
      const done = requests.filter((item) => item.status === 'Готово');
      const summary = active.length
        ? `В работе ${active.length}: ${active.map((item) => `«${item.title}» (${item.status})`).join('; ')}.`
        : 'Активных заявок нет.';
      return {
        id,
        sender: 'ai',
        text: `${summary} Готовых документов: ${done.length}. Статус обновляет деканат автоматически — я сообщу, когда документ будет подписан.`,
        timestamp,
      };
    }

    if (/расписан|пара|аудитор|заняти/i.test(text)) {
      return {
        id,
        sender: 'ai',
        text: `Открыл раздел «Расписание» — там видны ближайшие пары, аудитория и преподаватель, а также переключатель чётной и нечётной недели.`,
        timestamp,
      };
    }

    return {
      id,
      sender: 'ai',
      text: `Принял запрос «${text}». У меня доступ к контуру деканата: расписание, БРС по ${grades.length} дисциплинам и вашим заявкам. Уточните, что именно нужно, — отвечу по существу.`,
      timestamp,
    };
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { id: `msg-u-${Date.now()}`, sender: 'user', text: trimmed, timestamp: nowTime() },
    ]);
    setInputValue('');
    setIsLoading(true);

    window.setTimeout(() => {
      setMessages((prev) => [...prev, buildReply(trimmed)]);
      setIsLoading(false);
      inputRef.current?.focus();
    }, 700);
  }

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(inputValue);
  }

  function createSuggestedRequest(message: ChatMessage) {
    const suggestion = message.suggestedRequest;
    if (!suggestion) return;
    onAddRequest(suggestion);
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-a-${Date.now()}`,
        sender: 'ai',
        text: 'Заявка принята в обработку деканатом. Отслеживать статус можно в разделе «Заявки».',
        timestamp: nowTime(),
      },
    ]);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl px-4 pb-5 pt-6 shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold tracking-tight text-lg">Ассистент деканата</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Готов к диалогу · {grades.length} дисциплин · {requests.length} заявок
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMessages(initialChatMessages)}
            aria-label="Очистить чат"
            className="rounded-full bg-white/10 p-2 text-slate-200 transition-colors hover:bg-white/20"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label="История диалога с ассистентом"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                isUser
                  ? 'rounded-br-none bg-blue-600 text-white'
                  : 'rounded-bl-none border border-slate-100 bg-white text-slate-800'
              }`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                <span className={`mt-1 block text-right text-[10px] ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>
                  {msg.timestamp}
                </span>
                {msg.suggestedRequest && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => createSuggestedRequest(msg)}
                      className="flex w-full items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] rounded-xl px-3 py-2 text-sm font-semibold text-slate-950 transition-all shadow-sm"
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      Оформить заявку в 1 клик
                    </button>
                    <button
                      type="button"
                      onClick={onNavigateToRequests}
                      className="mt-2 w-full rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      Открыть мои заявки
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-none border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
            </div>
          </div>
        )}

        {messages.length === 1 && !isLoading && (
          <div className="space-y-2 pt-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              Возможные вопросы
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-500/20"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSendMessage}
        className="sticky bottom-0 flex gap-2 border-t border-slate-200 bg-white px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-3"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Спросите про справку, БРС или расписание"
          aria-label="Сообщение ассистенту"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          aria-label="Отправить сообщение"
          className="flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
