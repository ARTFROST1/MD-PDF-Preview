import { basicSetup } from 'codemirror';
import { undo, redo } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { Compartment } from '@codemirror/state';
import { EditorView, placeholder } from '@codemirror/view';
import type { Theme } from './types';

const themeCompartment = new Compartment();

export function createEditor(
  container: HTMLElement,
  content: string,
  onChange: (content: string) => void,
): EditorView {
  const view = new EditorView({
    doc: content,
    extensions: [
      basicSetup,
      markdown(),
      themeCompartment.of(oneDark),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.lineWrapping,
      placeholder('Start typing Markdown...'),
    ],
    parent: container,
  });

  return view;
}

export function setEditorContent(view: EditorView, content: string): void {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: content },
  });
}

export function setEditorTheme(view: EditorView, theme: Theme): void {
  view.dispatch({
    effects: themeCompartment.reconfigure(
      theme === 'dark' ? oneDark : EditorView.theme({}),
    ),
  });
}

// --- UNDO/REDO ---
export function editorUndo(view: EditorView): void {
  undo(view);
}

export function editorRedo(view: EditorView): void {
  redo(view);
}

// --- IMAGE PASTE / DRAG-DROP ---

/** Insert markdown image snippet at the current cursor / selection. */
function insertImageMarkdown(view: EditorView, dataUri: string, name: string): void {
  const snippet = `![${name}](${dataUri})`;
  const { from, to } = view.state.selection.main;
  view.dispatch({
    changes: { from, to, insert: snippet },
    selection: { anchor: from + snippet.length },
  });
  view.focus();
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Attach paste and drag-drop handlers to the editor container so that
 * image files / clipboard images are converted to base64 data URIs and
 * inserted as Markdown image syntax.
 */
export function attachImageHandlers(container: HTMLElement, view: EditorView): void {
  // Paste: intercept image items from the clipboard
  container.addEventListener('paste', (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        void fileToDataUri(file).then((dataUri) => {
          insertImageMarkdown(view, dataUri, 'image');
        });
        break;
      }
    }
  });

  // Drag-over: signal acceptance of image files
  container.addEventListener('dragover', (e: DragEvent) => {
    if (Array.from(e.dataTransfer?.items ?? []).some((i) => i.type.startsWith('image/'))) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      container.classList.add('drag-image-over');
    }
  });

  container.addEventListener('dragleave', (e: DragEvent) => {
    if (!container.contains(e.relatedTarget as Node | null)) {
      container.classList.remove('drag-image-over');
    }
  });

  // Drop: read dropped image files and insert
  container.addEventListener('drop', (e: DragEvent) => {
    container.classList.remove('drag-image-over');
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
      f.type.startsWith('image/'),
    );
    if (files.length === 0) return;
    e.preventDefault();
    void Promise.all(
      files.map(async (file) => {
        const dataUri = await fileToDataUri(file);
        const name = file.name.replace(/\.[^.]+$/, '') || 'image';
        return { dataUri, name };
      }),
    ).then((images) => {
      const snippet = images.map(({ dataUri, name }) => `![${name}](${dataUri})`).join('\n\n');
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + snippet.length },
      });
      view.focus();
    });
  });
}
