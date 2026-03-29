import React, { useState, useRef } from 'react';
import './FileUploader.css';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // bytes
  disabled?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  accept = ".pdf,.ps",
  multiple = false,
  maxSize = 50 * 1024 * 1024, // 50MB
  disabled = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = (files: File[]): { valid: File[], errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      if (file.size > maxSize) {
        errors.push(`${file.name} 超过大小限制 (${Math.round(maxSize / 1024 / 1024)}MB)`);
      } else if (!accept.split(',').some(ext => file.name.toLowerCase().endsWith(ext.trim()))) {
        errors.push(`${file.name} 文件类型不支持`);
      } else {
        valid.push(file);
      }
    });

    return { valid, errors };
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    const fileArray = Array.from(files);
    const { valid, errors } = validateFiles(fileArray);

    if (errors.length > 0) {
      setError(errors.join(', '));
    }

    if (valid.length > 0) {
      setUploading(true);
      // Simulate upload delay
      setTimeout(() => {
        onFilesSelected(valid);
        setUploading(false);
        // Reset input
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }, 500);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="file-uploader">
      <div
        className={`file-uploader-dropzone ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          disabled={disabled}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div className="file-uploader-content">
            <div className="file-uploader-icon">⏳</div>
            <p className="file-uploader-text">上传中...</p>
          </div>
        ) : (
          <div className="file-uploader-content">
            <div className="file-uploader-icon">📄</div>
            <p className="file-uploader-text">
              {dragActive ? '释放文件以上传' : '拖拽文件到此处或点击选择'}
            </p>
            <p className="file-uploader-hint">
              支持的格式: {accept} (最大 {Math.round(maxSize / 1024 / 1024)}MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="file-uploader-error">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};
