/**
 * Note Editor Component
 * 基于Zotero桌面版笔记编辑器
 * 支持富文本编辑、格式化、插入链接等
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

interface NoteEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  readOnly?: boolean;
  placeholder?: string;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  content = '',
  onChange,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const [editorContent, setEditorContent] = useState(content);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditorContent(content);
  }, [content]);

  // 执行编辑器命令
  const execCommand = useCallback((command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // 格式化工具栏按钮
  const formatButtons = [
    { command: 'bold', label: 'B', title: '粗体', style: { fontWeight: 'bold' } },
    { command: 'italic', label: 'I', title: '斜体', style: { fontStyle: 'italic' } },
    { command: 'underline', label: 'U', title: '下划线', style: { textDecoration: 'underline' } },
    { command: 'strikeThrough', label: 'S', title: '删除线', style: { textDecoration: 'line-through' } },
    { command: 'subscript', label: 'X₂', title: '下标' },
    { command: 'superscript', label: 'X²', title: '上标' }
  ];

  const blockButtons = [
    { command: 'formatBlock', value: 'p', label: '段落' },
    { command: 'formatBlock', value: 'h1', label: '标题1' },
    { command: 'formatBlock', value: 'h2', label: '标题2' },
    { command: 'formatBlock', value: 'h3', label: '标题3' },
    { command: 'insertUnorderedList', label: '• 列表' },
    { command: 'insertOrderedList', label: '1. 列表' }
  ];

  const insertButtons = [
    { command: 'createLink', label: '🔗 链接', prompt: '输入链接地址:' },
    { command: 'insertImage', label: '🖼️ 图片', prompt: '输入图片地址:' },
    { command: 'insertHorizontalRule', label: '➖ 分隔线' },
    { command: 'removeFormat', label: '🧹 清除格式' }
  ];

  // 处理插入命令
  const handleInsertCommand = useCallback((command: string, prompt?: string) => {
    if (prompt) {
      const value = window.prompt(prompt);
      if (value) {
        execCommand(command, value);
      }
    } else {
      execCommand(command);
    }
  }, [execCommand]);

  // 处理内容变化
  const handleInput = useCallback(() => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // 处理粘贴事件
  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // 字体大小控制
  const handleFontSize = useCallback((size: number) => {
    // 使用相对大小
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      range.surroundContents(span);
    }
  }, []);

  // 颜色选择
  const handleColorChange = useCallback((color: string) => {
    execCommand('foreColor', color);
  }, [execCommand]);

  return (
    <div className="note-editor-container">
      {/* 工具栏 */}
      {!readOnly && (
        <div className="note-toolbar">
          {/* 格式化按钮 */}
          <div className="toolbar-group">
            <span className="group-label">格式:</span>
            {formatButtons.map((btn) => (
              <button
                key={btn.command}
                className="toolbar-btn"
                onClick={() => execCommand(btn.command)}
                title={btn.title}
                style={btn.style}
                type="button"
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* 块级元素 */}
          <div className="toolbar-group">
            <span className="group-label">块:</span>
            {blockButtons.map((btn) => (
              <button
                key={btn.label}
                className="toolbar-btn"
                onClick={() => btn.value
                  ? execCommand(btn.command, btn.value)
                  : execCommand(btn.command)
                }
                title={btn.label}
                type="button"
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* 字体大小 */}
          <div className="toolbar-group">
            <span className="group-label">大小:</span>
            {[1, 2, 3, 4, 5, 6, 7].map((size) => (
              <button
                key={size}
                className="toolbar-btn font-size-btn"
                onClick={() => handleFontSize(size * 2)}
                style={{ fontSize: `${size * 2 + 8}px` }}
                title={`${size * 2}px`}
                type="button"
              >
                A
              </button>
            ))}
          </div>

          {/* 颜色选择 */}
          <div className="toolbar-group">
            <span className="group-label">颜色:</span>
            {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff6600'].map((color) => (
              <button
                key={color}
                className="color-btn"
                onClick={() => handleColorChange(color)}
                style={{ backgroundColor: color }}
                title={color}
                type="button"
              />
            ))}
          </div>

          {/* 插入功能 */}
          <div className="toolbar-group">
            <span className="group-label">插入:</span>
            {insertButtons.map((btn) => (
              <button
                key={btn.command}
                className="toolbar-btn"
                onClick={() => handleInsertCommand(btn.command, btn.prompt)}
                title={btn.label}
                type="button"
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* 撤销/重做 */}
          <div className="toolbar-group">
            <button
              className="toolbar-btn"
              onClick={() => execCommand('undo')}
              title="撤销"
              type="button"
            >
              ↶
            </button>
            <button
              className="toolbar-btn"
              onClick={() => execCommand('redo')}
              title="重做"
              type="button"
            >
              ↷
            </button>
          </div>
        </div>
      )}

      {/* 编辑器区域 */}
      <div
        ref={editorRef}
        className="note-editor"
        contentEditable={!readOnly}
        onInput={handleInput}
        onPaste={handlePaste}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: editorContent }}
      />

      {/* 字符统计 */}
      <div className="note-stats">
        <span>字符数: {editorContent.replace(/<[^>]*>/g, '').length}</span>
        <span>字数: {editorContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length}</span>
      </div>

      {/* 操作按钮 */}
      {(onSave || onCancel) && (
        <div className="note-actions">
          {onCancel && (
            <button onClick={onCancel} className="action-btn cancel-btn" type="button">
              取消
            </button>
          )}
          {onSave && (
            <button onClick={onSave} className="action-btn save-btn" type="button">
              保存
            </button>
          )}
        </div>
      )}
    </div>
  );
};

NoteEditor.propTypes = {
  content: PropTypes.string,
  onChange: PropTypes.func,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
  readOnly: PropTypes.bool,
  placeholder: PropTypes.string
};

export default NoteEditor;
