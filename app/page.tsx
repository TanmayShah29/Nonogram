'use client';

import { Suspense } from 'react';
import Landing from '@/components/Landing';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center font-mono text-muted">Loading Revelio...</div>}>
      <Landing />
    </Suspense>
  );
}
