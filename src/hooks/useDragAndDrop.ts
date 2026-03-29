/**
 * Drag and Drop Hook
 * 实现Zotero桌面版的拖拽功能
 */

import { useState, useCallback, useRef } from 'react';

interface DragItem {
  type: 'item' | 'collection';
  id: string | number;
  data: any;
}

interface DragPosition {
  x: number;
  y: number;
}

interface UseDragAndDropOptions {
  onDragStart?: (item: DragItem) => void;
  onDragEnd?: (item: DragItem, target?: string) => void;
  onDrop?: (item: DragItem, target: string) => void;
  canDrag?: (item: DragItem) => boolean;
  canDrop?: (item: DragItem, target: string) => boolean;
}

export const useDragAndDrop = (options: UseDragAndDropOptions = {}) => {
  const [dragging, setDragging] = useState(false);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dragPosition, setDragPosition] = useState<DragPosition>({ x: 0, y: 0 });
  const dragStartPos = useRef<DragPosition>({ x: 0, y: 0 });

  // 开始拖拽
  const handleDragStart = useCallback((
    event: React.DragEvent,
    item: DragItem
  ) => {
    if (options.canDrag && !options.canDrag(item)) {
      event.preventDefault();
      return;
    }

    setDragging(true);
    setDragItem(item);
    dragStartPos.current = {
      x: event.clientX,
      y: event.clientY
    };

    // 设置拖拽数据
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify(item));

    // 创建自定义拖拽图像
    const dragImage = (event.target as HTMLElement).cloneNode(true) as HTMLElement;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-9999px';
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);

    if (options.onDragStart) {
      options.onDragStart(item);
    }
  }, [options]);

  // 拖拽中
  const handleDrag = useCallback((event: React.DragEvent) => {
    if (!dragging) return;

    setDragPosition({
      x: event.clientX,
      y: event.clientY
    });
  }, [dragging]);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDragging(false);

    if (dragItem && options.onDragEnd) {
      options.onDragEnd(dragItem);
    }

    setDragItem(null);
  }, [dragItem, options]);

  // 处理放置
  const handleDragOver = useCallback((
    event: React.DragEvent,
    _target: string
  ) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((
    event: React.DragEvent,
    target: string
  ) => {
    event.preventDefault();

    try {
      const data = event.dataTransfer.getData('text/plain');
      const item: DragItem = JSON.parse(data);

      if (options.canDrop && !options.canDrop(item, target)) {
        return;
      }

      if (options.onDrop) {
        options.onDrop(item, target);
      }
    } catch (error) {
      console.error('Drop error:', error);
    }
  }, [options]);

  return {
    dragging,
    dragItem,
    dragPosition,
    handlers: {
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
      onDragOver: handleDragOver,
      onDrop: handleDrop
    }
  };
};

export default useDragAndDrop;
