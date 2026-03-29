import React from 'react';
import classNames from 'classnames';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: string;
}

/**
 * Button component - ported from desktop version
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'medium',
    loading = false,
    icon,
    children,
    className,
    disabled,
    ...props
  }, ref) => {
    const buttonClassName = classNames(
      'button',
      `button-${variant}`,
      `button-${size}`,
      {
        'button-loading': loading,
        'button-with-icon': icon
      },
      className
    );

    return (
      <button
        ref={ref}
        className={buttonClassName}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="button-spinner" />}
        {icon && !loading && <span className={`button-icon icon-${icon}`} />}
        {children && <span className="button-text">{children}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
