import React, { useState, useEffect } from 'react';
import { useDataStore } from '../hooks/useDataStore';
import { Modal } from '../components/modals/Modal';

interface PDFViewProps {
  attachmentKey: string;
  onClose?: () => void;
}

export const PDFView: React.FC<PDFViewProps> = ({ attachmentKey, onClose }) => {
  const dataStore = useDataStore();
  const [attachment, setAttachment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAttachment() {
      if (!dataStore || !attachmentKey) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const att = await dataStore.get('item', attachmentKey);
        if (att) {
          setAttachment(att);
        } else {
          setError('Attachment not found');
        }
      } catch (err) {
        console.error('Failed to load attachment:', err);
        setError('Failed to load attachment');
      } finally {
        setLoading(false);
      }
    }

    loadAttachment();
  }, [dataStore, attachmentKey]);

  if (loading) {
    return (
      <div className="pdf-view-loading">
        <div className="pdf-view-spinner"></div>
        <p>Loading attachment...</p>
      </div>
    );
  }

  if (error || !attachment) {
    return (
      <div className="pdf-view-error">
        <p>{error || 'Attachment not found'}</p>
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
    );
  }

  // Construct PDF URL
  // Zotero API provides direct links to attachments
  // 优先使用 url，其次使用 link，最后尝试构建路径
  let pdfUrl = '';

  if (attachment.url) {
    pdfUrl = attachment.url;
  } else if (attachment.link) {
    pdfUrl = attachment.link;
  } else if (attachment.path) {
    // 如果有本地路径，尝试转换为 URL
    pdfUrl = attachment.path;
  } else if (attachment.filename) {
    // 如果只有文件名，尝试从服务器构建 URL
    pdfUrl = `http://localhost:3001/uploads/${attachment.filename}`;
  }

  // 如果没有找到 URL，显示错误
  if (!pdfUrl) {
    return (
      <div className="pdf-view-error">
        <p>❌ 无法找到 PDF 文件</p>
        <p>Attachment: {JSON.stringify(attachment, null, 2)}</p>
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
    );
  }

  return (
    <div className="pdf-view-container">
      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title={attachment.title || attachment.name || 'PDF 预览'}
        />
      ) : (
        <div className="pdf-view-error">
          <p>❌ PDF URL 为空</p>
          {onClose && <button onClick={onClose}>Close</button>}
        </div>
      )}
    </div>
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
