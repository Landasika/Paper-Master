import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '../Button';
import './NoteEditor.css';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  readonly?: boolean;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  content,
  onChange,
  onSave,
  onCancel,
  placeholder = 'Start typing your note...',
  readonly = false
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editable: !readonly,
  });

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const unsetLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  if (!editor) {
    return <div className="note-editor-loading">Loading editor...</div>;
  }

  const MenuBar = () => (
    <div className="note-editor-menu">
      <div className="note-editor-menu-group">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`note-editor-button ${editor.isActive('bold') ? 'is-active' : ''}`}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`note-editor-button ${editor.isActive('italic') ? 'is-active' : ''}`}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`note-editor-button ${editor.isActive('strike') ? 'is-active' : ''}`}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          className={`note-editor-button ${editor.isActive('code') ? 'is-active' : ''}`}
          title="Code"
        >
          &lt;/&gt;
        </button>
      </div>

      <div className="note-editor-menu-group">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`note-editor-button ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`note-editor-button ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`note-editor-button ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
          title="Heading 3"
        >
          H3
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`note-editor-button ${editor.isActive('bulletList') ? 'is-active' : ''}`}
          title="Bullet List"
        >
          • List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`note-editor-button ${editor.isActive('orderedList') ? 'is-active' : ''}`}
          title="Numbered List"
        >
          1. List
        </button>
      </div>

      <div className="note-editor-menu-group">
        <button
          onClick={setLink}
          className={`note-editor-button ${editor.isActive('link') ? 'is-active' : ''}`}
          title="Add Link"
        >
          🔗 Link
        </button>
        <button
          onClick={unsetLink}
          disabled={!editor.isActive('link')}
          className="note-editor-button"
          title="Remove Link"
        >
          Unlink
        </button>
      </div>

      <div className="note-editor-menu-group">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="note-editor-button"
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="note-editor-button"
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </button>
      </div>
    </div>
  );

  return (
    <div className="note-editor">
      {!readonly && <MenuBar />}

      <EditorContent
        editor={editor}
        className="note-editor-content"
      />

      <div className="note-editor-footer">
        <div className="note-editor-status">
          {editor.storage.characterCount?.words() || 0} words,
          {editor.storage.characterCount?.characters() || 0} characters
        </div>

        {onSave && (
          <div className="note-editor-actions">
            {onCancel && (
              <Button variant="ghost" size="small" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button variant="primary" size="small" onClick={onSave}>
              Save Note
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
