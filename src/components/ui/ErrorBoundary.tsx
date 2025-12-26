import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service in production
    if (import.meta.env.PROD) {
      console.error('Error caught by boundary:', error, errorInfo);
      // TODO: Send to error tracking service
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-error/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Something went wrong
            </h1>
            <p className="text-text-secondary mb-6">
              We encountered an unexpected error. Your funds are safe.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="bg-bg-secondary rounded-xl p-4 mb-6 text-left">
                <p className="text-xs text-error font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={this.handleRetry}
              >
                Try Again
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={this.handleReload}
              >
                Reload App
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
