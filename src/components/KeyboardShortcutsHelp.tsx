/**
 * Keyboard Shortcuts Help Component
 * 显示所有可用的键盘快捷键
 */

import React from 'react';
import PropTypes from 'prop-types';
import './KeyboardShortcutsHelp.css';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  shortcuts: Shortcut[];
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  shortcuts,
  onClose
}) => {
  const formatKey = (shortcut: Shortcut) => {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    parts.push(shortcut.key);
    return parts.join(' + ');
  };

  const categorizedShortcuts = {
    '文件操作': shortcuts.filter(s =>
      ['新建条目', '新建集合', '同步', '关闭'].includes(s.description)
    ),
    '编辑操作': shortcuts.filter(s =>
      ['撤销', '重做', '复制', '剪切', '粘贴', '全选', '删除'].includes(s.description)
    ),
    '视图操作': shortcuts.filter(s =>
      ['放大', '缩小', '高级搜索'].includes(s.description)
    ),
    '帮助': shortcuts.filter(s =>
      ['帮助'].includes(s.description)
    )
  };

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>⌨️ 键盘快捷键</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="shortcuts-content">
          {Object.entries(categorizedShortcuts).map(([category, categoryShortcuts]) =>
            categoryShortcuts.length > 0 ? (
              <div key={category} className="shortcut-category">
                <h3 className="category-title">{category}</h3>
                <div className="shortcuts-list">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div key={index} className="shortcut-item">
                      <div className="shortcut-keys">
                        <kbd>{formatKey(shortcut)}</kbd>
                      </div>
                      <div className="shortcut-description">{shortcut.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
        <div className="shortcuts-footer">
          <p>💡 提示: 按 <kbd>?</kbd> 或 <kbd>F1</kbd> 可随时打开此面板</p>
        </div>
      </div>
    </div>
  );
};

KeyboardShortcutsHelp.propTypes = {
  shortcuts: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      ctrlKey: PropTypes.bool,
      shiftKey: PropTypes.bool,
      altKey: PropTypes.bool,
      description: PropTypes.string.isRequired
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired
};

export default KeyboardShortcutsHelp;
