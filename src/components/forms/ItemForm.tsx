import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../Button';
import { FieldInput } from './FieldInput';
import { CreatorEditor } from './CreatorEditor';
import type { Creator } from './CreatorEditor';
import { getFieldsForItemType, getItemTypeOptions } from '../../config/itemTypes';
import type { Item } from '../../core/data/Item';

interface ItemFormProps {
  item?: Partial<Item>;
  itemType: string;
  onChange?: (item: Partial<Item>) => void;
  onSave?: (item: Partial<Item>, files?: File[]) => void;
  onCancel?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const ItemForm: React.FC<ItemFormProps> = ({
  item: initialItem,
  itemType,
  onChange,
  onSave,
  onCancel,
  disabled = false,
  loading = false
}) => {
  const [item, setItem] = useState<Partial<Item>>(
    initialItem || {
      itemType,
      title: '',
      creators: [],
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString()
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attachments, setAttachments] = useState<File[]>([]);

  const { required, optional } = getFieldsForItemType(itemType);

  // Update local state when initialItem changes
  useEffect(() => {
    if (initialItem) {
      setItem(initialItem);
    }
  }, [initialItem]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      onChange(item);
    }
  }, [item, onChange]);

  const updateField = useCallback((fieldName: string, value: any) => {
    setItem(prev => ({ ...prev, [fieldName]: value }));
    setTouched(prev => ({ ...prev, [fieldName]: true }));

    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, [errors]);

  const updateCreators = useCallback((creators: Creator[]) => {
    // Convert to Zotero format
    const zoteroCreators = creators
      .filter(c => c.firstName || c.lastName)
      .map(c => ({
        creatorType: c.creatorType,
        firstName: c.firstName,
        lastName: c.lastName
      }));

    updateField('creators', zoteroCreators);
  }, [updateField]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setAttachments(prev => [...prev, ...files]);

    // 自动提取文件名作为标题
    if (files.length > 0 && !item.title) {
      const firstFileName = files[0].name;
      // 移除扩展名
      const title = firstFileName.replace(/\.(pdf|ps)$/i, '');
      updateField('title', title);
    }
  }, [item.title, updateField]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 如果有附件，标题就是必需的（自动从文件名提取）
    if (attachments.length > 0) {
      const title = item.title || attachments[0].name.replace(/\.(pdf|ps)$/i, '');
      if (!title) {
        newErrors.title = '标题不能为空';
      }
    } else {
      // 没有附件时，正常验证必填字段
      required.forEach(field => {
        const value = item[field.name as keyof Item];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors[field.name] = `${field.label} is required`;
        }
      });

      // Special validation for creators
      if (itemType === 'book' || itemType === 'journalArticle') {
        if (!item.creators || item.creators.length === 0) {
          newErrors.creators = 'At least one author is required';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 如果有附件但没有标题，自动从文件名提取
    let finalItem = { ...item };
    if (attachments.length > 0 && !finalItem.title) {
      const firstFileName = attachments[0].name;
      finalItem = {
        ...finalItem,
        title: firstFileName.replace(/\.(pdf|ps)$/i, '')
      };
    }

    if (validate()) {
      // Update dateModified
      const itemToSave = {
        ...finalItem,
        dateModified: new Date().toISOString()
      };

      if (onSave) {
        // 传递实际的File对象给数据存储
        onSave(itemToSave, attachments.length > 0 ? attachments : undefined);
      }
    } else {
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {};
      required.forEach(f => { allTouched[f.name] = true; });
      setTouched(allTouched);
    }
  };

  const handleBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  };

  return (
    <form onSubmit={handleSubmit} className="item-form">
      {/* Item Type Selector (only for new items) */}
      {!item.key && (
        <div className="form-group">
          <label htmlFor="itemType">Item Type</label>
          <select
            id="itemType"
            value={itemType}
            onChange={(e) => updateField('itemType', e.target.value)}
            disabled={disabled}
            className="form-input"
          >
            {getItemTypeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Required Fields */}
      {required.length > 0 && (
        <div className="form-section">
          <h3>Required Information</h3>
          {required.map(field => {
            if (field.name === 'creators') {
              return (
                <div key={field.name} className="form-group">
                  <label>{field.label}</label>
                  <CreatorEditor
                    creators={item.creators?.map((c, i) => ({
                      id: String(i),
                      creatorType: c.creatorType as any,
                      firstName: c.firstName || '',
                      lastName: c.lastName || ''
                    })) || []}
                    onChange={updateCreators}
                    disabled={disabled}
                  />
                  {touched[field.name] && errors[field.name] && (
                    <span className="form-error">{errors[field.name]}</span>
                  )}
                </div>
              );
            }

            return (
              <div key={field.name} className="form-group">
                <label htmlFor={field.name}>
                  {field.label}
                  {field.name === 'title' && <span className="required">*</span>}
                </label>
                <FieldInput
                  fieldName={field.name}
                  value={item[field.name as keyof Item]}
                  onChange={(value) => updateField(field.name, value)}
                  required={field.name === 'title'}
                  disabled={disabled}
                  onBlur={() => handleBlur(field.name)}
                />
                {touched[field.name] && errors[field.name] && (
                  <span className="form-error">{errors[field.name]}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Optional Fields */}
      {optional.length > 0 && (
        <div className="form-section">
          <h3>
            Additional Information
            <button
              type="button"
              className="toggle-section"
              onClick={() => {
                const section = document.querySelector('.optional-fields');
                section?.classList.toggle('collapsed');
              }}
            >
              Show/Hide
            </button>
          </h3>
          <div className="optional-fields">
            {optional.map(field => (
              <div key={field.name} className="form-group">
                <label htmlFor={field.name}>{field.label}</label>
                <FieldInput
                  fieldName={field.name}
                  value={item[field.name as keyof Item]}
                  onChange={(value) => updateField(field.name, value)}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Attachments */}
      <div className="form-section">
        <h3>
          📄 拖拽 PDF 文件到下方
          {attachments.length > 0 && (
            <span className="upload-success"> ✓ 已选择 {attachments.length} 个文件</span>
          )}
        </h3>
        <input
          type="file"
          accept=".pdf,.ps"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            handleFilesSelected(files);
          }}
          disabled={disabled}
          style={{ marginBottom: '1rem' }}
        />

        {attachments.length > 0 && (
          <div className="quick-save-hint">
            💡 提示：文件名会自动用作标题，可以直接点击"保存"按钮
          </div>
        )}

        {attachments.length > 0 && (
          <div className="file-uploader-list">
            {attachments.map((file, index) => (
              <div key={index} className="file-uploader-item">
                <div className="file-uploader-item-info">
                  <span className="file-uploader-item-name">📄 {file.name}</span>
                  <span className="file-uploader-item-size">
                    ({Math.round(file.size / 1024)}KB)
                  </span>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    className="file-uploader-item-remove"
                    onClick={() => handleRemoveAttachment(index)}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      {!disabled && (
        <div className="form-actions">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
          >
            {attachments.length > 0 ? '💾 保存条目' : (item.key ? 'Save Changes' : 'Create Item')}
          </Button>
        </div>
      )}
    </form>
  );
};
