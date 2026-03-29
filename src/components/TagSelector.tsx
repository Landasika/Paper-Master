/**
 * Tag Selector Component
 * 基于Zotero桌面版标签选择器
 * 支持标签选择、过滤、颜色编码等
 */

import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import './TagSelector.css';

export interface Tag {
  name: string;
  count: number;
  color?: string;
  selected?: boolean;
}

interface TagSelectorProps {
  tags: Tag[];
  selectedTags: string[];
  onTagToggle?: (tagName: string) => void;
  onTagAdd?: (tagName: string) => void;
  onTagRemove?: (tagName: string) => void;
  onTagColorChange?: (tagName: string, color: string) => void;
  collapsible?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  tags,
  selectedTags,
  onTagToggle,
  onTagAdd,
  onTagRemove,
  onTagColorChange,
  collapsible = true
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [draggedTag, setDraggedTag] = useState<string | null>(null);

  // 过滤标签
  const filteredTags = useMemo(() => {
    let filtered = tags;

    // 文本过滤
    if (filterText) {
      filtered = filtered.filter(tag =>
        tag.name.toLowerCase().includes(filterText.toLowerCase())
      );
    }

    // 显示数量限制
    if (!showAll && filtered.length > 10) {
      filtered = filtered.slice(0, 10);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [tags, filterText, showAll]);

  // 标签统计
  const tagStats = useMemo(() => {
    return {
      total: tags.length,
      selected: selectedTags.length,
      displayed: filteredTags.length
    };
  }, [tags, selectedTags, filteredTags]);

  // 处理标签点击
  const handleTagClick = useCallback((tagName: string) => {
    if (onTagToggle) {
      onTagToggle(tagName);
    }
  }, [onTagToggle]);

  // 处理标签双击（编辑颜色）
  const handleTagDoubleClick = useCallback((tagName: string) => {
    if (onTagColorChange) {
      const color = prompt('输入标签颜色 (hex格式):', '#667eea');
      if (color) {
        onTagColorChange(tagName, color);
      }
    }
  }, [onTagColorChange]);

  // 处理拖拽开始
  const handleDragStart = useCallback((event: React.DragEvent, tagName: string) => {
    setDraggedTag(tagName);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tagName);
  }, []);

  // 处理拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggedTag(null);
  }, []);

  // 处理新标签添加
  const handleAddTag = useCallback(() => {
    const newTag = prompt('输入新标签名称:');
    if (newTag && newTag.trim() && onTagAdd) {
      onTagAdd(newTag.trim());
    }
  }, [onTagAdd]);

  // 获取标签颜色
  const getTagColor = useCallback((tag: Tag) => {
    if (tag.color) return tag.color;

    // 基于标签名生成一致的颜色
    const hash = tag.name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
  }, []);

  return (
    <div className="tag-selector">
      {/* 头部 */}
      <div className="tag-selector-header">
        <div className="header-left">
          <h3 className="tag-title">
            🏷️ 标签
            <span className="tag-count">({tagStats.total})</span>
          </h3>
          {selectedTags.length > 0 && (
            <span className="selected-count">
              {selectedTags.length} 个已选
            </span>
          )}
        </div>
        <div className="header-right">
          {collapsible && (
            <button
              className="collapse-btn"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? '展开' : '收起'}
            >
              {collapsed ? '▶' : '▼'}
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* 过滤器 */}
          <div className="tag-filter">
            <input
              type="text"
              className="filter-input"
              placeholder="过滤标签..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <button
              className="add-tag-btn"
              onClick={handleAddTag}
              title="添加新标签"
            >
              +
            </button>
          </div>

          {/* 标签列表 */}
          <div className="tag-list">
            {filteredTags.length === 0 ? (
              <div className="no-tags">
                {filterText ? '没有匹配的标签' : '暂无标签'}
              </div>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.name);
                const isDragging = draggedTag === tag.name;
                const color = getTagColor(tag);

                return (
                  <div
                    key={tag.name}
                    className={`tag-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, tag.name)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleTagClick(tag.name)}
                    onDoubleClick={() => handleTagDoubleClick(tag.name)}
                    title={tag.name}
                  >
                    <span
                      className="tag-color"
                      style={{ backgroundColor: color }}
                    />
                    <span className="tag-name">{tag.name}</span>
                    <span className="tag-count">{tag.count}</span>
                    {isSelected && onTagRemove && (
                      <button
                        className="tag-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTagRemove(tag.name);
                        }}
                        title="移除标签"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })
            )}

            {tagStats.displayed < tagStats.total && (
              <div className="show-more">
                <button
                  className="show-more-btn"
                  onClick={() => setShowAll(true)}
                >
                  显示全部 {tagStats.total} 个标签
                </button>
              </div>
            )}
          </div>

          {/* 已选标签 */}
          {selectedTags.length > 0 && (
            <div className="selected-tags">
              <div className="selected-header">
                <span className="selected-title">已选择的标签:</span>
                <button
                  className="clear-all-btn"
                  onClick={() => {
                    selectedTags.forEach(tag => {
                      if (onTagRemove) onTagRemove(tag);
                    });
                  }}
                >
                  清除全部
                </button>
              </div>
              <div className="selected-tags-list">
                {selectedTags.map((tagName) => {
                  const tag = tags.find(t => t.name === tagName);
                  if (!tag) return null;

                  return (
                    <div
                      key={tagName}
                      className="selected-tag"
                      style={{
                        backgroundColor: getTagColor(tag),
                        color: 'white'
                      }}
                    >
                      {tagName}
                      <button
                        className="selected-tag-remove"
                        onClick={() => onTagRemove && onTagRemove(tagName)}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

TagSelector.propTypes = {
  tags: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
      color: PropTypes.string,
      selected: PropTypes.bool
    })
  ).isRequired,
  selectedTags: PropTypes.arrayOf(PropTypes.string).isRequired,
  onTagToggle: PropTypes.func,
  onTagAdd: PropTypes.func,
  onTagRemove: PropTypes.func,
  onTagColorChange: PropTypes.func,
  collapsible: PropTypes.bool
};

export default TagSelector;
