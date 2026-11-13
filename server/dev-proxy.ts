import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

function detectApiProvider(apiKey: string): string {
  if (apiKey.startsWith('AIza')) return 'gemini';
  if (apiKey.startsWith('sk-or-')) return 'openrouter';
  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('sk_live_')) return 'xyvero';
  return 'unknown';
}

function generateFallbackResponse(messages: ChatMessage[], studentData: ChatRequest['studentData']): string {
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';

  if (/иди|нахуй|пош[её]л|отстань|заткнись|бесит|достал|хуй|еб|бляд|сука/.test(lastMessage)) {
    return 'Понял. Не буду навязывать помощь. Если позже понадобится информация по учебе или заявкам, напишите.';
  }

  const fallbacks: Record<string, string> = {
    справка: `Могу помочь оформить справку об обучении. Уточните, пожалуйста, нужен электронный PDF с ЭЦП или бумажный оригинал.`,
    консультация: `По вашим показателям (БРС: ${studentData.brsAverage}/100, GPA: ${studentData.gpa.toFixed(2)}) могу помочь найти консультацию преподавателя или деканата.`,
    расписание: `Ваше расписание доступно в разделе «Расписание».`,
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
      system: systemPrompt,
      contents: messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = (await response.json()) as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenRouter(apiKey: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter API error: ${response.status}`);
  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content || '';
}

async function callGroq(apiKey: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'mixtral-8x7b-32768',
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content || '';
}

async function callXyvero(apiKey: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.xyvero.space/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gemini-3.8-flash',
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Xyvero API error: ${response.status} - ${error}`);
  }
  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content || '';
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, studentData } = req.body as ChatRequest;

    if (!messages || !studentData) {
      res.status(400).json({ response: 'Missing messages or studentData' });
      return;
    }

    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
      console.error('AI_API_KEY is not configured');
      res.status(503).json({ response: 'ИИ-сервис временно недоступен: на сервере не настроен AI_API_KEY.' });
      return;
    }

    const systemPrompt = `Ты — официальный ИИ-ассистент Цифрового деканата МГИМО.

Твоя задача — вести естественный многоходовый диалог со студентом, а не выдавать шаблонные ответы. Всегда отвечай именно на ПОСЛЕДНЕЕ сообщение пользователя с учетом всей истории диалога. Не повторяй предыдущий ответ и не возвращайся к старой теме, если студент ее не продолжает.

## КОНТЕКСТ СТУДЕНТА (обезличено по 152-ФЗ)
**Роль:** ${studentData.role}
**Курс:** ${studentData.course}
**Факультет:** ${studentData.faculty}
**Группа:** ${studentData.group}
**Рейтинг:** место ${studentData.ratingPlace}
**БРС:** ${studentData.brsAverage}/100, GPA ${studentData.gpa.toFixed(2)}

## ПРАВИЛА ДИАЛОГА
1. Отвечай на русском языке, спокойно, кратко и по делу.
2. Если студент выражает раздражение или просит прекратить диалог, признай это и не навязывай помощь.
3. Не повторяй приветствие и академические показатели в каждом сообщении.
4. Не утверждай, что заявка создана или отправлена: у тебя нет права создавать заявки напрямую.
5. Если студент только спрашивает о справке, объясни варианты и задай уточняющий вопрос.
6. Добавляй ACTION только если студент явно просит оформить документ или создать заявку. Формат: <ACTION>{"action":"create_request","title":"Справка об обучении","category":"Справки","deliveryFormat":"Электронная с ЭЦП (PDF)"}</ACTION>
7. Если студент не просит документ, никогда не добавляй ACTION.
8. Не запрашивай пароли, данные карт, паспорт или СНИЛС.`;

    const provider = detectApiProvider(apiKey);
    let aiResponse = '';

    try {
      if (provider === 'gemini') {
        aiResponse = await callGemini(apiKey, messages, systemPrompt);
      } else if (provider === 'openrouter') {
        aiResponse = await callOpenRouter(apiKey, messages, systemPrompt);
      } else if (provider === 'groq') {
        aiResponse = await callGroq(apiKey, messages, systemPrompt);
      } else if (provider === 'xyvero') {
        aiResponse = await callXyvero(apiKey, messages, systemPrompt);
      }
    } catch (apiError) {
      console.error('❌ API call failed:', apiError);
      res.status(502).json({ response: 'ИИ-сервис не ответил. Проверьте AI_API_KEY, AI_MODEL и настройки API-провайдера.' });
      return;
    }

    // Парсинг actionable AI
    let suggestedAction: any;
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const actionData = JSON.parse(jsonMatch[1]);
        if (actionData.action === 'create_request') {
          suggestedAction = { type: 'request', ...actionData };
          aiResponse = aiResponse.replace(/```json\n[\s\S]*?\n```\n?/g, '').trim();
        }
      } catch {
        /* ignore */
      }
    }

    res.json({ response: aiResponse, suggestedAction });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ response: 'Извините, временные проблемы с сервером.' });
  }
});

const PORT = process.env.VITE_API_PORT || 3001;
app.listen(PORT, () => console.log(`✅ Dev proxy running on :${PORT}`));
