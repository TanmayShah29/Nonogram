import { Metadata } from 'next';
import { decodePuzzle } from '@/lib/puzzleEncoder';
import PlayClient from './PlayClient';
import { Suspense } from 'react';

interface Props {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const resolvedSearchParams = await searchParams;
    const encoded = resolvedSearchParams.p as string;

    if (!encoded) return { title: 'Revelio Puzzle' };

    try {
        const puzzleData = decodePuzzle(encoded);
        if (!puzzleData) return { title: 'Revelio Puzzle' };

        const ogUrl = new URL(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://revelio.link'}/api/og`);
        ogUrl.searchParams.set('title', puzzleData.title || 'A hidden memory awaits...');
        ogUrl.searchParams.set('dim', `${puzzleData.cols}x${puzzleData.rows}`);
        ogUrl.searchParams.set('diff', 'Balanced'); // You could map puzzleData.diffIdx if needed

        return {
            title: `${puzzleData.title} | Revelio`,
            description: 'Solve this nonogram puzzle to reveal the hidden photo.',
            openGraph: {
                title: puzzleData.title,
                description: 'Hide a photo in a puzzle. Share it. Let them solve it.',
                images: [
                    {
                        url: ogUrl.toString(),
                        width: 1200,
                        height: 630,
                    },
                ],
            },
        };
    } catch (e) {
        return { title: 'Revelio Puzzle' };
    }
}

export default async function PlayPage({ params, searchParams }: Props) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const encoded = resolvedSearchParams.p as string;

    return (
        <Suspense fallback={<div className="flex h-full items-center justify-center font-mono text-muted">Loading puzzle...</div>}>
            <PlayClient id={resolvedParams.id} encoded={encoded} />
        </Suspense>
    );
}
