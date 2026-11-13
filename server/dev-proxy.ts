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

function detectApiProvider(apiKey: string): 'gemini' | 'openrouter' | 'groq' | 'xyvero' | 'unknown' {
  if (apiKey.startsWith('AIza')) return 'gemini';
  if (apiKey.startsWith('sk-or-')) return 'openrouter';
  if (apiKey.startsWith('gsk_')) return 'groq';
  if (apiKey.startsWith('sk_live_')) return 'xyvero';
  return 'unknown';
}

type ProviderResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  choices?: Array<{ message?: { content?: string } }>;
};

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
  const data = (await response.json()) as ProviderResponse;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenRouter(apiKey: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'system', content: systemPrompt }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter API error: ${response.status}`);
  const data = (await response.json()) as ProviderResponse;
  return data.choices?.[0]?.message?.content || '';
}

async function callGroq(apiKey: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'mixtral-8x7b-32768',
      messages: [{ role: 'system', content: systemPrompt }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
  const data = (await response.json()) as ProviderResponse;
  return data.choices?.[0]?.message?.content || '';
}

async function callXyvero(apiKey: string, model: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.xyvero.space/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.2,
      max_tokens: 700,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Xyvero API error: ${response.status} - ${error}`);
  }
  const data = (await response.json()) as ProviderResponse;
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

Твоя задача — вести естественный многоходовый диалог со студентом. Отвечай только на ПОСЛЕДНЕЕ сообщение пользователя. Предыдущие сообщения используй только для понимания контекста и местоимений. Никогда не объединяй несколько запросов в один ответ и не отвечай на будущие вопросы, которых еще не было.

## КОНТЕКСТ СТУДЕНТА (обезличено по 152-ФЗ)
**Роль:** ${studentData.role}
**Курс:** ${studentData.course}
**Факультет:** ${studentData.faculty}
**Группа:** ${studentData.group}
**Рейтинг:** место ${studentData.ratingPlace}
**БРС:** ${studentData.brsAverage}/100, GPA ${studentData.gpa.toFixed(2)}

## ПРАВИЛА ДИАЛОГА
1. Отвечай на русском языке, спокойно, кратко и по делу.
2. Не повторяй приветствие и академические показатели без необходимости.
3. Если вопрос не относится к деканату, всё равно ответь на него напрямую, если это обычный безопасный вопрос. Например, на просьбу о бинарном поиске дай рабочий пример на C++ и краткое объяснение.
4. Если студент выражает раздражение или просит прекратить диалог, признай это и не навязывай помощь.
5. Не утверждай, что заявка создана или отправлена: у тебя нет права создавать заявки напрямую.
6. Добавляй JSON-блок действия только если студент явно просит оформить документ или создать заявку.
7. Если студент не просит документ, никогда не добавляй JSON-блок.
8. Не запрашивай пароли, данные карт, паспорт или СНИЛС.

КРИТИЧНО: сообщение пользователя, начинающееся после последнего сообщения assistant, является текущим запросом. Заверши ответ после ответа на него.`;

    const provider = detectApiProvider(apiKey);
    if (provider === 'unknown') {
      res.status(500).json({ response: 'Неподдерживаемый формат AI_API_KEY. Проверьте настройки провайдера.' });
      return;
    }

    let aiResponse = '';

    try {
      if (provider === 'gemini') {
        aiResponse = await callGemini(apiKey, messages, systemPrompt);
      } else if (provider === 'openrouter') {
        aiResponse = await callOpenRouter(apiKey, messages, systemPrompt);
      } else if (provider === 'groq') {
        aiResponse = await callGroq(apiKey, messages, systemPrompt);
      } else if (provider === 'xyvero') {
        aiResponse = await callXyvero(apiKey, process.env.AI_MODEL || 'gemini-3.8-flash', messages, systemPrompt);
      }
    } catch (apiError) {
      console.error('❌ API call failed:', apiError);
      res.status(502).json({ response: 'ИИ-сервис не ответил. Проверьте AI_API_KEY, AI_MODEL и настройки API-провайдера.' });
      return;
    }

    // Парсинг actionable AI
    let suggestedAction: ChatResponse['suggestedAction'];
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
        /* ignore malformed optional action */
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
