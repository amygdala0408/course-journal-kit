// Keyboard shortcuts hook

import { useEffect, useCallback } from 'react';

type ShortcutHandler = () => void;

interface Shortcuts {
  save?: ShortcutHandler;
  nextSection?: ShortcutHandler;
  prevSection?: ShortcutHandler;
  toggleSidebar?: ShortcutHandler;
  search?: ShortcutHandler;
  newEntry?: ShortcutHandler;
}

export function useKeyboardShortcuts(shortcuts: Shortcuts) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Cmd/Ctrl + S - Save
      if (modifier && event.key === 's') {
        event.preventDefault();
        shortcuts.save?.();
        return;
      }

      // Cmd/Ctrl + Right Arrow - Next section
      if (modifier && event.key === 'ArrowRight') {
        event.preventDefault();
        shortcuts.nextSection?.();
        return;
      }

      // Cmd/Ctrl + Left Arrow - Previous section
      if (modifier && event.key === 'ArrowLeft') {
        event.preventDefault();
        shortcuts.prevSection?.();
        return;
      }

      // Cmd/Ctrl + B - Toggle sidebar
      if (modifier && event.key === 'b') {
        event.preventDefault();
        shortcuts.toggleSidebar?.();
        return;
      }

      // Cmd/Ctrl + K - Search
      if (modifier && event.key === 'k') {
        event.preventDefault();
        shortcuts.search?.();
        return;
      }

      // Cmd/Ctrl + N - New entry
      if (modifier && event.key === 'n') {
        event.preventDefault();
        shortcuts.newEntry?.();
        return;
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export function getShortcutLabel(shortcut: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifier = isMac ? '⌘' : 'Ctrl';

  const labels: Record<string, string> = {
    save: `${modifier}+S`,
    nextSection: `${modifier}+→`,
    prevSection: `${modifier}+←`,
    toggleSidebar: `${modifier}+B`,
    search: `${modifier}+K`,
    newEntry: `${modifier}+N`,
  };

  return labels[shortcut] || shortcut;
}
