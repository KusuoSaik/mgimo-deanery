import type { StoredAccount } from '../src/auth/types.js';
// Identity and permissions are server-owned, never selected by the browser.
export const DEMO_STAFF: StoredAccount = {
  id: 'staff-001', email: 'dean.demo@my.mgimo.ru', accessRole: 'staff',
  profile: { name: 'Орлова Марина Викторовна', faculty: 'Учебный отдел · Конкурсный прототип', course: 0, group: 'Деканат', role: 'Студент', studentId: 'STAFF-DEMO', avatarUrl: '', gpa: 0, brsAverage: 0, ratingPlace: 0, email: 'dean.demo@my.mgimo.ru', phone: '', passport: '', snils: '' },
  scheduleData: [], gradesData: [], requestsData: [], notificationsData: [], chatHistoryData: [],
};
