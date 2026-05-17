import { ReactNode, HTMLAttributes } from 'react';
import './Container.css';

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  padding?: boolean;
}

export function Container({
  maxWidth = 'lg',
  children,
  padding = true,
  className = '',
  ...props
}: ContainerProps) {
  return (
    <div
      className={`container container--${maxWidth} ${padding ? 'container--padded' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Container;
