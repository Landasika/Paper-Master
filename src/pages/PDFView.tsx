import React, { useState, useEffect, useRef } from 'react';
import { useDataStore } from '../hooks/useDataStore';
import { Modal } from '../components/modals/Modal';
import { TranslationTooltip } from '../components/TranslationTooltip';
import * as PDFJS from 'pdfjs-dist';

// Set worker path - use local file
PDFJS.GlobalWorkerOptions.workerSrc = '/workers/pdf.worker.min.mjs';

interface PDFViewProps {
  attachmentKey: string;
  onClose?: () => void;
}

export const PDFView: React.FC<PDFViewProps> = ({ attachmentKey, onClose }) => {
  const dataStore = useDataStore();
  const [attachment, setAttachment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const containerRef = useRef<HTMLDivElement>(null);

  // 翻译状态
  const [translationVisible, setTranslationVisible] = useState(false);
  const [translationPosition, setTranslationPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    async function loadAttachment() {
      if (!dataStore || !attachmentKey) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const items = await dataStore.query('item');

        let att = null;
        for (const item of items || []) {
          const typedItem = item as any;
          if (typedItem.attachments && Array.isArray(typedItem.attachments)) {
            const foundAttachment = typedItem.attachments.find((a: any) => a.key === attachmentKey);
            if (foundAttachment) {
              att = foundAttachment;
              break;
            }
          }
        }

        if (att) {
          setAttachment(att);
        } else {
          setError('Attachment not found');
        }
      } catch (err) {
        setError('Failed to load attachment: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadAttachment();
  }, [dataStore, attachmentKey]);

  // Load PDF document
  useEffect(() => {
    if (!attachment) return;

    let pdfUrl = attachment.url || attachment.link || attachment.path;
    if (attachment.filename && !pdfUrl) {
      pdfUrl = `http://localhost:3001/uploads/${attachment.filename}`;
    }

    if (!pdfUrl) {
      setError('无法找到 PDF 文件');
      return;
    }

    const loadPDF = async () => {
      try {
        const loadingTask = PDFJS.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
      } catch (err) {
        setError('Failed to load PDF: ' + (err as Error).message);
      }
    };

    loadPDF();
  }, [attachment]);

  // 处理文本选择
  useEffect(() => {
    const handleSelection = () => {
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0) {
          const range = selection?.getRangeAt(0);
          if (range) {
            const rect = range.getBoundingClientRect();
            setSelectedText(text);

            let x = rect.left + rect.width / 2 - 140;
            let y = rect.bottom + window.scrollY + 10;

            if (x < 10) x = 10;
            if (x > window.innerWidth - 300) x = window.innerWidth - 300;
            if (y > window.innerHeight - 200) y = rect.top + window.scrollY - 200;

            setTranslationPosition({ x, y });
            setTranslationVisible(true);
          }
        } else {
          setTranslationVisible(false);
        }
      }, 10);
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setPageNum(p => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setPageNum(p => Math.min(numPages, p + 1));
      } else if (e.key === '+' || e.key === '=') {
        setScale(s => Math.min(5, s + 0.25));
      } else if (e.key === '-' || e.key === '_') {
        setScale(s => Math.max(0.5, s - 0.25));
      } else if (e.key === 'Escape') {
        setTranslationVisible(false);
        window.getSelection()?.removeAllRanges();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#f5f5f5',
        color: '#333'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #e0e0e0',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }} />
        <p style={{ fontSize: '16px', fontWeight: 500 }}>加载中...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !attachment) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#f5f5f5',
        color: '#333'
      }}>
        <p style={{ fontSize: '18px', marginBottom: '1rem' }}>{error || 'Attachment not found'}</p>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            关闭
          </button>
        )}
      </div>
    );
  }

  if (!pdfDoc) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#f5f5f5',
        color: '#333'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #e0e0e0',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }} />
        <p style={{ fontSize: '16px', fontWeight: 500 }}>正在加载 PDF...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#f5f5f5'
      }}
    >
      {/* 顶部工具栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'white',
        borderBottom: '1px solid #e0e0e0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          justifyContent: 'center'
        }}>
          <button
            onClick={() => setPageNum(p => Math.max(1, p - 1))}
            disabled={pageNum <= 1}
            style={{
              padding: '8px 16px',
              background: pageNum <= 1 ? '#f5f5f5' : '#2563eb',
              color: pageNum <= 1 ? '#999' : 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              cursor: pageNum <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>←</span>
            <span>上一页</span>
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 16px'
          }}>
            <input
              type="number"
              value={pageNum}
              onChange={(e) => {
                const newPage = parseInt(e.target.value);
                if (newPage >= 1 && newPage <= numPages) {
                  setPageNum(newPage);
                }
              }}
              style={{
                width: '60px',
                padding: '6px 8px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 500
              }}
            />
            <span style={{ fontSize: '14px', color: '#666' }}>
              / {numPages}
            </span>
          </div>

          <button
            onClick={() => setPageNum(p => Math.min(numPages, p + 1))}
            disabled={pageNum >= numPages}
            style={{
              padding: '8px 16px',
              background: pageNum >= numPages ? '#f5f5f5' : '#2563eb',
              color: pageNum >= numPages ? '#999' : 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              cursor: pageNum >= numPages ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>下一页</span>
            <span>→</span>
          </button>

          <div style={{
            width: '1px',
            height: '24px',
            background: '#e0e0e0',
            margin: '0 8px'
          }} />

          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            disabled={scale <= 0.5}
            style={{
              padding: '8px 12px',
              background: scale <= 0.5 ? '#f5f5f5' : 'white',
              color: scale <= 0.5 ? '#999' : '#333',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              cursor: scale <= 0.5 ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            −
          </button>

          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            minWidth: '50px',
            textAlign: 'center',
            color: '#333'
          }}>
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => setScale(s => Math.min(5, s + 0.25))}
            disabled={scale >= 5}
            style={{
              padding: '8px 12px',
              background: scale >= 5 ? '#f5f5f5' : 'white',
              color: scale >= 5 ? '#999' : '#333',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              cursor: scale >= 5 ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            +
          </button>
        </div>

        <div style={{
          fontSize: '12px',
          color: '#666',
          padding: '6px 12px',
          background: '#f8f9fa',
          borderRadius: '4px',
          whiteSpace: 'nowrap'
        }}>
          💡 选中文本即可翻译
        </div>
      </div>

      {/* PDF 渲染区域 */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: '20px',
          background: '#e8e8e8'
        }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <PDFPageWithTextLayer
            pdfDoc={pdfDoc}
            pageNum={pageNum}
            scale={scale}
          />
        </div>
      </div>

      {/* 翻译提示框 */}
      <TranslationTooltip
        visible={translationVisible}
        x={translationPosition.x}
        y={translationPosition.y}
        selectedText={selectedText}
        onClose={() => {
          setTranslationVisible(false);
          window.getSelection()?.removeAllRanges();
        }}
      />
    </div>
  );
};

// PDF 页面渲染组件 - 带文本层
interface PDFPageProps {
  pdfDoc: any;
  pageNum: number;
  scale: number;
}

const PDFPageWithTextLayer: React.FC<PDFPageProps> = ({ pdfDoc, pageNum, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [renderTask, setRenderTask] = useState<any>(null);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !textLayerRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;

        if (!canvas || !textLayerDiv) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // 清空并设置文本层容器
        textLayerDiv.innerHTML = '';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;

        // 取消之前的渲染任务
        if (renderTask) {
          renderTask.cancel();
        }

        // 渲染 Canvas
        const newRenderTask = page.render({
          canvasContext: context,
          viewport: viewport
        });

        setRenderTask(newRenderTask);
        await newRenderTask.promise;

        // 获取文本内容
        const textContent = await page.getTextContent();

        // 创建文本层
        textContent.items.forEach((item: any) => {
          const tx = PDFJS.Util.transform(
            viewport.transform,
            item.transform
          );

          const fontSize = Math.sqrt((tx[0] * tx[0]) + (tx[1] * tx[1]));
          const fontHeight = item.height || fontSize;

          // 创建文本div
          const textDiv = document.createElement('div');
          textDiv.textContent = item.str;
          textDiv.style.position = 'absolute';
          textDiv.style.left = `${tx[4]}px`;
          textDiv.style.top = `${tx[5] - fontHeight}px`;
          textDiv.style.fontSize = `${fontHeight}px`;
          textDiv.style.fontFamily = item.fontName || 'sans-serif';
          textDiv.style.color = 'transparent'; // 透明，但可以选择
          textDiv.style.userSelect = 'text';
          textDiv.style.cursor = 'text';
          textDiv.style.whiteSpace = 'pre';
          textDiv.style.pointerEvents = 'auto';
          textDiv.style.lineHeight = '1';

          textLayerDiv.appendChild(textDiv);
        });

        console.log('[PDFPage] ✅ 页面渲染完成:', pageNum);
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('[PDFPage] ❌ 渲染失败:', err);
        }
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNum, scale]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '4px',
          background: 'white'
        }}
      />
      <div
        ref={textLayerRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          pointerEvents: 'auto'
        }}
      />
    </>
  );
};

// Wrapper component for modal usage
interface PDFViewModalProps {
  isOpen: boolean;
  attachmentKey: string;
  onClose: () => void;
}

export const PDFViewModal: React.FC<PDFViewModalProps> = ({
  isOpen,
  attachmentKey,
  onClose
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
    >
      <PDFView
        attachmentKey={attachmentKey}
        onClose={onClose}
      />
    </Modal>
  );
};
