import React, { useState, useEffect } from 'react';
import { useDataStore } from '../hooks/useDataStore';
import { PDFViewer } from '../components/pdf/PDFViewer';
import { Modal } from '../components/modals/Modal';
import './PDFView.css';

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
  const pdfUrl = attachment.url || attachment.link || '';

  return (
    <div className="pdf-view-container">
      <PDFViewer
        url={pdfUrl}
        title={attachment.title || attachment.name}
        onClose={onClose}
      />
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
