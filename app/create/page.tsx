'use client';

import { Suspense, useEffect } from 'react';
import GridPicker from '@/components/GridPicker';
import { useRouter } from 'next/navigation';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function CreatePage() {
    const router = useRouter();

    useEffect(() => {
        const data = sessionStorage.getItem('revelio_upload');
        if (!data) {
            router.push('/?error=no_image');
        }
    }, [router]);

    return (
        <Suspense fallback={<div className="flex h-full items-center justify-center font-mono text-muted">Preparing grid...</div>}>
            <ErrorBoundary>
                <GridPicker
                    onBack={() => router.push('/')}
                    onComplete={() => router.push('/share')}
                />
            </ErrorBoundary>
        </Suspense>
    );
}
