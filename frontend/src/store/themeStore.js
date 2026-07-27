/**
 * Light/dark theme state, persisted to localStorage and synced to <html class>.
 */
import { create } from 'zustand';

const KEY = 'hrms_theme';
const initial = localStorage.getItem(KEY) || 'light';

function apply(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
apply(initial);

export const useThemeStore = create((set, get) => ({
  theme: initial,
  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    apply(next);
    set({ theme: next });
  },
}));
