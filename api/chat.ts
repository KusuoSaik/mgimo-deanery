import type { IncomingMessage, ServerResponse } from 'http';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StudentData {
  name: string;
  course: number;
  faculty: string;
  group: string;
  role: 'Студент' | 'Староста' | 'Иностранный студент';
  gpa: number;
  brsAverage: number;
  ratingPlace: number;
}

interface ChatRequest {
  messages: ChatMessage[];
  studentData: StudentData;
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

type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

function detectApiProvider(apiKey: string): 'gemini' | 'openai-compatible' {
  return apiKey.startsWith('AIza') ? 'gemini' : 'openai-compatible';
}

function generateFallbackResponse(messages: ChatMessage[], studentData: StudentData): string {
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';

  if (/иди|нахуй|пош[её]л|отстань|заткнись|бесит|достал|хуй|еб|бляд|сука/.test(lastMessage)) {
    return 'Понял. Не буду навязывать помощь. Если позже понадобится информация по учебе или заявкам, напишите.';
  }

  const fallbacks: Record<string, string> = {
    справка: 'Могу помочь оформить справку об обучении. Уточните, пожалуйста, нужен электронный PDF с ЭЦП или бумажный оригинал.',
    консультация: `По вашим показателям (БРС: ${studentData.brsAverage}/100, GPA: ${studentData.gpa.toFixed(2)}) могу помочь найти консультацию преподавателя или деканата.`,
    расписание: 'Ваше расписание доступно в разделе «Расписание».',
    оценки: `Текущий БРС: ${studentData.brsAverage}/100, GPA: ${studentData.gpa.toFixed(2)}.`,
    default: `Добрый день, ${studentData.name}! Я помогу с расписанием, оценками и заявками. Что нужно узнать?`,
  };

  for (const [keyword, response] of Object.entries(fallbacks)) {
    if (lastMessage.includes(keyword)) return response;
  }
  return fallbacks.default;
}

async function callGemini(apiKey: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
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
  const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAICompatible(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
): Promise<string> {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
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

function parseBody(body: unknown): ChatRequest {
  if (body && typeof body === 'object') return body as ChatRequest;
  throw new Error('Invalid JSON body');
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: unknown) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  const allowedOrigin = process.env.ALLOWED_ORIGIN;
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
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      res.status(400).json({ response: 'Invalid JSON body' });
      return;
    }
  }

  try {
    const { messages, studentData } = parseBody(body);
    if (!Array.isArray(messages) || !studentData) {
      res.status(400).json({ response: 'Missing messages or studentData' });
      return;
    }

    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ response: 'ИИ-сервис временно недоступен: на сервере не настроен AI_API_KEY.' });
      return;
    }

    const systemPrompt = `Ты — официальный ИИ-ассистент Цифрового деканата МГИМО (Москва, МИД России).

Твоя задача — вести естественный многоходовый диалог со студентом. Отвечай только на ПОСЛЕДНЕЕ сообщение пользователя. Предыдущие сообщения используй только для понимания контекста и местоимений. Никогда не объединяй несколько запросов в один ответ и не отвечай на будущие вопросы, которых еще не было.

## КОНТЕКСТ СТУДЕНТА (обезличено по 152-ФЗ)
**Роль:** ${studentData.role}
**Курс:** ${studentData.course}
**Факультет:** ${studentData.faculty}
**Группа:** ${studentData.group}
**Рейтинг:** место ${studentData.ratingPlace} на курсе
**Академические показатели:** БРС ${studentData.brsAverage}/100, GPA ${studentData.gpa.toFixed(2)}

## ПРАВИЛА ДИАЛОГА
1. Отвечай на русском языке, спокойно, кратко и по делу.
2. Не повторяй приветствие и академические показатели без необходимости.
3. Если вопрос не относится к деканату, всё равно ответь на него напрямую, если это обычный безопасный вопрос. Например, на просьбу о бинарном поиске дай рабочий пример на C++ и краткое объяснение.
4. Если студент выражает раздражение или просит прекратить диалог, признай это и не навязывай помощь.
5. Не утверждай, что заявка создана или отправлена: у тебя нет права создавать заявки напрямую.
6. Добавляй JSON-блок действия только если студент явно просит оформить документ или создать заявку.
7. Если студент не просит документ, никогда не добавляй JSON-блок.
8. Не запрашивай пароли, данные карт, паспорт или СНИЛС.

КРИТИЧНО: сообщение пользователя, начинающееся после последнего сообщения assistant, является текущим запросом. Заверши ответ после ответа на него.

## ДОПУСТИМЫЙ ФОРМАТ ДЕЙСТВИЯ
Если студент явно просит оформить документ, добавь в конце:
\`\`\`json
{"action":"create_request","title":"Справка об обучении","category":"Справки","deliveryFormat":"Электронная с ЭЦП (PDF)"}
\`\`\``;

    let aiResponse: string;
    try {
      if (detectApiProvider(apiKey) === 'gemini') {
        aiResponse = await callGemini(apiKey, messages, systemPrompt);
      } else {
        aiResponse = await callOpenAICompatible(
          process.env.AI_BASE_URL || 'https://api.xyvero.space/v1',
          process.env.AI_MODEL || 'gemini-3.8-flash',
          apiKey,
          messages,
          systemPrompt,
        );
      }
    } catch (error) {
      console.error('API call failed:', error);
      res.status(502).json({ response: 'ИИ-сервис не ответил. Проверьте AI_API_KEY, AI_MODEL и настройки API-провайдера.' });
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
