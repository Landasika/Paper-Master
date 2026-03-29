/**
 * Keyboard Shortcuts Hook
 * 基于Zotero桌面版快捷键系统
 */

import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (
  shortcuts: ShortcutConfig[],
  enabled: boolean = true
) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // 忽略在输入框中的按键
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.altKey ? event.altKey : !event.altKey;
      const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};

// Zotero桌面版默认快捷键配置
export const getDefaultShortcuts = (
  handlers: {
    onNew?: () => void;
    onNewCollection?: () => void;
    onSync?: () => void;
    onSearch?: () => void;
    onDelete?: () => void;
    onClose?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onCopy?: () => void;
    onCut?: () => void;
    onPaste?: () => void;
    onselectAll?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onHelp?: () => void;
  }
): ShortcutConfig[] => [
  {
    key: 'n',
    ctrlKey: true,
    action: () => handlers.onNew?.(),
    description: '新建条目'
  },
  {
    key: 'n',
    ctrlKey: true,
    shiftKey: true,
    action: () => handlers.onNewCollection?.(),
    description: '新建集合'
  },
  {
    key: 'F5',
    action: () => handlers.onSync?.(),
    description: '同步'
  },
  {
    key: 'f',
    ctrlKey: true,
    shiftKey: true,
    action: () => handlers.onSearch?.(),
    description: '高级搜索'
  },
  {
    key: 'Delete',
    action: () => handlers.onDelete?.(),
    description: '删除'
  },
  {
    key: 'w',
    ctrlKey: true,
    action: () => handlers.onClose?.(),
    description: '关闭'
  },
  {
    key: 'z',
    ctrlKey: true,
    action: () => handlers.onUndo?.(),
    description: '撤销'
  },
  {
    key: 'z',
    ctrlKey: true,
    shiftKey: true,
    action: () => handlers.onRedo?.(),
    description: '重做'
  },
  {
    key: 'c',
    ctrlKey: true,
    action: () => handlers.onCopy?.(),
    description: '复制'
  },
  {
    key: 'x',
    ctrlKey: true,
    action: () => handlers.onCut?.(),
    description: '剪切'
  },
  {
    key: 'v',
    ctrlKey: true,
    action: () => handlers.onPaste?.(),
    description: '粘贴'
  },
  {
    key: 'a',
    ctrlKey: true,
    action: () => handlers.onselectAll?.(),
    description: '全选'
  },
  {
    key: '=',
    ctrlKey: true,
    action: () => handlers.onZoomIn?.(),
    description: '放大'
  },
  {
    key: '-',
    ctrlKey: true,
    action: () => handlers.onZoomOut?.(),
    description: '缩小'
  },
  {
    key: 'F1',
    action: () => handlers.onHelp?.(),
    description: '帮助'
  }
];

export default useKeyboardShortcuts;
