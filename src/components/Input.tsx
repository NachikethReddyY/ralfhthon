import { InputHTMLAttributes } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export function Input({
  label,
  error,
  helpText,
  className = '',
  type = 'text',
  ...props
}: InputProps) {
  return (
    <div className="input-container">
      {label && (
        <label className="input-label" htmlFor={props.id}>
          {label}
        </label>
      )}
      <input
        type={type}
        className={`input-field ${error ? 'input-field--error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="input-error">{error}</span>}
      {helpText && !error && <span className="input-help">{helpText}</span>}
    </div>
  );
}

export default Input;
