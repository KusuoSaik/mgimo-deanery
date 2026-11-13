import type { GradeItem, RequestItem, ScheduleItem } from '../../types';

export const SPRING = { type: 'spring', stiffness: 520, damping: 40, mass: 0.9 } as const;
export const SPRING_SOFT = { type: 'spring', stiffness: 260, damping: 30 } as const;
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const REQUEST_STAGES: { stage: RequestItem['stage']; status: RequestItem['status']; label: string; hint: string }[] = [
  { stage: 1, status: 'Зарегистрирована в СЭД', label: 'Зарегистрирована', hint: 'Заявка получила номер в СЭД' },
  { stage: 2, status: 'На проверке', label: 'На проверке', hint: 'Деканат сверяет данные' },
  { stage: 3, status: 'На подписи', label: 'На подписи', hint: 'Документ у подписанта' },
  { stage: 4, status: 'Подписано', label: 'Подписано', hint: 'Наложена электронная подпись' },
  { stage: 5, status: 'Готово к выдаче', label: 'Готово', hint: 'Документ можно получить' },
];

export const REQUEST_STATUS_TONE: Record<RequestItem['status'], string> = {
  'Зарегистрирована в СЭД': 'bg-slate-100 text-slate-600 border-slate-200',
  'На проверке': 'bg-amber-50 text-amber-700 border-amber-200',
  'На подписи': 'bg-blue-50 text-blue-700 border-blue-200',
  'Подписано': 'bg-blue-50 text-blue-700 border-blue-200',
  'Готово к выдаче': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const REQUEST_STATUS_DOT: Record<RequestItem['status'], string> = {
  'Зарегистрирована в СЭД': 'bg-slate-400',
  'На проверке': 'bg-amber-500',
  'На подписи': 'bg-blue-500',
  'Подписано': 'bg-blue-600',
  'Готово к выдаче': 'bg-emerald-500',
};

export const GRADE_STATUS_TONE: Record<GradeItem['status'], { badge: string; bar: string; text: string; stroke: string }> = {
  'Автомат близко': { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500', text: 'text-emerald-700', stroke: 'stroke-emerald-500' },
  Штатно: { badge: 'bg-blue-50 text-blue-700 border-blue-200', bar: 'bg-blue-600', text: 'text-blue-700', stroke: 'stroke-blue-600' },
  'Требует внимания': { badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500', text: 'text-amber-700', stroke: 'stroke-amber-500' },
};

export const CLASS_TYPE_TONE: Record<ScheduleItem['type'], { badge: string; rail: string }> = {
  Лекция: { badge: 'bg-blue-50 text-blue-700 border-blue-200', rail: 'bg-blue-600' },
  Семинар: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', rail: 'bg-emerald-500' },
  Язык: { badge: 'bg-amber-50 text-amber-700 border-amber-200', rail: 'bg-amber-500' },
  Экзамен: { badge: 'bg-rose-50 text-rose-700 border-rose-200', rail: 'bg-rose-500' },
};

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function firstName(fullName: string): string {
  const parts = fullName.split(' ').filter(Boolean);
  return parts[1] ?? parts[0] ?? '';
}

export function greeting(date: Date): string {
  const h = date.getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}
