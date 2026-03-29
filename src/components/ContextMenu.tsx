/**
 * Context Menu Component
 * 右键菜单组件，完全匹配Zotero桌面版
 */

import React, { useEffect, useRef, useState } from 'react';

export interface MenuItem {
  key: string;
  label?: string;  // separator时不需要label
  icon?: string;
  disabled?: boolean;
  separator?: boolean;
  shortcut?: string;
  onClick?: () => void;
  children?: MenuItem[];
}

interface ContextMenuProps {
  items: MenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, x, y, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('contextmenu', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('contextmenu', handleScroll);
    };
  }, [onClose]);

  useEffect(() => {
    // 调整菜单位置，防止超出屏幕
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > windowWidth) {
        adjustedX = windowWidth - rect.width - 10;
      }

      if (y + rect.height > windowHeight) {
        adjustedY = windowHeight - rect.height - 10;
      }

      if (adjustedX !== x || adjustedY !== y) {
        menuRef.current.style.left = `${adjustedX}px`;
        menuRef.current.style.top = `${adjustedY}px`;
      }
    }
  }, [x, y]);

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;

    if (item.onClick) {
      item.onClick();
      onClose();
    } else if (item.children) {
      // 处理子菜单
      setSubmenuOpen(item.key);
    }
  };

  const handleItemMouseEnter = (item: MenuItem) => {
    if (item.children && submenuOpen && submenuOpen !== item.key) {
      setSubmenuOpen(item.key);
    }
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.separator) {
      return <div key={index} className="context-menu-separator" />;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isOpen = submenuOpen === item.key;

    return (
      <div
        key={index}
        className={`context-menu-item ${item.disabled ? 'disabled' : ''} ${hasChildren ? 'has-submenu' : ''}`}
        onClick={() => handleItemClick(item)}
        onMouseEnter={() => handleItemMouseEnter(item)}
        style={{ position: 'relative' }}
      >
        <div className="context-menu-item-content">
          {item.icon && <span className="context-menu-icon">{item.icon}</span>}
          <span className="context-menu-label">{item.label}</span>
          {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
          {hasChildren && <span className="context-menu-arrow">▶</span>}
        </div>

        {/* 子菜单 */}
        {hasChildren && isOpen && (
          <div
            className="context-menu-submenu"
            style={{
              position: 'absolute',
              left: '100%',
              top: '0',
              marginLeft: '4px'
            }}
          >
            {item.children!.map((subItem, subIndex) => (
              <React.Fragment key={subIndex}>
                {renderMenuItem(subItem, subIndex)}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 10000
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, index) => renderMenuItem(item, index))}
    </div>
  );
};

// Hook for using context menu
export const useContextMenu = (items: MenuItem[] | ((target: any) => MenuItem[])) => {
  const [menuState, setMenuState] = useState<{
    x: number;
    y: number;
    items: MenuItem[];
    target: any;
  } | null>(null);

  const showContextMenu = (event: React.MouseEvent, target?: any) => {
    event.preventDefault();
    event.stopPropagation();

    const menuItems = typeof items === 'function' ? items(target) : items;

    setMenuState({
      x: event.clientX,
      y: event.clientY,
      items: menuItems,
      target: target || null
    });
  };

  const hideContextMenu = () => {
    setMenuState(null);
  };

  const ContextMenuComponent = menuState ? (
    <ContextMenu
      items={menuState.items}
      x={menuState.x}
      y={menuState.y}
      onClose={hideContextMenu}
    />
  ) : null;

  return {
    showContextMenu,
    hideContextMenu,
    ContextMenuComponent,
    menuTarget: menuState?.target
  };
};

export default ContextMenu;
