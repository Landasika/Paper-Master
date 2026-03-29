import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
}

/**
 * Icon component - ported from desktop version
 */
export const Icon = React.forwardRef<HTMLSpanElement, IconProps>(
  ({ name, className = '', ...props }, ref) => {
    const fullClassName = `icon icon-${name} ${className}`.trim();

    return <span ref={ref} className={fullClassName} {...props} />;
  }
);

Icon.displayName = 'Icon';

interface CSSIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
}

/**
 * CSS Icon component - uses CSS for icon rendering
 */
export const CSSIcon = React.forwardRef<HTMLSpanElement, CSSIconProps>(
  ({ name, className = '', ...props }, ref) => {
    const fullClassName = `icon icon-css icon-${name} ${className}`.trim();

    return <span ref={ref} className={fullClassName} {...props} />;
  }
);

CSSIcon.displayName = 'CSSIcon';

interface FileIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  fileType: string;
}

/**
 * File Icon component - displays icon for specific file types
 */
export const FileIcon = React.forwardRef<HTMLSpanElement, FileIconProps>(
  ({ fileType, className = '', ...props }, ref) => {
    const iconMap: Record<string, string> = {
      'pdf': 'pdf',
      'doc': 'word',
      'docx': 'word',
      'xls': 'excel',
      'xlsx': 'excel',
      'ppt': 'powerpoint',
      'pptx': 'powerpoint',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'mp3': 'audio',
      'wav': 'audio',
      'mp4': 'video',
      'mov': 'video',
      'zip': 'archive',
      'rar': 'archive'
    };

    const iconName = iconMap[fileType.toLowerCase()] || 'default';
    const fullClassName = `icon icon-file icon-${iconName} ${className}`.trim();

    return <span ref={ref} className={fullClassName} {...props} />;
  }
);

FileIcon.displayName = 'FileIcon';
