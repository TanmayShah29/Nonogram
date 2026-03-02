'use client';

import { useState } from 'react';
import PuzzlePlayer from '@/components/PuzzlePlayer';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { decodePuzzle } from '@/lib/puzzleEncoder';
import SkeletonGrid from '@/components/SkeletonGrid';
import ErrorBoundary from '@/components/ErrorBoundary';



interface PlayClientProps {
    id: string;
    encoded: string | null;
}

export default function PlayClient({ id, encoded }: PlayClientProps) {
    const router = useRouter();

    if (!encoded) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-[#faf7f2]">
                <h1 className="text-2xl font-bold mb-2">Puzzle not found</h1>
                <p className="text-muted mb-6">The link might be broken or incomplete.</p>
                <button
                    onClick={() => router.push('/')}
                    className="px-6 py-2 bg-terra text-white rounded-full font-mono"
                >
                    Go Home
                </button>
            </div>
        );
    }

    const [passwordVerified, setPasswordVerified] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [passwordShake, setPasswordShake] = useState(false);

    const puzzleData = decodePuzzle(encoded);

    if (!puzzleData) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-[#faf7f2]">
                <h1 className="text-2xl font-bold mb-2">Invalid puzzle data</h1>
                <p className="text-muted mb-6">We couldn't decode this puzzle. It might be corrupt.</p>
                <button
                    onClick={() => router.push('/')}
                    className="px-6 py-2 bg-terra text-white rounded-full font-mono"
                >
                    Go Home
                </button>
            </div>
        );
    }

    const puzzlePassword = puzzleData.pw ?? null;
    const requiresPassword = !!puzzlePassword && !passwordVerified;

    const handlePasswordSubmit = () => {
        if (passwordInput === puzzlePassword) {
            setPasswordVerified(true);
            setPasswordError(false);
        } else {
            setPasswordError(true);
            setPasswordInput('');
            setPasswordShake(true);
            setTimeout(() => setPasswordShake(false), 600);
        }
    };

    if (requiresPassword) {
        return (
            <div className="flex flex-col h-full bg-[#faf7f2] fixed inset-0 z-[100] items-center justify-center p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
                <div className="bg-white rounded-[24px] shadow-[0_12px_48px_rgba(0,0,0,0.12)] w-full max-w-[380px] p-[40px_32px] flex flex-col items-center gap-5 text-center animate-in fade-in zoom-in duration-500">
                    <div className="text-[40px] mb-2 leading-none">🔒</div>
                    <div className="w-full flex flex-col gap-1.5">
                        <h2 className="font-serif italic font-semibold text-[24px] text-text leading-tight truncate px-2">
                            {puzzleData.title || 'Private Puzzle'}
                        </h2>
                        <p className="text-[14px] text-body opacity-80 uppercase tracking-widest font-mono">Password Required</p>
                    </div>

                    <div className="flex flex-col gap-2 mt-2 w-full">
                        <input
                            type="password"
                            placeholder="••••••"
                            value={passwordInput}
                            onChange={(e) => {
                                setPasswordInput(e.target.value);
                                setPasswordError(false);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }}
                            className={`font-mono text-[18px] text-center text-text border-2 border-solid p-[14px] rounded-[14px] w-full bg-[#fcfbf9] outline-none transition-all ${passwordError ? 'border-err bg-err/5' : 'border-bdr focus:border-terra focus:bg-white'} ${passwordShake ? 'animate-shake' : ''}`}
                            autoFocus
                        />
                        {passwordError && (
                            <div className="text-err text-[13px] text-center font-mono font-bold">Incorrect password</div>
                        )}
                    </div>
                    <Button
                        variant="terra"
                        size="full"
                        onClick={handlePasswordSubmit}
                        className="mt-2"
                    >
                        Unlock Puzzle →
                    </Button>
                </div>
                <button onClick={() => router.push('/')} className="bg-transparent border-none text-muted font-mono text-[14px] cursor-pointer py-2 hover:text-terra mt-6">
                    ← Back to start
                </button>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <PuzzlePlayer
                puzzleData={puzzleData}
                onBack={() => router.push('/')}
            />
        </ErrorBoundary>
    );
}
