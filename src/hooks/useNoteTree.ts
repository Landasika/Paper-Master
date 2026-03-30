import { useState, useMemo, useCallback } from 'react';
import { Item } from '../core/data/Item';

/**
 * 笔记树状态管理Hook
 * 管理笔记的展开/折叠状态和层级关系
 */
export function useNoteTree(items: Item[]) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 切换展开状态
  const toggleExpand = useCallback((itemKey: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(itemKey)) {
        newExpanded.delete(itemKey);
      } else {
        newExpanded.add(itemKey);
      }
      return newExpanded;
    });
  }, []);

  // 展开指定条目
  const expand = useCallback((itemKey: string) => {
    setExpandedItems(prev => new Set(prev).add(itemKey));
  }, []);

  // 折叠指定条目
  const collapse = useCallback((itemKey: string) => {
    setExpandedItems(prev => {
      const newExpanded = new Set(prev);
      newExpanded.delete(itemKey);
      return newExpanded;
    });
  }, []);

  // 展开所有
  const expandAll = useCallback(() => {
    const allKeys = items
      .filter(item => item.isTopLevelItem())
      .map(item => item.key);
    setExpandedItems(new Set(allKeys));
  }, [items]);

  // 折叠所有
  const collapseAll = useCallback(() => {
    setExpandedItems(new Set());
  }, []);

  // 检查条目是否展开
  const isExpanded = useCallback((itemKey: string): boolean => {
    return expandedItems.has(itemKey);
  }, [expandedItems]);

  // 获取条目的子笔记
  const getChildNotes = useCallback((itemKey: string): Item[] => {
    return items.filter(item =>
      item.itemType === 'note' && item.parentKey === itemKey
    );
  }, [items]);

  // 获取条目的子笔记数量
  const getChildNoteCount = useCallback((itemKey: string): number => {
    return items.filter(item =>
      item.itemType === 'note' && item.parentKey === itemKey
    ).length;
  }, [items]);

  // 检查条目是否有子笔记
  const hasChildNotes = useCallback((itemKey: string): boolean => {
    return items.some(item =>
      item.itemType === 'note' && item.parentKey === itemKey
    );
  }, [items]);

  // 检查是否为顶级条目（不是笔记或附件）
  const isTopLevelItem = useCallback((item: Item): boolean => {
    return item.itemType !== 'note' && item.itemType !== 'attachment';
  }, []);

  // 构建树形结构的扁平列表（用于渲染）
  const flatTree = useMemo(() => {
    const result: Array<{ item: Item; level: number; hasChildren: boolean }> = [];

    // 首先添加所有顶级条目（非笔记、非附件）
    const topLevelItems = items.filter(item => isTopLevelItem(item));

    for (const item of topLevelItems) {
      const childCount = getChildNoteCount(item.key);
      result.push({
        item,
        level: 0,
        hasChildren: childCount > 0
      });

      // 如果展开且有子笔记，添加子笔记
      if (expandedItems.has(item.key)) {
        const childNotes = getChildNotes(item.key);
        for (const note of childNotes) {
          result.push({
            item: note,
            level: 1,
            hasChildren: false
          });
        }
      }
    }

    return result;
  }, [items, expandedItems, getChildNoteCount, getChildNotes, isTopLevelItem]);

  return {
    expandedItems,
    toggleExpand,
    expand,
    collapse,
    expandAll,
    collapseAll,
    isExpanded,
    getChildNotes,
    getChildNoteCount,
    hasChildNotes,
    flatTree
  };
}
