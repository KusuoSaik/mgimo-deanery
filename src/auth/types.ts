import type { GradeItem, NotificationItem, RequestItem, ScheduleItem, ChatMessage } from '../types.js';

export type UserRole = 'Студент' | 'Староста' | 'Иностранный студент';
export type Faculty = 'МО' | 'МП' | 'МЭО' | 'МИЭП' | 'ИМТУР' | 'ФУП';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  faculty: Faculty;
  course: number;
  role: UserRole;
}

export interface StoredAccount {
  id: string;
  email: string;
  /**
   * Серверное поле. Оно никогда не приходит в браузер, но оставлено
   * необязательным, чтобы seed-данные можно было использовать в API.
   */
  passwordHash?: string;
  profile: {
    name: string;
    studentId: string;
    faculty: string;
    group: string;
    course: number;
    role: UserRole;
    avatarUrl: string;
    gpa: number;
    brsAverage: number;
    ratingPlace: number;
    email: string;
    phone: string;
    passport: string;
    snils: string;
  };
  scheduleData: ScheduleItem[];
  gradesData: GradeItem[];
  requestsData: RequestItem[];
  notificationsData: NotificationItem[];
  chatHistoryData: ChatMessage[];
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: StoredAccount | null;
  twoFactorCode: string | null;
  twoFactorExpiry: number | null;
}
