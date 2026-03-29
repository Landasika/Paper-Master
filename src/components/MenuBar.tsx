/**
 * MenuBar Component
 * 基于Zotero桌面版菜单栏设计
 * 包含 File, Edit, View, Tools, Help 菜单
 */

import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './MenuBar.css';

export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  action?: () => void;
  submenu?: MenuItem[];
}

export interface Menu {
  key: string;
  label: string;
  items: MenuItem[];
}

interface MenuBarProps {
  onNew?: () => void;
  onSync?: () => void;
  onSettings?: () => void;
  onAbout?: () => void;
  onImport?: () => void;
  onExport?: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onNew,
  onSync,
  onSettings,
  onAbout,
  onImport,
  onExport
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // 菜单定义
  const menus: Menu[] = [
    {
      key: 'file',
      label: '文件',
      items: [
        {
          key: 'new-item',
          label: '新建条目',
          icon: '📄',
          shortcut: 'Ctrl+N',
          action: onNew
        },
        {
          key: 'new-collection',
          label: '新建集合',
          icon: '📁',
          shortcut: 'Ctrl+Shift+N'
        },
        { key: 'sep1', label: '-', separator: true },
        {
          key: 'import',
          label: '导入',
          icon: '📥',
          action: onImport
        },
        {
          key: 'export',
          label: '导出',
          icon: '📤',
          action: onExport
        },
        { key: 'sep2', label: '-', separator: true },
        {
          key: 'sync',
          label: '同步',
          icon: '🔄',
          shortcut: 'F5',
          action: onSync
        },
        { key: 'sep3', label: '-', separator: true },
        {
          key: 'close',
          label: '关闭',
          shortcut: 'Ctrl+W'
        }
      ]
    },
    {
      key: 'edit',
      label: '编辑',
      items: [
        {
          key: 'undo',
          label: '撤销',
          shortcut: 'Ctrl+Z'
        },
        {
          key: 'redo',
          label: '重做',
          shortcut: 'Ctrl+Shift+Z'
        },
        { key: 'sep1', label: '-', separator: true },
        {
          key: 'cut',
          label: '剪切',
          shortcut: 'Ctrl+X'
        },
        {
          key: 'copy',
          label: '复制',
          shortcut: 'Ctrl+C'
        },
        {
          key: 'paste',
          label: '粘贴',
          shortcut: 'Ctrl+V'
        },
        { key: 'sep2', label: '-', separator: true },
        {
          key: 'select-all',
          label: '全选',
          shortcut: 'Ctrl+A'
        },
        { key: 'sep3', label: '-', separator: true },
        {
          key: 'delete',
          label: '删除',
          icon: '🗑️',
          shortcut: 'Del'
        }
      ]
    },
    {
      key: 'view',
      label: '视图',
      items: [
        {
          key: 'zoom-in',
          label: '放大',
          shortcut: 'Ctrl++'
        },
        {
          key: 'zoom-out',
          label: '缩小',
          shortcut: 'Ctrl+-'
        },
        { key: 'sep1', label: '-', separator: true },
        {
          key: 'collections-pane',
          label: '集合面板',
          icon: '📁'
        },
        {
          key: 'item-pane',
          label: '条目面板',
          icon: '📄'
        },
        {
          key: 'tag-selector',
          label: '标签选择器',
          icon: '🏷️'
        }
      ]
    },
    {
      key: 'tools',
      label: '工具',
      items: [
        {
          key: 'advanced-search',
          label: '高级搜索',
          icon: '🔍',
          shortcut: 'Ctrl+Shift+F'
        },
        { key: 'sep1', label: '-', separator: true },
        {
          key: 'plugins',
          label: '插件管理'
        },
        {
          key: 'developer',
          label: '开发者工具'
        },
        { key: 'sep2', label: '-', separator: true },
        {
          key: 'settings',
          label: '设置',
          icon: '⚙️',
          action: onSettings
        }
      ]
    },
    {
      key: 'help',
      label: '帮助',
      items: [
        {
          key: 'documentation',
          label: '文档',
          icon: '📚'
        },
        {
          key: 'forums',
          label: '论坛'
        },
        { key: 'sep1', label: '-', separator: true },
        {
          key: 'report-error',
          label: '报告错误'
        },
        {
          key: 'check-updates',
          label: '检查更新'
        },
        { key: 'sep2', label: '-', separator: true },
        {
          key: 'about',
          label: '关于',
          action: onAbout
        }
      ]
    }
  ];

  // 处理菜单点击
  const handleMenuClick = (menuKey: string) => {
    setActiveMenu(activeMenu === menuKey ? null : menuKey);
  };

  // 处理菜单项点击
  const handleMenuItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
    }
    setActiveMenu(null);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 渲染菜单项
  const renderMenuItem = (item: MenuItem) => {
    if (item.separator) {
      return <div key={item.key} className="menu-separator" />;
    }

    return (
      <div
        key={item.key}
        className={`menu-item ${item.disabled ? 'disabled' : ''}`}
        onClick={() => !item.disabled && handleMenuItemClick(item)}
      >
        <div className="menu-item-content">
          {item.icon && <span className="menu-item-icon">{item.icon}</span>}
          <span className="menu-item-label">{item.label}</span>
        </div>
        {item.shortcut && <span className="menu-item-shortcut">{item.shortcut}</span>}
      </div>
    );
  };

  return (
    <div className="menu-bar" ref={menuBarRef}>
      {menus.map((menu) => (
        <div
          key={menu.key}
          className={`menu-item-wrapper ${activeMenu === menu.key ? 'active' : ''}`}
        >
          <div
            className="menu-title"
            onClick={() => handleMenuClick(menu.key)}
          >
            {menu.label}
          </div>
          {activeMenu === menu.key && (
            <div className="menu-dropdown">
              {menu.items.map(renderMenuItem)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

MenuBar.propTypes = {
  onNew: PropTypes.func,
  onSync: PropTypes.func,
  onSettings: PropTypes.func,
  onAbout: PropTypes.func,
  onImport: PropTypes.func,
  onExport: PropTypes.func
};

export default MenuBar;
