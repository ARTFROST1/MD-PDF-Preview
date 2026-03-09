import type { Document, AppSettings } from './types';

const STORAGE_KEY = 'md2pdf_documents';
const SETTINGS_KEY = 'md2pdf_settings';

/** Parse a JSON array of documents from localStorage, returning [] on any error. */
function readDocuments(): Document[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persist the full documents array to localStorage. */
function writeDocuments(docs: Document[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

/** Return all documents sorted by updatedAt descending (newest first). */
export function getAllDocuments(): Document[] {
  return readDocuments().sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Return a single document by id, or null if not found. */
export function getDocument(id: string): Document | null {
  return readDocuments().find((d) => d.id === id) ?? null;
}

/**
 * Upsert a document into storage.
 * If a document with the same id exists it is replaced; otherwise it is appended.
 * The updatedAt timestamp is always refreshed to Date.now().
 */
export function saveDocument(doc: Document): void {
  const docs = readDocuments();
  const idx = docs.findIndex((d) => d.id === doc.id);
  const updated: Document = { ...doc, updatedAt: Date.now() };

  if (idx !== -1) {
    docs[idx] = updated;
  } else {
    docs.push(updated);
  }

  writeDocuments(docs);
}

/** Remove a document by id. No-op if the id doesn't exist. */
export function deleteDocument(id: string): void {
  writeDocuments(readDocuments().filter((d) => d.id !== id));
}

/**
 * Create a brand-new document with a unique id.
 * @param title Optional title; defaults to "Untitled".
 * @returns The newly created Document (not yet persisted — call saveDocument if needed).
 */
export function createDocument(title?: string): Document {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: title ?? 'Untitled',
    content: '',
    createdAt: now,
    updatedAt: now,
  };
}

/** Return saved AppSettings, falling back to sensible defaults. */
export function getSettings(): AppSettings {
  const defaults: AppSettings = { theme: 'dark', lastOpenedDocId: null, syncScrollEnabled: false };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

/** Merge partial settings with the existing saved settings and persist. */
export function saveSettings(settings: Partial<AppSettings>): void {
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}
