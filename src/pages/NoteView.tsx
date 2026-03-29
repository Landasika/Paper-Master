import React, { useState, useEffect, useCallback } from 'react';
import { useDataStore } from '../hooks/useDataStore';
import { NoteEditor } from '../components/NoteEditor';
import { Item } from '../core/data/Item';

interface NoteViewProps {
  noteKey?: string;
  parentItemKey?: string;
  onClose?: () => void;
  onSave?: () => void;
}

export const NoteView: React.FC<NoteViewProps> = ({
  noteKey,
  parentItemKey,
  onClose,
  onSave
}) => {
  const dataStore = useDataStore();
  const [note, setNote] = useState<Partial<Item> | null>(null);
  const [content, setContent] = useState('');
  // @ts-ignore - saving will be used in future for manual save functionality
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!noteKey);

  // Load existing note
  useEffect(() => {
    async function loadNote() {
      if (!dataStore || !noteKey) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const loadedNote = await dataStore.get<Item>('item', noteKey);
        if (loadedNote) {
          setNote(loadedNote);
          setContent(loadedNote.note || '');
        } else {
          setError('Note not found');
        }
      } catch (err) {
        console.error('Failed to load note:', err);
        setError('Failed to load note');
      } finally {
        setLoading(false);
      }
    }

    loadNote();
  }, [dataStore, noteKey]);

  // Auto-save with debounce
  const debouncedSave = useCallback(
    debounce(async (noteContent: string) => {
      if (!dataStore) return;

      setAutoSaving(true);
      setError(null);

      try {
        if (noteKey) {
          // Update existing note
          const updated = {
            ...note,
            note: noteContent,
            dateModified: new Date().toISOString()
          };
          await dataStore.save('item', updated);
          setNote(updated);
        } else if (parentItemKey) {
          // Create new note
          const newNote = new Item(dataStore);
          newNote.itemType = 'note';
          newNote.parentKey = parentItemKey;
          newNote.note = noteContent;
          newNote.dateAdded = new Date().toISOString();
          newNote.dateModified = new Date().toISOString();
          await newNote.save();
          setNote(newNote);
        }

        setLastSaved(new Date());
      } catch (err) {
        console.error('Failed to save note:', err);
        setError('Failed to save note');
      } finally {
        setAutoSaving(false);
      }
    }, 2000),
    [dataStore, note, noteKey, parentItemKey]
  );

  // Handle content change
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (!noteKey) {
      // Only auto-save for new notes
      debouncedSave(newContent);
    }
  };

  // Manual save
  const handleSave = async () => {
    if (!dataStore) return;

    setSaving(true);
    setError(null);

    try {
      if (noteKey) {
        const updated = {
          ...note,
          note: content,
          dateModified: new Date().toISOString()
        };
        await dataStore.save('item', updated);
        setNote(updated);
      } else if (parentItemKey) {
        const newNote = new Item(dataStore);
        newNote.itemType = 'note';
        newNote.parentKey = parentItemKey;
        newNote.note = content;
        newNote.dateAdded = new Date().toISOString();
        newNote.dateModified = new Date().toISOString();
        await newNote.save();
        setNote(newNote);
      }

      setLastSaved(new Date());
      if (onSave) {
        onSave();
      }
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save note:', err);
      setError('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="note-view">
        <div className="note-view-loading">Loading note...</div>
      </div>
    );
  }

  return (
    <div className="note-view">
      <div className="note-view-header">
        <h2>{noteKey ? 'Edit Note' : 'New Note'}</h2>
        <div className="note-view-header-actions">
          {autoSaving && <span className="note-saving">Saving...</span>}
          {lastSaved && !autoSaving && (
            <span className="note-saved">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {onClose && (
            <button
              className="note-view-close"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="note-view-error">
          {error}
        </div>
      )}

      <div className="note-view-content">
        <NoteEditor
          content={content}
          onChange={handleContentChange}
          onSave={handleSave}
          onCancel={onClose}
          placeholder="Start typing your note..."
        />
      </div>
    </div>
  );
};

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
