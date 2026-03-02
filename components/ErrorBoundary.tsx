'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-[24px] border border-bdr shadow-sm">
                    <div className="text-[48px] mb-4">😕</div>
                    <h2 className="font-serif italic text-[24px] text-text mb-3">Something went wrong</h2>
                    <p className="text-[14px] text-body mb-6 max-w-[280px]">
                        The puzzle couldn't load correctly. This might be due to a broken link or an unexpected error.
                    </p>
                    <Button variant="terra" onClick={() => window.location.href = '/'}>
                        Return to Home
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
