import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Copy, Check, AlertCircle } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import type { AIProvider, AIConfig } from '../services/aiService';
import { loadAIConfig, saveAIConfig, hasAPIKey } from '../services/aiService';

export const AISettingsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AIConfig>(loadAIConfig());
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleProviderChange = (provider: AIProvider) => {
    setConfig({ ...config, provider });
    setTestResult(null);
  };

  const handleApiKeyChange = (key: string) => {
    setConfig({ ...config, apiKey: key });
    setTestResult(null);
  };

  const handleSave = () => {
    saveAIConfig(config);
    setTestResult({ status: 'success', message: '✓ Конфигурация сохранена' });
    setTimeout(() => setTestResult(null), 2000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const testPrompt =
        config.provider === 'google'
          ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.apiKey}`
          : 'https://api.anthropic.com/v1/messages';

      const response = await fetch(
        config.provider === 'google'
          ? testPrompt
          : 'https://api.anthropic.com/v1/messages',
        {
          method: config.provider === 'google' ? 'POST' : 'GET',
          headers:
            config.provider === 'anthropic'
              ? {
                  'x-api-key': config.apiKey,
                  'anthropic-version': '2023-06-01',
                }
              : {
                  'Content-Type': 'application/json',
                },
          body:
            config.provider === 'google'
              ? JSON.stringify({
                  contents: [{ role: 'user', parts: { text: 'test' } }],
                })
              : undefined,
        },
      );

      if (response.status === 401 || response.status === 403) {
        setTestResult({ status: 'error', message: '❌ Неверный API-ключ или доступ запрещен' });
      } else if (response.ok) {
        setTestResult({ status: 'success', message: '✓ Соединение успешно! API работает' });
      } else {
        setTestResult({
          status: 'error',
          message: `❌ Ошибка API (${response.status}). Проверьте ключ и провайдера`,
        });
      }
    } catch {
      setTestResult({ status: 'error', message: '❌ Ошибка соединения. Проверьте интернет' });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
        title="Настройки AI"
      >
        <Settings className="h-5 w-5 text-slate-600" />
      </motion.button>

      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Настройки ИИ-ассистента">
        <div className="space-y-6">
          {/* Статус подключения */}
          <motion.div
            animate={{
              backgroundColor: hasAPIKey() ? 'rgb(16 185 129 / 0.1)' : 'rgb(241 65 65 / 0.1)',
            }}
            className="rounded-xl p-4 border border-emerald-200"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: hasAPIKey() ? [1, 1.2, 1] : 0 }}
                className="h-2.5 w-2.5 rounded-full bg-emerald-500"
              />
              <div>
                <p className="font-semibold text-slate-900">
                  {hasAPIKey() ? '🟢 AI Online' : '🔴 Не подключено'}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {hasAPIKey()
                    ? 'API подключен. Ассистент готов к работе'
                    : 'Добавьте API-ключ для включения ассистента'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Выбор провайдера */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">Провайдер AI</label>
            <div className="space-y-2">
              {[
                { id: 'google', name: 'Google Gemini', desc: 'Быстро, бесплатный tier' },
                { id: 'anthropic', name: 'Anthropic Claude', desc: 'Продвинутое рассуждение' },
              ].map((provider) => (
                <motion.button
                  key={provider.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleProviderChange(provider.id as AIProvider)}
                  className={`w-full text-left rounded-lg p-3 border-2 transition-all ${
                    config.provider === provider.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-slate-900">{provider.name}</p>
                  <p className="text-xs text-slate-500">{provider.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* API-ключ */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">API-ключ</label>
            <div className="relative">
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder={`Вставьте ${config.provider === 'google' ? 'Google Gemini' : 'Anthropic'} API-ключ`}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => copyToClipboard(config.apiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4 text-slate-400" />
                )}
              </motion.button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {config.provider === 'google'
                ? '→ Получите на https://ai.google.dev/aistudio'
                : '→ Получите на https://console.anthropic.com'}
            </p>
          </div>

          {/* Тестирование соединения */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTestConnection}
            disabled={!config.apiKey || isTesting}
            className="w-full rounded-lg bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-900 font-medium py-2.5 transition-all"
          >
            {isTesting ? '⏳ Проверка...' : '🔗 Проверить соединение'}
          </motion.button>

          {/* Результат теста */}
          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg p-3 flex items-center gap-2 ${
                testResult.status === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {testResult.status === 'success' ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{testResult.message}</span>
            </motion.div>
          )}

          {/* Сохранение */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              handleSave();
              setTimeout(() => setIsOpen(false), 500);
            }}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 transition-all"
          >
            ✓ Сохранить настройки
          </motion.button>

          {/* Информация о безопасности */}
          <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
            <p className="text-xs text-amber-900 font-medium">🔒 Безопасность (152-ФЗ)</p>
            <p className="text-xs text-amber-800 mt-1">
              API-ключ хранится локально в браузере. Персональные данные обезличиваются перед
              отправкой на сервер AI. Все операции зашифрованы.
            </p>
          </div>
        </div>
      </BottomSheet>
    </>
  );
};
