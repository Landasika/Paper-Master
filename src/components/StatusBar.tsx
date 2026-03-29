/**
 * StatusBar Component
 * 基于Zotero桌面版状态栏设计
 * 显示同步状态、统计信息、进度等
 */

import React from 'react';
import PropTypes from 'prop-types';
import './StatusBar.css';

interface StatusBarProps {
  syncStatus?: 'idle' | 'syncing' | 'error' | 'success';
  lastSyncTime?: Date;
  itemCount?: number;
  collectionCount?: number;
  tagCount?: number;
  selectedItems?: number;
  progress?: {
    current: number;
    total: number;
    message: string;
  };
}

export const StatusBar: React.FC<StatusBarProps> = ({
  syncStatus = 'idle',
  lastSyncTime,
  itemCount = 0,
  collectionCount = 0,
  tagCount = 0,
  selectedItems = 0,
  progress
}) => {
  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return '正在同步...';
      case 'error':
        return '同步失败';
      case 'success':
        return '同步完成';
      default:
        return lastSyncTime
          ? `最后同步: ${lastSyncTime.toLocaleTimeString()}`
          : '未同步';
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return '🔄';
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      default:
        return '☁️';
    }
  };

  return (
    <div className="status-bar">
      {/* 左侧状态信息 */}
      <div className="status-left">
        {/* 同步状态 */}
        <div className={`status-sync status-${syncStatus}`}>
          <span className="status-icon">{getStatusIcon()}</span>
          <span className="status-text">{getStatusText()}</span>
        </div>

        {/* 选中条目数 */}
        {selectedItems > 0 && (
          <div className="status-selected">
            已选择 {selectedItems} 个条目
          </div>
        )}
      </div>

      {/* 中间进度条 */}
      {progress && (
        <div className="status-center">
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`
                }}
              />
            </div>
            <span className="progress-text">
              {progress.message} ({progress.current}/{progress.total})
            </span>
          </div>
        </div>
      )}

      {/* 右侧统计信息 */}
      <div className="status-right">
        <div className="status-stats">
          <span className="stat-item">
            <span className="stat-icon">📚</span>
            <span className="stat-value">{itemCount}</span>
          </span>
          <span className="stat-item">
            <span className="stat-icon">📁</span>
            <span className="stat-value">{collectionCount}</span>
          </span>
          <span className="stat-item">
            <span className="stat-icon">🏷️</span>
            <span className="stat-value">{tagCount}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

StatusBar.propTypes = {
  syncStatus: PropTypes.oneOf(['idle', 'syncing', 'error', 'success']),
  lastSyncTime: PropTypes.instanceOf(Date),
  itemCount: PropTypes.number,
  collectionCount: PropTypes.number,
  tagCount: PropTypes.number,
  selectedItems: PropTypes.number,
  progress: PropTypes.shape({
    current: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    message: PropTypes.string.isRequired
  })
};

export default StatusBar;
