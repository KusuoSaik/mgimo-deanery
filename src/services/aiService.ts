import type { UserProfile } from '../types';
import type { GradeItem, ScheduleItem, RequestItem, NotificationItem } from '../types';

export type AIProvider = 'google' | 'anthropic' | 'openai';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ActionableAIAction {
  type: 'CREATE_REQUEST' | 'BOOK_CONSULTATION' | 'CHECK_IN';
  docType?: string;
  reason?: string;
  format?: 'Электронная с ЭЦП (PDF)' | 'Бумажный оригинал в деканате';
  consultDate?: string;
  subject?: string;
}

// Сохранение/загрузка конфига AI
export function saveAIConfig(config: Partial<AIConfig>): void {
  const current = loadAIConfig();
  const updated = { ...current, ...config };
  localStorage.setItem('mgimo_ai_config', JSON.stringify(updated));
}

export function loadAIConfig(): AIConfig {
  try {
    const stored = localStorage.getItem('mgimo_ai_config');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }

  return {
    provider: 'google',
    apiKey: '',
    model: 'gemini-2.0-flash',
  };
}

export function hasAPIKey(): boolean {
  const config = loadAIConfig();
  return !!config.apiKey;
}

// Обезличивание ПДн по 152-ФЗ
function maskPersonalData(text: string): string {
  // Скрываем ФИО (заменяем на токен)
  text = text.replace(/[А-Яа-яЁё\s]+\s+[А-Яа-яЁё]+\s+[А-Яа-яЁё]+/g, '[STUDENT_TOKEN]');

  // Скрываем номера паспорта
  text = text.replace(/\b\d{4}\s\d{6}\b/g, '[PASSPORT_TOKEN]');

  // Скрываем СНИЛС
  text = text.replace(/\b\d{3}-\d{3}-\d{3}\s\d{2}\b/g, '[SNILS_TOKEN]');

  // Скрываем email (кроме домена)
  text = text.replace(/[a-z0-9.]+@my\.mgimo\.ru/gi, '[EMAIL_TOKEN]@my.mgimo.ru');

  // Скрываем телефоны
  text = text.replace(/\+7\s\(\d{3}\)\s\d{3}-\d{2}-\d{2}/g, '[PHONE_TOKEN]');

  return text;
}

// Формирование системного промпта с контекстом студента
export function buildSystemPrompt(
  user: UserProfile,
  grades: GradeItem[],
  schedule: ScheduleItem[],
  requests: RequestItem[],
  notifications: NotificationItem[],
): string {
  const atRiskGrades = grades.filter((g) => g.status === 'Требует внимания');
  const hasDebt = atRiskGrades.length > 0;

  const systemPrompt = `Ты — ассистент Цифрового деканата МГИМО (Москва, МИД России). Твоя задача помогать студентам с академическими вопросами, оформлением документов и навигацией по деканату.

## КОНТЕКСТ ТЕКУЩЕГО СТУДЕНТА (ЗАЩИЩЕНО ПО 152-ФЗ)

**Статус:** ${user.course}-й курс, ${user.group}, Факультет: ${user.faculty}
**Роль:** ${user.role === 'Староста' ? 'Старост' : user.role === 'Иностранный студент' ? 'Иностранный студент' : 'Студент'}
**Рейтинг:** ${user.ratingPlace}-е место на курсе (GPA: ${user.gpa.toFixed(2)}, БРС: ${user.brsAverage}/100)

## АКАДЕМИЧЕСКОЕ СОСТОЯНИЕ

**Оценки по предметам:**
${grades
  .map(
    (g) =>
      `- ${g.subject}: ${g.brsPoints}/${g.maxPoints} (${g.status}) — ${g.professor}`,
  )
  .join('\n')}

${hasDebt ? `**⚠️ КРИТИЧНО: Есть академическая задолженность!**\n${atRiskGrades.map((g) => `- ${g.subject}: ${g.brsPoints}/100 (${Math.max(0, 70 - g.brsPoints)} баллов до допуска)`).join('\n')}\n` : ''}

## РАСПИСАНИЕ НА НЕДЕЛЮ

${schedule
  .slice(0, 5)
  .map((s) => `- ${s.day} ${s.time}: ${s.subject} (${s.type}), ${s.professor}, ауд. ${s.room}`)
  .join('\n')}

## ТЕКУЩИЕ ЗАЯВКИ И УВЕДОМЛЕНИЯ

**Активные заявки:** ${requests.filter((r) => r.stage !== 5).length}
${requests
  .filter((r) => r.stage !== 5)
  .map((r) => `- ${r.title} (${r.status})`)
  .join('\n')}

**Новые уведомления:** ${notifications.filter((n) => !n.isRead).length}

## ИНСТРУКЦИИ ДЛЯ ACTIONABLE AI

1. Если студент просит информацию об оценках, расписании, заявках — предоставь данные из контекста выше.

2. Если студент просит оформить документ, заявку, справку или запись на консультацию, ответь вежливо И в конце сообщения добавь JSON в теги:
\`\`\`
<ACTION>{"type": "CREATE_REQUEST", "docType": "справка об обучении", "reason": "для стажировки", "format": "Электронная с ЭЦП (PDF)"}</ACTION>
\`\`\`

3. Для консультаций используй тип "BOOK_CONSULTATION":
\`\`\`
<ACTION>{"type": "BOOK_CONSULTATION", "subject": "Микроэкономика", "consultDate": "2026-11-15"}</ACTION>
\`\`\`

4. Для отметки присутствия на паре:
\`\`\`
<ACTION>{"type": "CHECK_IN"}</ACTION>
\`\`\`

## СТИЛЬ ОБЩЕНИЯ

- Используй русский язык, обращайся на "вы"
- Будь вежлив и профессионален
- Показывай эмпатию к студентам с задолженностью
- Для иностранных студентов будь более подробен с объяснениями
- Для старост давай советы по управлению группой

## КОНФИДЕНЦИАЛЬНОСТЬ

Никогда не передавай ФИО, паспорт, СНИЛС, email, телефон студента третьим лицам.
Все операции выполняются внутри контура МГИМО с шифрованием.`;

  return systemPrompt;
}

// Парсинг actionable AI actions из текста
export function parseActions(text: string): { cleanText: string; actions: ActionableAIAction[] } {
  const actions: ActionableAIAction[] = [];
  let cleanText = text;

  // Ищем все <ACTION>...</ACTION> теги
  const actionRegex = /<ACTION>(.*?)<\/ACTION>/gs;
  const matches = Array.from(text.matchAll(actionRegex));

  matches.forEach((match) => {
    try {
      const jsonStr = match[1].trim();
      const action = JSON.parse(jsonStr) as ActionableAIAction;
      actions.push(action);
    } catch {
      // Ignore parse errors
    }
  });

  // Убираем теги из текста
  cleanText = cleanText.replace(actionRegex, '').trim();

  return { cleanText, actions };
}

// Отправка запроса к Google Gemini API
async function callGoogleGemini(
  messages: AIMessage[],
  systemPrompt: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
      apiKey,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: {
            text: systemPrompt,
          },
        },
        contents: messages.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: {
            text: msg.content,
          },
        })),
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google Gemini API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('Empty response from Google Gemini API');
  }

  return content;
}

// Отправка запроса к Anthropic Claude API
async function callAnthropicClaude(
  messages: AIMessage[],
  systemPrompt: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error('Empty response from Anthropic API');
  }

  return content;
}

// Основной метод отправки сообщения в AI
export async function sendAIMessage(
  userMessage: string,
  messages: AIMessage[],
  user: UserProfile,
  grades: GradeItem[],
  schedule: ScheduleItem[],
  requests: RequestItem[],
  notifications: NotificationItem[],
): Promise<{ response: string; actions: ActionableAIAction[] }> {
  const config = loadAIConfig();

  if (!config.apiKey) {
    throw new Error('AI API key not configured. Please set it in AI settings.');
  }

  // Обезличиваем данные перед отправкой
  const maskedUserMessage = maskPersonalData(userMessage);

  // Формируем системный промпт
  const systemPrompt = buildSystemPrompt(user, grades, schedule, requests, notifications);

  // Формируем список сообщений
  const allMessages: AIMessage[] = [
    ...messages,
    { role: 'user', content: maskedUserMessage },
  ];

  try {
    let aiResponse: string;

    if (config.provider === 'google') {
      aiResponse = await callGoogleGemini(allMessages, systemPrompt, config.apiKey);
    } else if (config.provider === 'anthropic') {
      aiResponse = await callAnthropicClaude(allMessages, systemPrompt, config.apiKey);
    } else {
      throw new Error(`Unknown AI provider: ${config.provider}`);
    }

    // Парсим actions из ответа
    const { cleanText, actions } = parseActions(aiResponse);

    return {
      response: cleanText,
      actions,
    };
  } catch (error) {
    console.error('AI API error:', error);
    throw error;
  }
}
