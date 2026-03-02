/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Landing from './Landing';
import GridPicker from './GridPicker';
import ShareScreen from './ShareScreen';
import PuzzlePlayer from './PuzzlePlayer';
import { Button } from './ui/Button';
import { decodePuzzle, PuzzleData } from '@/lib/puzzleEncoder';

export type ViewState = 'landing' | 'picker' | 'share' | 'player';

export default function AppClient() {
    const searchParams = useSearchParams();
    const [view, setView] = useState<ViewState>('landing');

    // Global State
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
    const [shareUrl, setShareUrl] = useState<string>('');
    const [teaserThumb, setTeaserThumb] = useState<string>('');

    const [passwordVerified, setPasswordVerified] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [passwordShake, setPasswordShake] = useState(false);

    const puzzlePassword = puzzleData?.pw ?? null;
    const requiresPassword = view === 'player' && !!puzzlePassword && !passwordVerified;

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

    useEffect(() => {
        const puzzleParam = searchParams.get('puzzle');
        if (puzzleParam) {
            const decoded = decodePuzzle(puzzleParam);
            if (decoded) {
                setPuzzleData(decoded);
                setView('player');
            } else {
                alert("This puzzle link seems invalid or corrupted.");
                setView('landing');
            }
        }
    }, [searchParams]);

    const handleImageUpload = (file: File) => {
        setUploadedFile(file);
        setView('picker');
    };

    const handleGenerate = (data: PuzzleData, url: string, thumb: string) => {
        setPuzzleData(data);
        setShareUrl(url);
        setTeaserThumb(thumb);
        setView('share');
    };

    const handleRegenerate = () => {
        setView('picker');
    };

    const handleStartDemo = (data: PuzzleData) => {
        setPuzzleData(data);
        setView('player');
    };

    return (
        <>
            {view === 'landing' && <Landing onUpload={handleImageUpload} onStartDemo={handleStartDemo} />}
            {view === 'picker' && uploadedFile && (
                <GridPicker
                    uploadedFile={uploadedFile}
                    onGenerate={handleGenerate}
                    onBack={() => setView('landing')}
                />
            )}
            {view === 'share' && puzzleData && (
                <ShareScreen
                    puzzleData={puzzleData}
                    shareUrl={shareUrl}
                    teaserThumb={teaserThumb}
                    onRegenerate={handleRegenerate}
                    onPlay={() => setView('player')}
                />
            )}
            {view === 'player' && puzzleData && requiresPassword && (
                <div className="flex flex-col h-full bg-[#faf7f2] fixed inset-0 z-[100] items-center justify-center p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
                    <div className="bg-white rounded-[20px] shadow-[0_4px_32px_rgba(0,0,0,.1)] w-full max-w-[400px] p-[32px] flex flex-col items-center gap-4 text-center">
                        <div className="text-[32px] mb-2 leading-none">🔒</div>
                        <h2 className="font-serif italic font-semibold text-[24px] text-text leading-tight w-full truncate">
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
                                <div className="text-err text-[13px] text-center font-mono">Wrong password — try again</div>
                            )}
                        </div>
                        <button
                            onClick={handlePasswordSubmit}
                            className="font-mono text-[15px] min-h-[48px] rounded-[10px] px-[20px] w-full bg-[#f4845f] hover:bg-[#e06a43] text-white font-medium cursor-pointer transition-colors border-none mt-2 active:scale-95 inline-flex items-center justify-center"
                        >
                            Unlock Puzzle →
                        </button>
                    </div>
                    <button onClick={() => setView('landing')} className="bg-transparent border-none text-muted font-mono text-[14px] cursor-pointer py-2 hover:text-terra mt-6">
                        ← Back to start
                    </button>
                </div>
            )}
            {view === 'player' && puzzleData && !requiresPassword && (
                <PuzzlePlayer
                    puzzleData={puzzleData}
                    onBack={() => setView('landing')}
                />
            )}
        </>
    );
}
