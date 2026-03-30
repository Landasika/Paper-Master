import { useState, useEffect } from 'react';
import { useZoteroData, useDataStore } from '../hooks/useDataStore';
import { useTranslationSettings } from '../hooks/useTranslationSettings';
import { useNoteTree } from '../hooks/useNoteTree';
import { Button } from '../components/Button';
import { Modal } from '../components/modals/Modal';
import { ExpandableItemRow } from '../components/ExpandableItemRow';
import { ItemEditor } from './ItemEditor';
import { NoteView } from './NoteView';
import { TranslationSettingsPage } from './TranslationSettings';
import { loadSampleData } from '../utils/sampleData';
import { translationService } from '../services/translation';
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
  const [translationSettingsOpen, setTranslationSettingsOpen] = useState(false);
  const [editingItemKey, setEditingItemKey] = useState<string | undefined>();
  const [viewingNoteKey, setViewingNoteKey] = useState<string | undefined>();
  const [parentItemForNote, setParentItemForNote] = useState<string | undefined>();
  const [itemType, setItemType] = useState('book');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 多标签PDF管理（保留功能）
  // @ts-expect-error - 保留用于未来多标签功能
  const [openPDFs, setOpenPDFs] = useState<Array<{
    attachmentKey: string;
    title: string;
    itemKey: string;
  }>>([]);
  const [activePDFKey, setActivePDFKey] = useState<string | undefined>();

  // 翻译tooltip状态（暂时未使用，保留用于未来功能）
  // const [translationTooltip, setTranslationTooltip] = useState<{
  //   visible: boolean;
  //   x: number;
  //   y: number;
  //   text: string;
  // }>({ visible: false, x: 0, y: 0, text: '' });

  // 纯离线模式：只使用 IndexedDB
  const dataStore = useDataStore();
  const { items, collections, tags, loading, error, reload } = useZoteroData(dataStore);

  // 翻译设置
  const { settings: translationSettings } = useTranslationSettings();

  // 翻译设置改变时更新翻译服务
  useEffect(() => {
    translationService.updateSettings(translationSettings);
  }, [translationSettings]);

  // 首次加载：如果没有数据，加载示例数据
  useEffect(() => {
    async function initSampleData() {
      if (dataStore && !loading && items.length === 0) {
        try {
          const hasExistingData = await dataStore.get('item', 'SAMPLE1');
          if (!hasExistingData) {
            await loadSampleData(dataStore);
            reload();
          }
        } catch (error) {
          // 404错误说明数据不存在，正常情况，静默加载示例数据
          console.log('[Library] 没有找到示例数据，开始加载...');
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
            console.error('[Library] 文件上传失败:', file.name);
            continue;
          }

          const uploadResult = await uploadResponse.json();
          const uploadedFile = uploadResult.data;
          const metadata = uploadedFile.metadata || {};

          // 2. 立即创建基本条目（快速响应）
          const basicTitle = metadata.title || parseTitleFromFilename(file.name);
          const basicItem = {
            itemType: 'book',
            title: basicTitle,
            creators: parseCreators(metadata.author, metadata.text),
            date: parseYear(metadata.creationDate || metadata.text),
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

          // 立即保存基本条目
          const savedItem = await dataStore?.save('item', basicItem);
          console.log('[Library] ✅ 快速创建条目:', basicTitle);

          // 3. 后台异步查询完整元数据（不阻塞UI）
          if (metadata.title || metadata.doi) {
            // 延迟执行，让UI先刷新
            setTimeout(async () => {
              try {
                console.log('[Library] 🔄 后台查询元数据...');

                // 重新解析完整元数据
                let creators = [];
                if (metadata.authors && metadata.authors.length > 0) {
                  creators = metadata.authors.map((a: any) => ({
                    creatorType: 'author',
                    firstName: a.firstName || '',
                    lastName: a.lastName || a.name || ''
                  }));
                } else {
                  creators = parseCreators(metadata.author, metadata.text);
                }

                const publicationInfo = parsePublicationInfo(metadata.text);

                // 构建完整条目
                const enrichedItem = {
                  ...savedItem,
                  itemType: metadata.type === 'journal-article' ? 'journalArticle' : 'book',
                  title: metadata.title || basicTitle,
                  creators: creators,
                  publicationTitle: metadata.publicationTitle || metadata.journal || publicationInfo.journal,
                  volume: metadata.volume || publicationInfo.volume,
                  issue: metadata.issue || publicationInfo.issue,
                  pages: metadata.pages || publicationInfo.pages,
                  date: metadata.year || parseYear(metadata.creationDate || metadata.text),
                  DOI: metadata.doi || publicationInfo.doi,
                  abstractNote: metadata.abstract || metadata.subject || parseAbstract(metadata.text),
                  publisher: metadata.publisher || '',
                  dateAdded: (savedItem as any).dateAdded || new Date().toISOString(),
                  attachments: (savedItem as any).attachments || [],
                  dateModified: new Date().toISOString()
                };

                // 更新条目
                await dataStore?.save('item', enrichedItem);

                console.log('[Library] ✨ 元数据更新完成:', {
                  title: enrichedItem.title,
                  authors: creators.map((c: any) => c.lastName).join(', '),
                  source: metadata.onlineMatch ? '🌐 在线查询' : '📄 本地解析',
                  publication: enrichedItem.publicationTitle || '(未知)'
                });

                // 刷新列表显示最新信息
                reload();
              } catch (error) {
                console.error('[Library] ⚠️  后台元数据更新失败:', error);
                // 失败也没关系，基本条目已经创建成功了
              }
            }, 100); // 100ms延迟，让UI先刷新
          }
        }

        // 4. 立即刷新列表（显示基本条目）
        reload();
        alert(`✅ 成功导入 ${pdfFiles.length} 个 PDF 文件\n（元数据正在后台查询中...）`);
      } catch (err) {
        console.error('[Library] 导入失败:', err);
        alert(`❌ 导入失败: ${(err as Error).message || '未知错误'}`);
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

  // @ts-expect-error - 保留用于未来功能
  const handleViewPDF = async (attachmentKey: string) => {
    // 直接在新标签页打开 PDF
    await openPDFInNewTab(attachmentKey);

    // 显示提示
    setPdfViewerOpen(true);
  };

  // @ts-expect-error - 保留用于未来功能
  const handleClosePDF = (attachmentKey: string) => {
    // 关闭指定PDF标签
    setOpenPDFs(prev => {
      const newPDFs = prev.filter(pdf => pdf.attachmentKey !== attachmentKey);

      // 如果关闭的是当前激活的PDF，切换到最后一个
      if (activePDFKey === attachmentKey) {
        if (newPDFs.length > 0) {
          setActivePDFKey(newPDFs[newPDFs.length - 1].attachmentKey);
        } else {
          // 没有打开的PDF了，关闭查看器
          setPdfViewerOpen(false);
          setActivePDFKey(undefined);
        }
      }

      return newPDFs;
    });
  };

  // @ts-expect-error - 保留用于未来功能
  const handleSwitchPDF = (attachmentKey: string) => {
    setActivePDFKey(attachmentKey);
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

  // 辅助函数：在新标签页打开 PDF（使用 Zotero Reader + postMessage）
  const openPDFInNewTab = async (attachmentKey: string) => {
    if (!dataStore) return;

    try {
      const items = await dataStore.query('item');
      for (const item of items || []) {
        const typedItem = item as any;
        if (typedItem.attachments && Array.isArray(typedItem.attachments)) {
          const foundAttachment = typedItem.attachments.find((a: any) => a.key === attachmentKey);
          if (foundAttachment) {
            // 构建 PDF URL
            let url = foundAttachment.url || foundAttachment.link || foundAttachment.path;
            if (foundAttachment.filename && !url) {
              url = `http://localhost:3001/uploads/${foundAttachment.filename}`;
            }
            if (url) {
              // 修复：使用item的title（论文题目）而不是attachment的title
              const title = typedItem.title || foundAttachment.filename || 'PDF';
              // 打开干净的 reader.html，不带参数
              const readerUrl = `/zotero-reader/reader.html`;
              const newWindow = window.open(readerUrl, '_blank');
              console.log('[openPDFInNewTab] 打开 Zotero Reader');

              // 等待新窗口加载完成后发送初始化消息
              if (newWindow) {
                setTimeout(() => {
                  newWindow.postMessage({
                    type: 'init',
                    url: url,
                    title: title,
                    readOnly: false
                  }, '*');
                  console.log('[openPDFInNewTab] 发送初始化消息:', url);
                }, 2000);
              }
            }
            break;
          }
        }
      }
    } catch (err) {
      console.error('[openPDFInNewTab] 打开 PDF 失败:', err);
    }
  };

  // 处理文本选择事件（暂时未使用，保留用于未来功能）
  // const handleTextSelection = (selection: { text: string; x: number; y: number }) => {
  //   console.log('[Library] 处理文本选择:', selection);
  //
  //   const padding = 20;
  //   const maxX = window.innerWidth - padding - 300;
  //   const maxY = window.innerHeight - padding - 200;
  //
  //   setTranslationTooltip({
  //     visible: true,
  //     x: Math.min(Math.max(selection.x, padding), maxX),
  //     y: Math.min(Math.max(selection.y, padding), maxY),
  //     text: selection.text
  //   });
  // };

  // 关闭翻译tooltip（暂时未使用，保留用于未来功能）
  // const handleCloseTranslationTooltip = () => {
  //   setTranslationTooltip(prev => ({ ...prev, visible: false }));
  // };

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
            onClick={() => setTranslationSettingsOpen(true)}
            title="翻译设置"
          >
            ⚙️ 翻译
          </Button>
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
          <CollectionsPanel
            collections={collections}
            selectedCollection={selectedCollection}
            onSelectCollection={setSelectedCollection}
          />
          <TagsPanel
            tags={tags}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
          />
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
              selectedCollection={selectedCollection}
              selectedTag={selectedTag}
              onEditItem={handleEditItem}
              onOpenPDF={openPDFInNewTab}
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

          {/* PDF查看已改为新标签页打开，不需要显示在应用内 */}
          {pdfViewerOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>PDF 已在新标签页打开</h2>
                <p style={{ color: '#666', marginBottom: '20px' }}>请检查浏览器的新标签页</p>
                <button
                  onClick={() => {
                    setOpenPDFs([]);
                    setPdfViewerOpen(false);
                    setActivePDFKey(undefined);
                  }}
                  style={{
                    padding: '10px 24px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
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

          {/* Translation Settings Modal */}
          <Modal
            isOpen={translationSettingsOpen}
            onClose={() => setTranslationSettingsOpen(false)}
            title="翻译设置"
            size="medium"
          >
            <TranslationSettingsPage
              onClose={() => setTranslationSettingsOpen(false)}
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

function CollectionsPanel({
  collections,
  selectedCollection,
  onSelectCollection
}: {
  collections: any[];
  selectedCollection: string | null;
  onSelectCollection: (key: string | null) => void;
}) {
  return (
    <div className="collections-panel">
      <h3>Collections</h3>
      {collections.length === 0 ? (
        <p className="empty-state">No collections yet</p>
      ) : (
        <ul className="collection-list">
          {collections.map((collection) => (
            <li
              key={collection.key}
              className={`collection-item ${selectedCollection === collection.key ? 'active' : ''}`}
              onClick={() => onSelectCollection(selectedCollection === collection.key ? null : collection.key)}
            >
              📁 {collection.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TagsPanel({
  tags,
  selectedTag,
  onSelectTag
}: {
  tags: any[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}) {
  return (
    <div className="tags-panel">
      <h3>Tags</h3>
      {tags.length === 0 ? (
        <p className="empty-state">No tags yet</p>
      ) : (
        <div className="tag-cloud">
          {tags.slice(0, 50).map((tag, index) => {
            const tagValue = tag.tag || tag;
            return (
              <span
                key={index}
                className={`tag ${selectedTag === tagValue ? 'active' : ''}`}
                onClick={() => onSelectTag(selectedTag === tagValue ? null : tagValue)}
              >
                {tagValue}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 在新标签页打开 PDF 的按钮组件
// @ts-expect-error - 保留用于未来功能
function OpenPDFButton({ attachmentKey }: { attachmentKey: string }) {
  const dataStore = useDataStore();
  const [attachment, setAttachment] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    async function findAttachment() {
      if (!dataStore || !attachmentKey) return;

      try {
        const items = await dataStore.query('item');
        for (const item of items || []) {
          const typedItem = item as any;
          if (typedItem.attachments && Array.isArray(typedItem.attachments)) {
            const foundAttachment = typedItem.attachments.find((a: any) => a.key === attachmentKey);
            if (foundAttachment) {
              setAttachment(foundAttachment);

              // 构建 PDF URL
              let url = foundAttachment.url || foundAttachment.link || foundAttachment.path;
              if (foundAttachment.filename && !url) {
                url = `http://localhost:3001/uploads/${foundAttachment.filename}`;
              }
              if (url) setPdfUrl(url);
              break;
            }
          }
        }
      } catch (err) {
        console.error('[OpenPDFButton] 查找 attachment 失败:', err);
      }
    }

    findAttachment();
  }, [dataStore, attachmentKey]);

  const handleOpenPDF = () => {
    if (pdfUrl) {
      // 在新标签页打开 Zotero Reader
      const readerUrl = `/zotero-reader/reader.html?url=${encodeURIComponent(pdfUrl)}&title=${encodeURIComponent(attachment?.title || attachment?.filename || 'PDF')}`;
      window.open(readerUrl, '_blank');
    }
  };

  return (
    <button
      onClick={handleOpenPDF}
      style={{
        padding: '14px 28px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.3s',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
      }}
    >
      📖 在新标签页打开 PDF
    </button>
  );
}

function ItemsPanel({
  items,
  selectedCollection,
  selectedTag,
  onEditItem,
  // @ts-expect-error - 保留用于未来功能
  onEditNote,
  onCreateNote,
  onDeleteItem,
  onOpenPDF
}: {
  items: any[];
  selectedCollection: string | null;
  selectedTag: string | null;
  onEditItem: (key: string) => void;
  onEditNote: (key: string) => void;
  onCreateNote: (key?: string) => void;
  onDeleteItem: (key: string) => void;
  onOpenPDF: (attachmentKey: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // 使用笔记树hook
  const {
    toggleExpand,
    isExpanded
  } = useNoteTree(items);


  const filteredItems = items.filter(item => {
    // 搜索筛选
    const query = searchQuery.toLowerCase();
    const title = item.title?.toLowerCase() || '';
    const creators = (item.creators || [])
      .map((c: any) => `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase())
      .join(' ');
    const matchesSearch = title.includes(query) || creators.includes(query);

    // Collection 筛选
    const matchesCollection = !selectedCollection || item.collections?.some((c: any) => c.key === selectedCollection);

    // Tag 筛选
    const matchesTag = !selectedTag || item.tags?.some((t: any) => (t.tag || t) === selectedTag);

    return matchesSearch && matchesCollection && matchesTag;
  });
  // 使用笔记树重新构建扁平列表
  const { flatTree: displayTree } = useNoteTree(filteredItems);




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
        <span className="items-count">{displayTree.length} items</span>
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          {searchQuery ? 'No items match your search' : 'No items yet. Sync your library to get started.'}
        </div>
      ) : (
        <div className="items-list">
          {displayTree.map(({ item, level, hasChildren }) => {
            // 查找 PDF 附件
            const pdfAttachment = item.attachments?.find((att: any) =>
              att.mimeType === 'application/pdf' ||
              att.title?.endsWith('.pdf') ||
              att.filename?.endsWith('.pdf')
            );

            const handleOpenPDF = () => {
              if (pdfAttachment) {
                onOpenPDF(pdfAttachment.key);
              }
            };

            return (
              <ExpandableItemRow
                key={item.key}
                item={item}
                level={level}
                hasChildren={hasChildren}
                isExpanded={isExpanded(item.key)}
                onToggle={toggleExpand}
                onEdit={onEditItem}
                onAddNote={onCreateNote}
                onOpenPDF={handleOpenPDF}
                onDelete={onDeleteItem}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
