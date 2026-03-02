'use client';

import { Suspense, useEffect } from 'react';
import ShareScreen from '@/components/ShareScreen';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function SharePage() {
    const router = useRouter();

    useEffect(() => {
        const data = sessionStorage.getItem('revelio_puzzle');
        if (!data) {
            router.push('/?error=no_puzzle');
        }
    }, [router]);

    return (
        <Suspense fallback={<div className="flex h-full items-center justify-center font-mono text-muted">Generating link...</div>}>
            <ErrorBoundary>
                <ShareScreen
                    onBack={() => router.push('/create')}
                />
            </ErrorBoundary>
        </Suspense>
    );
}
