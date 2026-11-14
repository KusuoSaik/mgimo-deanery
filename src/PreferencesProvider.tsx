import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { PreferencesContext, readPreference } from './preferences';
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [english,setEnglish] = useState(() => readPreference('dean-en'));
  const [large,setLarge] = useState(() => readPreference('dean-large'));
  const [contrast,setContrast] = useState(() => readPreference('dean-contrast'));
  const [still,setStill] = useState(() => readPreference('dean-still'));
  useEffect(() => {
    document.documentElement.lang = english ? 'en' : 'ru';
    for (const [name,value] of [['large-text',large],['high-contrast',contrast],['no-motion',still]] as const) document.documentElement.classList.toggle(name,value);
    for (const [key,value] of [['dean-en',english],['dean-large',large],['dean-contrast',contrast],['dean-still',still]] as const) { try { localStorage.setItem(key,String(value)); } catch { /* Browser may disable storage. */ } }
  }, [english,large,contrast,still]);
  return <PreferencesContext.Provider value={{english,setEnglish,large,setLarge,contrast,setContrast,still,setStill}}>{children}</PreferencesContext.Provider>;
}
