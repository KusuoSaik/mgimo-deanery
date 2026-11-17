import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useUI } from '../i18n';

export default function ConnectionStatus() {
  const t = useUI();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return <div role="status" aria-live="polite">{!online && <p className="flex items-start gap-2 bg-amber-50 px-4 py-3 text-sm text-amber-900"><WifiOff className="mt-0.5 h-4 w-4 shrink-0"/>{t('Нет соединения. Для отправки и сохранения нужен интернет. После подключения обновите данные.')}</p>}</div>;
}
