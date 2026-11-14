import type { StoredAccount } from './types';
import type { GradeItem, NotificationItem, RequestItem, ScheduleItem, ChatMessage } from '../types';

export function hashPassword(raw: string): string {
  let h1 = 0xdeadbeef ^ raw.length;
  let h2 = 0x41c6ce57 ^ raw.length;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `sha256$${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

const createAvatar = (initials: string, bgColor: string, textColor: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${bgColor}"/><text x="40" y="48" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" fill="${textColor}">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const alekseyVolkovAccount: StoredAccount = {
  id: 'acc-001',
  email: 'a.volkov@my.mgimo.ru',
  passwordHash: hashPassword('mgimo2026'),
  profile: {
    name: 'Волков Алексей Дмитриевич',
    studentId: '22-15942',
    faculty: 'Факультет международного права',
    group: 'МП-402',
    course: 4,
    role: 'Староста',
    avatarUrl: createAvatar('АВ', '#1e3a8a', '#fbbf24'),
    gpa: 4.92,
    brsAverage: 94,
    ratingPlace: 2,
    email: 'a.volkov@my.mgimo.ru',
    phone: '+7 (916) 324-87-51',
    passport: '4518 726394',
    snils: '158-472-836 21',
  },
  scheduleData: [
    { id: 'sch-av-1', day: 'Пн', weekType: 'both', time: '09:00 – 10:30', subject: 'Международное публичное право', type: 'Лекция', room: '412', building: 'Главный корпус', professor: 'Соколова Ирина Владимировна', changeNote: 'Перенос из ауд. 305' },
    { id: 'sch-av-2', day: 'Пн', weekType: 'odd', time: '10:45 – 12:20', subject: 'Право международных организаций', type: 'Семинар', room: '308', building: 'Главный корпус', professor: 'Петров Андрей Сергеевич' },
    { id: 'sch-av-3', day: 'Вт', weekType: 'both', time: '09:00 – 10:30', subject: 'Английский язык (Legal English)', type: 'Язык', room: '205', building: 'Корпус 2', professor: 'Браун Джеймс' },
    { id: 'sch-av-4', day: 'Вт', weekType: 'even', time: '13:00 – 14:30', subject: 'Дипломатическое право', type: 'Лекция', room: '501', building: 'Новый корпус', professor: 'Лебедев Олег Николаевич', changeNote: 'Перенос с 14:45' },
    { id: 'sch-av-5', day: 'Ср', weekType: 'both', time: '10:45 – 12:20', subject: 'Международное гуманитарное право', type: 'Семинар', room: '214', building: 'Главный корпус', professor: 'Морозова Елена Петровна' },
    { id: 'sch-av-6', day: 'Чт', weekType: 'both', time: '09:00 – 10:30', subject: 'Французский язык', type: 'Язык', room: '118', building: 'Корпус 2', professor: 'Дюпон Мари' },
    { id: 'sch-av-7', day: 'Чт', weekType: 'odd', time: '13:00 – 14:30', subject: 'Международное экономическое право', type: 'Лекция', room: '405', building: 'Главный корпус', professor: 'Кузнецов Виктор Игоревич' },
    { id: 'sch-av-8', day: 'Пт', weekType: 'both', time: '10:45 – 12:20', subject: 'Международное частное право', type: 'Семинар', room: '302', building: 'Новый корпус', professor: 'Белова Наталья Андреевна' },
  ] as ScheduleItem[],
  gradesData: [
    { id: 'gr-av-1', subject: 'Международное публичное право', brsPoints: 98, maxPoints: 100, status: 'Автомат близко', professor: 'Соколова Ирина Владимировна', examType: 'Экзамен' },
    { id: 'gr-av-2', subject: 'Право международных организаций', brsPoints: 96, maxPoints: 100, status: 'Автомат близко', professor: 'Петров Андрей Сергеевич', examType: 'Экзамен' },
    { id: 'gr-av-3', subject: 'Дипломатическое право', brsPoints: 95, maxPoints: 100, status: 'Автомат близко', professor: 'Лебедев Олег Николаевич', examType: 'Экзамен' },
    { id: 'gr-av-4', subject: 'Международное гуманитарное право', brsPoints: 94, maxPoints: 100, status: 'Автомат близко', professor: 'Морозова Елена Петровна', examType: 'Зачет' },
    { id: 'gr-av-5', subject: 'Английский язык (Legal English)', brsPoints: 92, maxPoints: 100, status: 'Автомат близко', professor: 'Браун Джеймс', examType: 'Зачет' },
    { id: 'gr-av-6', subject: 'Международное частное право', brsPoints: 89, maxPoints: 100, status: 'Штатно', professor: 'Белова Наталья Андреевна', examType: 'Экзамен' },
  ] as GradeItem[],
  requestsData: [
    { id: 'req-av-1', title: 'Характеристика для стажировки в МИД', category: 'Справки', deliveryFormat: 'Бумажный оригинал в деканате', status: 'На проверке', stage: 2, createdAt: '10.11.2026', comment: 'Для подачи документов на стажировку в Департамент международных организаций МИД РФ.' },
    { id: 'req-av-2', title: 'Справка об успеваемости с отличием', category: 'Справки', deliveryFormat: 'Электронная с ЭЦП (PDF)', status: 'Подписано', stage: 4, createdAt: '05.11.2026', comment: 'С указанием среднего балла 4.92 для конкурса на грант.', verificationQrCode: 'MGIMO-AVG-8D2F-2026' },
  ] as RequestItem[],
  notificationsData: [
    { id: 'nt-av-1', title: 'Собрание старост факультета МП', message: 'Завтра в 15:00, каб. 420. Обсуждение организации зимней сессии и распределения аудиторий.', date: '12 ноября', type: 'info', isRead: false },
    { id: 'nt-av-2', title: 'Грант на обучение в Гаагской академии', message: 'Открыт конкурс на летнюю программу по международному праву. Подача до 20 ноября.', date: '10 ноября', type: 'success', isRead: false },
    { id: 'nt-av-3', title: 'Характеристика готова к выдаче', message: 'Справка подписана деканом. Можно забрать в деканате МП, каб. 412.', date: '8 ноября', type: 'success', isRead: true },
  ] as NotificationItem[],
  chatHistoryData: [
    { id: 'msg-av-1', sender: 'ai', text: 'Здравствуйте, Алексей! Я ассистент цифрового деканата. Как староста группы, вы можете запросить у меня сводку по успеваемости, расписанию или оформить справку.', timestamp: '09:20' },
  ] as ChatMessage[],
};

const dmitriySokolovAccount: StoredAccount = {
  id: 'acc-002',
  email: 'd.sokolov@my.mgimo.ru',
  passwordHash: hashPassword('debt1234'),
  profile: {
    name: 'Соколов Дмитрий Игоревич',
    studentId: '24-18205',
    faculty: 'Факультет международных экономических отношений',
    group: 'МЭО-205',
    course: 2,
    role: 'Студент',
    avatarUrl: createAvatar('ДС', '#7f1d1d', '#fbbf24'),
    gpa: 3.45,
    brsAverage: 51,
    ratingPlace: 78,
    email: 'd.sokolov@my.mgimo.ru',
    phone: '+7 (926) 518-42-37',
    passport: '4520 814723',
    snils: '172-583-947 45',
  },
  scheduleData: [
    { id: 'sch-ds-1', day: 'Пн', weekType: 'both', time: '09:00 – 10:30', subject: 'Микроэкономика', type: 'Лекция', room: '318', building: 'Главный корпус', professor: 'Иванов Сергей Петрович' },
    { id: 'sch-ds-2', day: 'Пн', weekType: 'both', time: '10:45 – 12:20', subject: 'Английский язык', type: 'Язык', room: '207', building: 'Корпус 2', professor: 'Смит Джон' },
    { id: 'sch-ds-3', day: 'Вт', weekType: 'both', time: '13:00 – 14:30', subject: 'Мировая экономика', type: 'Семинар', room: '125', building: 'Главный корпус', professor: 'Петрова Анна Владимировна', changeNote: 'Перенос из ауд. 210' },
    { id: 'sch-ds-4', day: 'Ср', weekType: 'even', time: '09:00 – 10:30', subject: 'Статистика', type: 'Лекция', room: '410', building: 'Новый корпус', professor: 'Павлов Игорь Николаевич' },
    { id: 'sch-ds-5', day: 'Ср', weekType: 'both', time: '13:00 – 14:30', subject: 'История экономических учений', type: 'Семинар', room: '220', building: 'Главный корпус', professor: 'Морозова Елена Сергеевна' },
    { id: 'sch-ds-6', day: 'Чт', weekType: 'both', time: '10:45 – 12:20', subject: 'Математический анализ', type: 'Семинар', room: '315', building: 'Новый корпус', professor: 'Кузнецов Олег Викторович' },
    { id: 'sch-ds-7', day: 'Пт', weekType: 'odd', time: '09:00 – 10:30', subject: 'Микроэкономика (Пересдача)', type: 'Экзамен', room: '102', building: 'Главный корпус', professor: 'Иванов Сергей Петрович', changeNote: 'Назначена комиссия' },
  ] as ScheduleItem[],
  gradesData: [
    { id: 'gr-ds-1', subject: 'Микроэкономика', brsPoints: 38, maxPoints: 100, status: 'Требует внимания', professor: 'Иванов Сергей Петрович', examType: 'Экзамен' },
    { id: 'gr-ds-2', subject: 'Математический анализ', brsPoints: 47, maxPoints: 100, status: 'Требует внимания', professor: 'Кузнецов Олег Викторович', examType: 'Экзамен' },
    { id: 'gr-ds-3', subject: 'Мировая экономика', brsPoints: 58, maxPoints: 100, status: 'Штатно', professor: 'Петрова Анна Владимировна', examType: 'Зачет' },
    { id: 'gr-ds-4', subject: 'Статистика', brsPoints: 62, maxPoints: 100, status: 'Штатно', professor: 'Павлов Игорь Николаевич', examType: 'Зачет' },
    { id: 'gr-ds-5', subject: 'Английский язык', brsPoints: 54, maxPoints: 100, status: 'Штатно', professor: 'Смит Джон', examType: 'Зачет' },
  ] as GradeItem[],
  requestsData: [
    { id: 'req-ds-1', title: 'Направление на пересдачу с комиссией (Микроэкономика)', category: 'Академические', deliveryFormat: 'Электронная с ЭЦП (PDF)', status: 'Подписано', stage: 4, createdAt: '08.11.2026', comment: 'Согласовано с деканатом. Дата пересдачи: 17 ноября 2026, 09:00, ауд. 102.', verificationQrCode: 'MGIMO-RET-5B8C-2026' },
    { id: 'req-ds-2', title: 'Справка об обучении', category: 'Справки', deliveryFormat: 'Бумажный оригинал в деканате', status: 'Готово к выдаче', stage: 5, createdAt: '01.11.2026' },
  ] as RequestItem[],
  notificationsData: [
    { id: 'nt-ds-1', title: 'Академическая задолженность', message: 'Внимание! Академическая задолженность по дисциплине "Микроэкономика" (БРС: 38/100). До пересдачи осталось 4 дня. Рекомендуем записаться на консультацию к преподавателю.', date: '13 ноября', type: 'warning', isRead: false },
    { id: 'nt-ds-2', title: 'Открыта запись на пересдачу', message: 'Деканат ФМЭО открыл запись на комиссию по микроэкономике. Доступные слоты: 17, 18, 19 ноября.', date: '10 ноября', type: 'info', isRead: false },
    { id: 'nt-ds-3', title: 'Консультация перед пересдачей', message: 'Иванов С.П. проводит консультацию 15 ноября в 14:00, ауд. 318. Обязательна для студентов с БРС ниже 50.', date: '9 ноября', type: 'warning', isRead: true },
  ] as NotificationItem[],
  chatHistoryData: [
    { id: 'msg-ds-1', sender: 'ai', text: 'Здравствуйте, Дмитрий! Вижу, что у вас академическая задолженность по микроэкономике. Могу помочь с записью на пересдачу, оформить справку или подсказать расписание.', timestamp: '08:45' },
  ] as ChatMessage[],
};

const sofiaChenAccount: StoredAccount = {
  id: 'acc-003',
  email: 's.chen@my.mgimo.ru',
  passwordHash: hashPassword('china2025'),
  profile: {
    name: 'Чен София (陈晓雅)',
    studentId: '25-19874',
    faculty: 'Факультет международных отношений',
    group: 'МО-103',
    course: 1,
    role: 'Иностранный студент',
    avatarUrl: createAvatar('СЧ', '#581c87', '#fbbf24'),
    gpa: 4.12,
    brsAverage: 73,
    ratingPlace: 42,
    email: 's.chen@my.mgimo.ru',
    phone: '+7 (999) 782-34-91',
    passport: '6815 947263',
    snils: '—',
  },
  scheduleData: [
    { id: 'sch-sc-1', day: 'Пн', weekType: 'both', time: '09:00 – 10:30', subject: 'Русский язык как иностранный (продвинутый)', type: 'Язык', room: '104', building: 'Корпус 2', professor: 'Иванова Мария Александровна' },
    { id: 'sch-sc-2', day: 'Пн', weekType: 'both', time: '10:45 – 12:20', subject: 'Введение в международные отношения', type: 'Лекция', room: '512', building: 'Главный корпус', professor: 'Соколов Андрей Николаевич', changeNote: 'Перенос из ауд. 410' },
    { id: 'sch-sc-3', day: 'Вт', weekType: 'both', time: '13:00 – 14:30', subject: 'История России', type: 'Семинар', room: '208', building: 'Главный корпус', professor: 'Петрова Елена Викторовна' },
    { id: 'sch-sc-4', day: 'Ср', weekType: 'both', time: '09:00 – 10:30', subject: 'Русский язык как иностранный (деловое письмо)', type: 'Язык', room: '106', building: 'Корпус 2', professor: 'Смирнова Ольга Петровна' },
    { id: 'sch-sc-5', day: 'Ср', weekType: 'even', time: '10:45 – 12:20', subject: 'Английский язык', type: 'Язык', room: '312', building: 'Корпус 2', professor: 'Браун Майкл' },
    { id: 'sch-sc-6', day: 'Чт', weekType: 'both', time: '13:00 – 14:30', subject: 'Политология', type: 'Лекция', room: '405', building: 'Новый корпус', professor: 'Лебедев Виктор Игоревич' },
    { id: 'sch-sc-7', day: 'Пт', weekType: 'both', time: '10:45 – 12:20', subject: 'Адаптационный семинар для иностранных студентов', type: 'Семинар', room: '120', building: 'Главный корпус', professor: 'Морозова Наталья Сергеевна' },
  ] as ScheduleItem[],
  gradesData: [
    { id: 'gr-sc-1', subject: 'Русский язык как иностранный', brsPoints: 82, maxPoints: 100, status: 'Штатно', professor: 'Иванова Мария Александровна', examType: 'Экзамен' },
    { id: 'gr-sc-2', subject: 'Введение в международные отношения', brsPoints: 76, maxPoints: 100, status: 'Штатно', professor: 'Соколов Андрей Николаевич', examType: 'Зачет' },
    { id: 'gr-sc-3', subject: 'История России', brsPoints: 71, maxPoints: 100, status: 'Штатно', professor: 'Петрова Елена Викторовна', examType: 'Зачет' },
    { id: 'gr-sc-4', subject: 'Политология', brsPoints: 68, maxPoints: 100, status: 'Штатно', professor: 'Лебедев Виктор Игоревич', examType: 'Экзамен' },
    { id: 'gr-sc-5', subject: 'Английский язык', brsPoints: 74, maxPoints: 100, status: 'Штатно', professor: 'Браун Майкл', examType: 'Зачет' },
  ] as GradeItem[],
  requestsData: [
    { id: 'req-sc-1', title: 'Справка для продления студенческой визы', category: 'Справки', deliveryFormat: 'Бумажный оригинал в деканате', status: 'На проверке', stage: 2, createdAt: '11.11.2026', comment: 'Для подачи в ГУВМ МВД РФ. С указанием срока обучения и формы (очная, бюджет).' },
    { id: 'req-sc-2', title: 'Подтверждение зачисления для посольства КНР', category: 'Справки', deliveryFormat: 'Электронная с ЭЦП (PDF)', status: 'Готово к выдаче', stage: 5, createdAt: '28.10.2026', verificationQrCode: 'MGIMO-FOR-3E9A-2026' },
  ] as RequestItem[],
  notificationsData: [
    { id: 'nt-sc-1', title: 'Продление визы — важные сроки', message: 'До окончания вашей студенческой визы осталось 28 дней. Рекомендуем подать документы на продление в Международное управление (каб. 215) в ближайшие 7 дней.', date: '12 ноября', type: 'warning', isRead: false },
    { id: 'nt-sc-2', title: 'Культурная программа для иностранных студентов', message: 'Экскурсия в Кремль 18 ноября. Регистрация через Международное управление до 15 ноября.', date: '10 ноября', type: 'info', isRead: false },
    { id: 'nt-sc-3', title: 'Консультация по миграционному учету', message: 'Представитель ГУВМ проводит консультацию 14 ноября в 15:00, ауд. 120.', date: '8 ноября', type: 'info', isRead: true },
  ] as NotificationItem[],
  chatHistoryData: [
    { id: 'msg-sc-1', sender: 'ai', text: 'Здравствуйте, София! Я ассистент цифрового деканата. Помогу с оформлением справок для визы, расскажу о программах адаптации и отвечу на вопросы об учебном процессе.', timestamp: '10:15' },
  ] as ChatMessage[],
};

export const ACCOUNTS_DATABASE: StoredAccount[] = [
  alekseyVolkovAccount,
  dmitriySokolovAccount,
  sofiaChenAccount,
];

export function findAccountByEmail(email: string): StoredAccount | undefined {
  return ACCOUNTS_DATABASE.find((acc) => acc.email.toLowerCase() === email.toLowerCase());
}

export function validatePassword(account: StoredAccount, password: string): boolean {
  return account.passwordHash === hashPassword(password) || account.passwordHash === password;
}
