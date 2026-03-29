import React, { useState } from 'react';
import { Button } from '../Button';
import classNames from 'classnames';

export interface Creator {
  id: string;
  creatorType: 'author' | 'editor' | 'contributor' | 'translator';
  firstName: string;
  lastName: string;
}

interface CreatorEditorProps {
  creators: Creator[];
  onChange: (creators: Creator[]) => void;
  disabled?: boolean;
}

const CREATOR_TYPES = [
  { value: 'author', label: 'Author' },
  { value: 'editor', label: 'Editor' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'translator', label: 'Translator' }
];

export const CreatorEditor: React.FC<CreatorEditorProps> = ({
  creators,
  onChange,
  disabled = false
}) => {
  const [localCreators, setLocalCreators] = useState<Creator[]>(
    creators.length > 0 ? creators : [{ id: '1', creatorType: 'author', firstName: '', lastName: '' }]
  );

  const addCreator = () => {
    const newCreator: Creator = {
      id: Date.now().toString(),
      creatorType: 'author',
      firstName: '',
      lastName: ''
    };
    const updated = [...localCreators, newCreator];
    setLocalCreators(updated);
    onChange(updated);
  };

  const removeCreator = (id: string) => {
    const updated = localCreators.filter(c => c.id !== id);
    setLocalCreators(updated);
    onChange(updated);
  };

  const updateCreator = (id: string, updates: Partial<Creator>) => {
    const updated = localCreators.map(c =>
      c.id === id ? { ...c, ...updates } : c
    );
    setLocalCreators(updated);
    onChange(updated);
  };

  return (
    <div className="creator-editor">
      <div className="creator-list">
        {localCreators.map((creator, index) => (
          <div key={creator.id} className={classNames('creator-row', { 'creator-row-disabled': disabled })}>
            <span className="creator-number">{index + 1}.</span>

            <select
              value={creator.creatorType}
              onChange={(e) => updateCreator(creator.id, {
                creatorType: e.target.value as Creator['creatorType']
              })}
              disabled={disabled}
              className="creator-type-select"
            >
              {CREATOR_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={creator.firstName}
              onChange={(e) => updateCreator(creator.id, { firstName: e.target.value })}
              disabled={disabled}
              placeholder="First name"
              className="creator-first-name"
            />

            <input
              type="text"
              value={creator.lastName}
              onChange={(e) => updateCreator(creator.id, { lastName: e.target.value })}
              disabled={disabled}
              placeholder="Last name"
              className="creator-last-name"
            />

            {!disabled && localCreators.length > 1 && (
              <button
                type="button"
                onClick={() => removeCreator(creator.id)}
                className="creator-remove"
                aria-label="Remove creator"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <Button
          variant="secondary"
          size="small"
          onClick={addCreator}
          className="creator-add"
        >
          + Add Creator
        </Button>
      )}
    </div>
  );
};
