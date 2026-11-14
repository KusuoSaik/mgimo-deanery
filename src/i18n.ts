import { usePreferences } from './preferences';
import { translations } from './translations';
// Data such as names, subjects and free-form messages keeps its original language.
// UI enum values are translated at render time, never in the stored API contract.
export function translateText(text: string): string {
  const normalized = text.replace(/\s+/g,' ').trim();
  const direct = translations[normalized];
  if (direct) return text.replace(normalized,direct);
  for (const [pattern,replacement] of patterns) {
    const match = normalized.match(pattern);
    if (match) return replacement(match);
  }
  return text;
}
const patterns: [RegExp,(match:RegExpMatchArray)=>string][] = [
  [/^, (староста|иностранный студент)$/,m=>`, ${translateText(m[1])}`],
  [/^(\d+) в работе$/,m=>`${m[1]} in progress`],
  [/^Средний балл (.+)$/,m=>`Grade average ${m[1]}`],
  [/^Этап (\d+) из 5$/,m=>`Stage ${m[1]} of 5`],
  [/^До аудитории (.+)$/,m=>`Directions to room ${m[1]}`],
  [/^Аудитория (.+)$/,m=>`Room ${m[1]}`],
  [/^(.+), около 4 минут пешком$/,m=>`${translateText(m[1])}, about 4 minutes on foot`],
  [/^Этаж (.+), лестница справа от гардероба$/,m=>`Floor ${m[1]}, stairs to the right of the cloakroom`],

  [/^(\d+) курс, группа (.+)$/,m=>`Year ${m[1]}, group ${m[2]}`],
  [/^Группа (.+) • Защищённый демо-кабинет$/,m=>`Group ${m[1]} • Secure demo portal`],
  [/^До автомата (\d+) б\.$/,m=>`${m[1]} points to automatic pass`],
  [/^До допуска (\d+) б\.$/,m=>`${m[1]} points to admission`],
  [/^(\d+) (пара|пары|пар)$/,m=>`${m[1]} ${m[1]==='1'?'class':'classes'}`],
  [/^На (чётной|нечётной) неделе в этот день пар нет$/,m=>`No classes on this day in the ${m[1]==='чётной'?'even':'odd'} week`],
  [/^Занятий типа «(.+)» в этот день нет$/,m=>`No ${translateText(m[1])} classes on this day`],
  [/^(Эта неделя|Следующая неделя), (.+)$/,m=>`${translateText(m[1])}, ${m[2]}`],
  [/^Требуют внимания: (.+)\. Посмотрите баллы и уточните условия пересдачи\.$/,m=>`Needs attention: ${m[1]}. Review your points and confirm resit requirements.`],
  [/^Создана заявка «(.+)»\.$/,m=>`Request “${m[1]}” created.`],
  [/^Заявка «(.+)» зарегистрирована в системе электронного документооборота\.$/,m=>`Request “${m[1]}” registered in the demo workflow.`],
  [/^(.+) временно недоступен \((\d+)\)\. Попробуйте позже\.$/,m=>`${m[1]} is temporarily unavailable (${m[2]}). Please retry later.`],
];
export function useUI() {
  const { english } = usePreferences();
  function t<T>(value:T):T {
    if (!english) return value;
    if (typeof value === 'string') return translateText(value) as T;
    if (Array.isArray(value)) return value.map(item=>t(item)) as T;
    return value;
  }
  return Object.assign(t,{locale:english?'en-GB':'ru-RU'});
}
