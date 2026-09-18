import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, updateSettings } from '../api/users';
import { useAuth } from './AuthContext';

export const DEFAULT_SETTINGS = {
  suggest_questions: true,
  suggestion_interval_seconds: 60,
  transcription_language: 'pt',
  auto_save_notes: true,
  timezone: 'America/Sao_Paulo',
  date_format: 'DD/MM/YYYY',
};

const SettingsContext = createContext(null);
export const useUserSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setSettings(DEFAULT_SETTINGS); return; }
    setLoading(true);
    getSettings().then(setSettings).finally(() => setLoading(false));
  }, [user]);

  const saveSettings = useCallback(async (data) => {
    const updated = await updateSettings(data);
    setSettings(updated);
    return updated;
  }, []);

  const value = useMemo(() => ({ settings, loading, saveSettings }), [settings, loading, saveSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
