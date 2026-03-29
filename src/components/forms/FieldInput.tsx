import React from 'react';
import classNames from 'classnames';
import { FIELD_DEFINITIONS } from '../../config/itemTypes';

interface FieldInputProps {
  fieldName: string;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onBlur?: () => void;
}

export const FieldInput: React.FC<FieldInputProps> = ({
  fieldName,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder,
  onBlur
}) => {
  const fieldDef = FIELD_DEFINITIONS[fieldName];

  if (!fieldDef) {
    // Default text input
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        onBlur={onBlur}
        className="form-input"
      />
    );
  }

  const inputClassName = classNames(
    'form-input',
    `form-input-${fieldDef.type}`
  );

  switch (fieldDef.type) {
    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder || fieldDef.placeholder}
          onBlur={onBlur}
          className={inputClassName}
          rows={4}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : '')}
          disabled={disabled}
          placeholder={placeholder || fieldDef.placeholder}
          onBlur={onBlur}
          className={inputClassName}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          onBlur={onBlur}
          className={inputClassName}
        />
      );

    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          onBlur={onBlur}
          className={inputClassName}
        >
          <option value="">Select...</option>
          {fieldDef.options?.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case 'text':
    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder || fieldDef.placeholder}
          onBlur={onBlur}
          className={inputClassName}
          required={required}
        />
      );
  }
};
