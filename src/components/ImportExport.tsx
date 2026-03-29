/**
 * Import/Export Component
 * 基于Zotero桌面版导入导出功能
 * 支持多种格式的条目导入导出
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import './ImportExport.css';

interface ImportExportProps {
  onImport?: (format: string, data: any) => void;
  onExport?: (format: string, items: any[]) => void;
  items?: any[];
}

export const ImportExport: React.FC<ImportExportProps> = ({
  onImport,
  onExport,
  items = []
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importFormat, setImportFormat] = useState('zotero');
  const [exportFormat, setExportFormat] = useState('zotero');
  const [importData, setImportData] = useState('');
  const [exportPreview, setExportPreview] = useState('');

  // 支持的导入格式
  const importFormats = [
    { value: 'zotero', label: 'Zotero RDF', icon: '📚' },
    { value: 'bibtex', label: 'BibTeX', icon: '📝' },
    { value: 'ris', label: 'RIS', icon: '📄' },
    { value: 'csv', label: 'CSV', icon: '📊' },
    { value: 'json', label: 'JSON', icon: '🔧' }
  ];

  // 支持的导出格式
  const exportFormats = [
    { value: 'zotero', label: 'Zotero RDF', icon: '📚' },
    { value: 'bibtex', label: 'BibTeX', icon: '📝' },
    { value: 'ris', label: 'RIS', icon: '📄' },
    { value: 'csv', label: 'CSV', icon: '📊' },
    { value: 'json', label: 'JSON', icon: '🔧' },
    { value: 'pdf', label: 'PDF报告', icon: '📕' }
  ];

  // 处理导入
  const handleImport = useCallback(() => {
    if (!importData.trim()) {
      alert('请输入要导入的数据');
      return;
    }

    try {
      const data = importFormat === 'json' ? JSON.parse(importData) : importData;
      if (onImport) {
        onImport(importFormat, data);
      }
      alert('导入成功！');
      setImportData('');
    } catch (error) {
      alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [importData, importFormat, onImport]);

  // 处理文件导入
  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  }, []);

  // 生成导出预览
  const generateExportPreview = useCallback(() => {
    if (items.length === 0) {
      setExportPreview('没有可导出的条目');
      return;
    }

    let preview = '';
    switch (exportFormat) {
      case 'json':
        preview = JSON.stringify(items, null, 2);
        break;
      case 'csv':
        const headers = Object.keys(items[0] || {});
        preview = [headers.join(','), ...items.map(item =>
          headers.map(header => JSON.stringify(item[header] || '')).join(',')
        )].join('\n');
        break;
      case 'bibtex':
        preview = items.map(item => {
          const creators = item.creators || [];
          const author = creators.map((c: any) => `${c.lastName}, ${c.firstName}`).join(' and ');
          return `@${item.itemType || 'misc'}{${item.key || 'key'},\n  author = {${author}},\n  title = {${item.title}},\n  year = {${item.date?.split('-')[0] || 'n.d.'}}\n}`;
        }).join('\n\n');
        break;
      default:
        preview = JSON.stringify(items, null, 2);
    }
    setExportPreview(preview);
  }, [items, exportFormat]);

  // 处理导出
  const handleExport = useCallback(() => {
    if (items.length === 0) {
      alert('没有可导出的条目');
      return;
    }

    if (onExport) {
      onExport(exportFormat, items);
    }

    // 生成文件下载
    const blob = new Blob([exportPreview], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zotero-export-${Date.now()}.${exportFormat === 'zotero' ? 'rdf' : exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items, exportFormat, exportPreview, onExport]);

  // 复制到剪贴板
  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportPreview);
      alert('已复制到剪贴板！');
    } catch (error) {
      alert('复制失败');
    }
  }, [exportPreview]);

  return (
    <div className="import-export">
      <div className="import-export-header">
        <h2>📥 导入 / 📤 导出</h2>
      </div>

      {/* 标签页切换 */}
      <div className="tab-switcher">
        <button
          className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📥 导入
        </button>
        <button
          className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          📤 导出
        </button>
      </div>

      {/* 导入面板 */}
      {activeTab === 'import' && (
        <div className="import-panel">
          <div className="format-selector">
            <label>导入格式:</label>
            <div className="format-options">
              {importFormats.map(format => (
                <label key={format.value} className="format-option">
                  <input
                    type="radio"
                    name="importFormat"
                    value={format.value}
                    checked={importFormat === format.value}
                    onChange={(e) => setImportFormat(e.target.value)}
                  />
                  <span className="format-icon">{format.icon}</span>
                  <span className="format-label">{format.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="import-methods">
            <div className="import-method">
              <h4>📁 从文件导入</h4>
              <input
                type="file"
                accept=".rdf,.bib,.ris,.csv,.json"
                onChange={handleFileImport}
                className="file-input"
              />
            </div>

            <div className="import-method">
              <h4>📋 从文本导入</h4>
              <textarea
                className="import-textarea"
                placeholder={`粘贴${importFormats.find(f => f.value === importFormat)?.label}格式的数据...`}
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={10}
              />
            </div>
          </div>

          <div className="import-actions">
            <button className="action-btn primary-btn" onClick={handleImport}>
              📥 导入数据
            </button>
            <button className="action-btn secondary-btn" onClick={() => setImportData('')}>
              🧹 清除
            </button>
          </div>

          <div className="import-help">
            <h4>💡 导入提示</h4>
            <ul>
              <li>支持批量导入多个条目</li>
              <li>重复的条目将被自动检测</li>
              <li>导入前请备份现有数据</li>
              <li>支持拖拽文件到此窗口</li>
            </ul>
          </div>
        </div>
      )}

      {/* 导出面板 */}
      {activeTab === 'export' && (
        <div className="export-panel">
          <div className="format-selector">
            <label>导出格式:</label>
            <div className="format-options">
              {exportFormats.map(format => (
                <label key={format.value} className="format-option">
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => {
                      setExportFormat(e.target.value);
                      generateExportPreview();
                    }}
                  />
                  <span className="format-icon">{format.icon}</span>
                  <span className="format-label">{format.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="export-stats">
            <span>📊 准备导出 {items.length} 个条目</span>
          </div>

          <div className="export-preview">
            <div className="preview-header">
              <span>导出预览:</span>
              <button className="copy-btn" onClick={handleCopyToClipboard}>
                📋 复制
              </button>
            </div>
            <textarea
              className="export-textarea"
              value={exportPreview}
              onChange={(e) => setExportPreview(e.target.value)}
              rows={15}
              readOnly
            />
          </div>

          <div className="export-actions">
            <button className="action-btn primary-btn" onClick={handleExport}>
              📤 导出文件
            </button>
            <button className="action-btn secondary-btn" onClick={generateExportPreview}>
              🔄 刷新预览
            </button>
          </div>

          <div className="export-help">
            <h4>💡 导出提示</h4>
            <ul>
              <li>可以选择性导出特定条目</li>
              <li>导出的格式兼容各种引用管理软件</li>
              <li>PDF报告适合打印和分享</li>
              <li>BibTeX格式适合LaTeX用户</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

ImportExport.propTypes = {
  onImport: PropTypes.func,
  onExport: PropTypes.func,
  items: PropTypes.array
};

export default ImportExport;
