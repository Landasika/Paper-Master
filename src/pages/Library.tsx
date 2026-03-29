import { useState, useEffect } from 'react';
import { useZoteroData, useDataStore } from '../hooks/useDataStore';
import { Button } from '../components/Button';
import { Modal } from '../components/modals/Modal';
import { ItemEditor } from './ItemEditor';
import { PDFViewModal } from './PDFView';
import { NoteView } from './NoteView';
import { loadSampleData } from '../utils/sampleData';
import type { Item } from '../core/data/Item';
import './Library.css';

export function Library() {
  const [showSettings, setShowSettings] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [noteViewOpen, setNoteViewOpen] = useState(false);
  const [editingItemKey, setEditingItemKey] = useState<string | undefined>();
  const [viewingAttachmentKey, setViewingAttachmentKey] = useState<string | undefined>();
  const [viewingNoteKey, setViewingNoteKey] = useState<string | undefined>();
  const [parentItemForNote, setParentItemForNote] = useState<string | undefined>();
  const [itemType, setItemType] = useState('book');

  // 纯离线模式：只使用 IndexedDB
  const dataStore = useDataStore();
  const { items, collections, tags, loading, error, reload } = useZoteroData(dataStore);

  // 首次加载：如果没有数据，加载示例数据
  useEffect(() => {
    async function initSampleData() {
      if (dataStore && !loading && items.length === 0) {
        const hasExistingData = await dataStore.get('item', 'SAMPLE1');
        if (!hasExistingData) {
          await loadSampleData(dataStore);
          reload();
        }
      }
    }
    initSampleData();
  }, [dataStore, loading, items.length, reload]);

  const handleSync = async () => {
    try {
      await dataStore?.sync();
      reload();
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Sync failed. Please try again.');
    }
  };

  // 数据导出功能
  const handleExportData = async () => {
    try {
      const [items, collections, tags] = await Promise.all([
        dataStore?.query('item'),
        dataStore?.query('collection'),
        dataStore?.query('tag')
      ]);

      const data = {
        version: 1,
        exportDate: new Date().toISOString(),
        items: items || [],
        collections: collections || [],
        tags: tags || []
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paper-master-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  };

  // 数据导入功能
  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !dataStore) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.items) await dataStore.save('item', data.items);
        if (data.collections) await dataStore.save('collection', data.collections);
        if (data.tags) await dataStore.save('tag', data.tags);

        alert('Data imported successfully!');
        reload();
      } catch (err) {
        console.error('Import failed:', err);
        alert('Import failed. Please check the file format.');
      }
    };
    input.click();
  };

  const handleCreateItem = (type: string = 'book') => {
    setItemType(type);
    setEditingItemKey(undefined);
    setEditorOpen(true);
  };

  const handleEditItem = (itemKey: string) => {
    setEditingItemKey(itemKey);
    setEditorOpen(true);
  };

  const handleViewPDF = (attachmentKey: string) => {
    setViewingAttachmentKey(attachmentKey);
    setPdfViewerOpen(true);
  };

  const handleCreateNote = (parentItemKey?: string) => {
    setParentItemForNote(parentItemKey);
    setViewingNoteKey(undefined);
    setNoteViewOpen(true);
  };

  const handleEditNote = (noteKey: string) => {
    setViewingNoteKey(noteKey);
    setParentItemForNote(undefined);
    setNoteViewOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingItemKey(undefined);
  };

  const handleEditorSave = async (_itemData: Partial<Item>, _files?: File[]) => {
    setEditorOpen(false);
    setEditingItemKey(undefined);
    reload();
  };

  const handlePDFClose = () => {
    setPdfViewerOpen(false);
    setViewingAttachmentKey(undefined);
  };

  const handleNoteClose = () => {
    setNoteViewOpen(false);
    setViewingNoteKey(undefined);
    setParentItemForNote(undefined);
    reload();
  };

  const handleNoteSave = () => {
    setNoteViewOpen(false);
    setViewingNoteKey(undefined);
    setParentItemForNote(undefined);
    reload();
  };

  return (
    <div className="library">
      <header className="library-header">
        <h1>Paper-Master</h1>
        <div className="library-actions">
          <Button
            variant="ghost"
            size="small"
            onClick={handleExportData}
          >
            📤 Export
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={handleImportData}
          >
            📥 Import
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={handleSync}
          >
            Sync
          </Button>
        </div>
      </header>

      {showSettings && (
        <div className="settings-panel">
          <h3>离线模式设置</h3>
          <p>您的数据完全存储在本地浏览器中。</p>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </div>
      )}

      <div className="library-content">
        <aside className="library-sidebar">
          <CollectionsPanel collections={collections} />
          <TagsPanel tags={tags} />
        </aside>

        <main className="library-main">
          <div className="library-toolbar">
            <div className="library-actions-left">
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="item-type-selector"
              >
                <option value="book">Book</option>
                <option value="journalArticle">Journal Article</option>
                <option value="magazineArticle">Magazine Article</option>
                <option value="newspaperArticle">Newspaper Article</option>
                <option value="thesis">Thesis</option>
                <option value="conferencePaper">Conference Paper</option>
                <option value="webpage">Web Page</option>
                <option value="report">Report</option>
              </select>
              <Button
                variant="primary"
                onClick={() => handleCreateItem(itemType)}
              >
                + New Item
              </Button>
            </div>

            <div className="sync-status">
              <span className="status-indicator offline">🟢 离线模式</span>
              <span className="storage-info">数据存储在本地浏览器</span>
            </div>
          </div>

          {!loading && !error && (
            <ItemsPanel
              items={items}
              onEditItem={handleEditItem}
              onViewPDF={handleViewPDF}
              onEditNote={handleEditNote}
              onCreateNote={handleCreateNote}
            />
          )}

          {loading && <div className="loading">Loading...</div>}

          {error && (
            <div className="error">
              Error loading data: {error.message}
              <Button onClick={reload} variant="secondary" size="small">Retry</Button>
            </div>
          )}

          {/* Item Editor Modal */}
          <Modal
            isOpen={editorOpen}
            onClose={handleEditorClose}
            size="large"
          >
            <ItemEditor
              itemKey={editingItemKey}
              itemType={itemType}
              onClose={handleEditorClose}
              onSave={handleEditorSave}
            />
          </Modal>

          {/* PDF Viewer Modal */}
          {viewingAttachmentKey && (
            <PDFViewModal
              isOpen={pdfViewerOpen}
              attachmentKey={viewingAttachmentKey}
              onClose={handlePDFClose}
            />
          )}

          {/* Note View Modal */}
          <Modal
            isOpen={noteViewOpen}
            onClose={handleNoteClose}
            size="large"
          >
            <NoteView
              noteKey={viewingNoteKey}
              parentItemKey={parentItemForNote}
              onClose={handleNoteClose}
              onSave={handleNoteSave}
            />
          </Modal>
        </main>
      </div>
    </div>
  );
}

// @ts-ignore - SettingsPage will be used in future
function SettingsPage({ onSave }: { onSave: (key: string) => void }) {
  const [key, setKey] = useState('');

  return (
    <div className="settings-page">
      <div className="settings-card">
        <h2>Welcome to Paper-Master</h2>
        <p>Enter your API key to get started.</p>
        <p>
          You can create an API key at{' '}
          <a href="https://www.zotero.org/settings/keys" target="_blank" rel="noopener noreferrer">
            zotero.org/settings/keys
          </a>
        </p>

        <form onSubmit={(e) => { e.preventDefault(); onSave(key); }}>
          <div className="form-group">
            <label htmlFor="api-key">API Key</label>
            <input
              id="api-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter your API key"
              className="form-input"
            />
          </div>

          <Button type="submit" variant="primary" disabled={!key}>
            Get Started
          </Button>
        </form>
      </div>
    </div>
  );
}

// @ts-ignore - SettingsPanel will be used in future
function SettingsPanel({ apiKey, onSave }: { apiKey: string; onSave: (key: string) => void }) {
  const [key, setKey] = useState(apiKey);

  return (
    <div className="settings-panel">
      <div className="settings-content">
        <h3>Settings</h3>
        <div className="form-group">
          <label htmlFor="settings-api-key">API Key</label>
          <input
            id="settings-api-key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="settings-actions">
          <Button onClick={() => onSave(key)} variant="primary" size="small">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function CollectionsPanel({ collections }: { collections: any[] }) {
  return (
    <div className="collections-panel">
      <h3>Collections</h3>
      {collections.length === 0 ? (
        <p className="empty-state">No collections yet</p>
      ) : (
        <ul className="collection-list">
          {collections.map((collection) => (
            <li key={collection.key} className="collection-item">
              📁 {collection.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TagsPanel({ tags }: { tags: any[] }) {
  return (
    <div className="tags-panel">
      <h3>Tags</h3>
      {tags.length === 0 ? (
        <p className="empty-state">No tags yet</p>
      ) : (
        <div className="tag-cloud">
          {tags.slice(0, 50).map((tag, index) => (
            <span key={index} className="tag">
              {tag.tag || tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemsPanel({
  items,
  onEditItem,
  onViewPDF,
  onEditNote,
  onCreateNote
}: {
  items: any[];
  onEditItem: (key: string) => void;
  onViewPDF: (key: string) => void;
  onEditNote: (key: string) => void;
  onCreateNote: (key?: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    const title = item.title?.toLowerCase() || '';
    const creators = (item.creators || [])
      .map((c: any) => `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase())
      .join(' ');

    return title.includes(query) || creators.includes(query);
  });

  return (
    <div className="items-panel">
      <div className="items-header">
        <input
          type="search"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <span className="items-count">{filteredItems.length} items</span>
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          {searchQuery ? 'No items match your search' : 'No items yet. Sync your library to get started.'}
        </div>
      ) : (
        <div className="items-list">
          {filteredItems.map((item) => (
            <div
              key={item.key}
              className={`item-card ${item.itemType === 'note' ? 'item-card-note' : ''}`}
              onClick={() => {
                if (item.itemType === 'note') {
                  onEditNote(item.key);
                } else {
                  onEditItem(item.key);
                }
              }}
            >
              <div className="item-title">
                {item.itemType === 'note' ? (
                  <span>📝 {item.note?.replace(/<[^>]+>/g, '').substring(0, 100) || 'Empty Note'}</span>
                ) : (
                  item.title || 'Untitled'
                )}
              </div>
              <div className="item-meta">
                {item.creators && item.creators.length > 0 && (
                  <span className="item-creators">
                    {item.creators.map((c: any) =>
                      `${c.firstName || ''} ${c.lastName || ''}`.trim()
                    ).join(', ')}
                  </span>
                )}
                {item.date && (
                  <span className="item-date">{item.date}</span>
                )}
              </div>
              {item.itemType && (
                <div className="item-type">
                  Type: {item.itemType}
                </div>
              )}
              <div className="item-actions">
                <button
                  className="item-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.itemType === 'note') {
                      onEditNote(item.key);
                    } else {
                      onEditItem(item.key);
                    }
                  }}
                  title={item.itemType === 'note' ? 'Edit note' : 'Edit item'}
                >
                  ✏️ {item.itemType === 'note' ? 'Edit Note' : 'Edit'}
                </button>
                {item.itemType === 'attachment' && item.linkType === 'embedded' && (
                  <button
                    className="item-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewPDF(item.key);
                    }}
                    title="View PDF"
                  >
                      📄 PDF
                  </button>
                )}
                {item.itemType !== 'note' && item.itemType !== 'attachment' && (
                  <button
                    className="item-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateNote(item.key);
                    }}
                    title="Add note"
                  >
                    📝 Add Note
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
