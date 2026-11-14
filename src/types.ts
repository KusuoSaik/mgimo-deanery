export type TabType = 'dashboard' | 'schedule' | 'grades' | 'requests' | 'ai' | 'profile';

export interface UserProfile {
  name: string;
  studentId: string;
  faculty: string;
  group: string;
  course: number;
  avatarUrl: string;
  gpa: number;
  brsAverage: number;
  ratingPlace: number;
  email: string;
  phone: string;
  passport: string;
  snils: string;
  role?: 'Студент' | 'Староста' | 'Иностранный студент';
}

export interface ScheduleItem {
  id: string;
  day: 'Пн' | 'Вт' | 'Ср' | 'Чт' | 'Пт' | 'Сб';
  weekType: 'even' | 'odd' | 'both';
  time: string;
  subject: string;
  type: 'Лекция' | 'Семинар' | 'Язык' | 'Экзамен';
  room: string;
  building: string;
  professor: string;
  changeNote?: string;
}

export interface GradeItem {
  id: string;
  subject: string;
  brsPoints: number;
  maxPoints: number;
  status: 'Автомат близко' | 'Штатно' | 'Требует внимания';
  professor: string;
  examType: 'Зачет' | 'Экзамен';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'info' | 'warning' | 'success';
  isRead: boolean;
}

export interface RequestItem {
  id: string;
  title: string;
  category: 'Справки' | 'Военкомат' | 'Финансы и матпомощь' | 'Академические';
  deliveryFormat: 'Электронная с ЭЦП (PDF)' | 'Бумажный оригинал в деканате';
  status: 'Зарегистрирована в СЭД' | 'На проверке' | 'На подписи' | 'Подписано' | 'Готово к выдаче';
  stage: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt?: string;
  comment?: string;
  verificationQrCode?: string;
  timestamps?: {
    registered?: string;
    inReview?: string;
    inSigning?: string;
    signed?: string;
    ready?: string;
  };
  reason?: string;
  docType?: string;
}

export interface SuggestedAction {
  type: 'request';
  title: string;
  category: RequestItem['category'];
  deliveryFormat: RequestItem['deliveryFormat'];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestedAction?: SuggestedAction;
  actionSent?: boolean;
}
