'use client';

import { useState } from 'react';
import PuzzlePlayer from '@/components/PuzzlePlayer';
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
                <div className="bg-white rounded-[20px] shadow-[0_4px_32px_rgba(0,0,0,.1)] w-full max-w-[400px] p-[32px] flex flex-col items-center gap-4 text-center animate-in fade-in zoom-in duration-300">
                    <div className="text-[32px] mb-2 leading-none">🔒</div>
                    <h2 className="font-serif italic font-semibold text-[24px] text-text leading-tight w-full truncate px-4">
                        {puzzleData.title || 'A puzzle is waiting for you'}
                    </h2>
                    <p className="text-[15px] text-body -mt-2">This puzzle is password protected</p>

                    <div className="flex flex-col gap-2 mt-2 w-full">
                        <input
                            type="password"
                            placeholder="Enter password"
                            value={passwordInput}
                            onChange={(e) => {
                                setPasswordInput(e.target.value);
                                setPasswordError(false);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }}
                            className={`font-sans text-[16px] text-center text-text border-[1.5px] border-solid p-[12px] rounded-[10px] w-full bg-transparent min-h-[48px] outline-none transition-colors ${passwordError ? 'border-err' : 'border-bdr focus:border-terra'} ${passwordShake ? 'shake' : ''}`}
                            autoFocus
                        />
                        {passwordError && (
                            <div className="text-err text-[13px] text-center font-mono animate-in shake duration-300">Wrong password — try again</div>
                        )}
                    </div>
                    <button
                        onClick={handlePasswordSubmit}
                        className="font-mono text-[15px] min-h-[48px] rounded-[10px] px-[20px] w-full bg-[#f4845f] hover:bg-[#e06a43] text-white font-medium cursor-pointer transition-colors border-none mt-2 active:scale-95 inline-flex items-center justify-center"
                    >
                        Unlock Puzzle →
                    </button>
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
