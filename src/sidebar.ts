import type { Document, SidebarCallbacks } from './types';

let sidebarCallbacks: SidebarCallbacks;

export function initSidebar(callbacks: SidebarCallbacks): void {
  sidebarCallbacks = callbacks;
  const newDocBtn = document.getElementById('new-doc-btn');
  if (newDocBtn) {
    newDocBtn.addEventListener('click', () => sidebarCallbacks.onNewDoc());
  }
}

export function refreshSidebar(docs: Document[], activeDocId: string | null): void {
  const docList = document.getElementById('doc-list');
  if (!docList) return;

  docList.innerHTML = '';

  for (const doc of docs) {
    const item = document.createElement('div');
    item.className = 'doc-item' + (doc.id === activeDocId ? ' active' : '');
    item.dataset.docId = doc.id;

    item.innerHTML = `
      <div class="doc-item-content">
        <span class="doc-item-title">${escapeHtml(doc.title)}</span>
        <span class="doc-item-time">${formatRelativeTime(doc.updatedAt)}</span>
      </div>
      <button class="doc-item-delete" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    item.addEventListener('click', () => sidebarCallbacks.onSelectDoc(doc.id));

    const deleteBtn = item.querySelector('.doc-item-delete') as HTMLButtonElement;
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebarCallbacks.onDeleteDoc(doc.id);
      });
    }

    docList.appendChild(item);
  }
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'Just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} days ago`;

  return new Date(timestamp).toLocaleDateString();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
