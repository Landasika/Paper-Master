/**
 * Real PDF Viewer Component
 * 基于PDF.js实现真正的PDF渲染
 * 完全模拟Zotero桌面版PDF阅读器功能
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import * as pdfjsLib from 'pdfjs-dist';
import './RealPDFViewer.css';

// 设置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface RealPDFViewerProps {
  url?: string;
  title?: string;
  onPageChange?: (pageNumber: number) => void;
  onZoomChange?: (scale: number) => void;
}

export const RealPDFViewer: React.FC<RealPDFViewerProps> = ({
  url,
  title = 'PDF预览',
  onPageChange,
  onZoomChange
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // 加载PDF文档
  useEffect(() => {
    if (!url) {
      setError('没有PDF文件');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument(url);
    loadingTask.promise.then(
      (pdf) => {
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setLoading(false);
      },
      (reason) => {
        console.error('PDF加载失败:', reason);
        setError(`PDF加载失败: ${reason.message || '未知错误'}`);
        setLoading(false);
      }
    );

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [url]);

  // 渲染PDF页面
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async (pageNum: number) => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');

        if (!canvas || !context) return;

        // 取消之前的渲染任务
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        // 计算视口
        const viewport = page.getViewport({ scale, rotation });

        // 设置canvas尺寸
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // 渲染上下文
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        };

        // 渲染页面
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (error) {
        if ((error as any).name !== 'RenderingCancelledException') {
          console.error('页面渲染失败:', error);
        }
      }
    };

    renderPage(currentPage);
  }, [pdfDoc, currentPage, scale, rotation]);

  // 页面导航
  const goToPage = useCallback((pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      if (onPageChange) {
        onPageChange(pageNumber);
      }
    }
  }, [totalPages, onPageChange]);

  const handlePrevPage = () => goToPage(currentPage - 1);
  const handleNextPage = () => goToPage(currentPage + 1);

  // 缩放控制
  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.25, 3.0);
    setScale(newScale);
    if (onZoomChange) {
      onZoomChange(newScale);
    }
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.25, 0.25);
    setScale(newScale);
    if (onZoomChange) {
      onZoomChange(newScale);
    }
  };

  // 旋转控制
  const handleRotateLeft = () => {
    setRotation((rotation - 90) % 360);
  };

  const handleRotateRight = () => {
    setRotation((rotation + 90) % 360);
  };

  // 下载PDF
  const handleDownload = () => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = title || 'document.pdf';
      link.click();
    }
  };

  // 打印PDF
  const handlePrint = () => {
    if (url) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
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
    <div className="real-pdf-viewer">
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
              title="上一页"
            >
              ◀
            </button>
            <span className="page-info">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                className="page-input"
              />
              / {totalPages}
            </span>
            <button
              className="nav-btn"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              title="下一页"
            >
              ▶
            </button>
          </div>

          {/* 缩放控制 */}
          <div className="zoom-controls">
            <button
              className="zoom-btn"
              onClick={handleZoomOut}
              disabled={scale <= 0.25}
              title="缩小"
            >
              🔍-
            </button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button
              className="zoom-btn"
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
              title="放大"
            >
              🔍+
            </button>
          </div>

          {/* 旋转控制 */}
          <div className="rotation-controls">
            <button
              className="rotate-btn"
              onClick={handleRotateLeft}
              title="向左旋转"
            >
              ↺
            </button>
            <button
              className="rotate-btn"
              onClick={handleRotateRight}
              title="向右旋转"
            >
              ↻
            </button>
          </div>

          {/* 其他操作 */}
          <div className="pdf-actions">
            <button className="action-btn" onClick={handlePrint} title="打印">
              🖨️
            </button>
            <button className="action-btn" onClick={handleDownload} title="下载">
              📥
            </button>
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

        {!loading && !error && pdfDoc && (
          <div className="pdf-pages">
            <canvas
              ref={canvasRef}
              className="pdf-page"
            />
          </div>
        )}
      </div>

      {/* 页面缩略图（可选） */}
      {!loading && !error && totalPages > 0 && (
        <div className="pdf-thumbnails">
          <div className="thumbnails-header">
            <span>页面缩略图</span>
          </div>
          <div className="thumbnails-list">
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                className={`thumbnail ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => goToPage(pageNum)}
              >
                <span className="thumbnail-number">{pageNum}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

RealPDFViewer.propTypes = {
  url: PropTypes.string,
  title: PropTypes.string,
  onPageChange: PropTypes.func,
  onZoomChange: PropTypes.func
};

export default RealPDFViewer;
