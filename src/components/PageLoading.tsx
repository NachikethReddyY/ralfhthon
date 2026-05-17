import './PageLoading.css';

interface PageLoadingProps {
  message?: string;
  fullPage?: boolean;
}

/** A branded loading spinner that works as a centered overlay or an inline element. */
export function PageLoading({ message, fullPage = true }: PageLoadingProps) {
  return (
    <div className={`pl-wrap ${fullPage ? 'pl-wrap--full' : ''}`}>
      {/* Three-dot bounce loader */}
      <div className="pl-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      {message && <p className="pl-message">{message}</p>}
    </div>
  );
}

/** Compact inline spinner for status bars, drafts, small actions. */
export function InlineSpinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="pl-inline"
      style={{ width: size, height: size }}
      aria-label="Loading"
    >
      <span className="pl-inline-dot" />
    </span>
  );
}
