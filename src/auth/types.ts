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
  passwordHash: string; // В реальной системе это был бы хеш, но для демо храним как есть
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
  // Персональные данные для каждого аккаунта
  scheduleData: any[];
  gradesData: any[];
  requestsData: any[];
  notificationsData: any[];
  chatHistoryData: any[];
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: StoredAccount | null;
  twoFactorCode: string | null;
  twoFactorExpiry: number | null;
}
