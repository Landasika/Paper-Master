import React, { useState, useEffect } from 'react';
import { useDataStore } from '../hooks/useDataStore';
import { ItemForm } from '../components/forms/ItemForm';
import { Button } from '../components/Button';
import { Item } from '../core/data/Item';
import './ItemEditor.css';

interface ItemEditorProps {
  itemKey?: string;
  itemType?: string;
  onClose?: () => void;
  onSave?: (itemData: Partial<Item>, files?: File[]) => Promise<void>;
}

export const ItemEditor: React.FC<ItemEditorProps> = ({
  itemKey,
  itemType = 'book',
  onClose,
  onSave
}) => {
  const dataStore = useDataStore();
  const [item, setItem] = useState<Partial<Item> | null>(null);
  const [loading, setLoading] = useState(!!itemKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load item for editing
  useEffect(() => {
    async function loadItem() {
      if (!dataStore || !itemKey) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const loadedItem = await dataStore.get<Item>('item', itemKey);
        if (loadedItem) {
          setItem(loadedItem);
        } else {
          setError('Item not found');
        }
      } catch (err) {
        console.error('Failed to load item:', err);
        setError('Failed to load item');
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [dataStore, itemKey]);

  const handleSave = async (itemData: Partial<Item>, files?: File[]) => {
    try {
      setSaving(true);
      setError(null);

      if (onSave) {
        await onSave(itemData, files);
      }

      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save item:', err);
      setError('保存条目失败，请重试。');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="item-editor">
        <div className="item-editor-loading">Loading...</div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="item-editor">
        <div className="item-editor-error">
          <p>{error}</p>
          <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="item-editor">
      <div className="item-editor-header">
        <h2>{itemKey ? 'Edit Item' : 'Create New Item'}</h2>
        {onClose && (
          <button
            className="item-editor-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="item-editor-alert item-editor-alert-error">
          {error}
        </div>
      )}

      <ItemForm
        item={item || undefined}
        itemType={item?.itemType || itemType}
        onSave={handleSave}
        onCancel={onClose}
        loading={saving}
      />
    </div>
  );
};
