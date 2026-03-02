import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import QRCode from 'qrcode';
import { PuzzleData, encodePuzzle } from '@/lib/puzzleEncoder';
import { DIFF_TAGS } from '@/lib/utils';

import { useRouter } from 'next/navigation';

interface ShareScreenProps {
    onBack: () => void;
}

export default function ShareScreen({ onBack }: ShareScreenProps) {
    const router = useRouter();
    const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
    const [url, setUrl] = useState<string>('');
    const [caption, setCaption] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showQR, setShowQR] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [copyLinkText, setCopyLinkText] = useState('🔗 Copy Link');
    const [copyMsgText, setCopyMsgText] = useState('Copy Challenge Message');
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showPwaNudge, setShowPwaNudge] = useState(false);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        setMounted(true);
        const mobile = /mobile|android|iphone|ipad/i.test(navigator.userAgent);
        setIsMobile(mobile);

        // Check for PWA nudge
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        const nudgeDismissed = localStorage.getItem('revelio_pwa_nudge_dismissed');
        if (mobile && !isStandalone && !nudgeDismissed) {
            setShowPwaNudge(true);
        }

        const stored = sessionStorage.getItem('revelio_puzzle');
        if (stored) {
            const { decodePuzzle } = require('@/lib/puzzleEncoder');
            const data = decodePuzzle(stored);
            if (data) {
                setPuzzleData(data);
                setCaption(data.title);
                setPassword(data.pw || '');
            }
        }
    }, []);

    const isUrlTooLong = url.length > 50000;
    const isUrlLong = url.length > 8000;

    useEffect(() => {
        if (!puzzleData) return;
        // Re-generate URL when caption or password changes
        const newData = { ...puzzleData, title: caption || 'Can you guess what this is? 👀', pw: password || null };
        const encoded = encodePuzzle(newData);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
        const newUrl = `${baseUrl}/play/${newData.id}?p=${encoded}`;
        setUrl(newUrl);
    }, [caption, password, puzzleData]);

    useEffect(() => {
        if (!isUrlTooLong && showQR && qrCanvasRef.current) {
            QRCode.toCanvas(qrCanvasRef.current, url, { width: 200, color: { dark: '#2d2d2d', light: '#ffffff' } }, (err) => { });
        }
    }, [url, showQR, isUrlTooLong]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopyLinkText('Copied ✓');
            setTimeout(() => setCopyLinkText('🔗 Copy Link'), 2000);
        });
    };

    const handleShareChallenge = async () => {
        if (!puzzleData) return;
        const text = `I made you a puzzle 🧩 Can you solve it without giving up?`;
        const shareURL = url;

        if (isMobile && navigator.share) {
            try {
                await navigator.share({ title: puzzleData.title || 'Solve my puzzle!', text, url: shareURL });
            } catch (err) {
                if ((err as Error).name !== 'AbortError') fallbackCopy(`${text}\n${shareURL}`);
            }
        } else {
            fallbackCopy(`${text}\n${shareURL}`);
        }
    };

    const fallbackCopy = async (content: string) => {
        await navigator.clipboard.writeText(content);
        setCopyMsgText('Copied ✓');
        setTimeout(() => setCopyMsgText('Copy Challenge Message'), 2000);
    };

    if (!puzzleData) {
        return <div className="flex h-full items-center justify-center font-mono text-muted">Loading puzzle...</div>;
    }

    return (
        <div className="flex flex-col items-center p-[20px_20px_calc(40px+env(safe-area-inset-bottom,0px))] gap-4 max-w-[720px] w-full mx-auto">
            <h1 className="font-serif italic font-semibold text-[clamp(22px,5vw,32px)] text-text text-center">
                Your puzzle is ready ✦
            </h1>
            <p className="text-[15px] text-body text-center max-w-[360px]">
                Copy the link below and send it to a friend. They don't need an app to play it.
            </p>

            <div className="relative bg-white rounded-[20px] shadow-[0_4px_32px_rgba(0,0,0,.1)] overflow-hidden w-full max-w-[440px]">
                {/* Lock icon if password is set */}
                {password && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 shadow-sm z-10 border border-black/5">
                        <span className="text-[12px]">🔒</span>
                        <span className="text-[10px] font-mono text-text font-bold uppercase tracking-wide">Password protected</span>
                    </div>
                )}

                {/* Teaser Image (Blurred via CSS or already blurred via canvas data URL) */}
                <img
                    src={puzzleData.thumb}
                    className="block w-full h-[200px] object-cover [image-rendering:pixelated] blur-[4px] brightness-105"
                    alt="Hidden Puzzle"
                />

                <div className="p-[16px_18px_18px] flex flex-col gap-3">
                    <input
                        type="text"
                        value={caption}
                        onChange={e => setCaption(e.target.value)}
                        placeholder="Can you guess what this is? 👀"
                        className="font-caveat text-[20px] text-text border-none outline-none border-b-[1.5px] border-solid border-bdr pb-1.5 w-full bg-transparent min-h-[44px] focus:border-terra"
                    />

                    <div className="flex gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-muted bg-bg rounded-[20px] px-2.5 py-1 border border-solid border-bdr">
                            {puzzleData.cols} × {puzzleData.rows}
                        </span>
                        <span className="font-mono text-[11px] text-muted bg-bg rounded-[20px] px-2.5 py-1 border border-solid border-bdr">
                            {DIFF_TAGS[Math.min(puzzleData.diffIdx, 4)]}
                        </span>
                    </div>

                    <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="font-mono text-[12px] text-muted bg-transparent border-none cursor-pointer py-1 text-left w-fit transition-colors hover:text-terra mt-1"
                    >
                        {showPassword ? 'Hide password ▴' : 'Add a password ▾'}
                    </button>

                    {showPassword && (
                        <input
                            type="text"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Add password to lock puzzle..."
                            className="font-sans text-[14px] text-text border border-solid border-bdr p-[8px_12px] rounded-DEFAULT w-full bg-transparent min-h-[44px] focus:border-terra outline-none transition-colors"
                        />
                    )}
                </div>
            </div>
            <div className="font-mono text-[11px] text-muted max-w-[440px] text-center mb-1">
                Puzzle ID: <span className="font-bold">#{puzzleData.id}</span>
            </div>

            <div className="flex flex-col gap-2.5 w-full max-w-[440px]">
                <Button variant="terra" size="full" onClick={handleCopyLink}>
                    {copyLinkText}
                </Button>
                <div className="flex flex-col gap-2.5 w-full">
                    <Button variant="outline" size="full" onClick={handleShareChallenge}>
                        {mounted && isMobile && !!navigator.share ? 'Send to Friend →' : copyMsgText}
                    </Button>
                </div>
            </div>

            <button
                onClick={() => setShowQR(!showQR)}
                className="font-mono text-[12px] text-muted bg-transparent border-none cursor-pointer py-1 min-h-[44px] transition-colors hover:text-terra mt-1"
            >
                {showQR ? 'Hide QR ▴' : 'Show QR Code ▾'}
            </button>

            {mounted && showQR && (
                <div id="qrWrap" className="flex flex-col items-center gap-2.5 bg-white rounded-DEFAULT shadow p-5 w-full max-w-[440px]">
                    {isUrlTooLong ? (
                        <div className="text-center text-body text-[13px]">QR code cannot be generated (URL too long)</div>
                    ) : (
                        <>
                            <div className="text-[12px] text-muted text-center">Long-press to save</div>
                            <canvas ref={qrCanvasRef} className="rounded-[8px]" />
                        </>
                    )}
                </div>
            )}

            {isUrlTooLong ? (
                <div className="text-[12px] text-body text-center max-w-[440px] bg-[#fffbf0] border border-solid border-[#f9e090] rounded-DEFAULT p-[10px_14px] leading-relaxed">
                    ⚠️ This puzzle is very large — the QR code may not scan reliably. The copy-link still works perfectly.
                </div>
            ) : isUrlLong ? (
                <div className="text-[12px] text-body text-center max-w-[440px] bg-[#fffbf0] border border-solid border-[#f9e090] rounded-DEFAULT p-[10px_14px] leading-relaxed">
                    Your puzzle is large — the QR code may be hard to scan. The link works fine.
                </div>
            ) : null}

            <div className="flex flex-col gap-2 w-full max-w-[440px] items-center mt-2">
                <button
                    onClick={() => {
                        const encoded = encodePuzzle(puzzleData);
                        router.push(`/play/${puzzleData.id}?p=${encoded}`);
                    }}
                    className="font-mono text-text bg-transparent border-none cursor-pointer py-2 px-4 hover:underline"
                >
                    Play it yourself
                </button>
                <div className="text-[12px] text-muted mt-2">
                    The photo stays hidden until they solve it · Link works for 30 days
                </div>
                <button onClick={onBack} className="btn-sm font-mono text-muted bg-transparent border-none cursor-pointer flex items-center justify-center gap-1 hover:text-terra h-[36px] mt-2">
                    ↺ Re-generate Puzzle
                </button>
            </div>

            {showPwaNudge && (
                <div className="fixed bottom-6 left-6 right-6 z-[200] bg-text text-white p-4 rounded-[20px] shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-8 duration-500">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                            <div className="w-10 h-10 bg-[#f4845f] rounded-[10px] flex items-center justify-center text-[20px] shrink-0">
                                🧩
                            </div>
                            <div>
                                <h4 className="font-serif italic text-[16px]">Install Revelio</h4>
                                <p className="text-[12px] opacity-80 leading-snug">Add to home screen for a better experience and faster access.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setShowPwaNudge(false);
                                localStorage.setItem('revelio_pwa_nudge_dismissed', 'true');
                            }}
                            className="text-white/60 hover:text-white p-1"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="bg-white/10 rounded-[12px] p-2.5 text-[11px] flex flex-col gap-1.5 opacity-90">
                        <p className="flex items-center gap-2">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded-[4px] font-bold">iOS</span>
                            Tap share <span className="text-[14px]">⎋</span> then "Add to Home Screen"
                        </p>
                        <p className="flex items-center gap-2 border-t border-white/5 pt-1.5">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded-[4px] font-bold">Android</span>
                            Tap the 3 dots <span className="text-[14px]">⋮</span> then "Install app"
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
