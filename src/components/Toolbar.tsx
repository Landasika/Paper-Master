/**
 * Toolbar Component
 * 基于Zotero桌面版工具栏设计
 * 包含同步、新建、搜索、删除等核心功能按钮
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from './Button';
import './Toolbar.css';

interface ToolbarProps {
  onSync?: () => void;
  onNew?: () => void;
  onNewCollection?: () => void;
  onSearch?: (term: string) => void;
  onDelete?: () => void;
  onSyncStatus?: () => void;
  syncInProgress?: boolean;
  syncError?: boolean;
  lastSyncTime?: Date;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onSync,
  onNew,
  onNewCollection,
  onSearch,
  onDelete,
  onSyncStatus,
  syncInProgress = false,
  syncError = false,
  lastSyncTime
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // 处理搜索输入
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  // 新建项下拉菜单
  const [showNewMenu, setShowNewMenu] = useState(false);

  const newItemTypes = [
    { key: 'book', label: '图书', icon: '📚' },
    { key: 'journal', label: '期刊文章', icon: '📄' },
    { key: 'webpage', label: '网页', icon: '🌐' },
    { key: 'note', label: '笔记', icon: '✏️' }
  ];

  return (
    <div className="zotero-toolbar-complete">
      {/* 左侧按钮组 */}
      <div className="toolbar-left">
        {/* 同步按钮 */}
        <Button
          variant="ghost"
          size="small"
          onClick={onSync}
          className={`sync-button ${syncInProgress ? 'syncing' : ''} ${syncError ? 'error' : ''}`}
          title={syncError ? '同步失败 - 点击重试' : '同步'}
        >
          {syncInProgress ? '🔄' : syncError ? '❌' : '☁️'}
        </Button>

        {/* 新建按钮组 */}
        <div className="new-item-group">
          <Button
            variant="primary"
            size="small"
            onClick={() => setShowNewMenu(!showNewMenu)}
          >
            + 新建
          </Button>
          {showNewMenu && (
            <div className="new-item-dropdown">
              {newItemTypes.map((type) => (
                <div
                  key={type.key}
                  className="new-item-option"
                  onClick={() => {
                    if (onNew) onNew();
                    setShowNewMenu(false);
                  }}
                >
                  <span className="new-item-icon">{type.icon}</span>
                  <span className="new-item-label">{type.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 新建集合按钮 */}
        <Button
          variant="ghost"
          size="small"
          onClick={onNewCollection}
          title="新建集合"
        >
          📁
        </Button>
      </div>

      {/* 中间搜索框 */}
      <div className="toolbar-center">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="搜索条目..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              className="search-clear"
              onClick={() => handleSearchChange('')}
            >
              ✕
            </button>
          )}
        </div>
        <Button
          variant="ghost"
          size="small"
          onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
          title="高级搜索"
        >
          🔬
        </Button>
      </div>

      {/* 右侧操作按钮 */}
      <div className="toolbar-right">
        {/* 删除按钮 */}
        <Button
          variant="ghost"
          size="small"
          onClick={onDelete}
          title="删除 (Del)"
        >
          🗑️
        </Button>

        {/* 同步状态 */}
        <div className="sync-status" onClick={onSyncStatus}>
          {syncInProgress && <span className="sync-indicator syncing">🔄</span>}
          {syncError && <span className="sync-indicator error">❌</span>}
          {!syncInProgress && !syncError && lastSyncTime && (
            <span className="sync-time">
              {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* 高级搜索面板 */}
      {showAdvancedSearch && (
        <div className="advanced-search-panel">
          <div className="advanced-search-content">
            <h3>高级搜索</h3>
            <div className="search-conditions">
              <div className="search-condition">
                <select className="condition-field">
                  <option>标题</option>
                  <option>作者</option>
                  <option>年份</option>
                  <option>标签</option>
                </select>
                <select className="condition-operator">
                  <option>包含</option>
                  <option>不包含</option>
                  <option>是</option>
                  <option>不是</option>
                </select>
                <input type="text" className="condition-value" placeholder="搜索值" />
                <button className="condition-remove">✕</button>
              </div>
            </div>
            <div className="search-actions">
              <Button variant="ghost" size="small">+ 添加条件</Button>
              <Button variant="primary" size="small">搜索</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Toolbar.propTypes = {
  onSync: PropTypes.func,
  onNew: PropTypes.func,
  onNewCollection: PropTypes.func,
  onSearch: PropTypes.func,
  onDelete: PropTypes.func,
  onSyncStatus: PropTypes.func,
  syncInProgress: PropTypes.bool,
  syncError: PropTypes.bool,
  lastSyncTime: PropTypes.instanceOf(Date)
};

export default Toolbar;
