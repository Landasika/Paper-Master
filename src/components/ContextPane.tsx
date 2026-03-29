/**
 * ContextPane Component
 * 基于Zotero桌面版contextPane.js和itemPane.js
 * 右侧详情面板，支持多标签页显示
 */

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { PDFViewer } from './PDFViewer';
import { NoteEditor } from './NoteEditor';
import './ContextPane.css';

export interface Item {
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
  url?: string;
  notes?: Array<{
    noteId: number;
    content: string;
    dateModified: string;
  }>;
  attachments?: Array<{
    attachmentId: number;
    title: string;
    url: string;
    mimeType: string;
  }>;
}

interface ContextPaneProps {
  item: Item | null;
  onNoteAdd?: (itemId: number, content: string) => void;
  onTagAdd?: (itemId: number, tag: string) => void;
  onTagRemove?: (itemId: number, tag: string) => void;
  className?: string;
}

type TabType = 'info' | 'abstract' | 'notes' | 'attachments' | 'tags' | 'pdf';

export const ContextPane: React.FC<ContextPaneProps> = ({
  item,
  onNoteAdd,
  onTagAdd,
  onTagRemove,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [collapsed, setCollapsed] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');

  // 标签页定义
  const tabs = useMemo(() => [
    { key: 'info' as TabType, label: '详情', icon: '📄' },
    { key: 'abstract' as TabType, label: '摘要', icon: '📝' },
    { key: 'notes' as TabType, label: '笔记', icon: '✏️' },
    { key: 'attachments' as TabType, label: '附件', icon: '📎' },
    { key: 'pdf' as TabType, label: 'PDF', icon: '📕' },
    { key: 'tags' as TabType, label: '标签', icon: '🏷️' }
  ], []);

  // 处理添加笔记
  const handleAddNote = useCallback(() => {
    if (!item || !newNote.trim()) return;
    if (onNoteAdd) {
      onNoteAdd(item.itemID, newNote);
      setNewNote('');
    }
  }, [item, newNote, onNoteAdd]);

  // 处理添加标签
  const handleAddTag = useCallback(() => {
    if (!item || !newTag.trim()) return;
    if (onTagAdd && !item.tags.includes(newTag)) {
      onTagAdd(item.itemID, newTag);
      setNewTag('');
    }
  }, [item, newTag, onTagAdd]);

  // 处理删除标签
  const handleRemoveTag = useCallback((tag: string) => {
    if (!item || !onTagRemove) return;
    onTagRemove(item.itemID, tag);
  }, [item, onTagRemove]);

  // 渲染创作者
  const renderCreators = useCallback(() => {
    if (!item || item.creators.length === 0) return null;
    return (
      <div className="context-section">
        <h4 className="context-section-title">作者</h4>
        <div className="context-creators">
          {item.creators.map((creator, index) => (
            <div key={index} className="context-creator">
              <span className="creator-type">{creator.creatorType}:</span>
              <span className="creator-name">
                {creator.firstName} {creator.lastName}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }, [item]);

  // 渲染出版物信息
  const renderPublicationInfo = useCallback(() => {
    if (!item) return null;
    const hasPublicationInfo = item.publicationTitle || item.volume || item.issue || item.pages;

    if (!hasPublicationInfo) return null;

    return (
      <div className="context-section">
        <h4 className="context-section-title">出版物信息</h4>
        <div className="context-publication">
          {item.publicationTitle && (
            <div className="publication-field">
              <span className="field-label">期刊:</span>
              <span className="field-value">{item.publicationTitle}</span>
            </div>
          )}
          {item.volume && (
            <div className="publication-field">
              <span className="field-label">卷:</span>
              <span className="field-value">{item.volume}</span>
            </div>
          )}
          {item.issue && (
            <div className="publication-field">
              <span className="field-label">期:</span>
              <span className="field-value">{item.issue}</span>
            </div>
          )}
          {item.pages && (
            <div className="publication-field">
              <span className="field-label">页码:</span>
              <span className="field-value">{item.pages}</span>
            </div>
          )}
        </div>
      </div>
    );
  }, [item]);

  // 渲染摘要标签页
  const renderAbstractTab = useCallback(() => {
    if (!item?.abstractNote) {
      return (
        <div className="context-empty">
          <p>暂无摘要</p>
        </div>
      );
    }

    return (
      <div className="context-abstract">
        <p className="abstract-text">{item.abstractNote}</p>
      </div>
    );
  }, [item]);

  // 渲染笔记标签页
  const renderNotesTab = useCallback(() => {
    if (!item) return null;

    return (
      <div className="context-notes">
        <div className="notes-list">
          {item.notes && item.notes.length > 0 ? (
            item.notes.map((note) => (
              <div key={note.noteId} className="note-item">
                <div className="note-header">
                  <span className="note-title">笔记 #{note.noteId}</span>
                  <span className="note-date">
                    {new Date(note.dateModified).toLocaleString()}
                  </span>
                </div>
                <div className="note-content" dangerouslySetInnerHTML={{ __html: note.content }} />
              </div>
            ))
          ) : (
            <div className="context-empty">
              <p>暂无笔记</p>
            </div>
          )}
        </div>

        {/* 富文本笔记编辑器 */}
        <div className="note-editor-wrapper">
          <NoteEditor
            content={newNote}
            onChange={setNewNote}
            onSave={handleAddNote}
            placeholder="在这里输入新笔记内容..."
          />
        </div>
      </div>
    );
  }, [item, newNote, handleAddNote]);

  // 渲染附件标签页
  const renderAttachmentsTab = useCallback(() => {
    if (!item) return null;

    return (
      <div className="context-attachments">
        {item.attachments && item.attachments.length > 0 ? (
          <div className="attachments-list">
            {item.attachments.map((attachment) => (
              <div key={attachment.attachmentId} className="attachment-item">
                <span className="attachment-icon">
                  {attachment.mimeType?.includes('pdf') ? '📕' : '📄'}
                </span>
                <span className="attachment-name">{attachment.title}</span>
                {attachment.url && (
                  <a
                    href={attachment.url}
                    className="attachment-link"
                    target="_blank"
                    rel="noopener"
                  >
                    打开
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="context-empty">
            <p>暂无附件</p>
          </div>
        )}
      </div>
    );
  }, [item]);

  // 渲染标签标签页
  const renderTagsTab = useCallback(() => {
    if (!item) return null;

    return (
      <div className="context-tags">
        <div className="tags-list">
          {item.tags.length > 0 ? (
            item.tags.map((tag, index) => (
              <div key={index} className="tag-item">
                <span className="tag-name">🏷️ {tag}</span>
                <button
                  className="tag-remove"
                  onClick={() => handleRemoveTag(tag)}
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <div className="context-empty">
              <p>暂无标签</p>
            </div>
          )}
        </div>

        <div className="tag-adder">
          <input
            type="text"
            className="tag-input"
            placeholder="添加新标签..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
          />
          <button
            className="add-tag-btn"
            onClick={handleAddTag}
            disabled={!newTag.trim()}
          >
            添加
          </button>
        </div>
      </div>
    );
  }, [item, newTag, handleAddTag, handleRemoveTag]);

  // 渲染当前标签页内容
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="context-info">
            {renderCreators()}
            {renderPublicationInfo()}
            <div className="context-section">
              <h4 className="context-section-title">元数据</h4>
              <div className="context-meta">
                <div className="meta-field">
                  <span className="field-label">类型:</span>
                  <span className="field-value">{item?.itemType}</span>
                </div>
                <div className="meta-field">
                  <span className="field-label">添加日期:</span>
                  <span className="field-value">
                    {item && new Date(item.dateAdded).toLocaleDateString()}
                  </span>
                </div>
                {item?.date && (
                  <div className="meta-field">
                    <span className="field-label">发布日期:</span>
                    <span className="field-value">{item.date}</span>
                  </div>
                )}
                {item?.DOI && (
                  <div className="meta-field">
                    <span className="field-label">DOI:</span>
                    <a
                      href={`https://doi.org/${item.DOI}`}
                      className="field-value doi-link"
                      target="_blank"
                      rel="noopener"
                    >
                      {item.DOI}
                    </a>
                  </div>
                )}
                {item?.ISBN && (
                  <div className="meta-field">
                    <span className="field-label">ISBN:</span>
                    <span className="field-value">{item.ISBN}</span>
                  </div>
                )}
                {item?.url && (
                  <div className="meta-field">
                    <span className="field-label">URL:</span>
                    <a
                      href={item.url}
                      className="field-value url-link"
                      target="_blank"
                      rel="noopener"
                    >
                      {item.url}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'abstract':
        return renderAbstractTab();

      case 'notes':
        return renderNotesTab();

      case 'attachments':
        return renderAttachmentsTab();

      case 'tags':
        return renderTagsTab();

      case 'pdf':
        return (
          <div className="context-pdf">
            <PDFViewer
              url={item?.attachments?.find(a => a.mimeType?.includes('pdf'))?.url}
              title={item?.title || 'PDF预览'}
            />
          </div>
        );

      default:
        return null;
    }
  }, [
    activeTab,
    item,
    renderCreators,
    renderPublicationInfo,
    renderAbstractTab,
    renderNotesTab,
    renderAttachmentsTab,
    renderTagsTab
  ]);

  if (!item) {
    return (
      <div className={`context-pane empty ${className}`}>
        <div className="context-empty-state">
          <div className="empty-icon">📄</div>
          <p>选择一个条目查看详情</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`context-pane ${collapsed ? 'collapsed' : ''} ${className}`}>
      {/* 头部 */}
      <div className="context-header">
        <h3 className="context-title">{item.title}</h3>
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展开' : '收起'}
        >
          {collapsed ? '◀' : '▶'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* 标签页导航 */}
          <div className="context-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`context-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* 标签页内容 */}
          <div className="context-content">
            {renderTabContent()}
          </div>
        </>
      )}
    </div>
  );
};

ContextPane.propTypes = {
  item: PropTypes.object,
  onItemUpdate: PropTypes.func,
  onNoteAdd: PropTypes.func,
  onTagAdd: PropTypes.func,
  onTagRemove: PropTypes.func,
  className: PropTypes.string
};

export default ContextPane;
