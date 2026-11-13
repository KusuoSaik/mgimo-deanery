import type {
  ChatMessage,
  GradeItem,
  NotificationItem,
  RequestItem,
  ScheduleItem,
  UserProfile,
} from './types';

const avatarSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#1e1b4b"/><text x="40" y="48" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" fill="#fbbf24">ЕВ</text></svg>';

export const mockUser: UserProfile = {
  name: 'Волкова Елизавета Сергеевна',
  studentId: '23-14837',
  faculty: 'Факультет международных экономических отношений',
  group: 'МЭО-3',
  course: 3,
  avatarUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(avatarSvg)}`,
  gpa: 4.85,
  brsAverage: 86,
  ratingPlace: 12,
  email: 'es.volkova@my.mgimo.ru',
  phone: '+7 (903) 214-58-76',
  passport: '4519 638274',
  snils: '164-582-739 98',
};

export const mockSchedule: ScheduleItem[] = [
  { id: 'sch-1', day: 'Пн', weekType: 'both', time: '09:00 – 10:30', subject: 'Мировая экономика', type: 'Лекция', room: '214', building: 'Главный корпус', professor: 'Орлов Андрей Викторович' },
  { id: 'sch-2', day: 'Пн', weekType: 'even', time: '10:45 – 12:20', subject: 'Английский язык', type: 'Язык', room: '305', building: 'Корпус 2', professor: 'Смирнова Елена Петровна' },
  { id: 'sch-3', day: 'Вт', weekType: 'both', time: '10:45 – 12:20', subject: 'Международные экономические отношения', type: 'Семинар', room: '118', building: 'Главный корпус', professor: 'Кузнецов Дмитрий Игоревич' },
  { id: 'sch-4', day: 'Вт', weekType: 'odd', time: '13:00 – 14:30', subject: 'Экономика Европейского союза', type: 'Лекция', room: '401', building: 'Новый корпус', professor: 'Лебедева Наталья Сергеевна' },
  { id: 'sch-5', day: 'Ср', weekType: 'both', time: '09:00 – 10:30', subject: 'Статистика внешнеэкономической деятельности', type: 'Семинар', room: '207', building: 'Главный корпус', professor: 'Павлов Илья Николаевич' },
  { id: 'sch-6', day: 'Ср', weekType: 'even', time: '10:45 – 12:20', subject: 'Испанский язык', type: 'Язык', room: '312', building: 'Корпус 2', professor: 'Гарсия Мария' },
  { id: 'sch-7', day: 'Чт', weekType: 'both', time: '13:00 – 14:30', subject: 'Международные финансы', type: 'Лекция', room: '510', building: 'Главный корпус', professor: 'Белова Ольга Андреевна' },
  { id: 'sch-8', day: 'Чт', weekType: 'odd', time: '09:00 – 12:20', subject: 'Макроэкономика', type: 'Экзамен', room: '101', building: 'Новый корпус', professor: 'Соколов Виктор Павлович' },
  { id: 'sch-9', day: 'Пт', weekType: 'both', time: '09:00 – 10:30', subject: 'Внешнеэкономическая деятельность предприятий', type: 'Семинар', room: '220', building: 'Главный корпус', professor: 'Морозова Татьяна Кирилловна' },
  { id: 'sch-10', day: 'Сб', weekType: 'odd', time: '10:45 – 12:20', subject: 'Китайский язык', type: 'Язык', room: '108', building: 'Корпус 2', professor: 'Ли Вэй' },
];

export const mockGrades: GradeItem[] = [
  { id: 'gr-1', subject: 'Мировая экономика', brsPoints: 95, maxPoints: 100, status: 'Автомат близко', professor: 'Орлов Андрей Викторович', examType: 'Экзамен' },
  { id: 'gr-2', subject: 'Международные экономические отношения', brsPoints: 93, maxPoints: 100, status: 'Автомат близко', professor: 'Кузнецов Дмитрий Игоревич', examType: 'Экзамен' },
  { id: 'gr-3', subject: 'Международные финансы', brsPoints: 92, maxPoints: 100, status: 'Автомат близко', professor: 'Белова Ольга Андреевна', examType: 'Экзамен' },
  { id: 'gr-4', subject: 'Статистика внешнеэкономической деятельности', brsPoints: 88, maxPoints: 100, status: 'Штатно', professor: 'Павлов Илья Николаевич', examType: 'Зачет' },
  { id: 'gr-5', subject: 'Английский язык', brsPoints: 86, maxPoints: 100, status: 'Штатно', professor: 'Смирнова Елена Петровна', examType: 'Зачет' },
  { id: 'gr-6', subject: 'Макроэкономика', brsPoints: 62, maxPoints: 100, status: 'Требует внимания', professor: 'Соколов Виктор Павлович', examType: 'Экзамен' },
];

export const mockNotifications: NotificationItem[] = [
  { id: 'nt-1', title: 'Запись на пересдачу макроэкономики', message: 'Деканат открыл запись до 14 ноября. Выберите слот в разделе заявок, если не набираете порог автомата.', date: '10 ноября', type: 'warning', isRead: false },
  { id: 'nt-2', title: 'Справки об обучении теперь с ЭЦП', message: 'Электронную справку можно получить в PDF и проверить по коду на портале деканата.', date: '8 ноября', type: 'info', isRead: false },
  { id: 'nt-3', title: 'Справка для военкомата готова', message: 'Бумажный оригинал можно забрать в деканате ФМЭО, каб. 214, в часы приёма.', date: '3 ноября', type: 'success', isRead: true },
];

export const mockRequests: RequestItem[] = [
  { id: 'req-1', title: 'Справка об обучении для стажировки', category: 'Справки', deliveryFormat: 'Электронная с ЭЦП (PDF)', status: 'Создано', createdAt: '09.11.2026', comment: 'Нужна для отдела стажировок МИД, с указанием курса и формы обучения.' },
  { id: 'req-2', title: 'Справка для военного комиссариата', category: 'Военкомат', deliveryFormat: 'Бумажный оригинал в деканате', status: 'Проверка деканатом', createdAt: '02.11.2026', comment: 'Приложение № 2, очная форма, отсрочка на 2026/27 учебный год.' },
  { id: 'req-3', title: 'Справка о стипендии для материальной помощи', category: 'Финансы и матпомощь', deliveryFormat: 'Электронная с ЭЦП (PDF)', status: 'Готово', createdAt: '28.10.2026', comment: 'За осенний семестр, с указанием размера академической стипендии.', verificationQrCode: 'MGIMO-SPR-7F3A-2026' },
];

export const initialChatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'ai',
    text: 'Здравствуйте, Елизавета! Я ассистент цифрового деканата МГИМО. Подскажу по расписанию, баллам БРС и помогу оформить справку — напишите, что нужно.',
    timestamp: '09:15',
  },
];
