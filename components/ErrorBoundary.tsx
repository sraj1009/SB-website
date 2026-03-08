import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    readonly props: Readonly<Props>;

    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        const { hasError, error } = this.state;
        const { children, fallback } = this.props;

        const isNetworkError = error && (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('timeout'));

        if (hasError) {
            return fallback || (
                <div className="min-h-screen flex flex-col items-center justify-center bg-brand-light p-6 text-center">
                    <div className="text-6xl mb-4">{isNetworkError ? '🔌' : '🐝'}</div>
                    <h1 className="text-2xl font-black text-brand-black mb-2">{isNetworkError ? 'Hive Offline / Maintenance' : 'Something buzzed wrong!'}</h1>
                    <p className="text-gray-600 mb-6 max-w-md">
                        {isNetworkError
                            ? 'Our connection to the hive was interrupted. You might be offline or the server is undergoing maintenance. Check your connection and try again.'
                            : 'Our busy bees encountered an unexpected error. Please refresh the page or try again later.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-brand-primary text-brand-black px-6 py-3 rounded-xl font-bold shadow-honey hover:scale-105 transition-transform"
                    >
                        Refresh Honeycomb
                    </button>
                    {process.env.NODE_ENV === 'development' && error && (
                        <pre className="mt-8 p-4 bg-red-50 text-red-800 rounded-lg text-xs text-left overflow-auto max-w-full">
                            {error.toString()}
                        </pre>
                    )}
                </div>
            );
        }

        return children;
    }
}

export default ErrorBoundary;
