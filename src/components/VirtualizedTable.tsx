/**
 * Simple Item List - 基于Zotero桌面版设计
 * 支持拖拽功能的虚拟化表格
 */

import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import './VirtualizedTable.css';

export interface ColumnDefinition {
  key: string;
  label: string;
  width: number;
  dataKey?: string;
  sortable?: boolean;
  format?: (value: any, row: any) => React.ReactNode;
}

interface VirtualizedTableProps {
  data: any[];
  columns: ColumnDefinition[];
  onRowClick?: (row: any) => void;
  onRowDoubleClick?: (row: any) => void;
  onRowDragStart?: (row: any) => void;
  height?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
  onSort?: (sortBy: string, sortDirection: 'ASC' | 'DESC') => void;
  loading?: boolean;
}

export const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  data,
  columns,
  onRowClick,
  onRowDoubleClick,
  onRowDragStart: _onRowDragStart,
  height = 400,
  sortBy,
  sortDirection = 'ASC',
  onSort,
  loading = false
}) => {
  const [internalSortBy, setInternalSortBy] = useState(sortBy);
  const [internalSortDirection, setInternalSortDirection] = useState(sortDirection);

  // 排序数据
  const sortedData = useMemo(() => {
    if (!internalSortBy) return data;

    return [...data].sort((a, b) => {
      const aValue = a[internalSortBy];
      const bValue = b[internalSortBy];

      if (aValue == null) return 1;
      if (bValue == null) return -1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }

      return internalSortDirection === 'DESC' ? -comparison : comparison;
    });
  }, [data, internalSortBy, internalSortDirection]);

  // 处理排序
  const handleSort = useCallback((columnKey: string) => {
    const newDirection = internalSortBy === columnKey && internalSortDirection === 'ASC' ? 'DESC' : 'ASC';
    setInternalSortBy(columnKey);
    setInternalSortDirection(newDirection);

    if (onSort) {
      onSort(columnKey, newDirection);
    }
  }, [internalSortBy, internalSortDirection, onSort]);

  // 拖拽相关处理函数
  const handleDragStart = useCallback((event: React.DragEvent, row: any) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/zotero-item', JSON.stringify(row));
    event.dataTransfer.setData('text/plain', row.title || 'Unnamed Item');
  }, []);

  const handleDragEnd = useCallback(() => {
    // 可以在这里添加拖拽结束的清理工作
  }, []);

  // 获取单元格内容
  const getCellValue = useCallback((row: any, column: ColumnDefinition) => {
    const value = row[column.dataKey || column.key];
    if (column.format) {
      return column.format(value, row);
    }
    return value;
  }, []);

  if (loading) {
    return (
      <div className="rt-loading" style={{ height }}>
        <div className="rt-spinner"></div>
        <div className="rt-loading-text">Loading...</div>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div className="rt-empty" style={{ height }}>
        <div className="rt-empty-text">No items found</div>
      </div>
    );
  }

  return (
    <div className="rt-root" style={{ height, overflow: 'auto' }}>
      {/* 表头 */}
      <div className="rt-thead">
        <div className="rt-tr">
          {columns.map((column) => (
            <div
              key={column.key}
              className={`rt-th ${column.sortable ? 'rt-th-sortable' : ''} ${internalSortBy === column.key ? 'rt-th-active' : ''}`}
              style={{ width: column.width }}
              onClick={() => column.sortable && handleSort(column.key)}
            >
              <div className="rt-th-content">
                <span>{column.label}</span>
                {internalSortBy === column.key && (
                  <span className="rt-th-sort-indicator">
                    {internalSortDirection === 'ASC' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 表体 */}
      <div className="rt-tbody">
        {sortedData.map((row, index) => (
          <div
            key={row.itemID || index}
            className="rt-tr"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, row)}
            onDragEnd={handleDragEnd}
            onClick={() => onRowClick && onRowClick(row)}
            onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(row)}
          >
            {columns.map((column) => (
              <div
                key={column.key}
                className="rt-td"
                style={{ width: column.width }}
              >
                <div className="rt-cell">
                  {getCellValue(row, column)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

VirtualizedTable.propTypes = {
  data: PropTypes.array.isRequired,
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    width: PropTypes.number.isRequired,
    dataKey: PropTypes.string,
    sortable: PropTypes.bool,
    format: PropTypes.func
  })).isRequired,
  onRowClick: PropTypes.func,
  onRowDoubleClick: PropTypes.func,
  height: PropTypes.number,
  sortBy: PropTypes.string,
  sortDirection: PropTypes.oneOf(['ASC', 'DESC']),
  onSort: PropTypes.func,
  loading: PropTypes.bool
};

export default VirtualizedTable;