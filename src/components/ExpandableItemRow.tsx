import React from 'react';
import { Item } from '../core/data/Item';
import { ItemTags } from './ItemTags';
import './ExpandableItemRow.css';

interface ExpandableItemRowProps {
  item: Item;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggle: (itemKey: string) => void;
  onEdit: (itemKey: string) => void;
  onAddNote?: (parentKey: string) => void;
  onOpenPDF?: (itemKey: string) => void;
  onDelete?: (itemKey: string) => void;
  onTagClick?: (tag: string) => void;
}

export const ExpandableItemRow: React.FC<ExpandableItemRowProps> = ({
  item,
  level,
  hasChildren,
  isExpanded,
  onToggle,
  onEdit,
  onAddNote,
  onOpenPDF,
  onDelete,
  onTagClick
}) => {
  const handleClick = (e: React.MouseEvent) => {
    // 如果点击的是按钮，不触发展开/折叠
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    // 如果有子笔记，切换展开状态
    if (hasChildren) {
      onToggle(item.key);
    } else {
      // 如果没有子笔记，直接编辑
      onEdit(item.key);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(item.key);
  };

  const getIconForItemType = (itemType: string): string => {
    if (itemType === 'note') return '📝';
    if (itemType === 'book') return '📕';
    if (itemType === 'journalArticle') return '📄';
    return '📄';
  };

  return (
    <>
      <div
        className={`item-row ${item.itemType === 'note' ? 'item-row-note' : ''} ${level > 0 ? 'item-row-child' : ''}`}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={handleClick}
        title={hasChildren ? (isExpanded ? '点击折叠' : '点击展开') : '点击编辑'}
      >
        {/* 展开/折叠箭头 */}
        <div className="item-row-expand">
          {hasChildren ? (
            <button
              className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
              onClick={handleToggle}
              title={isExpanded ? '折叠' : '展开'}
            >
              ▶
            </button>
          ) : (
            <span className="expand-spacer" />
          )}
        </div>

        {/* 类型图标 */}
        <div className="item-row-type">
          {getIconForItemType(item.itemType)}
        </div>

        {/* 条目内容 */}
        <div className="item-row-content">
          <div className="item-row-title">
            {item.itemType === 'note' ?
              (item.note?.replace(/<[^>]+>/g, '').substring(0, 100) || 'Empty Note') :
              (item.title || 'Untitled')
            }
          </div>

          <div className="item-row-meta">
            {item.creators && item.creators.length > 0 && item.itemType !== 'note' && (
              <span className="item-row-authors">
                {item.creators.slice(0, 3).map((c: any) =>
                  `${c.firstName || ''} ${c.lastName || ''}`.trim()
                ).join(', ')}
                {item.creators.length > 3 && ' et al.'}
              </span>
            )}

            {item.publicationTitle && item.itemType !== 'note' && (
              <span className="item-row-publication">{item.publicationTitle}</span>
            )}

            {item.date && item.itemType !== 'note' && (
              <span className="item-row-date">{item.date}</span>
            )}
          </div>

          {/* 标签显示 */}
          {item.tags && item.tags.length > 0 && (
            <ItemTags
              tags={item.tags}
              maxDisplay={3}
              onTagClick={onTagClick}
            />
          )}
        </div>

        {/* 操作按钮 */}
        <div className="item-row-actions">
          {item.itemType !== 'note' && onAddNote && hasChildren && isExpanded && (
            <button
              className="item-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onAddNote(item.key);
              }}
              title="添加笔记"
            >
              📝+
            </button>
          )}

          {item.itemType !== 'note' && onOpenPDF && (
            <button
              className="item-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenPDF(item.key);
              }}
              title="打开PDF"
            >
              📖
            </button>
          )}

          <button
            className="item-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item.key);
            }}
            title="编辑"
          >
            ✏️
          </button>

          {onDelete && (
            <button
              className="item-action-btn delete"
              onClick={(e) => {
                e.stopPropagation();
                const title = item.itemType === 'note'
                  ? (item.note?.replace(/<[^>]+>/g, '').substring(0, 50) || '笔记')
                  : (item.title || '条目');
                if (confirm(`确定要删除"${title}"吗？`)) {
                  onDelete(item.key);
                }
              }}
              title="删除"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* 展开时显示"添加笔记"区域 */}
      {hasChildren && isExpanded && onAddNote && item.itemType !== 'note' && (
        <div
          className="add-note-section"
          style={{ paddingLeft: `${(level + 1) * 20 + 32}px` }}
        >
          <button
            className="add-note-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddNote(item.key);
            }}
          >
            + 添加笔记
          </button>
        </div>
      )}
    </>
  );
};
