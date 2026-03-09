/**
 * Markdown → HTML rendering pipeline using unified/remark/rehype.
 */

import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import type { Options as SanitizeSchema } from 'rehype-sanitize';

const sanitizeAttributes = defaultSchema.attributes ?? {};

const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: Array.from(new Set([...(defaultSchema.tagNames ?? []), 'input', 'section'])),
  attributes: {
    ...sanitizeAttributes,
    a: [
      ...(sanitizeAttributes.a ?? []),
      'ariaDescribedBy',
      'ariaLabel',
      'dataFootnoteBackref',
      'dataFootnoteRef',
      ['className', 'data-footnote-backref'],
    ],
    code: [
      ...(sanitizeAttributes.code ?? []),
      ['className', 'hljs', /^language-./, /^hljs-./],
    ],
    h2: [...(sanitizeAttributes.h2 ?? []), ['className', 'sr-only']],
    input: [
      ...(sanitizeAttributes.input ?? []),
      ['type', 'checkbox'],
      ['checked', true],
      ['disabled', true],
      ['className', 'task-list-item-checkbox'],
    ],
    li: [...(sanitizeAttributes.li ?? []), ['className', 'task-list-item']],
    ol: [...(sanitizeAttributes.ol ?? [])],
    pre: [...(sanitizeAttributes.pre ?? []), ['className', 'hljs']],
    section: [
      ...(sanitizeAttributes.section ?? []),
      'dataFootnotes',
      ['className', 'footnotes'],
    ],
    span: [...(sanitizeAttributes.span ?? []), ['className', 'hljs', /^hljs-./]],
    ul: [...(sanitizeAttributes.ul ?? []), ['className', 'contains-task-list']],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeHighlight, { detect: false, ignoreMissing: true })
  .use(rehypeStringify);

function isExternalHttpLink(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute('href');

  if (!href || href.startsWith('#')) {
    return false;
  }

  try {
    const url = new URL(href, window.location.href);
    return /^(http|https):$/.test(url.protocol) && url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function secureExternalLinks(container: HTMLElement): void {
  container.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    if (isExternalHttpLink(anchor)) {
      anchor.target = '_blank';
      anchor.rel = 'noreferrer noopener';
      return;
    }

    anchor.removeAttribute('target');
    anchor.removeAttribute('rel');
  });
}

/**
 * Convert a raw Markdown string to an HTML string.
 * Uses a synchronous unified pipeline so the return type is always `string`.
 */
export function renderMarkdown(markdown: string): string {
  return String(processor.processSync(markdown));
}

/**
 * Render Markdown into a container element.
 * Sets `container.innerHTML` to the rendered HTML and secures external links.
 */
export function updatePreview(container: HTMLElement, markdown: string): void {
  container.innerHTML = renderMarkdown(markdown);
  secureExternalLinks(container);
}
