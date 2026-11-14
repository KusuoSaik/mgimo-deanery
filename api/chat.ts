import { env } from 'node:process';
import type { ApiRequest, ApiResponse } from './_server.js';
import { getAuthenticatedAccount, getState, readBody, responseHelpers } from './_server.js';
import { AiLimitError, runLimitedAi } from '../server/aiLimiter.js';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
}

interface ChatResponse {
  response: string;
  suggestedAction?: {
    type: 'request';
    title: string;
    category: string;
    deliveryFormat: string;
  };
}

function detectApiProvider(apiKey: string): 'gemini' | 'openai-compatible' {
  return apiKey.startsWith('AIza') ? 'gemini' : 'openai-compatible';
}

type ProviderResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  choices?: Array<{ message?: { content?: string } }>;
};

async function callGemini(apiKey: string, messages: ChatMessage[], systemPrompt: string, signal: AbortSignal): Promise<string> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map((message) => ({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content }],
      })),
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = (await response.json()) as ProviderResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAICompatible(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error(`AI API error: ${response.status}`);
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || '';
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  responseHelpers(res);

  const allowedOrigin = env.ALLOWED_ORIGIN;
  const requestOrigin = req.headers.origin;
  if (allowedOrigin && requestOrigin && requestOrigin !== allowedOrigin) {
    res.status(403).json({ response: 'Origin not allowed' });
    return;
  }
  if (allowedOrigin && (!requestOrigin || requestOrigin === allowedOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ response: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (!body) {
    try {
      body = await readBody(req);
    } catch {
      res.status(400).json({ response: 'Invalid JSON body' });
      return;
    }
  }

  try {
    const account = getAuthenticatedAccount(req);
    if (!account) {
      res.status(401).json({ response: 'Сессия истекла. Войдите снова.' });
      return;
    }
    const payload = body as Partial<ChatRequest>;
    const rawMessages = payload.messages;
    if (!Array.isArray(rawMessages)) {
      res.status(400).json({ response: 'Missing messages' });
      return;
    }
    const messages = rawMessages
      .filter((message): message is ChatMessage => Boolean(message) && typeof message === 'object' && (message as ChatMessage).role !== undefined && typeof (message as ChatMessage).content === 'string')
      .slice(-20)
      .map((message): ChatMessage => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content.slice(0, 4000) }));
    const state = getState(req, account);
    const studentData = {
      course: account.profile.course,
      faculty: account.profile.faculty,
      group: account.profile.group,
      role: account.profile.role,
      gpa: account.profile.gpa,
      brsAverage: account.profile.brsAverage,
      ratingPlace: account.profile.ratingPlace,
      grades: account.gradesData,
      schedule: account.scheduleData,
      requests: state.requests,
    };

    const apiKey = env.AI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ response: 'ИИ-сервис временно недоступен: на сервере не настроен AI_API_KEY.' });
      return;
    }

    const gradesSummary =
      Array.isArray(studentData.grades) && studentData.grades.length > 0
        ? studentData.grades.map((g) => `- ${g.subject}: ${g.brsPoints}/100 (${g.status}, ${g.examType}, преп. ${g.professor})`).join('\n')
        : 'Нет данных';

    const scheduleSummary =
      Array.isArray(studentData.schedule) && studentData.schedule.length > 0
        ? studentData.schedule
            .map(
              (s) =>
                `- ${s.day} (${s.weekType}): ${s.time} — ${s.subject} (${s.type}), ауд. ${s.room}, ${s.building}${
                  s.changeNote ? ` [ИЗМЕНЕНИЕ: ${s.changeNote}]` : ''
                }`,
            )
            .join('\n')
        : 'Нет данных';

    const requestsSummary =
      Array.isArray(studentData.requests) && studentData.requests.length > 0
        ? studentData.requests.map((r) => `- ${r.title}: ${r.status} (этап ${r.stage}/5)`).join('\n')
        : 'Активных заявок нет';

    const systemPrompt = `Ты — ИИ-ассистент Цифрового деканата (конкурсный концепт личного кабинета студента МГИМО).

Твоя задача — вести естественный многоходовый диалог со студентом. Отвечай только на ПОСЛЕДНЕЕ сообщение пользователя. Предыдущие сообщения используй только для понимания контекста.

## КОНТЕКСТ СТУДЕНТА (обезличено по 152-ФЗ)
**Роль:** ${studentData.role}
**Курс:** ${studentData.course}
**Факультет:** ${studentData.faculty}
**Группа:** ${studentData.group}
**Рейтинг:** место ${studentData.ratingPlace} на курсе
**Академические показатели:** БРС ${studentData.brsAverage}/100, GPA ${studentData.gpa.toFixed(2)}

**Дисциплины и баллы БРС:**
${gradesSummary}

**Расписание занятий:**
${scheduleSummary}

**Текущие заявки в СЭД:**
${requestsSummary}

## ПРАВИЛА ДИАЛОГА
1. Отвечай на русском языке, спокойно, кратко и по делу.
2. Используй реальные оценки, расписание и заявки из контекста выше, когда студент спрашивает о них.
3. Не утверждай, что заявка уже создана: предлагай карточку создания через JSON-блок.
4. Добавляй JSON-блок действия только если студент явно просит оформить документ, справку или создать заявку.
5. Не запрашивай пароли, данные карт, паспорт или СНИЛС.

## ДОПУСТИМЫЙ ФОРМАТ ДЕЙСТВИЯ
Если студент явно просит оформить документ или справку, добавь в самом конце ответа:
\`\`\`json
{"action":"create_request","title":"Справка об обучении","category":"Справки","deliveryFormat":"Электронная с ЭЦП (PDF)"}
\`\`\``;

    let aiResponse: string;
    try {
      aiResponse = await runLimitedAi(account.id, (signal) => {
        if (detectApiProvider(apiKey) === 'gemini') {
          return callGemini(apiKey, messages, systemPrompt, signal);
        }
        return callOpenAICompatible(
          env.AI_BASE_URL || 'https://api.xyvero.space/v1',
          env.AI_MODEL || 'gemini-3.8-flash',
          apiKey,
          messages,
          systemPrompt,
          signal,
        );
      });
    } catch (error) {
      console.error('API call failed:', error);
      const status = error instanceof AiLimitError ? error.statusCode : 502;
      const message = error instanceof AiLimitError ? error.message : 'ИИ-сервис не ответил. Проверьте настройки API-провайдера.';
      res.status(status).json({ response: message });
      return;
    }

    let suggestedAction: ChatResponse['suggestedAction'] | undefined;
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const actionData = JSON.parse(jsonMatch[1]) as Record<string, string>;
        if (actionData.action === 'create_request') {
          suggestedAction = {
            type: 'request',
            title: actionData.title,
            category: actionData.category,
            deliveryFormat: actionData.deliveryFormat,
          };
          aiResponse = aiResponse.replace(/```json\s*[\s\S]*?\s*```\s*/g, '').trim();
        }
      } catch {
        // Keep the original response when the optional action is malformed.
      }
    }

    res.status(200).json({ response: aiResponse, suggestedAction });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ response: 'Извините, временные проблемы с сервером. Пожалуйста, попробуйте позже.' });
  }
}
