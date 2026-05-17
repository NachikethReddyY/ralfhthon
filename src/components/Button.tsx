import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'secondary-dark' | 'text-link';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  disabled,
  className = '',
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="btn-loading">Loading...</span> : children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
