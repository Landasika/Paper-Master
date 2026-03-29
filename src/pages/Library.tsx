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

// PDF 元数据解析函数
function parseTitleFromFilename(filename: string): string {
  return filename.replace(/\.pdf$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCreators(authorStr: string, text?: string): Array<{ creatorType: string; firstName: string; lastName: string }> {
  const creators: Array<{ creatorType: string; firstName: string; lastName: string }> = [];

  if (!authorStr && !text) return creators;

  // 尝试从作者字段解析
  if (authorStr) {
    const authorList = authorStr.split(/,|;&/).map(a => a.trim()).filter(a => a);
    authorList.forEach(author => {
      const parts = author.split(/\s+/);
      if (parts.length >= 2) {
        creators.push({
          creatorType: 'author',
          firstName: parts.slice(0, -1).join(' '),
          lastName: parts[parts.length - 1]
        });
      } else if (parts.length === 1) {
        creators.push({
          creatorType: 'author',
          firstName: '',
          lastName: parts[0]
        });
      }
    });
  }

  // 如果没有找到作者，尝试从文本中提取（常见格式：Author et al.）
  if (creators.length === 0 && text) {
    const authorMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+et\s+al/i);
    if (authorMatch) {
      const parts = authorMatch[1].split(/\s+/);
      creators.push({
        creatorType: 'author',
        firstName: parts.slice(0, -1).join(' '),
        lastName: parts[parts.length - 1]
      });
    }
  }

  return creators.slice(0, 10); // 最多10个作者
}

function parseYear(dateStr: string, text?: string): string {
  // 尝试从日期字符串提取年份
  if (dateStr) {
    const yearMatch = dateStr.match(/(19|20)\d{2}/);
    if (yearMatch) return yearMatch[0];
  }

  // 尝试从文本中提取年份（常见格式：© 2024, 2024 IEEE）
  if (text) {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) return yearMatch[0];
  }

  return new Date().getFullYear().toString();
}

function parsePublicationInfo(text?: string): {
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
} {
  const info: any = {};

  if (text) {
    // 提取期刊名（常见格式）
    const journalPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s+Journal|,\s+Vol|,\s+No)/,
      /(?:in\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+Journal)?)/i
    ];

    for (const pattern of journalPatterns) {
      const match = text.match(pattern);
      if (match) {
        info.journal = match[1].trim();
        break;
      }
    }

    // 提取卷号和期号
    const volIssueMatch = text.match(/Vol\.?\s*(\d+)(?:\s*,\s*No\.?\s*(\d+))?/i);
    if (volIssueMatch) {
      info.volume = volIssueMatch[1];
      if (volIssueMatch[2]) info.issue = volIssueMatch[2];
    }

    // 提取页码
    const pagesMatch = text.match(/pp?\.\s*(\d+(?:-\d+)?)/i);
    if (pagesMatch) {
      info.pages = pagesMatch[1];
    }

    // 提取 DOI
    const doiMatch = text.match(/DOI\s+:\s*(10\.\d+\/[^\s,]+)/i);
    if (doiMatch) {
      info.doi = doiMatch[1];
    }
  }

  return info;
}

function parseAbstract(text?: string): string {
  if (!text) return '';

  // 尝试提取摘要（通常在 Abstract 或 Summary 后）
  const abstractMatch = text.match(/(?:Abstract|Summary)\s*:\s*([^\n]+(?:\n[^\n]+){0,5})/i);
  if (abstractMatch) {
    return abstractMatch[1].trim().substring(0, 500);
  }

  return '';
}


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
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  // 处理文件拖拽
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      // 只在真正离开拖拽区域时取消
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));

      if (pdfFiles.length === 0) {
        alert('请拖拽 PDF 文件');
        return;
      }

      setUploading(true);

      try {
        // 处理每个 PDF 文件
        for (const file of pdfFiles) {
          // 1. 上传文件
          const formData = new FormData();
          formData.append('file', file);

          const uploadResponse = await fetch('http://localhost:3001/api/upload', {
            method: 'POST',
            body: formData
          });

          if (!uploadResponse.ok) {
            console.error('文件上传失败:', file.name);
            continue;
          }

          const uploadResult = await uploadResponse.json();
          const uploadedFile = uploadResult.data;

          // 2. 解析元数据并按照 Zotero 格式创建条目
          const metadata = uploadedFile.metadata || {};
          const parsedTitle = metadata.title || parseTitleFromFilename(file.name);
          const creators = parseCreators(metadata.author, metadata.text);
          const year = parseYear(metadata.creationDate || metadata.text);
          const publicationInfo = parsePublicationInfo(metadata.text);

          const newItem = {
            itemType: 'journalArticle',
            title: parsedTitle,
            creators: creators,
            publicationTitle: publicationInfo.journal,
            volume: publicationInfo.volume,
            issue: publicationInfo.issue,
            pages: publicationInfo.pages,
            date: year,
            DOI: publicationInfo.doi,
            abstractNote: metadata.subject || parseAbstract(metadata.text),
            dateAdded: new Date().toISOString(),
            dateModified: new Date().toISOString(),
            attachments: [{
              key: `ATTACH_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              itemType: 'attachment',
              linkType: 'linked_file',
              title: file.name,
              url: `http://localhost:3001${uploadedFile.url}`,
              filename: uploadedFile.filename,
              size: uploadedFile.size,
              mimeType: uploadedFile.mimeType,
              dateAdded: new Date().toISOString()
            }]
          };

          await dataStore?.save('item', newItem, [file]);
          console.log('[Library] 自动创建条目:', parsedTitle, `作者: ${creators.map(c => c.lastName).join(', ')}`);
        }

        // 3. 刷新列表
        reload();
        alert(`✅ 成功导入 ${pdfFiles.length} 个 PDF 文件`);
      } catch (err) {
        console.error('导入失败:', err);
        alert('导入失败，请重试');
      } finally {
        setUploading(false);
      }
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

  const handleDeleteItem = async (itemKey: string) => {
    try {
      // 获取条目信息以便删除关联的文件
      const item = items.find(i => i.key === itemKey);
      if (item?.attachments) {
        // 删除关联的 PDF 文件
        for (const attachment of item.attachments) {
          if (attachment.filename) {
            try {
              await fetch(`http://localhost:3001/api/upload/${attachment.filename}`, {
                method: 'DELETE'
              });
              console.log('[Library] 已删除文件:', attachment.filename);
            } catch (err) {
              console.error('[Library] 删除文件失败:', attachment.filename, err);
            }
          }
        }
      }

      // 删除条目
      await dataStore?.delete('item', itemKey);
      console.log('[Library] 已删除条目:', itemKey);

      // 刷新列表
      reload();
      alert('✅ 删除成功');
    } catch (err) {
      console.error('[Library] 删除失败:', err);
      alert('删除失败，请重试');
    }
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
    <div
      className={`library ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
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
              onDeleteItem={handleDeleteItem}
            />
          )}

          {loading && <div className="loading">Loading...</div>}

          {dragActive && (
            <div className="drag-overlay">
              <div className="drag-overlay-content">
                <div className="drag-icon">📄</div>
                <h2>释放以导入 PDF</h2>
                <p>将自动创建条目并上传文件</p>
              </div>
            </div>
          )}

          {uploading && (
            <div className="uploading-overlay">
              <div className="uploading-content">
                <div className="spinner"></div>
                <p>正在导入 PDF...</p>
              </div>
            </div>
          )}

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
  onCreateNote,
  onDeleteItem
}: {
  items: any[];
  onEditItem: (key: string) => void;
  onViewPDF: (key: string) => void;
  onEditNote: (key: string) => void;
  onCreateNote: (key?: string) => void;
  onDeleteItem: (key: string) => void;
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
                <button
                  className="item-action-btn item-action-btn-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`确定要删除 "${item.title || 'this item'}" 吗？`)) {
                      onDeleteItem(item.key);
                    }
                  }}
                  title="Delete item"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
