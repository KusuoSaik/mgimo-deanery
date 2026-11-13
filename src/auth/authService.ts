import type { AuthState, AuthCredentials, RegisterData, StoredAccount } from './types';
import { ACCOUNTS_DATABASE, validatePassword } from './accountsDatabase';

const AUTH_STATE_KEY = 'mgimo_auth_state';
const REGISTERED_ACCOUNTS_KEY = 'mgimo_registered_accounts';
const TWO_FACTOR_VALIDITY_MS = 5 * 60 * 1000; // 5 минут

// Генерация 4-значного кода для 2FA
export function generate2FACode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Сохранение состояния авторизации
export function saveAuthState(state: AuthState): void {
  localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
}

// Загрузка состояния авторизации
export function loadAuthState(): AuthState {
  try {
    const stored = localStorage.getItem(AUTH_STATE_KEY);
    if (!stored) {
      return {
        isAuthenticated: false,
        currentUser: null,
        twoFactorCode: null,
        twoFactorExpiry: null,
      };
    }
    const state = JSON.parse(stored) as AuthState;

    // Проверяем валидность 2FA кода
    if (state.twoFactorCode && state.twoFactorExpiry) {
      if (Date.now() > state.twoFactorExpiry) {
        state.twoFactorCode = null;
        state.twoFactorExpiry = null;
      }
    }

    return state;
  } catch {
    return {
      isAuthenticated: false,
      currentUser: null,
      twoFactorCode: null,
      twoFactorExpiry: null,
    };
  }
}

// Получение всех зарегистрированных аккаунтов (встроенные + пользовательские)
export function getAllAccounts(): StoredAccount[] {
  try {
    const stored = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    const userAccounts: StoredAccount[] = stored ? JSON.parse(stored) : [];
    return [...ACCOUNTS_DATABASE, ...userAccounts];
  } catch {
    return ACCOUNTS_DATABASE;
  }
}

// Сохранение нового зарегистрированного аккаунта
export function saveNewAccount(account: StoredAccount): void {
  try {
    const stored = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    const userAccounts: StoredAccount[] = stored ? JSON.parse(stored) : [];
    userAccounts.push(account);
    localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(userAccounts));
  } catch (error) {
    console.error('Failed to save new account:', error);
  }
}

// Проверка учетных данных (шаг 1)
export function validateCredentials(credentials: AuthCredentials): {
  success: boolean;
  account?: StoredAccount;
  error?: string;
} {
  const allAccounts = getAllAccounts();
  const account = allAccounts.find(acc => acc.email.toLowerCase() === credentials.email.toLowerCase());

  if (!account) {
    return { success: false, error: 'Пользователь с таким email не найден' };
  }

  if (!validatePassword(account, credentials.password)) {
    return { success: false, error: 'Неверный пароль' };
  }

  return { success: true, account };
}

// Создание 2FA сессии
export function create2FASession(account: StoredAccount): string {
  const code = generate2FACode();
  const expiry = Date.now() + TWO_FACTOR_VALIDITY_MS;

  const state: AuthState = {
    isAuthenticated: false,
    currentUser: account,
    twoFactorCode: code,
    twoFactorExpiry: expiry,
  };

  saveAuthState(state);

  // В реальной системе код отправляется через push-уведомление
  console.log(`[2FA] Код для ${account.email}: ${code}`);

  return code;
}

// Проверка 2FA кода
export function verify2FACode(inputCode: string): {
  success: boolean;
  error?: string;
} {
  const state = loadAuthState();

  if (!state.twoFactorCode || !state.twoFactorExpiry) {
    return { success: false, error: '2FA сессия не найдена' };
  }

  if (Date.now() > state.twoFactorExpiry) {
    return { success: false, error: 'Код истек. Запросите новый' };
  }

  if (inputCode !== state.twoFactorCode) {
    return { success: false, error: 'Неверный код' };
  }

  // Успешная авторизация
  const newState: AuthState = {
    isAuthenticated: true,
    currentUser: state.currentUser,
    twoFactorCode: null,
    twoFactorExpiry: null,
  };

  saveAuthState(newState);

  return { success: true };
}

// Повторная отправка 2FA кода
export function resend2FACode(): string | null {
  const state = loadAuthState();

  if (!state.currentUser) {
    return null;
  }

  return create2FASession(state.currentUser);
}

// Выход из системы
export function logout(): void {
  const emptyState: AuthState = {
    isAuthenticated: false,
    currentUser: null,
    twoFactorCode: null,
    twoFactorExpiry: null,
  };
  saveAuthState(emptyState);
}

// Регистрация нового аккаунта
export function registerAccount(data: RegisterData): {
  success: boolean;
  account?: StoredAccount;
  error?: string;
} {
  // Валидация email
  if (!data.email.endsWith('@my.mgimo.ru')) {
    return { success: false, error: 'Email должен заканчиваться на @my.mgimo.ru' };
  }

  // Проверка существования аккаунта
  const allAccounts = getAllAccounts();
  if (allAccounts.find(acc => acc.email.toLowerCase() === data.email.toLowerCase())) {
    return { success: false, error: 'Аккаунт с таким email уже существует' };
  }

  // Валидация пароля
  if (data.password.length < 6) {
    return { success: false, error: 'Пароль должен содержать минимум 6 символов' };
  }

  // Создание нового аккаунта
  const facultyNames: Record<string, string> = {
    'МО': 'Факультет международных отношений',
    'МП': 'Факультет международного права',
    'МЭО': 'Факультет международных экономических отношений',
    'МИЭП': 'Институт маркетинга и предпринимательства',
    'ИМТУР': 'Институт международного туризма',
    'ФУП': 'Факультет управления и политики',
  };

  const initials = data.fullName
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarColors = [
    { bg: '#1e3a8a', text: '#fbbf24' },
    { bg: '#166534', text: '#fbbf24' },
    { bg: '#7c2d12', text: '#fbbf24' },
    { bg: '#4c1d95', text: '#fbbf24' },
  ];
  const color = avatarColors[Math.floor(Math.random() * avatarColors.length)];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${color.bg}"/><text x="40" y="48" text-anchor="middle" font-size="26" font-family="Arial,sans-serif" fill="${color.text}">${initials}</text></svg>`;
  const avatarUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

  const newAccount: StoredAccount = {
    id: `acc-${crypto.randomUUID()}`,
    email: data.email,
    passwordHash: data.password,
    profile: {
      name: data.fullName,
      studentId: `26-${Math.floor(10000 + Math.random() * 89999)}`,
      faculty: facultyNames[data.faculty] || 'Факультет',
      group: `${data.faculty}-${data.course}0${Math.floor(1 + Math.random() * 9)}`,
      course: data.course,
      role: data.role,
      avatarUrl,
      gpa: 4.0,
      brsAverage: 75,
      ratingPlace: 50,
      email: data.email,
      phone: `+7 (9${Math.floor(10 + Math.random() * 89)}) ${Math.floor(100 + Math.random() * 899)}-${Math.floor(10 + Math.random() * 89)}-${Math.floor(10 + Math.random() * 89)}`,
      passport: `${Math.floor(4500 + Math.random() * 500)} ${Math.floor(100000 + Math.random() * 899999)}`,
      snils: data.role === 'Иностранный студент' ? '—' : `${Math.floor(100 + Math.random() * 899)}-${Math.floor(100 + Math.random() * 899)}-${Math.floor(100 + Math.random() * 899)} ${Math.floor(10 + Math.random() * 89)}`,
    },
    scheduleData: [],
    gradesData: [],
    requestsData: [],
    notificationsData: [
      {
        id: `nt-${crypto.randomUUID()}`,
        title: 'Добро пожаловать в Цифровой деканат!',
        message: 'Ваш аккаунт успешно создан. Здесь вы можете смотреть расписание, оценки БРС и подавать заявки на справки.',
        date: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date()),
        type: 'success',
        isRead: false,
      },
    ],
    chatHistoryData: [
      {
        id: `msg-${crypto.randomUUID()}`,
        sender: 'ai',
        text: `Здравствуйте, ${data.fullName.split(' ')[0]}! Я ассистент цифрового деканата МГИМО. Подскажу по расписанию, баллам БРС и помогу оформить справку — напишите, что нужно.`,
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      },
    ],
  };

  saveNewAccount(newAccount);

  return { success: true, account: newAccount };
}

// Получение текущего пользователя
export function getCurrentUser(): StoredAccount | null {
  const state = loadAuthState();
  return state.isAuthenticated ? state.currentUser : null;
}

// Проверка аутентификации
export function isAuthenticated(): boolean {
  const state = loadAuthState();
  return state.isAuthenticated;
}
