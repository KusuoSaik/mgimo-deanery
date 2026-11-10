import { useState } from 'react';
import type { FormEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { initialChatMessages } from '../mockData';
import type { ChatMessage, GradeItem, RequestItem, UserProfile } from '../types';

type AiAssistantViewProps = {
  user: UserProfile;
  grades: GradeItem[];
  requests: RequestItem[];
  onAddRequest: (req: Omit<RequestItem, 'id' | 'createdAt' | 'status'>) => void;
  onNavigateToRequests: () => void;
};

export default function AiAssistantView({
  user,
  grades,
  requests,
  onAddRequest,
  onNavigateToRequests,
}: AiAssistantViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [draft, setDraft] = useState('');

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setDraft('');
  }

  function createSuggestedRequest() {
    onAddRequest({
      title: 'Справка об обучении',
      category: 'Справки',
      deliveryFormat: 'Электронная с ЭЦП (PDF)',
      comment: `Черновик из чата для ${user.name}.`,
    });
    onNavigateToRequests();
  }

  return (
    <div className="flex min-h-screen flex-col pb-24">
      <header className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl px-4 pb-6 pt-6 shadow-md">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" aria-hidden="true" />
          <h1 className="font-semibold tracking-tight text-xl">ИИ-ассистент</h1>
        </div>
        <p className="mt-2 text-xs text-slate-300">
          {user.group} · дисциплин {grades.length} · заявок {requests.length} · БРС {user.brsAverage}
        </p>
      </header>

      <div className="flex-1 space-y-3 px-4 py-4">
        {messages.map((message) => {
          const suggestion = message.suggestedRequest;
          const mine = message.sender === 'user';
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={
                  mine
                    ? 'max-w-[85%] rounded-2xl bg-blue-600 px-3.5 py-2.5 text-sm text-white'
                    : 'max-w-[85%] rounded-2xl border border-slate-100 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm'
                }
              >
                <p>{message.text}</p>
                <p className={`mt-1 text-[11px] ${mine ? 'text-blue-100' : 'text-slate-400'}`}>{message.timestamp}</p>
                {suggestion && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddRequest(suggestion);
                      onNavigateToRequests();
                    }}
                    className="mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl px-3.5 py-2 text-sm transition-colors"
                  >
                    {suggestion.title}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={createSuggestedRequest}
          className="bg-amber-500/10 border border-amber-500/20 text-amber-700 font-medium rounded-xl px-3.5 py-2 text-sm"
        >
          Оформить справку об обучении
        </button>
        <button
          type="button"
          onClick={onNavigateToRequests}
          className="block bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl px-3.5 py-2 text-sm transition-colors"
        >
          Открыть заявки
        </button>
      </div>

      <form onSubmit={handleSend} className="flex gap-2 px-4">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Вопрос деканату"
          aria-label="Сообщение ассистенту"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm"
          aria-label="Отправить"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
