import { useState } from 'react';
import type { FormEvent } from 'react';
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

export default function AiAssistantView({ user, grades, requests, onAddRequest, onNavigateToRequests }: AiAssistantViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRequestAction, setShowRequestAction] = useState(false);

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newUserMessage: ChatMessage = { id: `msg-${Date.now()}`, sender: 'user', text: userText, timestamp: timeStr };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    window.setTimeout(() => {
      const isCertificateRequest = /справк|документ|военкомат/i.test(userText);
      const assistantResponse: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: isCertificateRequest
          ? `Понял, ${user.name.split(' ')[0]}. Могу оформить электронную справку с ЭЦП в один клик.`
          : `Анализ запроса «${userText}»: я проверил связанные данные деканата. Сейчас у вас ${requests.length} заявок и средний БРС ${user.brsAverage} баллов.`,
        timestamp: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
      };
      setMessages((prev) => [...prev, assistantResponse]);
      setShowRequestAction(isCertificateRequest);
      setIsLoading(false);
    }, 900);
  }

  function createCertificateRequest() {
    onAddRequest({ title: 'Справка об обучении для стажировки', category: 'Справки', deliveryFormat: 'Электронная с ЭЦП (PDF)' });
    setShowRequestAction(false);
    setMessages((prev) => [...prev, {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: 'Заявка принята в обработку деканатом. Отслеживать статус можно в разделе «Заявки».',
      timestamp: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    }]);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto p-4">
      <div className="bg-white border border-slate-200 rounded-t-xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold shadow-inner">AI</div><div><h2 className="text-base font-semibold text-slate-900">Интеллектуальный ассистент</h2><p className="text-xs text-emerald-600 font-medium">● Готов к диалогу</p></div></div>
        <button type="button" onClick={() => { setMessages(initialChatMessages); setShowRequestAction(false); }} className="text-xs text-slate-500 hover:text-slate-800 transition-colors border border-slate-200 px-2.5 py-1.5 rounded-lg">Очистить чат</button>
      </div>

      <div className="flex-1 bg-slate-50 border-x border-slate-200 overflow-y-auto p-4 space-y-4">
        <p className="text-xs text-slate-400">Контекст: {grades.length} дисциплин · {requests.length} заявок</p>
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}><p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p><span className={`block text-[10px] mt-1 text-right ${isUser ? 'text-indigo-200' : 'text-slate-400'}`}>{msg.timestamp}</span></div></div>;
        })}
        {showRequestAction && <div className="flex flex-wrap gap-2"><button type="button" onClick={createCertificateRequest} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg">Оформить справку в 1 клик</button><button type="button" onClick={onNavigateToRequests} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg">Открыть заявки</button></div>}
        {isLoading && <div className="flex justify-start"><div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1.5"><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" /><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" /><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" /></div></div>}
      </div>

      <form onSubmit={handleSendMessage} className="bg-white border border-slate-200 rounded-b-xl p-3 flex gap-2 shadow-sm"><input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Спросите AI об инциденте, справке или БРС..." className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /><button type="submit" disabled={isLoading || !inputValue.trim()} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors shadow-sm">Отправить</button></form>
    </div>
  );
}
