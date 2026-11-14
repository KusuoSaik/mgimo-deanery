import { createContext, useContext } from 'react';
export type Preferences = {
  english: boolean; setEnglish: (v: boolean) => void;
  large: boolean; setLarge: (v: boolean) => void;
  contrast: boolean; setContrast: (v: boolean) => void;
  still: boolean; setStill: (v: boolean) => void;
};
export const PreferencesContext = createContext<Preferences | null>(null);
export function usePreferences() { const value = useContext(PreferencesContext); if (!value) throw new Error('PreferencesProvider missing'); return value; }
export function readPreference(key: string) { try { return localStorage.getItem(key) === 'true'; } catch { return false; } }
