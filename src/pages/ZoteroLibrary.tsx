/**
 * Paper-Master - Main Interface
 * Reference management application
 */

import { useState, useEffect, useCallback } from 'react';
import { ItemAdapter } from '../core/adapters/ItemAdapter';
import { VirtualizedTable } from '../components/VirtualizedTable';
import { CollectionTree } from '../components/CollectionTree';
import { ContextPane } from '../components/ContextPane';
import { MenuBar } from '../components/MenuBar';
import { Toolbar } from '../components/Toolbar';
import { StatusBar } from '../components/StatusBar';
import { KeyboardShortcutsHelp } from '../components/KeyboardShortcutsHelp';
import { SyncSettings } from '../components/SyncSettings';
import { WebDAVSettings } from '../components/WebDAVSettings';
import { Button } from '../components/Button';
import { FileSyncService } from '../core/sync/FileSyncService';
import { FileUploadService } from '../core/services/FileUploadService';
import { PDFRecognizer } from '../core/services/PDFRecognizer';
import { Modal } from '../components/modals/Modal';
import { useKeyboardShortcuts, getDefaultShortcuts } from '../hooks/useKeyboardShortcuts';
import { initSampleData } from '../core/database/initSampleData';
import { logDatabaseStatus } from '../utils/debug';
import { ServerStore } from '../core/stores/ServerStore';
import { ItemEditor } from './ItemEditor';
import './ZoteroLibrary.css';

// 导入组件和类型
import type { Collection } from '../components/CollectionTree';

interface Item {
  itemID: number;
  key: string;
  itemType: string;
  title: string;
  creators: Array<{
    creatorType: string;
    firstName: string;
    lastName: string;
  }>;
  tags: string[];
  date: string;
  dateAdded: string;
  publicationTitle?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  DOI?: string;
  ISBN?: string;
  abstractNote?: string;
}

export function ZoteroLibrary() {
  const [items, setItems] = useState<Item[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectedCollection, setSelectedCollection] = useState<string | null>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ items: 0, collections: 0, tags: 0 });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>(undefined);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'sync' | 'webdav'>('sync');
  // @ts-ignore - syncConfig used in sync logic
  const [syncConfig, setSyncConfig] = useState<any>(null);
  const [fileSyncService] = useState(() => new FileSyncService());
  const [fileUploadService] = useState(() => new FileUploadService());
  const [dragActive, setDragActive] = useState(false);
  const [processingDrop, setProcessingDrop] = useState(false);

  const itemAdapter = ItemAdapter.getInstance();

  // 初始化应用
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[ZoteroLibrary] 开始初始化应用...');

        // 先初始化示例数据
        await initSampleData();

        // 检查数据库状态
        await logDatabaseStatus();

        // 然后加载条目
        await loadItems();

        console.log('[ZoteroLibrary] 应用初始化完成!');
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError('初始化应用失败: ' + (err as Error).message);
      }
    };
    initializeApp();
  }, []); // 只在组件挂载时运行一次

  // 加载数据
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[ZoteroLibrary] 开始加载数据...');

      // 优先尝试从Zotero服务器加载真实数据
      const authData = localStorage.getItem('zotero_auth');
      if (authData) {
        try {
          const auth = JSON.parse(authData);
          if (auth.apiKey) {
            console.log('[ZoteroLibrary] 发现Zotero认证信息，从服务器加载数据...');

            // 动态导入ZoteroAPI
            const { ZoteroAPI } = await import('../core/api/ZoteroAPI');
            const api = new ZoteroAPI(auth.apiKey, { userID: auth.userID });

            // 获取用户的所有条目
            const itemsData = await api.getItems('user', auth.userID || '', {
              limit: 100
            });

            if (itemsData && itemsData.length > 0) {
              console.log(`[ZoteroLibrary] 从Zotero服务器加载了 ${itemsData.length} 个真实条目`);

              // 转换Zotero数据为本地格式
              const zoteroItems = itemsData.map((item: any) => ({
                itemID: parseInt(item.key.substring(0, 8), 16) || Math.floor(Math.random() * 1000000),
                key: item.key,
                itemType: item.data.itemType,
                title: item.data.title || 'Untitled',
                creators: item.data.creators || [],
                tags: item.data.tags ? item.data.tags.map((t: any) => t.tag) : [],
                date: item.data.date || '',
                dateAdded: item.data.dateAdded || new Date().toISOString(),
                publicationTitle: item.data.publicationTitle || '',
                abstractNote: item.data.abstractNote || '',
                volume: item.data.volume,
                issue: item.data.issue,
                pages: item.data.pages,
                DOI: item.data.DOI,
                ISBN: item.data.ISBN
              }));

              setItems(zoteroItems);
              updateStats();
              setLoading(false);
              return;
            } else {
              console.log('[ZoteroLibrary] Zotero服务器没有数据，使用本地数据');
            }
          }
        } catch (error) {
          console.error('[ZoteroLibrary] 从Zotero服务器加载数据失败:', error);
          // 如果API加载失败，回退到本地数据
        }
      }

      // 回退到本地数据库数据
      console.log('[ZoteroLibrary] 使用本地数据库数据');
      let fetchedItems: Item[];
      if (searchTerm) {
        fetchedItems = await itemAdapter.searchItems(searchTerm);
      } else {
        fetchedItems = await itemAdapter.getAllItems(50);
      }

      setItems(fetchedItems);
      updateStats();
    } catch (err) {
      console.error('Failed to load items:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // 更新统计信息
  const updateStats = () => {
    // TODO: 从数据库获取真实统计
    setStats({
      items: items.length,
      collections: 0,
      tags: 0
    });
  };

  // 初始化集合数据
  useEffect(() => {
    initializeCollections();
  }, []);

  // 初始化集合
  const initializeCollections = () => {
    // 创建模拟集合数据
    const mockCollections: Collection[] = [
      {
        collectionID: 1,
        key: 'all',
        name: '所有条目',
        level: 0,
        hasChildren: false,
        itemCount: items.length,
        type: 'library'
      },
      {
        collectionID: 2,
        key: 'trash',
        name: '回收站',
        level: 0,
        hasChildren: false,
        itemCount: 0,
        type: 'trash'
      },
      {
        collectionID: 3,
        key: 'research',
        name: '研究项目',
        level: 0,
        hasChildren: true,
        itemCount: 5,
        type: 'collection',
        isOpen: true
      },
      {
        collectionID: 4,
        key: 'research-ai',
        name: '人工智能',
        level: 1,
        hasChildren: false,
        itemCount: 2,
        type: 'collection',
        parentCollectionID: 3
      },
      {
        collectionID: 5,
        key: 'research-web',
        name: 'Web开发',
        level: 1,
        hasChildren: false,
        itemCount: 3,
        type: 'collection',
        parentCollectionID: 3
      },
      {
        collectionID: 6,
        key: 'personal',
        name: '个人收藏',
        level: 0,
        hasChildren: false,
        itemCount: 2,
        type: 'collection'
      }
    ];

    setCollections(mockCollections);
  };

  // 移除重复的初始加载，因为已经在初始化应用时处理

  // 处理条目点击
  const handleItemClick = useCallback((item: Item) => {
    setSelectedItem(item);
  }, []);

  // 处理新建条目
  const handleNewItem = useCallback(() => {
    setEditingItem(null);
    setEditorOpen(true);
  }, []);

  // 处理编辑条目
  const handleEditItem = useCallback((item: Item) => {
    setEditingItem(item);
    setEditorOpen(true);
  }, []);

  // 处理文件拖拽
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // 处理文件拖放
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (files.length === 0) {
      alert('请拖拽PDF文件到此处');
      return;
    }

    setProcessingDrop(true);

    try {
      for (const file of files) {
        console.log('[ZoteroLibrary] 处理PDF文件:', file.name);

        let metadata: any;
        try {
          // 提取PDF元数据
          metadata = await PDFRecognizer.extractMetadata(file);
          console.log('[ZoteroLibrary] 提取的元数据:', metadata);
        } catch (pdfError) {
          console.warn('[ZoteroLibrary] PDF元数据提取失败，使用基本信息:', pdfError);
          metadata = {
            title: file.name.replace('.pdf', ''),
            itemType: 'document'
          };
        }

        // 如果有DOI，尝试获取更完整的元数据
        if (metadata.DOI) {
          try {
            const doiData = await PDFRecognizer.queryByDOI(metadata.DOI);
            Object.assign(metadata, doiData);
          } catch (err) {
            console.warn('[ZoteroLibrary] DOI查询失败，使用PDF元数据');
          }
        }

        // 创建条目 - 确保所有必需字段都有值
        const newItem = await itemAdapter.createItem(metadata.itemType || 'document', {
          title: metadata.title || file.name,
          abstractNote: metadata.abstract || '',
          creators: metadata.creators || [],
          DOI: metadata.DOI || '',
          ISBN: metadata.ISBN || '',
          date: metadata.date || '',
          publicationTitle: metadata.publicationTitle || '',
          volume: metadata.volume || '',
          issue: metadata.issue || '',
          pages: metadata.pages?.toString() || '',
          tags: metadata.keywords || []
        });

        console.log('[ZoteroLibrary] 创建条目成功:', newItem.itemID);

        // 上传PDF附件
        const webdavConfig = localStorage.getItem('zotero_webdav_config');
        if (webdavConfig) {
          const config = JSON.parse(webdavConfig);
          await fileUploadService.initialize(config);
          await fileUploadService.uploadFiles(newItem.itemID, [file], (progress) => {
            console.log(`[ZoteroLibrary] 上传进度: ${progress.filename} - ${progress.progress}%`);
          });
        } else {
          // 没有WebDAV配置，只保存到数据库
          await itemAdapter.addAttachment(newItem.itemID, {
            title: file.name,
            filename: file.name,
            contentType: file.type,
            size: file.size
          });
        }
      }

      // 刷新条目列表
      await loadItems();

      alert(`成功导入 ${files.length} 个PDF文件`);
    } catch (err) {
      console.error('[ZoteroLibrary] 处理PDF失败:', err);
      alert('导入PDF失败: ' + (err as Error).message);
    } finally {
      setProcessingDrop(false);
    }
  }, [itemAdapter, fileUploadService, loadItems]);

  // 处理删除条目
  const handleDeleteItem = async (item: Item) => {
    if (!confirm(`确定要删除"${item.title}"吗？`)) return;

    try {
      await itemAdapter.deleteItem(item.itemID);
      setSelectedItem(null);
      await loadItems();
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('删除失败: ' + (err as Error).message);
    }
  };

  // 处理集合选择
  const handleCollectionSelect = useCallback((collection: Collection | null) => {
    if (!collection) {
      setSelectedCollection(null);
      return;
    }

    setSelectedCollection(collection.key);

    // 根据选择的集合过滤条目
    if (collection.key === 'all') {
      loadItems(); // 加载所有条目
    } else if (collection.key === 'trash') {
      // 显示已删除的条目（暂未实现）
      setItems([]);
    } else {
      // 根据集合过滤条目（暂未实现）
      // 目前显示所有条目
      loadItems();
    }
  }, [loadItems]);

  // 处理集合重命名
  const handleCollectionRename = async (collectionID: number, newName: string) => {
    setCollections(prev => prev.map(col =>
      col.collectionID === collectionID ? { ...col, name: newName } : col
    ));
  };

  // 处理集合删除
  const handleCollectionDelete = async (collectionID: number) => {
    setCollections(prev => prev.filter(col => col.collectionID !== collectionID));
    if (selectedCollection === collections.find(c => c.collectionID === collectionID)?.key) {
      setSelectedCollection('all');
      loadItems();
    }
  };

  // 处理添加笔记
  const handleNoteAdd = async (itemId: number, content: string) => {
    try {
      // 这里可以调用API保存笔记
      console.log('添加笔记:', { itemId, content });
      // 暂时只更新本地状态
      setItems(prev => prev.map(item =>
        item.itemID === itemId
          ? {
              ...item,
              notes: [
                ...((item as any).notes || []),
                {
                  noteId: Date.now(),
                  content,
                  dateModified: new Date().toISOString()
                }
              ]
            }
          : item
      ));
    } catch (error) {
      console.error('添加笔记失败:', error);
      alert('添加笔记失败');
    }
  };

  // 处理添加标签
  const handleTagAdd = async (itemId: number, tag: string) => {
    try {
      // 这里可以调用API保存标签
      console.log('添加标签:', { itemId, tag });
      // 暂时只更新本地状态
      setItems(prev => prev.map(item =>
        item.itemID === itemId
          ? { ...item, tags: [...item.tags, tag] }
          : item
      ));
    } catch (error) {
      console.error('添加标签失败:', error);
      alert('添加标签失败');
    }
  };

  // 处理删除标签
  const handleTagRemove = async (itemId: number, tag: string) => {
    try {
      // 这里可以调用API删除标签
      console.log('删除标签:', { itemId, tag });
      // 暂时只更新本地状态
      setItems(prev => prev.map(item =>
        item.itemID === itemId
          ? { ...item, tags: item.tags.filter(t => t !== tag) }
          : item
      ));
    } catch (error) {
      console.error('删除标签失败:', error);
      alert('删除标签失败');
    }
  };

  // 拖拽条目开始
  const handleItemDragStart = useCallback((item: Item) => {
    console.log('[ZoteroLibrary] 开始拖拽条目:', item.title);
    // 设置拖拽数据
    const dragData = JSON.stringify({
      itemID: item.itemID,
      key: item.key,
      title: item.title,
      itemType: item.itemType
    });

    // 确保在其他线程中可以访问这个数据
    if (typeof window !== 'undefined') {
      (window as any).zoteroDragData = dragData;
    }
  }, []);

  // 菜单操作处理函数
  const handleSettings = () => {
    setShowSyncSettings(true);
  };

  const handleSync = async () => {
    try {
      setSyncStatus('syncing');

      console.log('[Sync] 开始同步...');

      // 1. 检查元数据同步配置
      const savedConfig = localStorage.getItem('zotero_sync_config');
      if (!savedConfig) {
        setShowSyncSettings(true);
        setSyncStatus('idle');
        alert('请先配置同步设置');
        return;
      }

      const config = JSON.parse(savedConfig);
      let syncResults: any = {
        items: [],
        collections: [],
        tags: [],
        files: { uploaded: 0, downloaded: 0 }
      };

      // 2. 元数据同步
      if (config.serverType === 'custom') {
        console.log('[Sync] 连接到自定义服务器:', config.serverURL);

        const serverStore = new ServerStore(config.serverURL || 'http://localhost:3001');
        await serverStore.initialize();

        const result = await serverStore.sync();
        syncResults.items = result.items;
        syncResults.collections = result.collections;
        syncResults.tags = result.tags;

        console.log('[Sync] 元数据同步完成:', result);

      } else if (config.serverType === 'zotero' && config.apiKey) {
        // 这里可以添加真正的Zotero官方API同步
        console.log('[Sync] Zotero官方API同步暂未实现');
        alert('Zotero官方API同步功能开发中，请使用自定义服务器同步');
        setSyncStatus('idle');
        return;
      }

      // 3. 文件同步
      const webdavConfig = localStorage.getItem('zotero_webdav_config');
      if (webdavConfig) {
        try {
          console.log('[Sync] 开始文件同步...');

          const parsedWebDAVConfig = JSON.parse(webdavConfig);

          // 初始化文件同步服务
          const initialized = await fileSyncService.initialize({
            url: parsedWebDAVConfig.url,
            username: parsedWebDAVConfig.username,
            password: parsedWebDAVConfig.password,
            path: parsedWebDAVConfig.path || '/Zotero',
            enabled: true
          });

          if (initialized) {
            const fileResult = await fileSyncService.syncAllAttachments();
            syncResults.files = {
              uploaded: fileResult.filesUploaded,
              downloaded: fileResult.filesDownloaded
            };

            console.log('[Sync] 文件同步完成:', fileResult);
          } else {
            console.warn('[Sync] WebDAV初始化失败，跳过文件同步');
          }
        } catch (error) {
          console.error('[Sync] 文件同步失败:', error);
          // 文件同步失败不影响元数据同步结果
        }
      } else {
        console.log('[Sync] 未配置WebDAV，跳过文件同步');
      }

      // 4. 更新UI
      setSyncStatus('success');
      setLastSyncTime(new Date());
      setTimeout(() => setSyncStatus('idle'), 3000);

      // 5. 重新加载数据
      await loadItems();

      // 6. 显示同步结果
      const message = `同步完成！\n\n` +
        `📚 元数据:\n` +
        `  • 条目: ${syncResults.items.length} 个\n` +
        `  • 集合: ${syncResults.collections.length} 个\n` +
        `  • 标签: ${syncResults.tags.length} 个\n` +
        `\n📁 文件:\n` +
        `  • 上传: ${syncResults.files.uploaded} 个\n` +
        `  • 下载: ${syncResults.files.downloaded} 个\n` +
        `\n⏰ ${new Date().toLocaleString('zh-CN')}`;

      alert(message);

      console.log('[Sync] 同步完成:', syncResults);

    } catch (error) {
      console.error('[Sync] 同步失败:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);

      alert(`同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleSyncConfigChange = (config: any) => {
    setSyncConfig(config);
    // 保存到localStorage
    localStorage.setItem('zotero_sync_config', JSON.stringify(config));
  };

  const handleAbout = () => {
    alert('Paper-Master\nModern Reference Management\nVersion: 1.0.0');
  };

  const handleImport = () => {
    alert('导入功能 - 待实现');
  };

  const handleExport = () => {
    alert('导出功能 - 待实现');
  };

  const handleNewCollection = () => {
    const name = prompt('输入集合名称:');
    if (name) {
      const newCollection: Collection = {
        collectionID: Date.now(),
        key: `collection-${Date.now()}`,
        name,
        level: 0,
        hasChildren: false,
        itemCount: 0,
        type: 'collection'
      };
      setCollections(prev => [...prev, newCollection]);
    }
  };

  // 工具栏删除操作
  const handleToolbarDelete = () => {
    if (selectedItems.size > 0) {
      if (confirm(`确定要删除选中的 ${selectedItems.size} 个条目吗？`)) {
        // 批量删除逻辑
        console.log('删除条目:', Array.from(selectedItems));
        setSelectedItems(new Set());
        loadItems();
      }
    } else if (selectedItem) {
      handleDeleteItem(selectedItem);
    }
  };

  // 键盘快捷键处理函数
  const handleShowShortcutsHelp = () => {
    setShowShortcutsHelp(true);
  };

  // 配置键盘快捷键
  const shortcuts = getDefaultShortcuts({
    onNew: handleNewItem,
    onNewCollection: handleNewCollection,
    onSync: handleSync,
    onSearch: () => alert('高级搜索 - 待实现'),
    onDelete: handleToolbarDelete,
    onClose: () => setSelectedItem(null),
    onUndo: () => alert('撤销 - 待实现'),
    onRedo: () => alert('重做 - 待实现'),
    onCopy: () => alert('复制 - 待实现'),
    onCut: () => alert('剪切 - 待实现'),
    onPaste: () => alert('粘贴 - 待实现'),
    onselectAll: () => alert('全选 - 待实现'),
    onZoomIn: () => alert('放大 - 待实现'),
    onZoomOut: () => alert('缩小 - 待实现'),
    onHelp: handleShowShortcutsHelp
  });

  // 启用键盘快捷键
  useKeyboardShortcuts(shortcuts, true);

  // 表格列定义
  const columns = [
    {
      key: 'title',
      label: '标题',
      dataKey: 'title',
      width: 300,
      flexGrow: 1,
      sortable: true
    },
    {
      key: 'creators',
      label: '作者',
      dataKey: 'creators',
      width: 200,
      sortable: true
    },
    {
      key: 'itemType',
      label: '类型',
      dataKey: 'itemType',
      width: 120,
      sortable: true
    },
    {
      key: 'date',
      label: '日期',
      dataKey: 'date',
      width: 120,
      sortable: true
    }
  ];

  // 格式化创作者显示
  const formatCreators = (creators: any[]) => {
    return creators.map(c => `${c.firstName} ${c.lastName}`).join('; ');
  };

  // 获取虚拟化表格数据
  const tableData = items.map(item => ({
    ...item,
    creators: formatCreators(item.creators)
  }));

  return (
    <div className="zotero-library">
      {/* 菜单栏 */}
      <MenuBar
        onNew={handleNewItem}
        onSync={handleSync}
        onSettings={handleSettings}
        onAbout={handleAbout}
        onImport={handleImport}
        onExport={handleExport}
      />

      {/* 工具栏 */}
      <Toolbar
        onSync={handleSync}
        onNew={handleNewItem}
        onNewCollection={handleNewCollection}
        onSearch={(term) => setSearchTerm(term)}
        onDelete={handleToolbarDelete}
        syncInProgress={syncStatus === 'syncing'}
        syncError={syncStatus === 'error'}
        lastSyncTime={lastSyncTime}
      />

      {/* 主内容区域 - 三栏布局 */}
      <div className="zotero-content">
        {/* 左侧集合面板 */}
        <div className="zotero-collections-panel">
          <div className="zotero-collections-toolbar">
            <span className="zotero-collections-title">集合</span>
            <Button onClick={handleNewItem} size="small" variant="ghost">
              + 新建
            </Button>
          </div>
          <div className="zotero-collections-tree">
            <CollectionTree
              collections={collections}
              selectedCollection={selectedCollection}
              onSelectionChange={handleCollectionSelect}
              onCollectionRename={handleCollectionRename}
              onCollectionDelete={handleCollectionDelete}
            />
          </div>
        </div>

        {/* 分割条 */}
        <div className="zotero-splitter" />

        {/* 右侧详情面板 */}
        <div className="zotero-detail-panel">
          <ContextPane
            item={selectedItem}
            onNoteAdd={handleNoteAdd}
            onTagAdd={handleTagAdd}
            onTagRemove={handleTagRemove}
          />
        </div>

        {/* 中间条目面板 */}
        <div className="zotero-items-panel">
          <div className="zotero-items-toolbar">
            <span className="zotero-items-title">条目</span>
            <div className="zotero-items-actions">
              <Button onClick={handleNewItem} size="small" variant="primary">
                + 新建条目
              </Button>
            </div>
          </div>
          <div
            className={`zotero-items-content ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {dragActive && (
              <div className="drag-drop-overlay">
                <div className="drag-drop-message">
                  <div className="drag-drop-icon">📄</div>
                  <p>释放以上传PDF文件</p>
                  <p className="drag-drop-hint">自动识别元数据并创建条目</p>
                </div>
              </div>
            )}

            {processingDrop && (
              <div className="processing-overlay">
                <div className="processing-message">
                  <div className="processing-spinner"></div>
                  <p>正在处理PDF文件...</p>
                </div>
              </div>
            )}

            <VirtualizedTable
              data={tableData}
              columns={columns}
              onRowClick={handleItemClick}
              onRowDoubleClick={handleEditItem}
              onRowDragStart={handleItemDragStart}
              height={600}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* 条目编辑器模态框 */}
      <Modal isOpen={editorOpen} onClose={() => setEditorOpen(false)} size="large">
        <ItemEditor
          itemKey={editingItem?.key}
          itemType={editingItem?.itemType || 'book'}
          onClose={() => setEditorOpen(false)}
          onSave={async (itemData, files) => {
            try {
              let itemID: number;

              if (editingItem?.itemID) {
                // 更新现有条目
                itemID = editingItem.itemID;
                await itemAdapter.updateItem(itemID, itemData);
              } else {
                // 创建新条目
                const newItem = await itemAdapter.createItem(itemData.itemType || 'book', itemData);
                itemID = newItem.itemID;
              }

              // 处理文件附件上传
              if (files && files.length > 0) {
                // 检查是否配置了WebDAV
                const webdavConfig = localStorage.getItem('zotero_webdav_config');
                if (webdavConfig) {
                  const config = JSON.parse(webdavConfig);
                  await fileUploadService.initialize(config);

                  console.log('[ZoteroLibrary] 开始上传', files.length, '个文件到WebDAV');

                  // 上传所有文件
                  const results = await fileUploadService.uploadFiles(itemID, files, (progress) => {
                    console.log(`[ZoteroLibrary] 上传进度: ${progress.filename} - ${progress.progress}%`);
                  });

                  console.log('[ZoteroLibrary] 上传结果:', results);
                } else {
                  console.warn('[ZoteroLibrary] 未配置WebDAV，文件已保存到数据库但未同步到服务器');
                  // 仍然保存附件信息到数据库（不上传到WebDAV）
                  for (const file of files) {
                    await itemAdapter.addAttachment(itemID, {
                      title: file.name,
                      filename: file.name,
                      contentType: file.type,
                      size: file.size,
                      localPath: undefined,
                      remotePath: undefined
                    });
                  }
                }
              }

              await loadItems();
            } catch (err) {
              console.error('Failed to save item:', err);
              throw err;
            }
          }}
        />
      </Modal>

      {/* 错误提示 */}
      {error && (
        <div className="zotero-error">
          ❌ {error}
          <Button onClick={loadItems} size="small">重试</Button>
        </div>
      )}

      {/* 状态栏 */}
      <StatusBar
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        itemCount={stats.items}
        collectionCount={collections.length}
        tagCount={stats.tags}
        selectedItems={selectedItems.size}
      />

      {/* 键盘快捷键帮助面板 */}
      {showShortcutsHelp && (
        <KeyboardShortcutsHelp
          shortcuts={shortcuts}
          onClose={() => setShowShortcutsHelp(false)}
        />
      )}

      {/* 设置面板 - 包含同步和WebDAV设置 */}
      {showSyncSettings && (
        <Modal isOpen={showSyncSettings} onClose={() => setShowSyncSettings(false)} size="large">
          <div style={{ width: '100%', height: '100%' }}>
            {/* 设置标签页 */}
            <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
              <button
                onClick={() => setActiveSettingsTab('sync')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderBottom: activeSettingsTab === 'sync' ? '3px solid #2c3e50' : '3px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: activeSettingsTab === 'sync' ? 'bold' : 'normal',
                  color: activeSettingsTab === 'sync' ? '#2c3e50' : '#7f8c8d'
                }}
              >
                🔄 同步设置
              </button>
              <button
                onClick={() => setActiveSettingsTab('webdav')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderBottom: activeSettingsTab === 'webdav' ? '3px solid #2c3e50' : '3px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: activeSettingsTab === 'webdav' ? 'bold' : 'normal',
                  color: activeSettingsTab === 'webdav' ? '#2c3e50' : '#7f8c8d'
                }}
              >
                ☁️ WebDAV设置
              </button>
            </div>

            {/* 设置内容 */}
            {activeSettingsTab === 'sync' ? (
              <SyncSettings
                onConfigChange={handleSyncConfigChange}
                onSync={handleSync}
              />
            ) : (
              <WebDAVSettings
                onConfigChange={(config) => {
                  console.log('WebDAV配置已更新:', config);
                }}
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ZoteroLibrary;
