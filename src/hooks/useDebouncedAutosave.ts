import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSettings, StorageError } from '../utils/storage';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

type Options<T> = {
  // The thing being edited. Whenever this changes by reference, we treat it
  // as a new edit and (after the debounce) call `save`.
  value: T;
  // Whether the value is in a state that should be persisted. Common reasons
  // to return false: the row is brand new and missing required fields, or the
  // value matches the last-saved snapshot.
  canSave: (value: T) => boolean;
  // Performs the actual write. May throw — `StorageError` is preferred so the
  // hook can surface a friendly message.
  save: (value: T) => void | Promise<void>;
  // Optional: when true, the hook is disabled (e.g. before initial load).
  enabled?: boolean;
};

// Reusable autosave on a debounce. Mirrors the pattern in EntryPage so every
// editor in the app behaves the same way: type → "Unsaved changes" → "Saved".
export function useDebouncedAutosave<T>({ value, canSave, save, enabled = true }: Options<T>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const valueRef = useRef(value);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRunRef = useRef(true);
  const isMountedRef = useRef(true);

  const debounceMs = useMemo(() => {
    const fromSettings = getSettings().autoSaveInterval;
    return Math.max(800, Math.min(fromSettings || 2000, 60000));
  }, []);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const current = valueRef.current;
    if (!canSave(current)) return;

    setStatus('saving');
    setErrorMessage(null);
    try {
      await save(current);
      dirtyRef.current = false;
      if (!isMountedRef.current) return;
      setLastSavedAt(new Date());
      setStatus('saved');
    } catch (err) {
      if (!isMountedRef.current) return;
      setStatus('error');
      if (err instanceof StorageError) setErrorMessage(err.message);
      else if (err instanceof Error) setErrorMessage(err.message);
      else setErrorMessage('Save failed for an unknown reason.');
    }
  }, [canSave, save]);

  // Debounced autosave lifecycle. The setState-in-effect calls below are
  // intentional and mirror the canonical pattern used in EntryPage; the
  // generic lint rule is too strict for autosave.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!enabled) return;
    // Skip the very first effect; the value just mounted, nothing to save yet.
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    dirtyRef.current = true;
    if (!canSave(value)) {
      setStatus('idle');
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('pending');
    timerRef.current = setTimeout(() => void flush(), debounceMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, enabled, canSave, debounceMs, flush]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const handler = () => {
      if (dirtyRef.current) void flush();
    };
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
      if (dirtyRef.current) void flush();
    };
  }, [flush]);

  return { status, lastSavedAt, errorMessage, flush, isDirty: () => dirtyRef.current };
}

export function autosavePillText(
  status: AutosaveStatus,
  lastSavedAt: Date | null,
  errorMessage: string | null,
): string {
  switch (status) {
    case 'idle':
      return 'Autosave armed';
    case 'pending':
      return 'Unsaved changes…';
    case 'saving':
      return 'Saving…';
    case 'saved':
      return lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : 'Saved';
    case 'error':
      return errorMessage || 'Save failed — try Save Now';
  }
}
