export type TabType = 'dashboard' | 'schedule' | 'grades' | 'requests' | 'ai' | 'profile';

export interface UserProfile {
  name: string;
  studentId: string;
  faculty: string;        // например: "Институт маркетинга и предпринимательства"
  group: string;
  course: number;
  avatarUrl: string;
  gpa: number;            // Средний балл
  brsAverage: number;     // Средний рейтинг БРС (0-100)
  ratingPlace: number;
  email: string;          // корпоративная почта @my.mgimo.ru
  phone: string;          // для маскирования и автозаполнения
  passport: string;       // для маскирования (152-ФЗ) и автозаполнения заявок
  snils: string;          // для маскирования (152-ФЗ)
  role?: 'Студент' | 'Староста' | 'Иностранный студент'; // Роль студента
}

export interface ScheduleItem {
  id: string;
  day: 'Пн' | 'Вт' | 'Ср' | 'Чт' | 'Пт' | 'Сб';
  weekType: 'even' | 'odd' | 'both'; // Четная / Нечетная / Каждую неделю
  time: string;                      // например: "10:45 – 12:20"
  subject: string;
  type: 'Лекция' | 'Семинар' | 'Язык' | 'Экзамен';
  room: string;
  building: string;
  professor: string;
}

export interface GradeItem {
  id: string;
  subject: string;
  brsPoints: number;      // 0 - 100
  maxPoints: number;      // 100
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
  status: 'Создано' | 'Проверка деканатом' | 'Подписано ЭЦП' | 'Готово';
  createdAt: string;
  comment?: string;
  verificationQrCode?: string; // токен проверки подлинности справки
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  // Если ИИ предлагает создать заявку прямо в чате (Actionable AI):
  suggestedRequest?: {
    title: string;
    category: RequestItem['category'];
    deliveryFormat: RequestItem['deliveryFormat'];
  };
}
