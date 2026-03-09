/**
 * Shared TypeScript interfaces and types for the Markdown-to-PDF converter.
 */

/** Represents a single markdown document stored in the application. */
export interface Document {
  /** Unique identifier for the document. */
  id: string;
  /** Display title of the document. */
  title: string;
  /** Raw markdown content. */
  content: string;
  /** Timestamp (ms since epoch) when the document was created. */
  createdAt: number;
  /** Timestamp (ms since epoch) when the document was last updated. */
  updatedAt: number;
}

/** Persisted application-level settings. */
export interface AppSettings {
  /** Current UI theme. */
  theme: Theme;
  /** ID of the last opened document, or null if none. */
  lastOpenedDocId: string | null;
  /** Whether sync-scroll between editor and preview is enabled. */
  syncScrollEnabled?: boolean;
}

/** Supported UI colour themes. */
export type Theme = 'dark' | 'light';

/** Callbacks consumed by the sidebar component. */
export interface SidebarCallbacks {
  /** Called when a document is selected by its ID. */
  onSelectDoc: (id: string) => void;
  /** Called when the user requests a new document. */
  onNewDoc: () => void;
  /** Called when the user deletes a document by its ID. */
  onDeleteDoc: (id: string) => void;
}

/** Callbacks consumed by the header component. */
export interface HeaderCallbacks {
  /** Called when the document title is changed. */
  onTitleChange: (title: string) => void;
  /** Called when the user requests a PDF download. */
  onDownloadPdf: () => void;
  /** Called when the user toggles the colour theme. */
  onToggleTheme: () => void;
  /** Called when the user triggers undo. */
  onUndo: () => void;
  /** Called when the user triggers redo. */
  onRedo: () => void;
  /** Called when the user clears the document content. */
  onClearDocument: () => void;
  /** Called when the user toggles sync-scroll; receives the new enabled state. */
  onToggleSyncScroll: (enabled: boolean) => void;
}
