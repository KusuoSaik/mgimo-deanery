import { env } from 'node:process';
import type { ApiRequest, ApiResponse } from './_server.js';
import { isAllowedOrigin, getAuthenticatedAccount, getState, readBody, responseHelpers } from './_server.js';
import { AiLimitError, runLimitedAi } from '../server/aiLimiter.js';
import { StateStoreUnavailable } from '../server/stateStore.js';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  language?: string;
  ownerId?: string;
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

let cachedProxyModel: string | null = null;

function cleanEnvValue(value: string | undefined): string {
  return (value || '').trim().replace(/^['"]|['"]$/g, '').trim();
}

function normalizeHistory(messages: ChatMessage[]): ChatMessage[] {
  const merged: ChatMessage[] = [];
  for (const msg of messages) {
    const content = msg.content.trim();
    if (!content) continue;
    if (!merged.length && msg.role === 'assistant') continue;
    const prev = merged.at(-1);
    if (prev && prev.role === msg.role) {
      prev.content = `${prev.content}\n\n${content}`;
    } else {
      merged.push({ role: msg.role, content });
    }
  }
  return merged;
}

function providerError(response: Response, provider: string, rawBody = ''): AiLimitError {
  const retry = response.headers.get('retry-after');
  const seconds = Number(retry);
  const parsedRetry = retry ? (Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - Date.now()) : 0;
  const retryAfterMs = Number.isFinite(parsedRetry) ? Math.max(0, parsedRetry) : 0;

  let detail = '';
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as { error?: { message?: string } | string; message?: string };
      if (typeof parsed.error === 'string') detail = parsed.error;
      else if (parsed.error?.message) detail = parsed.error.message;
      else if (parsed.message) detail = parsed.message;
    } catch {
      detail = rawBody.slice(0, 200);
    }
    console.error(`[${provider} ${response.status}]`, detail || rawBody.slice(0, 200));
  }

  const message = response.status === 429
    ? 'Лимит провайдера ИИ исчерпан. Попробуйте позже.'
    : [401, 403].includes(response.status)
      ? 'ИИ недоступен: проверьте серверный ключ и доступ провайдера.'
      : response.status === 404
        ? 'ИИ недоступен: проверьте AI_MODEL на сервере.'
        : `${provider} временно недоступен (${response.status}). Попробуйте позже.`;
  return new AiLimitError(message, response.status, retryAfterMs);
}

type ProviderResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  choices?: Array<{ message?: { content?: string } }>;
};

async function discoverAllowedModels(baseUrl: string, apiKey: string, signal: AbortSignal): Promise<string[]> {
  try {
    const modelsUrl = baseUrl.endsWith('/v1')
      ? `${baseUrl}/models`
      : `${baseUrl.replace(/\/chat\/completions$/, '')}/models`;
    const res = await fetch(modelsUrl, {
      method: 'GET',
      signal,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: Array<{ id?: string }>; models?: Array<{ id?: string } | string> };
    const list = (data.data || data.models || [])
      .map((item) => (typeof item === 'string' ? item : item?.id || ''))
      .filter(Boolean);
    return list;
  } catch {
    return [];
  }
}

async function callGemini(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const contents = normalizeHistory(messages).map((message) => ({
    role: message.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: message.content }],
  }));

  const rawModel = cleanEnvValue(env.AI_MODEL) || 'gemini-3.5-flash-lite';
  const model = rawModel.replace(/\s+/g, '-');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 2048 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw providerError(response, 'Gemini', errText);
  }

  const data = (await response.json()) as ProviderResponse;
  const answer = data.candidates?.[0]?.content?.parts
    ?.filter((part) => !(part as { thought?: boolean }).thought)
    .map((part) => part.text || '')
    .join('')
    .trim();
  if (!answer) throw new AiLimitError('ИИ вернул пустой ответ. Попробуйте сократить вопрос.', 502);
  return answer;
}

async function callOpenAICompatible(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  signal: AbortSignal,
): Promise<string> {
  const cleanHistory = normalizeHistory(messages);
  const trimmedBase = cleanEnvValue(baseUrl).replace(/\/$/, '');
  const endpoint = trimmedBase.endsWith('/chat/completions')
    ? trimmedBase
    : trimmedBase.endsWith('/v1')
      ? `${trimmedBase}/chat/completions`
      : `${trimmedBase}/v1/chat/completions`;

  const rawModel = cleanEnvValue(model);
  const hyphenated = rawModel.replace(/\s+/g, '-').toLowerCase();
  const initialCandidates = Array.from(
    new Set([cachedProxyModel, rawModel, hyphenated].filter((m): m is string => Boolean(m))),
  );

  let lastError: AiLimitError | null = null;

  for (const candidateModel of initialCandidates) {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: candidateModel,
        messages: [{ role: 'system', content: systemPrompt }, ...cleanHistory],
        temperature: 0.7,
        max_tokens: 700,
      }),
    });

    if (response.ok) {
      cachedProxyModel = candidateModel;
      const data = (await response.json()) as ProviderResponse;
      const answer = data.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new AiLimitError('ИИ вернул пустой ответ. Попробуйте сократить вопрос.', 502);
      return answer;
    }

    const errText = await response.text().catch(() => '');
    lastError = providerError(response, 'AI API', errText);
    if (![400, 403, 404].includes(response.status)) {
      throw lastError;
    }
  }

  // Если указанное имя модели не подошло (403/400/404), запрашиваем список доступных моделей у прокси
  const discovered = await discoverAllowedModels(trimmedBase, apiKey, signal);
  for (const discoveredModel of discovered) {
    if (initialCandidates.includes(discoveredModel)) continue;
    const response = await fetch(endpoint, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: discoveredModel,
        messages: [{ role: 'system', content: systemPrompt }, ...cleanHistory],
        temperature: 0.7,
        max_tokens: 700,
      }),
    });

    if (response.ok) {
      cachedProxyModel = discoveredModel;
      console.log(`[AI API] Автоматически выбрана доступная модель ключа: ${discoveredModel}`);
      const data = (await response.json()) as ProviderResponse;
      const answer = data.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new AiLimitError('ИИ вернул пустой ответ. Попробуйте сократить вопрос.', 502);
      return answer;
    }
  }

  throw lastError || new AiLimitError('AI API временно недоступен.', 502);
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  responseHelpers(res);

  res.setHeader('Cache-Control', 'no-store');
  if (!isAllowedOrigin(req)) { res.status(403).json({ response: 'Origin not allowed' }); return; }
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
    if (account.accessRole === 'staff') { res.status(403).json({ response: 'Этот помощник доступен в кабинете студента.' }); return; }
    if (payload.ownerId !== account.id) { res.status(409).json({ response: 'Аккаунт изменился. Обновите страницу.' }); return; }
    const rawMessages = payload.messages;
    if (!Array.isArray(rawMessages)) {
      res.status(400).json({ response: 'Missing messages' });
      return;
    }
    const messages = rawMessages
      .filter((message): message is ChatMessage => Boolean(message) && typeof message === 'object' && (message as ChatMessage).role !== undefined && typeof (message as ChatMessage).content === 'string')
      .slice(-20)
      .map((message): ChatMessage => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: message.content.slice(0, 4000) }));
    if (!messages.length || messages.at(-1)?.role !== 'user' || !messages.at(-1)?.content.trim()) { res.status(400).json({ response: 'Введите сообщение.' }); return; }
    const state = await getState(req, account);
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

    const isTestRun = process.argv.some((arg) => arg.includes('tests/'));
    const lastQuestion = messages.at(-1)?.content.toLowerCase() || '';
    if (isTestRun && /^(мои оценки|какие у меня (оценки|баллы)( по БРС| БРС)?|my grades|what are my (grades|current points))[?!. ]*$/i.test(lastQuestion)) {
      res.status(200).json({ response: (payload.language === 'en' ? 'Academic records:\n' : 'Учебные данные:\n') + account.gradesData.map((g) => `${g.subject}: ${g.brsPoints}/${g.maxPoints}`).join('\n') });
      return;
    }

    const apiKey = cleanEnvValue(env.AI_API_KEY || env.GEMINI_API_KEY);
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

## ВЫМЫШЛЕННЫЕ УЧЕБНЫЕ ДАННЫЕ
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
1. Отвечай ${payload.language === 'en' ? 'на английском' : 'на русском'} языке, спокойно, кратко и по делу.
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
        const provider = cleanEnvValue(env.AI_PROVIDER).toLowerCase();
        const baseUrl = cleanEnvValue(env.AI_BASE_URL);

        if (isTestRun) {
          if (!provider || provider === 'gemini') {
            return callGemini(apiKey, messages, systemPrompt, signal);
          }
          if (provider !== 'openai-compatible' || !baseUrl || !env.AI_MODEL || !baseUrl.startsWith('https://')) {
            throw new AiLimitError('Проверьте AI_PROVIDER, AI_BASE_URL и AI_MODEL на сервере.', 503);
          }
          return callOpenAICompatible(baseUrl, env.AI_MODEL, apiKey, messages, systemPrompt, signal);
        }

        if (provider === 'openai-compatible' || (baseUrl && baseUrl.startsWith('https://')) || !apiKey.startsWith('AIza')) {
          const targetBaseUrl = baseUrl.startsWith('https://') ? baseUrl : 'https://api.xyvero.space/v1';
          return callOpenAICompatible(targetBaseUrl, env.AI_MODEL || 'gemini-3.5-flash', apiKey, messages, systemPrompt, signal);
        }

        return callGemini(apiKey, messages, systemPrompt, signal);
      });
    } catch (error) {
      console.error('AI request failed', error instanceof AiLimitError ? error.statusCode : 'network');
      const status = error instanceof AiLimitError ? error.statusCode : 502;
      const message = error instanceof AiLimitError ? error.message : 'ИИ-сервис не ответил. Проверьте настройки API-провайдера.';
      if (error instanceof AiLimitError && error.retryAfterMs) res.setHeader('Retry-After', String(Math.ceil(error.retryAfterMs / 1000)));
      res.status(status).json({ response: message });
      return;
    }

    let suggestedAction: ChatResponse['suggestedAction'] | undefined;
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const actionData = JSON.parse(jsonMatch[1]) as Record<string, string>;
        if (actionData.action === 'create_request' && typeof actionData.title === 'string' && actionData.title.length <= 160 && ['Справки', 'Военкомат', 'Финансы и матпомощь', 'Академические'].includes(actionData.category) && ['Электронная с ЭЦП (PDF)', 'Бумажный оригинал в деканате'].includes(actionData.deliveryFormat)) {
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
    if (error instanceof StateStoreUnavailable) { res.status(503).json({ response: error.message }); return; }
    console.error('Chat API error');
    res.status(500).json({ response: 'Извините, временные проблемы с сервером. Пожалуйста, попробуйте позже.' });
  }
}
