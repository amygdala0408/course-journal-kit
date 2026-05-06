// Dark mode hook with system preference support

import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../utils/storage';

type DarkModePreference = 'system' | 'light' | 'dark';

export function useDarkMode() {
  const [preference, setPreference] = useState<DarkModePreference>(() => {
    return getSettings().darkMode;
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    const pref = getSettings().darkMode;
    if (pref === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return pref === 'dark';
  });

  useEffect(() => {
    const updateDarkMode = () => {
      let shouldBeDark: boolean;

      if (preference === 'system') {
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        shouldBeDark = preference === 'dark';
      }

      setIsDark(shouldBeDark);

      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    updateDarkMode();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateDarkMode);

    return () => {
      mediaQuery.removeEventListener('change', updateDarkMode);
    };
  }, [preference]);

  const setDarkMode = (newPreference: DarkModePreference) => {
    setPreference(newPreference);
    saveSettings({ darkMode: newPreference });
  };

  const toggleDarkMode = () => {
    const newPreference: DarkModePreference = isDark ? 'light' : 'dark';
    setDarkMode(newPreference);
  };

  return {
    isDark,
    preference,
    setDarkMode,
    toggleDarkMode,
  };
}
