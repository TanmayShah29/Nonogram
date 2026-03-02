'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PuzzleData } from '@/lib/puzzleEncoder';

const PuzzlePlayer = dynamic(() => import('@/components/PuzzlePlayer'), { ssr: false });

export default function PreviewClient() {
    const router = useRouter();
    const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
    const [isCreator, setIsCreator] = useState(false);

    useEffect(() => {
        const creator = sessionStorage.getItem('creatorPreview');
        if (!creator) {
            router.replace('/');
            return;
        }

        const dataStr = sessionStorage.getItem('creatorPreviewData');
        if (dataStr) {
            try {
                setPuzzleData(JSON.parse(dataStr));
                setIsCreator(true);
            } catch (e) {
                router.replace('/');
            }
        } else {
            router.replace('/');
        }
    }, [router]);

    if (!isCreator || !puzzleData) {
        return <div className="min-h-screen bg-[#faf7f2]"></div>;
    }

    return (
        <PuzzlePlayer
            puzzleData={puzzleData}
            isCreatorMode={true}
            onBack={() => router.push('/share')}
        />
    );
}
