import { useState, useEffect, useCallback } from 'react';
import type { TranslationSettings } from '../config/translation';
import { defaultSettings } from '../config/translation';

const SETTINGS_KEY = 'paper-master-translation-settings';

/**
 * 翻译设置管理Hook
 * 使用localStorage持久化存储翻译配置
 */
export function useTranslationSettings() {
  const [settings, setSettings] = useState<TranslationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // 加载设置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 合并默认设置，确保所有字段都存在
        setSettings({
          ...defaultSettings,
          ...parsed
        });
      }
    } catch (e) {
      console.error('Failed to parse translation settings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存设置
  const saveSettings = useCallback((newSettings: TranslationSettings) => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      return true;
    } catch (e) {
      console.error('Failed to save translation settings:', e);
      return false;
    }
  }, []);

  // 重置为默认设置
  const resetSettings = useCallback(() => {
    return saveSettings(defaultSettings);
  }, [saveSettings]);

  // 更新单个设置项
  const updateSetting = useCallback(<K extends keyof TranslationSettings>(
    key: K,
    value: TranslationSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    return saveSettings(newSettings);
  }, [settings, saveSettings]);

  return {
    settings,
    saveSettings,
    updateSetting,
    resetSettings,
    loading
  };
}
