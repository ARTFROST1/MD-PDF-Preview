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
