/**
 * ErrorBoundary — catches JavaScript errors in component tree
 * 
 * Copilot: Prevents components from crashing the entire application.
 * Features:
 * - Catches errors during rendering, lifecycle methods, and constructors
 * - Shows fallback UI instead of blank screen
 * - Logs error details for debugging
 * - Provides recovery mechanism
 * 
 * Usage: <ErrorBoundary><ComponentThatMightFail /></ErrorBoundary>
 */

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    showDetails?: boolean;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Update state with error info
        this.setState({
            error,
            errorInfo
        });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="glass-card rounded-glass-card p-6 border border-glass-bright/20 max-w-md mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-status-error" />
                        <h3 className="text-lg font-semibold text-glass-bright">Something went wrong</h3>
                    </div>

                    <p className="text-glass-muted mb-4">
                        A component error occurred. This has been logged for debugging.
                    </p>

                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 px-4 py-2 bg-glass/20 hover:bg-glass/30 
                     border border-glass-bright/20 rounded-glass text-glass-bright 
                     transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </button>

                    {this.props.showDetails && this.state.error && (
                        <details className="mt-4">
                            <summary className="text-sm text-glass-muted cursor-pointer hover:text-glass-bright">
                                Error Details
                            </summary>
                            <pre className="mt-2 p-3 bg-glass/10 rounded-glass text-xs text-status-error 
                            overflow-auto max-h-32 border border-glass/20">
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;