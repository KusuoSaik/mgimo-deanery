import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  studentData: {
    name: string;
    course: number;
    faculty: string;
    group: string;
    role: 'Студент' | 'Староста' | 'Иностранный студент';
    gpa: number;
    brsAverage: number;
    ratingPlace: number;
  };
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

// Определение API-провайдера по ключу
function detectApiProvider(apiKey: string): {
  provider: 'gemini' | 'openrouter' | 'groq' | 'unknown';
  baseUrl?: string;
} {
  if (apiKey.startsWith('AIza')) {
    return { provider: 'gemini' };
  }
  if (apiKey.startsWith('sk-or-')) {
    return { provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1' };
  }
  if (apiKey.startsWith('gsk_')) {
    return { provider: 'groq', baseUrl: 'https://api.groq.com/openai/v1' };
  }
  return { provider: 'unknown' };
}

// Fallback ответ на основе контекста студента
function generateFallbackResponse(messages: ChatMessage[], studentData: ChatRequest['studentData']): string {
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';

  const fallbacks: Record<string, string> = {
    справка: `Здравствуйте, ${studentData.name}! Я помогу вам оформить справку. Какой тип справки вам нужен? Я предложу наиболее подходящий вариант из очереди документов для вашего ${studentData.course}-го курса факультета ${studentData.faculty}.`,
    консультация: `По вашим показателям (БРС: ${studentData.brsAverage}/100, GPA: ${studentData.gpa.toFixed(2)}) я рекомендую встречу с деканом. Вы на ${studentData.ratingPlace}-м месте на курсе — отличный результат!`,
    расписание: `Ваше расписание загружено в систему. Можете посмотреть его в разделе "Расписание" приложения.`,
    оценки: `Текущий БРС: ${studentData.brsAverage}/100, GPA: ${studentData.gpa.toFixed(2)}. ${studentData.brsAverage >= 70 ? 'Отличный результат!' : 'Рекомендую записаться на консультацию.'}`,
    default: `Добрый день, ${studentData.name}! Я — ИИ-ассистент цифрового деканата МГИМО. Как дела? Чем я вам могу помочь? Я знаю ваше расписание, оценки и могу помочь с оформлением документов.`,
  };

  for (const [keyword, response] of Object.entries(fallbacks)) {
    if (lastMessage.includes(keyword)) {
      return response;
    }
  }

  return fallbacks.default;
}

// Google Gemini
async function callGemini(apiKey: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      system: systemPrompt,
      contents: messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', error);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// OpenRouter
async function callOpenRouter(apiKey: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

// Groq
async function callGroq(apiKey: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mixtral-8x7b-32768',
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || '';
}

export default async function handler(req: VercelRequest, res: VercelResponse<ChatResponse>): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ response: 'Method not allowed' });
    return;
  }

  try {
    const { messages, studentData } = req.body as ChatRequest;

    if (!messages || !studentData) {
      res.status(400).json({ response: 'Missing messages or studentData' });
      return;
    }

    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
      console.warn('AI_API_KEY not configured, using fallback response');
      const fallbackResponse = generateFallbackResponse(messages, studentData);
      res.status(200).json({ response: fallbackResponse });
      return;
    }

    // Система промпт с обезличиванием ПДн
    const systemPrompt = `Ты — официальный ИИ-ассистент Цифрового деканата МГИМО (Москва, МИД России).

## КОНТЕКСТ СТУДЕНТА (обезличено по 152-ФЗ)

**Роль:** ${studentData.role}
**Курс:** ${studentData.course}
**Факультет:** ${studentData.faculty}
**Группа:** ${studentData.group}
**Рейтинг:** место ${studentData.ratingPlace} на курсе
**Академические показатели:** БРС ${studentData.brsAverage}/100, GPA ${studentData.gpa.toFixed(2)}

## ПРАВИЛА ОТВЕТОВ

1. **Тон:** Вежливый, профессиональный, по делу
2. **Язык:** Русский, доступный студентам
3. **Данные:** Используй реальные баллы БРС и расписание студента
4. **Действия:** Если студент просит оформить справку/заявку — предложи интерактивную карточку заявки с кнопкой подтверждения
5. **Безопасность:** Никогда не запрашивай пароли, реквизиты карт или другие чувствительные данные

## ACTIONABLE AI: Предложение заявок

Если студент просит справку, заявку или направление — предложи в сообщении JSON-блок (в обратных кавычках):
\`\`\`json
{
  "action": "create_request",
  "title": "Справка об обучении",
  "category": "Справки",
  "deliveryFormat": "Электронная с ЭЦП (PDF)"
}
\`\`\`

Отвечай четко и предлагай помощь.`;

    const { provider } = detectApiProvider(apiKey);
    let aiResponse = '';

    try {
      if (provider === 'gemini') {
        aiResponse = await callGemini(apiKey, messages, systemPrompt);
      } else if (provider === 'openrouter') {
        aiResponse = await callOpenRouter(apiKey, messages, systemPrompt);
      } else if (provider === 'groq') {
        aiResponse = await callGroq(apiKey, messages, systemPrompt);
      } else {
        throw new Error('Unknown API provider');
      }
    } catch (apiError) {
      console.error('API call failed, using fallback:', apiError);
      aiResponse = generateFallbackResponse(messages, studentData);
    }

    // Парсинг actionable AI
    let suggestedAction: ChatResponse['suggestedAction'] | undefined;
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const actionData = JSON.parse(jsonMatch[1]) as any;
        if (actionData.action === 'create_request') {
          suggestedAction = {
            type: 'request',
            title: actionData.title,
            category: actionData.category,
            deliveryFormat: actionData.deliveryFormat,
          };
          // Удаляем JSON из ответа
          aiResponse = aiResponse.replace(/```json\n[\s\S]*?\n```\n?/g, '').trim();
        }
      } catch {
        // Игнорируем ошибки парсинга
      }
    }

    res.status(200).json({
      response: aiResponse,
      suggestedAction,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      response: 'Извините, временные проблемы с сервером. Пожалуйста, попробуйте позже.',
    });
  }
}
