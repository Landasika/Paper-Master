/**
 * PDF Viewer Component
 * 基于PDF.js实现PDF预览功能
 * 模拟Zotero桌面版PDF阅读器
 */

import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './PDFViewer.css';

interface PDFViewerProps {
  url?: string;
  title?: string;
  onClose?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  title = 'PDF预览',
  onClose
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 模拟PDF加载（实际项目中需要集成PDF.js）
  useEffect(() => {
    if (!url) {
      setError('没有PDF文件');
      return;
    }

    setLoading(true);
    setError(null);

    // 这里应该集成PDF.js
    // 目前使用模拟数据
    setTimeout(() => {
      setTotalPages(10); // 模拟总页数
      setLoading(false);
    }, 1000);
  }, [url]);

  // 渲染PDF页面
  useEffect(() => {
    if (!loading && canvasRef.current && totalPages > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (ctx) {
        // 模拟PDF渲染（实际项目中应该使用PDF.js）
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制模拟文本
        ctx.fillStyle = '#333';
        ctx.font = '16px Arial';
        ctx.fillText(`第 ${currentPage} 页`, 20, 30);

        // 绘制一些模拟内容
        for (let i = 0; i < 20; i++) {
          ctx.fillStyle = '#666';
          ctx.font = '12px Arial';
          ctx.fillText(`模拟PDF内容行 ${i + 1}...`, 20, 60 + i * 20);
        }
      }
    }
  }, [currentPage, loading, totalPages]);

  // 页面控制
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.25, 0.5));
  };

  const handleDownload = () => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (!url) {
    return (
      <div className="pdf-viewer-empty">
        <div className="empty-icon">📄</div>
        <p>没有可显示的PDF</p>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      {/* PDF工具栏 */}
      <div className="pdf-toolbar">
        <div className="pdf-title">{title}</div>
        <div className="pdf-controls">
          {/* 页面导航 */}
          <div className="page-navigation">
            <button
              className="nav-btn"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
            >
              ◀
            </button>
            <span className="page-info">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => setCurrentPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                className="page-input"
              />
              / {totalPages}
            </span>
            <button
              className="nav-btn"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              ▶
            </button>
          </div>

          {/* 缩放控制 */}
          <div className="zoom-controls">
            <button
              className="zoom-btn"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
            >
              🔍-
            </button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button
              className="zoom-btn"
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
            >
              🔍+
            </button>
          </div>

          {/* 其他操作 */}
          <div className="pdf-actions">
            <button className="action-btn" onClick={handleDownload} title="下载">
              📥
            </button>
            {onClose && (
              <button className="action-btn" onClick={onClose} title="关闭">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PDF内容区域 */}
      <div className="pdf-content">
        {loading && (
          <div className="pdf-loading">
            <div className="loading-spinner"></div>
            <p>加载PDF中...</p>
          </div>
        )}

        {error && (
          <div className="pdf-error">
            <div className="error-icon">❌</div>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="pdf-pages" style={{ transform: `scale(${scale})` }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={800}
              className="pdf-page"
            />
          </div>
        )}
      </div>
    </div>
  );
};

PDFViewer.propTypes = {
  url: PropTypes.string,
  title: PropTypes.string,
  onClose: PropTypes.func
};

export default PDFViewer;
