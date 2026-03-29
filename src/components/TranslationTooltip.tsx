import React, { useState, useEffect, useRef } from 'react';
import { translationService } from '../services/translation';
import './TranslationTooltip.css';

interface TranslationTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  onClose: () => void;
}

export const TranslationTooltip: React.FC<TranslationTooltipProps> = ({
  visible,
  x,
  y,
  selectedText,
  onClose
}) => {
  const [translatedText, setTranslatedText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && selectedText) {
      translateText();
    } else {
      // 清空状态
      setTranslatedText('');
      setError(null);
      setLoading(false);
    }
  }, [visible, selectedText]);

  useEffect(() => {
    // 点击外部关闭
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  const translateText = async () => {
    if (!selectedText || selectedText.trim().length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const result = await translationService.smartTranslate(selectedText);
      setTranslatedText(result.translatedText);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
  };

  if (!visible) return null;

  return (
    <div
      ref={tooltipRef}
      className="translation-tooltip"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 10000
      }}
    >
      <div className="translation-tooltip-header">
        <span className="translation-tooltip-title">翻译结果</span>
        <button
          className="translation-tooltip-close"
          onClick={onClose}
          title="关闭"
        >
          ×
        </button>
      </div>

      <div className="translation-tooltip-original">
        <div className="translation-tooltip-label">原文：</div>
        <div className="translation-tooltip-text">{selectedText}</div>
      </div>

      <div className="translation-tooltip-divider" />

      {loading && (
        <div className="translation-tooltip-loading">
          <div className="translation-tooltip-spinner" />
          <span>翻译中...</span>
        </div>
      )}

      {error && (
        <div className="translation-tooltip-error">
          <span>⚠️ {error}</span>
          <button
            className="translation-tooltip-retry"
            onClick={translateText}
          >
            重试
          </button>
        </div>
      )}

      {!loading && !error && translatedText && (
        <div className="translation-tooltip-result">
          <div className="translation-tooltip-label">译文：</div>
          <div className="translation-tooltip-text translation-tooltip-text-highlight">
            {translatedText}
          </div>
          <button
            className="translation-tooltip-copy"
            onClick={handleCopy}
            title="复制译文"
          >
            📋 复制
          </button>
        </div>
      )}
    </div>
  );
};
