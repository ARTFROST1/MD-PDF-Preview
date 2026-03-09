# Markdown-to-PDF Web Converter — Architecture Document

> **Version:** 1.0  
> **Date:** 2026-03-09  
> **Stack:** Vite + vanilla TypeScript  
> **Libraries:** marked (v14+), CodeMirror 6, highlight.js, github-markdown-css, html2pdf.js

---

## 1. Project Overview

A single-page application that provides a split-pane Markdown editor (CodeMirror 6) with live GitHub-flavored preview and one-click PDF export. Documents are persisted in `localStorage` and listed in a sidebar for quick access. Ships with a dark theme by default and supports light/dark toggling.

---

## 2. File Tree with Per-File Descriptions

```
/
├── index.html              # Single HTML page: app shell with container divs
├── package.json            # Dependencies, scripts (dev, build, preview)
├── vite.config.ts          # Vite config (base path, build target)
├── tsconfig.json           # Strict TS config, ES2020+, DOM lib
├── src/
│   ├── main.ts             # Entry point: bootstraps all modules, wires events
│   ├── editor.ts           # CodeMirror 6 setup: extensions, theme, update listener
│   ├── preview.ts          # Markdown→HTML pipeline: marked + highlight.js
│   ├── pdf.ts              # PDF export via html2pdf.js, page/margin config
│   ├── storage.ts          # localStorage CRUD: save, load, list, delete documents
│   ├── theme.ts            # Theme toggle logic, CSS class switching, persistence
│   ├── sidebar.ts          # Renders recent-docs list, handles create/select/delete
│   ├── header.ts           # Editable doc title, Download PDF button, theme toggle btn
│   ├── types.ts            # Shared TypeScript interfaces & type aliases
│   └── styles/
│       ├── main.css        # CSS custom properties, layout grid, resets
│       ├── sidebar.css     # Sidebar list, buttons, scrollable area
│       ├── header.css      # Top bar layout, title input, action buttons
│       ├── editor.css      # CodeMirror overrides, dark/light variants
│       └── preview.css     # Preview pane, github-markdown-css overrides
```

### 2.1 File Responsibility Details

#### `index.html`
- Declares the app shell with semantic container elements:
  - `<div id="app">` — root wrapper
  - `<aside id="sidebar">` — left sidebar
  - `<header id="header">` — top bar
  - `<main id="main">` — split editor + preview
    - `<div id="editor-pane">`
    - `<div id="preview-pane">`
- Loads `/src/main.ts` as a module via `<script type="module">`
- Contains `<meta>` tags for charset, viewport
- Links to `main.css` (Vite handles CSS imports from TS, but the root CSS can be linked directly or imported from `main.ts`)

#### `package.json`
- **Dependencies:** `marked`, `@codemirror/state`, `@codemirror/view`, `@codemirror/lang-markdown`, `@codemirror/language`, `@codemirror/commands`, `@codemirror/autocomplete`, `codemirror`, `highlight.js`, `github-markdown-css`, `html2pdf.js`
- **DevDependencies:** `vite`, `typescript`
- **Scripts:**
  - `dev` → `vite`
  - `build` → `tsc && vite build`
  - `preview` → `vite preview`

#### `vite.config.ts`
- Minimal config
- Sets `base: './'` for relative asset paths in production
- Build target: `es2020`

#### `tsconfig.json`
- `strict: true`
- `target: "ES2020"`, `module: "ESNext"`, `moduleResolution: "bundler"`
- `lib: ["ES2020", "DOM", "DOM.Iterable"]`
- `include: ["src"]`

#### `src/types.ts`
- `Document` interface (see §4 localStorage Schema)
- `Theme` type alias: `'dark' | 'light'`
- `AppState` interface: currently active document ID, theme preference

#### `src/storage.ts`
- **Constants:** `STORAGE_KEY = 'md2pdf_documents'`, `SETTINGS_KEY = 'md2pdf_settings'`
- **Functions:**
  - `getAllDocuments(): Document[]` — parse from localStorage, return sorted by `updatedAt` desc
  - `getDocument(id: string): Document | null`
  - `saveDocument(doc: Document): void` — upsert into the array, update `updatedAt`
  - `deleteDocument(id: string): void`
  - `createDocument(title?: string): Document` — generates UUID, sets defaults
  - `getSettings(): AppSettings` — returns `{ theme, lastOpenedDocId }`
  - `saveSettings(settings: AppSettings): void`

#### `src/theme.ts`
- Reads saved theme from `storage.getSettings()`
- Applies `data-theme="dark"|"light"` attribute on `<html>` element
- `toggleTheme(): Theme` — switches attribute, persists, returns new theme
- `getCurrentTheme(): Theme`
- Exports a function to get the matching CodeMirror theme extension (delegates actual extension to `editor.ts`, but provides the theme name)

#### `src/editor.ts`
- Initializes CodeMirror 6 `EditorView` inside `#editor-pane`
- **Extensions:**
  - `markdown()` language support (from `@codemirror/lang-markdown`)
  - `keymap` — default keymap + indentation
  - `lineNumbers()`
  - `highlightActiveLine()`
  - `bracketMatching()`
  - Dark/Light theme (custom CodeMirror theme built with `EditorView.theme()`)
- **Update listener:** on every `docChanged` transaction, calls a callback provided by `main.ts` with the new content string
- Exports:
  - `createEditor(container: HTMLElement, content: string, onChange: (content: string) => void): EditorView`
  - `setEditorContent(view: EditorView, content: string): void` — programmatic content replacement (for doc switching)
  - `setEditorTheme(view: EditorView, theme: Theme): void` — reconfigure theme compartment

#### `src/preview.ts`
- Configures `marked` instance:
  - GFM enabled
  - Custom renderer for code blocks that uses `highlight.js` for syntax highlighting
  - `breaks: true`
- **Functions:**
  - `renderMarkdown(markdown: string): string` — returns sanitized HTML string
  - `updatePreview(container: HTMLElement, html: string): void` — sets `innerHTML` on the preview container (wrapped in `.markdown-body` div)

#### `src/pdf.ts`
- Wraps `html2pdf.js`
- **Functions:**
  - `exportToPdf(htmlContent: string, filename: string): Promise<void>`
    - Creates a temporary off-screen container with `.markdown-body` class
    - Applies print-friendly styles (white background, dark text)
    - Calls `html2pdf()` with config: A4 page, 10mm margins, `html2canvas` scale 2
    - Cleans up temporary container after export

#### `src/sidebar.ts`
- Renders the list of recent documents inside `<aside id="sidebar">`
- **Functions:**
  - `initSidebar(container: HTMLElement, callbacks: SidebarCallbacks): void`
    - `SidebarCallbacks = { onSelectDoc, onNewDoc, onDeleteDoc }`
  - `refreshSidebar(docs: Document[]): void` — re-renders the list
- Each list item shows:
  - Document title (truncated to ~30 chars)
  - Last-updated relative time (e.g., "2 min ago")
  - Delete button (icon: ✕)
- "New Document" button at top of sidebar
- Active document gets a `.active` CSS class

#### `src/header.ts`
- Renders the header bar inside `<header id="header">`
- **Functions:**
  - `initHeader(container: HTMLElement, callbacks: HeaderCallbacks): void`
    - `HeaderCallbacks = { onTitleChange, onDownloadPdf, onToggleTheme }`
  - `setTitle(title: string): void` — updates the input value
  - `setThemeIcon(theme: Theme): void` — switches sun ↔ moon icon
- Elements:
  - `<input>` for editable doc title (fires `onTitleChange` on blur / Enter)
  - Theme toggle `<button>` with sun/moon SVG icon
  - "Download PDF" `<button>`

#### `src/main.ts`
- **The orchestrator.** Imports and wires all modules.
- Initialization sequence:
  1. Import all CSS files (`import './styles/main.css'`, etc.)
  2. Call `theme.init()` — apply saved theme
  3. Load documents from `storage`, determine active doc
  4. Call `header.initHeader()` with callbacks
  5. Call `sidebar.initSidebar()` with callbacks
  6. Call `editor.createEditor()` with active doc content
  7. Render initial preview
- **Event wiring:**
  - Editor `onChange` → debounced (500ms) → `storage.saveDocument()` + `preview.updatePreview()` + `sidebar.refreshSidebar()`
  - Sidebar `onSelectDoc` → load doc → `editor.setEditorContent()` → `preview.updatePreview()` → `header.setTitle()`
  - Sidebar `onNewDoc` → `storage.createDocument()` → switch to it
  - Header `onTitleChange` → update doc title in storage → refresh sidebar
  - Header `onDownloadPdf` → `pdf.exportToPdf()`
  - Header `onToggleTheme` → `theme.toggleTheme()` → `editor.setEditorTheme()` → `header.setThemeIcon()`

---

## 3. Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          index.html (#app)                          │
│                                                                      │
│  ┌─────────────┐  ┌──────────────────────────────────────────────┐  │
│  │              │  │              <header id="header">            │  │
│  │   SIDEBAR    │  │  [Doc Title Input]  [☀/☾ Toggle] [⬇ PDF]   │  │
│  │              │  ├──────────────────────────────────────────────┤  │
│  │  [+ New Doc] │  │              <main id="main">               │  │
│  │              │  │                                              │  │
│  │  ┌─────────┐ │  │  ┌───────────────┐  ┌───────────────────┐  │  │
│  │  │ Doc 1 ● │ │  │  │               │  │                   │  │  │
│  │  ├─────────┤ │  │  │  CodeMirror   │  │   Preview Pane    │  │  │
│  │  │ Doc 2   │ │  │  │  Editor       │──▶  .markdown-body   │  │  │
│  │  ├─────────┤ │  │  │               │  │                   │  │  │
│  │  │ Doc 3   │ │  │  │  (#editor-    │  │  (#preview-pane)  │  │  │
│  │  └─────────┘ │  │  │    pane)      │  │                   │  │  │
│  │              │  │  └───────────────┘  └───────────────────┘  │  │
│  └─────────────┘  └──────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘

Data Flow:

  User types in CodeMirror
        │
        ▼
  editor.ts onChange(content)
        │
        ├──▶ preview.ts → renderMarkdown(content) → updatePreview(html)
        │
        └──▶ storage.ts → saveDocument(doc)  [debounced 500ms]
                │
                └──▶ sidebar.ts → refreshSidebar(docs)

  User clicks doc in sidebar
        │
        ▼
  sidebar.ts onSelectDoc(id)
        │
        ├──▶ storage.ts → getDocument(id)
        ├──▶ editor.ts → setEditorContent(content)
        ├──▶ preview.ts → updatePreview(html)
        └──▶ header.ts → setTitle(title)

  User clicks "Download PDF"
        │
        ▼
  header.ts onDownloadPdf()
        │
        └──▶ pdf.ts → exportToPdf(previewHTML, filename)

  User clicks theme toggle
        │
        ▼
  header.ts onToggleTheme()
        │
        ├──▶ theme.ts → toggleTheme()
        ├──▶ editor.ts → setEditorTheme(theme)
        └──▶ header.ts → setThemeIcon(theme)
```

---

## 4. localStorage Schema

### Key: `md2pdf_documents`

```jsonc
// Array of Document objects
[
  {
    "id": "a1b2c3d4-...",          // crypto.randomUUID()
    "title": "My Document",        // User-editable, default "Untitled"
    "content": "# Hello\n\nWorld", // Raw Markdown string
    "createdAt": 1741500000000,    // Date.now() at creation
    "updatedAt": 1741500300000     // Date.now() at last save
  }
]
```

### Key: `md2pdf_settings`

```jsonc
{
  "theme": "dark",                 // "dark" | "light"
  "lastOpenedDocId": "a1b2c3d4-..." // ID of last active doc (nullable)
}
```

### TypeScript Interfaces (`src/types.ts`)

```
Document {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

AppSettings {
  theme: Theme
  lastOpenedDocId: string | null
}

Theme = 'dark' | 'light'
```

### Storage Size Considerations
- localStorage limit: ~5–10 MB per origin
- Each document stored as JSON; reasonably supports ~50–100 documents
- No compression needed for MVP

---

## 5. CSS Architecture — Custom Properties

### 5.1 Theme Variables (defined on `:root` / `[data-theme]`)

```
/* ─── Surface colors ─── */
--color-bg-primary          /* App background */
--color-bg-sidebar          /* Sidebar background */
--color-bg-header           /* Header background */
--color-bg-editor           /* Editor pane background */
--color-bg-preview          /* Preview pane background */

/* ─── Text colors ─── */
--color-text-primary        /* Primary text */
--color-text-secondary      /* Muted/secondary text */
--color-text-heading        /* Headings in preview */
--color-text-link           /* Links */
--color-text-inverse        /* Text on accent backgrounds */

/* ─── Border & dividers ─── */
--color-border              /* General borders */
--color-border-sidebar      /* Sidebar right border */
--color-divider             /* Split-pane divider */

/* ─── Interactive ─── */
--color-accent              /* Primary accent (buttons, active states) */
--color-accent-hover        /* Accent hover */
--color-btn-bg              /* Button background */
--color-btn-text            /* Button text */
--color-btn-hover           /* Button hover background */
--color-sidebar-item-hover  /* Sidebar item hover */
--color-sidebar-item-active /* Sidebar active item */

/* ─── Shadows ─── */
--shadow-sm                 /* Subtle shadow */
--shadow-md                 /* Medium shadow (header) */

/* ─── Spacing ─── */
--sidebar-width             /* 250px */
--header-height             /* 52px */
--radius-sm                 /* 4px */
--radius-md                 /* 8px */
--gap                       /* 16px — general spacing */

/* ─── Typography ─── */
--font-mono                 /* Editor & code blocks */
--font-sans                 /* UI elements */
--font-size-base            /* 14px */
--font-size-sm              /* 12px */
--font-size-lg              /* 16px */

/* ─── Transitions ─── */
--transition-speed          /* 0.2s */
```

### 5.2 Dark Theme Values (default)

| Variable | Value |
|----------|-------|
| `--color-bg-primary` | `#0d1117` |
| `--color-bg-sidebar` | `#161b22` |
| `--color-bg-header` | `#161b22` |
| `--color-bg-editor` | `#0d1117` |
| `--color-bg-preview` | `#0d1117` |
| `--color-text-primary` | `#e6edf3` |
| `--color-text-secondary` | `#8b949e` |
| `--color-border` | `#30363d` |
| `--color-accent` | `#58a6ff` |
| `--color-sidebar-item-active` | `#1f6feb33` |

### 5.3 Light Theme Values

| Variable | Value |
|----------|-------|
| `--color-bg-primary` | `#ffffff` |
| `--color-bg-sidebar` | `#f6f8fa` |
| `--color-bg-header` | `#f6f8fa` |
| `--color-bg-editor` | `#ffffff` |
| `--color-bg-preview` | `#ffffff` |
| `--color-text-primary` | `#1f2328` |
| `--color-text-secondary` | `#656d76` |
| `--color-border` | `#d0d7de` |
| `--color-accent` | `#0969da` |
| `--color-sidebar-item-active` | `#0969da1a` |

---

## 6. Implementation DAG — Phases & Levels

Tasks within the same level have **no dependencies on each other** and can be implemented in parallel. Each level must complete before the next begins.

```
Level 0 — Project Scaffolding (sequential, one task)
│
Level 1 — Foundation Modules (parallel, no cross-deps)
│
Level 2 — UI Modules (parallel, depend on types + storage)
│
Level 3 — Orchestration (depends on all L1 + L2 modules)
│
Level 4 — Verification & Polish
```

### Level 0 — Scaffolding

| # | Task | Files | Description |
|---|------|-------|-------------|
| 0.1 | Project init | `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` | Create project config, install dependencies, set up HTML shell with all container elements |

### Level 1 — Foundation (all parallel)

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 1.1 | Types | `src/types.ts` | 0.1 |
| 1.2 | Styles — main | `src/styles/main.css` | 0.1 |
| 1.3 | Styles — sidebar | `src/styles/sidebar.css` | 0.1 |
| 1.4 | Styles — header | `src/styles/header.css` | 0.1 |
| 1.5 | Styles — editor | `src/styles/editor.css` | 0.1 |
| 1.6 | Styles — preview | `src/styles/preview.css` | 0.1 |

### Level 2 — Core Modules (all parallel)

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 2.1 | Storage module | `src/storage.ts` | 1.1 (types) |
| 2.2 | Theme module | `src/theme.ts` | 1.1 (types), 1.2 (main.css variables) |
| 2.3 | Preview module | `src/preview.ts` | 1.1, 1.6 |
| 2.4 | PDF module | `src/pdf.ts` | 1.1 |
| 2.5 | Editor module | `src/editor.ts` | 1.1, 1.5 |

### Level 3 — UI Components (all parallel)

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 3.1 | Sidebar component | `src/sidebar.ts` | 2.1 (storage), 1.3 (sidebar.css) |
| 3.2 | Header component | `src/header.ts` | 2.2 (theme), 1.4 (header.css) |

### Level 4 — Orchestrator (sequential)

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 4.1 | Main entry point | `src/main.ts` | ALL previous levels |

### Level 5 — Verification (sequential)

| # | Task | Description | Depends On |
|---|------|-------------|------------|
| 5.1 | Type check | `npx tsc --noEmit` | 4.1 |
| 5.2 | Dev server test | `npm run dev`, manual smoke test | 5.1 |
| 5.3 | Build | `npm run build` — ensure clean production build | 5.2 |

### DAG Visualization

```
        ┌─────────┐
        │  L0:    │
        │  Scaff  │
        └────┬────┘
             │
     ┌───────┼───────┬───────┬───────┬───────┐
     ▼       ▼       ▼       ▼       ▼       ▼
  ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐
  │L1.1 ││L1.2 ││L1.3 ││L1.4 ││L1.5 ││L1.6 │
  │Types││main ││side ││head ││edit ││prev │
  │     ││.css ││.css ││.css ││.css ││.css │
  └──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘
     │      │      │      │      │      │
     ├──────┴──┬───┘      │      │      │
     │         │           │      │      │
     ▼         ▼           ▼      ▼      ▼
  ┌─────┐  ┌─────┐  ┌─────┐┌─────┐┌─────┐
  │L2.1 │  │L2.2 │  │L2.3 ││L2.4 ││L2.5 │
  │store│  │theme│  │prev ││ pdf ││edit │
  └──┬──┘  └──┬──┘  └──┬──┘└──┬──┘└──┬──┘
     │        │        │      │      │
     ▼        ▼        │      │      │
  ┌─────┐  ┌─────┐    │      │      │
  │L3.1 │  │L3.2 │    │      │      │
  │side │  │head │    │      │      │
  └──┬──┘  └──┬──┘    │      │      │
     │        │        │      │      │
     └────────┴────────┴──────┴──────┘
                    │
                    ▼
              ┌──────────┐
              │  L4:     │
              │  main.ts │
              └────┬─────┘
                   │
                   ▼
              ┌──────────┐
              │  L5:     │
              │  Verify  │
              └──────────┘
```

---

## 7. Key Implementation Notes Per Module

### `index.html`
- Use CSS Grid on `#app` for the overall layout: sidebar column + content column
- Content column uses CSS Grid rows: header row + main row
- `#main` uses CSS Grid with `grid-template-columns: 1fr 1fr` for the 50/50 split
- A `1px` border or `var(--color-divider)` between panes — no draggable resizer in MVP
- Include `<meta name="color-scheme" content="dark light">` for native OS integration

### `src/editor.ts`
- Use a **Compartment** for the theme so it can be dynamically reconfigured without destroying the editor
- `EditorView.updateListener.of(update => { if (update.docChanged) onChange(...) })` for change detection
- Import CodeMirror's built-in `oneDark` theme package for dark mode; create a minimal light theme or use the default
- The editor should fill its container height with `height: 100%` and `EditorView.theme({ "&": { height: "100%" }, ".cm-scroller": { overflow: "auto" } })`

### `src/preview.ts`
- Wrap rendered HTML in `<div class="markdown-body">` to leverage `github-markdown-css`
- For highlight.js integration with marked, use a custom renderer or `marked.use({ extensions })` to highlight code blocks:
  ```
  marked.use({
    renderer: {
      code(token) → highlight with hljs, wrap in <pre><code>
    }
  })
  ```
- Import a highlight.js theme CSS that matches the current app theme (e.g., `github-dark` / `github`)
- The preview pane should scroll independently (`overflow-y: auto`)

### `src/pdf.ts`
- html2pdf.js options:
  - `margin: 10` (mm)
  - `filename` from document title
  - `image: { type: 'jpeg', quality: 0.98 }`
  - `html2canvas: { scale: 2, useCORS: true }`
  - `jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }`
- Clone the preview HTML into a temp container to avoid layout shifts
- Force light mode styles on the cloned content for printing (white bg, black text)
- Append temp container to `document.body`, export, then remove

### `src/storage.ts`
- Use `crypto.randomUUID()` for ID generation (available in all modern browsers)
- Parse errors should fall back to empty array `[]` (defensive coding)
- The `saveDocument` function does an **upsert**: find by ID, replace or push
- Sort by `updatedAt` descending in `getAllDocuments()`
- Debouncing is NOT in this module — it's handled in `main.ts` to keep storage pure

### `src/theme.ts`
- Set `data-theme` attribute on `document.documentElement` (`:root`)
- Default theme: `'dark'`
- On init: check `storage.getSettings().theme`, apply immediately before first render to prevent flash
- The CSS uses `[data-theme="dark"]` and `[data-theme="light"]` selectors to scope variable values

### `src/sidebar.ts`
- Relative time formatting: use `Intl.RelativeTimeFormat` or a simple helper function (elapsed seconds → "just now" / "2 min ago" / "1 hour ago" / "3 days ago")
- Truncate titles over 30 characters with `...`
- "New Document" button at the top, styled distinctly (accent color or outline)
- Delete button appears on hover over a list item
- Active document highlighted with `--color-sidebar-item-active` background
- List is a simple `<ul>` with `<li>` items — no virtual scrolling needed for MVP

### `src/header.ts`
- Title input: `<input type="text">` styled to look like plain text until focused
- Theme toggle: single `<button>` with inline SVG icons (sun for light, moon for dark)
- "Download PDF" button: `<button>` with download icon + text label
- Title change fires on `blur` and `keydown` Enter (prevent Enter from creating newlines)
- Buttons use `--color-btn-bg` and hover states

### `src/main.ts`
- Debounce utility: inline or import a tiny `debounce(fn, ms)` helper
- Initialization order matters:
  1. CSS imports (Vite processes these)
  2. Theme init (prevents FOUC)
  3. Storage read
  4. UI components
  5. Editor (heaviest init)
  6. Initial preview render
- If no documents exist, auto-create a "Welcome" document with sample Markdown
- Track `currentDocId` as module-level state

### CSS General Notes
- `main.css` is imported FIRST — it defines all custom properties
- Component CSS files use the custom properties, never hard-coded colors
- `* { box-sizing: border-box; margin: 0; padding: 0; }` reset in `main.css`
- All transitions use `var(--transition-speed)` for consistent animation
- `github-markdown-css` is imported in `preview.ts` (or `main.css` via `@import`)
- Override `.markdown-body` background and text color with CSS variables so theming works

---

## 8. Critical Dependencies & Gotchas

| Item | Detail |
|------|--------|
| **html2pdf.js types** | No official `@types/html2pdf.js`. Use a `declare module 'html2pdf.js'` in `types.ts` or a `.d.ts` file |
| **CodeMirror bundle** | Import from `codemirror` (meta-package) or individual `@codemirror/*` packages. Either works; meta-package is simpler |
| **marked v14+ API** | v14 uses `marked.use()` for configuration. Do NOT use the deprecated `marked.setOptions()` |
| **github-markdown-css** | Import CSS directly: `import 'github-markdown-css/github-markdown.css'` — Vite injects it |
| **highlight.js tree-shaking** | Import only needed languages to keep bundle small: `import hljs from 'highlight.js/lib/core'` + register individual languages |
| **Browser compat** | `crypto.randomUUID()` requires HTTPS or localhost. Works on all Vite dev servers |
| **PDF export theming** | Always render PDF with light styles regardless of app theme for readability |

---

## 9. Suggested Welcome Document Content

When no documents exist, create one with this content as a demo:

```
# Welcome to MD → PDF

Start writing **Markdown** on the left, see a live preview on the right.

## Features
- 📝 Live preview with GitHub styling
- 🎨 Dark & Light themes  
- 💾 Auto-save to browser storage
- 📄 One-click PDF export

## Try it out

Write some code:

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

> This is a blockquote

| Feature | Status |
|---------|--------|
| Editor  | ✅     |
| Preview | ✅     |
| PDF     | ✅     |
```

---

*This document serves as the single source of truth for the implementation plan. All Builder subagents should reference it for file responsibilities, interfaces, and implementation order.*
