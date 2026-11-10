import { QrCode } from 'lucide-react';
import type { RequestItem, UserProfile } from '../types';

type RequestsViewProps = {
  user: UserProfile;
  requests: RequestItem[];
  onAddRequest: (req: Omit<RequestItem, 'id' | 'createdAt' | 'status'>) => void;
};

const REQUEST_STATUS: Record<RequestItem['status'], string> = {
  Создано: 'bg-slate-100 text-slate-600 border-slate-200',
  'Проверка деканатом': 'bg-amber-50 text-amber-700 border-amber-200',
  'Подписано ЭЦП': 'bg-blue-50 text-blue-700 border-blue-200',
  Готово: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function RequestsView({ user, requests, onAddRequest }: RequestsViewProps) {
  return (
    <div className="pb-24">
      <header className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl px-4 pb-6 pt-6 shadow-md">
        <h1 className="font-semibold tracking-tight text-xl">Заявки</h1>
        <p className="mt-1 text-xs text-slate-300">
          {user.group} · {user.studentId}
        </p>
      </header>

      <div className="space-y-4 px-4 py-4">
        <button
          type="button"
          onClick={() =>
            onAddRequest({
              title: 'Справка с места учёбы',
              category: 'Справки',
              deliveryFormat: 'Электронная с ЭЦП (PDF)',
              comment: 'Тестовая заявка из заглушки раздела.',
            })
          }
          className="bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm w-full"
        >
          Создать тестовую заявку
        </button>

        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Заявок пока нет.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <article key={request.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold tracking-tight text-slate-900">{request.title}</h2>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${REQUEST_STATUS[request.status]}`}>
                    {request.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {request.category} · {request.createdAt}
                </p>
                <p className="mt-1 text-sm text-slate-600">{request.deliveryFormat}</p>
                {request.comment && <p className="mt-2 text-sm text-slate-600">{request.comment}</p>}
                {request.verificationQrCode && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-medium text-emerald-700">Код проверки</p>
                      <p className="mt-0.5 font-mono text-xs text-emerald-800">{request.verificationQrCode}</p>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
