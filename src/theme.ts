import { getSettings, saveSettings } from './storage';
import type { Theme } from './types';

const ROOT = document.documentElement;
const ATTR = 'data-theme';
const DEFAULT_THEME: Theme = 'dark';

export function initTheme(): void {
  const { theme } = getSettings();
  const resolved: Theme = theme ?? DEFAULT_THEME;
  ROOT.setAttribute(ATTR, resolved);
}

export function toggleTheme(): Theme {
  const current = getCurrentTheme();
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  ROOT.setAttribute(ATTR, next);
  saveSettings({ theme: next });
  return next;
}

export function getCurrentTheme(): Theme {
  return (ROOT.getAttribute(ATTR) as Theme) ?? DEFAULT_THEME;
}
