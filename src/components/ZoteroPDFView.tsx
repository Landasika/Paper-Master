import React, { useEffect, useRef, useState } from 'react';
import { useDataStore } from '../hooks/useDataStore';

interface ZoteroPDFViewProps {
  attachmentKey: string;
  onClose?: () => void;
  onTextSelection?: (selection: {
    text: string;
    x: number;
    y: number;
  }) => void;
}

/**
 * Zotero PDF Reader 桥接组件
 * 使用 iframe 加载 Zotero Reader，通过 postMessage 通信
 */
export const ZoteroPDFView: React.FC<ZoteroPDFViewProps> = ({ attachmentKey, onClose, onTextSelection }) => {
  const dataStore = useDataStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [attachment, setAttachment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载 attachment 信息
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

  // 监听来自 iframe 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 确保消息来自 Zotero Reader iframe
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      console.log('[ZoteroPDFView] 收到消息:', event.data);

      // 处理不同类型的消息
      switch (event.data.type) {
        case 'onSaveAnnotations':
          // 保存注释
          console.log('[ZoteroPDFView] 保存注释:', event.data.annotations);
          break;
        case 'onOpenLink':
          // 打开链接
          if (event.data.url) {
            window.open(event.data.url, '_blank');
          }
          break;
        case 'onSetZoom':
          // 设置缩放
          console.log('[ZoteroPDFView] 设置缩放:', event.data.zoom);
          break;
        case 'onTextSelection':
          // 文本选择翻译
          console.log('[ZoteroPDFView] 文本选择:', event.data);
          if (onTextSelection && event.data.text) {
            const iframeRect = iframeRef.current?.getBoundingClientRect();
            onTextSelection({
              text: event.data.text,
              x: iframeRect ? iframeRect.left + event.data.x : event.data.x,
              y: iframeRect ? iframeRect.top + event.data.y : event.data.y
            });
          }
          break;
        default:
          console.log('[ZoteroPDFView] 未处理的消息类型:', event.data.type);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#f5f5f5'
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
        background: '#f5f5f5'
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
              cursor: 'pointer'
            }}
          >
            关闭
          </button>
        )}
      </div>
    );
  }

  // 构建 PDF URL
  let pdfUrl = attachment.url || attachment.link || attachment.path;
  if (attachment.filename && !pdfUrl) {
    pdfUrl = `http://localhost:3001/uploads/${attachment.filename}`;
  }

  if (!pdfUrl) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#f5f5f5'
      }}>
        <p style={{ fontSize: '18px', color: '#666' }}>无法找到 PDF 文件</p>
      </div>
    );
  }

  // 构建 Reader URL（如果需要可以添加查询参数）
  const readerUrl = `/zotero-reader/reader.html`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#f5f5f5'
    }}>
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
          gap: '12px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: '#333'
          }}>
            {attachment.title || attachment.filename || 'PDF'}
          </h2>
        </div>

        <div style={{
          fontSize: '12px',
          color: '#666',
          padding: '6px 12px',
          background: '#f8f9fa',
          borderRadius: '4px'
        }}>
          💡 使用 Zotero Reader
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'white',
              color: '#666',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
              e.currentTarget.style.borderColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#e0e0e0';
            }}
          >
            关闭
          </button>
        )}
      </div>

      {/* Zotero Reader iframe */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: '#e8e8e8',
        overflow: 'hidden'
      }}>
        <iframe
          ref={iframeRef}
          src={readerUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'white'
          }}
          onLoad={() => {
            console.log('[ZoteroPDFView] Reader 加载完成');

            // 向 Reader 发送初始化消息
            // Zotero Reader 期望收到 {type: 'init', url, title, readOnly}
            setTimeout(() => {
              if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage({
                  type: 'init',
                  url: pdfUrl,
                  title: attachment.title || attachment.filename,
                  readOnly: false
                }, '*');
                console.log('[ZoteroPDFView] 发送初始化消息:', pdfUrl);
              }
            }, 1500);
          }}
        />
      </div>
    </div>
  );
};

// Modal wrapper
interface ZoteroPDFViewModalProps {
  isOpen: boolean;
  attachmentKey: string;
  onClose: () => void;
}

export const ZoteroPDFViewModal: React.FC<ZoteroPDFViewModalProps> = ({
  isOpen,
  attachmentKey,
  onClose
}) => {
  // 这里需要使用你的 Modal 组件
  // 由于我不确定 Modal 的具体实现，暂时直接返回组件
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        maxWidth: '1400px',
        maxHeight: '90vh',
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <ZoteroPDFView
          attachmentKey={attachmentKey}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
