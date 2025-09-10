import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onRetry?: () => void;
  title?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-2">⚠</div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              {this.props.title || 'Something went wrong'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            {this.props.onRetry && (
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                ↻ Try Again
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface QueryErrorProps {
  error: Error;
  onRetry: () => void;
  title?: string;
}

export const QueryError: React.FC<QueryErrorProps> = ({ error, onRetry, title }) => (
  <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
    <div className="text-center">
      <div className="text-red-500 text-xl mb-2">⚠</div>
      <h3 className="text-sm font-medium text-gray-900 mb-2">
        {title || 'Failed to load data'}
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        {error.message || 'Unable to fetch data from server'}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        ↻ Retry
      </button>
    </div>
  </div>
);

interface SectionWrapperProps {
  children: React.ReactNode;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  skeleton: React.ReactNode;
  title?: string;
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({
  children,
  loading,
  error,
  onRetry,
  skeleton,
  title
}) => {
  if (loading) {
    return <>{skeleton}</>;
  }

  if (error) {
    return <QueryError error={error} onRetry={onRetry} title={title} />;
  }

  return (
    <ErrorBoundary onRetry={onRetry} title={title}>
      {children}
    </ErrorBoundary>
  );
};
