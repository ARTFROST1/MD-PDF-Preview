import './styles/main.css';
import './styles/sidebar.css';
import './styles/header.css';
import './styles/editor.css';
import './styles/preview.css';
import 'github-markdown-css/github-markdown.css';

import { Document } from './types';
import {
  getAllDocuments,
  getDocument,
  saveDocument,
  deleteDocument,
  createDocument,
  getSettings,
  saveSettings,
} from './storage';
import { initTheme, toggleTheme, getCurrentTheme } from './theme';
import { createEditor, setEditorContent, setEditorTheme, editorUndo, editorRedo } from './editor';
import { updatePreview } from './preview';
import { exportToPdf } from './pdf';
import { initSidebar, refreshSidebar } from './sidebar';
import { initHeader, setTitle, setThemeIcon } from './header';

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as unknown as T;
}

function initApp(): void {
  // a. Initialize theme
  initTheme();

  // b. Load or create initial document
  const settings = getSettings();
  let currentDoc: Document | null = null;

  if (settings.lastOpenedDocId) {
    currentDoc = getDocument(settings.lastOpenedDocId);
  }

  if (!currentDoc) {
    const docs = getAllDocuments();
    if (docs.length > 0) {
      currentDoc = docs[0] ?? null;
    } else {
      currentDoc = createDocument('Untitled');
      saveDocument(currentDoc);
    }
  }

  // c. State (currentDoc is guaranteed non-null here)
  let activeDoc: Document = currentDoc!;

  // d. Get DOM elements
  const editorPane = document.getElementById('editor-pane')!;
  const previewContent = document.getElementById('preview-content')!;
  const previewPane = document.getElementById('preview-pane') as HTMLElement;

  // e. Create editor with onChange callback
  const debouncedSave = debounce((doc: Document) => {
    saveDocument(doc);
    refreshSidebar(getAllDocuments(), doc.id);
  }, 500);

  const editorView = createEditor(editorPane, activeDoc.content, (content: string) => {
    activeDoc.content = content;
    // Update preview immediately for real-time feedback
    updatePreview(previewContent, content);
    // Debounce the storage save
    debouncedSave(activeDoc);
  });

  // f. Render initial preview
  updatePreview(previewContent, activeDoc.content);

  // g. Sync-scroll state & listeners
  let syncScrollEnabled = false;
  let isSyncing = false;

  function onEditorScroll(): void {
    if (!syncScrollEnabled || isSyncing) return;
    const scroller = editorPane.querySelector('.cm-scroller') as HTMLElement | null;
    if (!scroller) return;
    isSyncing = true;
    const ratio = scroller.scrollHeight - scroller.clientHeight > 0
      ? scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight)
      : 0;
    previewPane.scrollTop = ratio * (previewPane.scrollHeight - previewPane.clientHeight);
    isSyncing = false;
  }

  function onPreviewScroll(): void {
    if (!syncScrollEnabled || isSyncing) return;
    const scroller = editorPane.querySelector('.cm-scroller') as HTMLElement | null;
    if (!scroller) return;
    isSyncing = true;
    const ratio = previewPane.scrollHeight - previewPane.clientHeight > 0
      ? previewPane.scrollTop / (previewPane.scrollHeight - previewPane.clientHeight)
      : 0;
    scroller.scrollTop = ratio * (scroller.scrollHeight - scroller.clientHeight);
    isSyncing = false;
  }

  // Attach listeners once after editor renders (`.cm-scroller` needs to exist)
  setTimeout(() => {
    const scroller = editorPane.querySelector('.cm-scroller') as HTMLElement | null;
    if (scroller) scroller.addEventListener('scroll', onEditorScroll, { passive: true });
    previewPane.addEventListener('scroll', onPreviewScroll, { passive: true });
  }, 0);

  // h. Initialize header with callbacks
  initHeader({
    onTitleChange: (title: string) => {
      activeDoc.title = title;
      saveDocument(activeDoc);
      refreshSidebar(getAllDocuments(), activeDoc.id);
    },
    onDownloadPdf: () => {
      void exportToPdf(previewContent, activeDoc.title);
    },
    onToggleTheme: () => {
      const newTheme = toggleTheme();
      setEditorTheme(editorView, newTheme);
      setThemeIcon(newTheme);
    },
    // --- UNDO/REDO ---
    onUndo: () => editorUndo(editorView),
    onRedo: () => editorRedo(editorView),
    onClearDocument: () => {
      activeDoc.content = '';
      setEditorContent(editorView, '');
      updatePreview(previewContent, '');
      saveDocument(activeDoc);
      refreshSidebar(getAllDocuments(), activeDoc.id);
    },
    onToggleSyncScroll: (enabled: boolean) => {
      syncScrollEnabled = enabled;
    },
  });

  // i-init. Set initial header state
  setTitle(activeDoc.title);
  setThemeIcon(getCurrentTheme());

  // j. Initialize sidebar with callbacks
  initSidebar({
    onSelectDoc: (id: string) => {
      activeDoc = getDocument(id)!;
      setEditorContent(editorView, activeDoc.content);
      updatePreview(previewContent, activeDoc.content);
      setTitle(activeDoc.title);
      saveSettings({ lastOpenedDocId: id });
      refreshSidebar(getAllDocuments(), activeDoc.id);
    },
    onNewDoc: () => {
      activeDoc = createDocument();
      saveDocument(activeDoc);
      setEditorContent(editorView, activeDoc.content);
      updatePreview(previewContent, activeDoc.content);
      setTitle(activeDoc.title);
      saveSettings({ lastOpenedDocId: activeDoc.id });
      refreshSidebar(getAllDocuments(), activeDoc.id);
    },
    onDeleteDoc: (id: string) => {
      deleteDocument(id);
      const docs = getAllDocuments();
      if (id === activeDoc.id) {
        if (docs.length > 0) {
          activeDoc = docs[0]!;
        } else {
          activeDoc = createDocument();
          saveDocument(activeDoc);
        }
        setEditorContent(editorView, activeDoc.content);
        updatePreview(previewContent, activeDoc.content);
        setTitle(activeDoc.title);
        saveSettings({ lastOpenedDocId: activeDoc.id });
      }
      refreshSidebar(getAllDocuments(), activeDoc.id);
    },
  });

  // k. Initial sidebar render
  refreshSidebar(getAllDocuments(), activeDoc.id);

  // l. Save lastOpenedDocId to settings
  saveSettings({ lastOpenedDocId: activeDoc.id });

  // l. Sidebar toggle
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  sidebarToggleBtn?.addEventListener('click', () => {
    const app = document.getElementById('app')!;
    app.classList.toggle('sidebar-collapsed');
    sidebarToggleBtn.classList.toggle('active', app.classList.contains('sidebar-collapsed'));
  });

  // m. Global keyboard shortcuts for undo/redo (fallback when editor lacks focus)
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (document.activeElement?.closest('.cm-editor')) return; // handled by CodeMirror
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      editorUndo(editorView);
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      editorRedo(editorView);
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
