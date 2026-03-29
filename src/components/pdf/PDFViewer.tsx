import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '../Button';
import './PDFViewer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
  title?: string;
  onClose?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ url, title, onClose }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF load error:', err);
    setError('Failed to load PDF. The file may be corrupted or not accessible.');
    setLoading(false);
  }, []);

  const changePage = useCallback((offset: number) => {
    setCurrentPage(prevPage => {
      const newPage = prevPage + offset;
      return Math.min(Math.max(1, newPage), numPages);
    });
  }, [numPages]);

  const changeScale = useCallback((delta: number) => {
    setScale(prevScale => {
      const newScale = prevScale + delta;
      return Math.min(Math.max(0.5, newScale), 3.0);
    });
  }, []);

  const nextPage = useCallback(() => changePage(1), [changePage]);
  const previousPage = useCallback(() => changePage(-1), [changePage]);
  const zoomIn = useCallback(() => changeScale(0.25), [changeScale]);
  const zoomOut = useCallback(() => changeScale(-0.25), [changeScale]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          previousPage();
          break;
        case 'ArrowRight':
          nextPage();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previousPage, nextPage, zoomIn, zoomOut]);

  return (
    <div className="pdf-viewer" ref={containerRef}>
      {/* Header */}
      <div className="pdf-header">
        <div className="pdf-title">
          {title && <h2>{title}</h2>}
        </div>
        <div className="pdf-header-actions">
          {onClose && (
            <Button variant="ghost" size="small" onClick={onClose}>
              × Close
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="pdf-toolbar">
        <div className="pdf-toolbar-left">
          <Button
            variant="secondary"
            size="small"
            onClick={previousPage}
            disabled={currentPage <= 1}
          >
            ← Previous
          </Button>
          <span className="pdf-page-info">
            Page {currentPage} of {numPages}
          </span>
          <Button
            variant="secondary"
            size="small"
            onClick={nextPage}
            disabled={currentPage >= numPages}
          >
            Next →
          </Button>
        </div>

        <div className="pdf-toolbar-right">
          <Button
            variant="secondary"
            size="small"
            onClick={zoomOut}
            disabled={scale <= 0.5}
          >
            − Zoom Out
          </Button>
          <span className="pdf-zoom-level">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="secondary"
            size="small"
            onClick={zoomIn}
            disabled={scale >= 3.0}
          >
            + Zoom In
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="pdf-content">
        {loading && (
          <div className="pdf-loading">
            <div className="pdf-spinner"></div>
            <p>Loading PDF...</p>
          </div>
        )}

        {error && (
          <div className="pdf-error">
            <p>{error}</p>
            <Button onClick={() => window.location.reload()} variant="secondary">
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div className="pdf-document-container">
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<div className="pdf-loading">Loading PDF...</div>}
              error={<div className="pdf-error">Failed to load PDF</div>}
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="pdf-page"
              />
            </Document>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      {!loading && !error && (
        <div className="pdf-shortcuts">
          <small>
            Use ← → for navigation, + − for zoom
          </small>
        </div>
      )}
    </div>
  );
};
