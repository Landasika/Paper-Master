/**
 * Advanced Search Component
 * 基于Zotero桌面版高级搜索功能
 * 支持多条件搜索、保存搜索等
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import './AdvancedSearch.css';

interface SearchCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  mode: 'contains' | 'is' | 'isNot' | 'greaterThan' | 'lessThan';
}

interface AdvancedSearchProps {
  onSearch?: (conditions: SearchCondition[]) => void;
  onSaveSearch?: (name: string, conditions: SearchCondition[]) => void;
  onClear?: () => void;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  onSaveSearch,
  onClear
}) => {
  const [conditions, setConditions] = useState<SearchCondition[]>([
    {
      id: '1',
      field: 'title',
      operator: 'contains',
      value: '',
      mode: 'contains'
    }
  ]);
  const [matchType, setMatchType] = useState<'all' | 'any'>('all');
  const [searchName, setSearchName] = useState('');

  // 可搜索字段
  const searchFields = [
    { value: 'title', label: '标题' },
    { value: 'creators', label: '作者' },
    { value: 'date', label: '日期' },
    { value: 'abstractNote', label: '摘要' },
    { value: 'publicationTitle', label: '出版物' },
    { value: 'DOI', label: 'DOI' },
    { value: 'ISBN', label: 'ISBN' },
    { value: 'tags', label: '标签' },
    { value: 'itemType', label: '类型' },
    { value: 'notes', label: '笔记' }
  ];

  // 操作符
  const operators = [
    { value: 'contains', label: '包含' },
    { value: 'doesNotContain', label: '不包含' },
    { value: 'is', label: '是' },
    { value: 'isNot', label: '不是' },
    { value: 'greaterThan', label: '大于' },
    { value: 'lessThan', label: '小于' }
  ];

  // 添加搜索条件
  const handleAddCondition = useCallback(() => {
    const newCondition: SearchCondition = {
      id: Date.now().toString(),
      field: 'title',
      operator: 'contains',
      value: '',
      mode: 'contains'
    };
    setConditions([...conditions, newCondition]);
  }, [conditions]);

  // 删除搜索条件
  const handleRemoveCondition = useCallback((id: string) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter(c => c.id !== id));
    }
  }, [conditions]);

  // 更新搜索条件
  const handleUpdateCondition = useCallback((id: string, updates: Partial<SearchCondition>) => {
    setConditions(conditions.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ));
  }, [conditions]);

  // 执行搜索
  const handleSearch = useCallback(() => {
    const validConditions = conditions.filter(c => c.value.trim());
    if (validConditions.length > 0 && onSearch) {
      onSearch(validConditions);
    }
  }, [conditions, onSearch]);

  // 清除搜索
  const handleClear = useCallback(() => {
    setConditions([{
      id: '1',
      field: 'title',
      operator: 'contains',
      value: '',
      mode: 'contains'
    }]);
    if (onClear) {
      onClear();
    }
  }, [onClear]);

  // 保存搜索
  const handleSaveSearch = useCallback(() => {
    const name = searchName || `搜索 ${new Date().toLocaleString()}`;
    const validConditions = conditions.filter(c => c.value.trim());
    if (validConditions.length > 0 && onSaveSearch) {
      onSaveSearch(name, validConditions);
      setSearchName('');
    }
  }, [conditions, searchName, onSaveSearch]);

  return (
    <div className="advanced-search">
      <div className="search-header">
        <h3>🔬 高级搜索</h3>
        <div className="search-actions">
          <button className="search-btn save-btn" onClick={handleSaveSearch}>
            💾 保存搜索
          </button>
          <button className="search-btn clear-btn" onClick={handleClear}>
            🧹 清除
          </button>
        </div>
      </div>

      {/* 保存搜索名称 */}
      <div className="search-name-input">
        <input
          type="text"
          placeholder="搜索名称（可选）"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />
      </div>

      {/* 匹配类型 */}
      <div className="match-type">
        <span className="match-label">匹配条件:</span>
        <label className="match-option">
          <input
            type="radio"
            value="all"
            checked={matchType === 'all'}
            onChange={(e) => setMatchType(e.target.value as 'all' | 'any')}
          />
          满足所有条件
        </label>
        <label className="match-option">
          <input
            type="radio"
            value="any"
            checked={matchType === 'any'}
            onChange={(e) => setMatchType(e.target.value as 'all' | 'any')}
          />
          满足任意条件
        </label>
      </div>

      {/* 搜索条件 */}
      <div className="search-conditions">
        {conditions.map((condition, index) => (
          <div key={condition.id} className="condition-row">
            <span className="condition-number">{index + 1}</span>

            <select
              className="condition-field"
              value={condition.field}
              onChange={(e) => handleUpdateCondition(condition.id, { field: e.target.value })}
            >
              {searchFields.map(field => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>

            <select
              className="condition-operator"
              value={condition.operator}
              onChange={(e) => handleUpdateCondition(condition.id, { operator: e.target.value })}
            >
              {operators.map(op => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              className="condition-value"
              placeholder="搜索值..."
              value={condition.value}
              onChange={(e) => handleUpdateCondition(condition.id, { value: e.target.value })}
            />

            <button
              className="remove-condition-btn"
              onClick={() => handleRemoveCondition(condition.id)}
              disabled={conditions.length === 1}
              title="删除条件"
            >
              ✕
            </button>
          </div>
        ))}

        <button className="add-condition-btn" onClick={handleAddCondition}>
          + 添加条件
        </button>
      </div>

      {/* 搜索按钮 */}
      <div className="search-footer">
        <button className="search-btn primary" onClick={handleSearch}>
          🔍 搜索
        </button>
        <div className="search-info">
          {conditions.filter(c => c.value.trim()).length} 个有效条件
        </div>
      </div>

      {/* 搜索预览 */}
      <div className="search-preview">
        <div className="preview-header">搜索预览:</div>
        <div className="preview-content">
          {matchType === 'all' ? '所有条件' : '任意条件'}必须满足:
          <ul className="preview-conditions">
            {conditions.filter(c => c.value.trim()).map((condition) => {
              const field = searchFields.find(f => f.value === condition.field)?.label;
              const operator = operators.find(o => o.value === condition.operator)?.label;
              return (
                <li key={condition.id}>
                  <strong>{field}</strong> {operator} "{condition.value}"
                </li>
              );
            })}
          </ul>
          {conditions.filter(c => c.value.trim()).length === 0 && (
            <div className="preview-empty">添加搜索条件以查看预览</div>
          )}
        </div>
      </div>
    </div>
  );
};

AdvancedSearch.propTypes = {
  onSearch: PropTypes.func,
  onSaveSearch: PropTypes.func,
  onClear: PropTypes.func
};

export default AdvancedSearch;
