import { useState } from 'react';
import { LogOut } from 'lucide-react';
import type { UserProfile } from '../types';

type ProfileViewProps = {
  user: UserProfile;
  onLogout: () => void;
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `+7 ··· ·· ${digits.slice(-2)}`;
}

function maskDocument(value: string): string {
  const compact = value.replace(/\s/g, '');
  if (compact.length < 4) return '···';
  return `${compact.slice(0, 2)}···${compact.slice(-2)}`;
}

export default function ProfileView({ user, onLogout }: ProfileViewProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);

  const rows = [
    { label: 'Студенческий билет', value: user.studentId },
    { label: 'Факультет', value: user.faculty },
    { label: 'Группа', value: `${user.course} курс · ${user.group}` },
    { label: 'Почта', value: user.email },
    { label: 'Телефон', value: maskPhone(user.phone) },
    { label: 'Паспорт', value: maskDocument(user.passport) },
    { label: 'СНИЛС', value: maskDocument(user.snils) },
  ];

  return (
    <div className="pb-24">
      <header className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl px-4 pb-6 pt-6 shadow-md">
        <div className="flex items-center gap-3">
          {avatarFailed ? (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold">
              {initials(user.name)}
            </div>
          ) : (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-white/15"
              onError={() => setAvatarFailed(true)}
            />
          )}
          <div className="min-w-0">
            <h1 className="font-semibold tracking-tight text-lg leading-tight">{user.name}</h1>
            <span className="mt-2 inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              GPA {user.gpa.toFixed(2)} · БРС {user.brsAverage}
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h2 className="font-semibold tracking-tight text-slate-900">Карточка студента</h2>
          <dl className="mt-3 space-y-3">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs text-slate-500">{row.label}</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl px-3.5 py-2 text-sm transition-colors"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Выйти
        </button>
      </div>
    </div>
  );
}
