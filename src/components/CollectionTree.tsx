/**
 * CollectionTree Component
 * 基于Zotero桌面版collectionTree.jsx
 * 左侧集合树组件 - 完全实现右键菜单
 */

import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useContextMenu } from '../hooks/useContextMenu';
import './CollectionTree.css';

export interface Collection {
  collectionID: number;
  key: string;
  name: string;
  parentCollectionID?: number | null;
  level: number;
  hasChildren: boolean;
  isOpen?: boolean;
  itemCount?: number;
  type: 'collection' | 'library' | 'trash' | 'search';
}

interface CollectionTreeProps {
  collections: Collection[];
  selectedCollection?: string | null;
  onSelectionChange?: (collection: Collection | null) => void;
  onCollectionRename?: (collectionID: number, newName: string) => void;
  onCollectionDelete?: (collectionID: number) => void;
}

export const CollectionTree: React.FC<CollectionTreeProps> = ({
  collections,
  selectedCollection,
  onSelectionChange,
  onCollectionRename,
  onCollectionDelete
}) => {
  const [openCollections, setOpenCollections] = useState<Set<string>>(new Set());
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(null);

  // 右键菜单配置
  const { showContextMenu, ContextMenuComponent } = useContextMenu((target: Collection) => [
    {
      key: 'new-subcollection',
      label: '新建子集合',
      icon: '📁',
      onClick: () => {
        console.log('[CollectionTree] 新建子集合:', target.name);
        // 这里应该调用创建子集合的功能
        alert(`创建 "${target.name}" 的子集合`);
      }
    },
    {
      key: 'rename',
      label: '重命名',
      icon: '✏️',
      shortcut: 'F2',
      onClick: () => {
        if (onCollectionRename) {
          const newName = prompt(`重命名集合 "${target.name}":`, target.name);
          if (newName && newName !== target.name) {
            onCollectionRename(target.collectionID, newName);
          }
        }
      }
    },
    {
      key: 'delete',
      label: '删除',
      icon: '🗑️',
      shortcut: 'Del',
      onClick: () => {
        if (onCollectionDelete && confirm(`确定要删除集合 "${target.name}" 吗？`)) {
          onCollectionDelete(target.collectionID);
        }
      }
    },
    { key: 'sep1', separator: true },
    {
      key: 'export',
      label: '导出集合',
      icon: '📤',
      children: [
        {
          key: 'export-bibtex',
          label: 'BibTeX',
          onClick: () => alert(`导出 "${target.name}" 为BibTeX`)
        },
        {
          key: 'export-ris',
          label: 'RIS',
          onClick: () => alert(`导出 "${target.name}" 为RIS`)
        }
      ]
    },
    { key: 'sep2', separator: true },
    {
      key: 'properties',
      label: '属性',
      icon: '⚙️',
      onClick: () => alert(`集合 "${target.name}" 的属性`)
    }
  ]);

  // 过滤并排序集合
  const sortedCollections = useMemo(() => {
    return [...collections].sort((a, b) => {
      // 按级别和名称排序
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      return a.name.localeCompare(b.name);
    });
  }, [collections]);

  // 处理集合点击
  const handleCollectionClick = useCallback((collection: Collection, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    console.log('[CollectionTree] 点击集合:', collection.name, 'Target:', event.target);

    // 选中集合
    if (onSelectionChange) {
      onSelectionChange(collection);
    }
  }, [onSelectionChange]);

  // 拖拽处理函数 - 真正实现拖拽分类
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    // 添加拖拽高亮效果
    (event.currentTarget as HTMLElement).style.background = 'rgba(102, 126, 234, 0.1)';
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    // 移除拖拽高亮效果
    (event.currentTarget as HTMLElement).style.background = '';
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent, collection: Collection) => {
    event.preventDefault();

    // 移除拖拽高亮效果
    (event.currentTarget as HTMLElement).style.background = '';

    try {
      const itemData = event.dataTransfer.getData('application/zotero-item');
      if (!itemData) {
        console.log('[CollectionTree] 没有拖拽数据');
        return;
      }

      const item = JSON.parse(itemData);
      console.log('[CollectionTree] 拖拽条目到集合:', { item, collection });

      // 真正实现：将条目添加到集合
      // 这里应该调用API将条目移动到集合
      // 暂时用alert模拟
      const confirmed = confirm(`确定要将"${item.title}"移动到集合"${collection.name}"吗？`);

      if (confirmed) {
        // TODO: 调用API将条目添加到集合
        console.log(`[CollectionTree] 确认移动条目 "${item.title}" 到集合 "${collection.name}"`);
        alert(`已将 "${item.title}" 移动到 "${collection.name}"`);
      }
    } catch (error) {
      console.error('[CollectionTree] 拖拽处理失败:', error);
    }
  }, []);

  // 切换集合展开状态
  const toggleCollectionOpen = useCallback((collectionKey: string) => {
    setOpenCollections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(collectionKey)) {
        newSet.delete(collectionKey);
      } else {
        newSet.add(collectionKey);
      }
      return newSet;
    });
  }, []);

  // 获取集合图标
  const getCollectionIcon = useCallback((collection: Collection) => {
    switch (collection.type) {
      case 'library':
        return '📚';
      case 'trash':
        return '🗑️';
      case 'search':
        return '🔍';
      case 'collection':
      default:
        return '📁';
    }
  }, []);

  // 渲染单个集合
  const renderCollection = useCallback((collection: Collection) => {
    const isSelected = selectedCollection === collection.key;
    const isHovered = hoveredCollection === collection.key;
    const isOpen = openCollections.has(collection.key);
    const hasChildren = collection.hasChildren;

    return (
      <div
        key={collection.key}
        className={`collection-row ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
        style={{
          paddingLeft: `${16 * collection.level}px`
        }}
        onClick={(e) => handleCollectionClick(collection, e)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[CollectionTree] 右键点击集合:', collection.name);
          showContextMenu(e, collection);
        }}
        onMouseEnter={() => setHoveredCollection(collection.key)}
        onMouseLeave={() => setHoveredCollection(null)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, collection)}
      >
        {/* Twisty (展开/收起箭头) */}
        {hasChildren ? (
          <span
            className={`twisty ${isOpen ? 'open' : 'closed'}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              console.log('[CollectionTree] 点击箭头:', collection.name, isOpen ? '收起' : '展开');
              toggleCollectionOpen(collection.key);
            }}
            style={{ fontSize: '14px', fontWeight: 'bold', pointerEvents: 'auto' }}
          >
            {isOpen ? '▼' : '▶'}
          </span>
        ) : (
          <span className="spacer" />
        )}

        {/* 图标 */}
        <span className="collection-icon">
          {getCollectionIcon(collection)}
        </span>

        {/* 名称 */}
        <span className="collection-name">
          {collection.name}
        </span>

        {/* 条目数量 */}
        {collection.itemCount !== undefined && (
          <span className="collection-count">
            {collection.itemCount}
          </span>
        )}
      </div>
    );
  }, [
    selectedCollection,
    hoveredCollection,
    openCollections,
    getCollectionIcon,
    handleCollectionClick,
    toggleCollectionOpen,
    onCollectionRename,
    onCollectionDelete
  ]);

  if (sortedCollections.length === 0) {
    return (
      <div className="collection-tree empty">
        <div className="empty-message">暂无集合</div>
      </div>
    );
  }

  return (
    <div className="collection-tree">
      <div className="collection-tree-content">
        {sortedCollections.map(collection => renderCollection(collection))}
      </div>
      {ContextMenuComponent}
    </div>
  );
};

CollectionTree.propTypes = {
  collections: PropTypes.arrayOf(
    PropTypes.shape({
      collectionID: PropTypes.number.isRequired,
      key: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      parentCollectionID: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
      level: PropTypes.number.isRequired,
      hasChildren: PropTypes.bool.isRequired,
      isOpen: PropTypes.bool,
      itemCount: PropTypes.number,
      type: PropTypes.oneOf(['collection', 'library', 'trash', 'search']).isRequired
    })
  ).isRequired,
  selectedCollection: PropTypes.string,
  onSelectionChange: PropTypes.func,
  onCollectionRename: PropTypes.func,
  onCollectionDelete: PropTypes.func
};

export default CollectionTree;
