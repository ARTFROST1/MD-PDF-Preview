import type { Theme, HeaderCallbacks } from './types';

export function initHeader(callbacks: HeaderCallbacks & { initialSyncScrollEnabled?: boolean }): void {
  const titleInput = document.getElementById('doc-title') as HTMLInputElement;
  const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement;
  const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
  // --- UNDO/REDO ---
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
  const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;

  titleInput.addEventListener('blur', () => {
    callbacks.onTitleChange(titleInput.value.trim() || 'Untitled');
  });

  titleInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      titleInput.blur();
    }
  });

  themeToggle.addEventListener('click', () => {
    callbacks.onToggleTheme();
  });

  downloadBtn.addEventListener('click', () => {
    callbacks.onDownloadPdf();
  });

  // --- UNDO/REDO ---
  undoBtn.addEventListener('click', () => callbacks.onUndo());
  redoBtn.addEventListener('click', () => callbacks.onRedo());

  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  const syncScrollBtn = document.getElementById('sync-scroll-btn') as HTMLButtonElement;

  let syncScrollEnabled = callbacks.initialSyncScrollEnabled ?? false;
  syncScrollBtn.classList.toggle('active', syncScrollEnabled);

  clearBtn.addEventListener('click', () => {
    callbacks.onClearDocument();
  });

  syncScrollBtn.addEventListener('click', () => {
    syncScrollEnabled = !syncScrollEnabled;
    syncScrollBtn.classList.toggle('active', syncScrollEnabled);
    callbacks.onToggleSyncScroll(syncScrollEnabled);
  });
}

export function setTitle(title: string): void {
  const titleInput = document.getElementById('doc-title') as HTMLInputElement;
  titleInput.value = title;
}

export function setThemeIcon(theme: Theme): void {
  const header = document.getElementById('header')!;
  const sunIcon = header.querySelector('.icon-sun') as HTMLElement;
  const moonIcon = header.querySelector('.icon-moon') as HTMLElement;

  if (theme === 'dark') {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  } else {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  }
}
