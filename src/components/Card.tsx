import { ReactNode, HTMLAttributes } from 'react';
import './Card.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'dark' | 'elevated';
  children: ReactNode;
}

export function Card({
  variant = 'default',
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div className={`card card--${variant} ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
