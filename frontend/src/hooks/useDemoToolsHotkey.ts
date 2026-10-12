import { useEffect, useRef, useState } from 'react';
import { useToast } from '../components/ui';

const STORAGE_KEY = 'mediassist_demo_tools';

const readFlag = (): boolean => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const writeFlag = (on: boolean) => {
  try {
    if (on) window.sessionStorage.setItem(STORAGE_KEY, '1');
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode / policy): the flag just lives in memory for this page.
  }
};

/**
 * Ctrl+Shift+D (Cmd+Shift+D on macOS) unlocks the demo tools for the capstone defense.
 * The flag lives in sessionStorage so it survives navigation but not a new tab.
 * Listens in the capture phase so it also works while the search box has focus.
 */
export function useDemoToolsHotkey(): boolean {
  const toast = useToast();
  const [unlocked, setUnlocked] = useState(readFlag);
  const current = useRef(unlocked);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.altKey) return;
      if (e.code !== 'KeyD' && e.key.toLowerCase() !== 'd') return;
      // Chrome/Firefox bind this combo to "bookmark all tabs"
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      const next = !current.current;
      current.current = next;
      writeFlag(next);
      setUnlocked(next);
      toast.info(next ? 'Đã bật công cụ demo' : 'Đã tắt công cụ demo');
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [toast]);

  return unlocked;
}
