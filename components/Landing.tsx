import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button';
import { computeClues } from '@/lib/nonogram';
import { PuzzleData } from '@/lib/puzzleEncoder';
import { useRouter } from 'next/navigation';

interface LandingProps { }

const N = 14;

const DEMOS = [
    { label: 'Heart', diff: 0, fn: (r: number, c: number, n: number) => { const x = (c / n - .5) * 2, y = (r / n - .42) * 2; return (x * x + y * y - 1) ** 3 < x * x * y * y * y ? 1 : 0 } },
    { label: 'House', diff: 1, fn: (r: number, c: number, n: number) => { const m = n / 2; if (r < n * .45 && Math.abs(c - m) <= m - r * (m / (n * .45))) return 1; if (r >= n * .45 && c > n * .15 && c < n * .85) return 1; return 0 } },
    { label: 'Star', diff: 2, fn: (r: number, c: number, n: number) => { const x = c / n - .5, y = r / n - .5, a = Math.atan2(y, x), d = Math.hypot(x, y); return d * (1 + .6 * Math.cos(5 * a)) < .28 ? 1 : 0 } },
];

// Hardcoded 5×5 teaching grid for demo
const DEMO_GRID_5X5 = [
    [0, 1, 1, 0, 0],
    [1, 1, 1, 0, 0],
    [1, 0, 0, 1, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 1, 0]
];

const DEMO_ROW_CLUES = [[2], [3], [1, 1], [3], [2]];
const DEMO_COL_CLUES = [[2], [1, 1], [3], [1, 1], [2]];

export default function Landing({ }: LandingProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [demoCells, setDemoCells] = useState<number[][]>(() =>
        Array.from({ length: 5 }, () => Array(5).fill(0))
    );
    const [demoFrame, setDemoFrame] = useState(0);
    const [isDemoRevealed, setIsDemoRevealed] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        const runSequence = () => {
            // Frame 1: Initial state (0.0s)
            setDemoFrame(1);
            setDemoCells(Array.from({ length: 5 }, () => Array(5).fill(0)));
            setIsDemoRevealed(false);

            // Frame 2: Top-left cell fills (0.5s)
            timer = setTimeout(() => {
                setDemoFrame(2);
                setDemoCells(prev => {
                    const n = [...prev.map(r => [...r])];
                    n[0][1] = 1;
                    return n;
                });
            }, 500);

            // Frame 3: Drag fill row (1.2s)
            timer = setTimeout(() => {
                setDemoFrame(3);
                setDemoCells(prev => {
                    const n = [...prev.map(r => [...r])];
                    n[1][0] = 1; n[1][1] = 1; n[1][2] = 1;
                    return n;
                });
            }, 1200);

            // Frame 4: Column clue dims (2.0s) - (Visualized by CSS later)
            timer = setTimeout(() => {
                setDemoFrame(4);
            }, 2000);

            // Frame 5: More cells fill in (2.8s)
            timer = setTimeout(() => {
                setDemoFrame(5);
                setDemoCells(prev => {
                    const n = [...prev.map(r => [...r])];
                    n[2][0] = 1; n[2][3] = 1; n[3][1] = 1; n[3][2] = 1; n[3][3] = 1;
                    return n;
                });
            }, 2800);

            // Frame 6: Last cell fills - ALL clues dim (3.8s)
            timer = setTimeout(() => {
                setDemoFrame(6);
                setDemoCells(prev => {
                    const n = [...prev.map(r => [...r])];
                    n[0][2] = 1; n[4][2] = 1; n[4][3] = 1;
                    return n;
                });
            }, 3800);

            // Frame 7: Grid ripples / Heart appear (4.4s)
            timer = setTimeout(() => {
                setDemoFrame(7);
                setIsDemoRevealed(true);
            }, 4400);

            // Frame 8: "Revelio! ✦" (5.0s)
            timer = setTimeout(() => {
                setDemoFrame(8);
            }, 5000);

            // Restart (8s)
            timer = setTimeout(() => {
                runSequence();
            }, 8000);
        };

        runSequence();
        return () => clearTimeout(timer);
    }, []);

    const [isDragging, setIsDragging] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'error' | 'warning' } | null>(null);

    const showToast = (text: string, type: 'error' | 'warning') => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg(null), 4000);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const error = params.get('error');
        if (error === 'no_image') showToast("Start by uploading a photo first ✦", 'warning');
        if (error === 'no_puzzle') showToast("Please create a puzzle first ✦", 'warning');

        // Clear param without refresh
        if (error) {
            const url = new URL(window.location.href);
            url.searchParams.delete('error');
            window.history.replaceState({}, '', url.toString());
        }
    }, []);

    const processFile = (file: File) => {
        if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
            showToast("iPhone HEIC photos aren't supported — export as JPG first", 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            try {
                sessionStorage.setItem('revelio_upload', dataUrl);
                router.push('/create');
            } catch (err) {
                showToast("Image too large to process — try a smaller photo or lower quality", 'error');
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const playDemo = (demo: typeof DEMOS[0]) => {
        const grid: number[][] = [];
        for (let r = 0; r < N; r++) {
            const rw: number[] = [];
            for (let c = 0; c < N; c++) rw.push(demo.fn(r, c, N) ? 1 : 0);
            grid.push(rw);
        }

        const rClues = grid.map(r => computeClues(r));
        const cClues = Array.from({ length: N }, (_, c) => computeClues(grid.map(r => r[c])));

        const demoPuzzle: PuzzleData = {
            grid,
            rowClues: rClues,
            colClues: cClues,
            title: demo.label + ' — Demo',
            thumb: '',
            cols: N,
            rows: N,
            diffIdx: demo.diff,
            logicDiff: 'Medium',
            id: 'demo-' + demo.label.toLowerCase()
        };

        // For demo puzzles, we can just encode and go straight to /play?p=...
        // But the user's instructions say to follow /create -> /share -> /play flow or similar.
        // Actually, demos can go straight to play.
        const { encodePuzzle } = require('@/lib/puzzleEncoder');
        router.push(`/play/demo?p=${encodePuzzle(demoPuzzle)}`);
    };

    return (
        <div
            className={`flex flex-col flex-1 pb-10 transition-opacity duration-500 animate-in fade-in ${isDragging ? 'bg-[#f0ece6]' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Toast System */}
            {toastMsg && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className={`px-4 py-2.5 rounded-[12px] shadow-lg text-[14px] font-medium text-white flex items-center gap-2 ${toastMsg.type === 'error' ? 'bg-[#e55039]' : 'bg-[#e58e26]'}`}>
                        {toastMsg.type === 'error' ? '⚠️' : '💡'} {toastMsg.text}
                    </div>
                </div>
            )}

            <div className="flex flex-col items-center pt-8 px-5 gap-7 max-w-[720px] w-full mx-auto md:flex-row md:pt-[60px] md:gap-12 md:justify-center">

                {/* Demo Wrap - 5x5 Teaching Grid */}
                <div className="bg-white rounded-[20px] shadow-xl p-6 flex flex-col items-center gap-4 w-fit shrink-0 md:order-2 border border-[#ede8e1] relative overflow-hidden">
                    {/* SVG Heart Reveal Layer */}
                    {isDemoRevealed && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#faf7f2] animate-in fade-in zoom-in duration-500">
                            <svg width="120" height="120" viewBox="0 0 24 24" fill="#e55039" className="drop-shadow-sm">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </div>
                    )}

                    <div className="flex gap-4">
                        {/* Row Clues */}
                        <div className="flex flex-col gap-[3px] pt-[45px]">
                            {DEMO_ROW_CLUES.map((clue, idx) => (
                                <div key={idx} className={`h-[28px] flex items-center justify-end gap-1 px-1 font-mono text-[11px] font-bold ${demoFrame >= 4 && idx < 2 ? 'text-[#b0a89e] line-through' : 'text-[#6b6661]'}`}>
                                    {clue.join(' ')}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-4">
                            {/* Column Clues */}
                            <div className="flex gap-[3px] pl-[2px]">
                                {DEMO_COL_CLUES.map((clue, idx) => (
                                    <div key={idx} className={`w-[28px] h-[40px] flex flex-col items-center justify-end font-mono text-[11px] font-bold ${demoFrame >= 5 && idx < 2 ? 'text-[#b0a89e] line-through' : 'text-[#6b6661]'}`}>
                                        {clue.map((n, i) => <span key={i}>{n}</span>)}
                                    </div>
                                ))}
                            </div>

                            {/* Grid */}
                            <div className="inline-grid gap-[3px] select-none" style={{ gridTemplateColumns: `repeat(5, 28px)` }}>
                                {demoCells.flat().map((val, i) => (
                                    <div
                                        key={i}
                                        className={`w-[28px] h-[28px] rounded-[3px] transition-all duration-200 ${val === 1 ? 'bg-[#f4845f] scale-100 shadow-sm' : 'bg-[#f0ece6] scale-95 opacity-50'}`}
                                        style={{ transitionDelay: `${(i % 5) * 20}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="font-serif italic text-[14px] text-muted text-center h-[20px] animate-pulse">
                        {demoFrame === 1 && 'Look at the clues...'}
                        {demoFrame === 2 && 'Tap to fill...'}
                        {demoFrame === 3 && 'Drag a row...'}
                        {demoFrame >= 4 && demoFrame < 7 && 'Solving...'}
                        {demoFrame >= 7 && 'Revelio! ✦'}
                    </div>
                </div>

                {/* Hero Text */}
                <div className="flex flex-col items-center text-center gap-3.5 w-full md:items-start md:text-left md:order-1 relative">
                    <h1 className="font-serif italic font-semibold text-[clamp(48px,12vw,72px)] leading-[0.9] text-[#f4845f] max-w-[420px] tracking-tight">
                        Revelio
                    </h1>
                    <p className="text-[16px] md:text-[18px] text-[#2d2d2d] font-sans leading-relaxed max-w-[340px] md:max-w-[380px] -mt-1 opacity-90">
                        Hide a photo in a puzzle. Share it. Let them solve it.
                    </p>

                    <div className={`flex flex-col items-center md:items-start w-full max-w-[380px] mt-4 relative transition-transform ${isDragging ? 'scale-[1.02]' : ''}`}>
                        <Button variant="terra" size="full" className="relative cursor-pointer h-[56px] text-[16px]">
                            {isDragging ? 'Drop photo here ✦' : 'Upload a Photo →'}
                            <input
                                type="file"
                                accept="image/jpeg, image/png, image/gif, image/webp"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                            />
                        </Button>
                        <span className="text-[13px] text-muted font-mono mt-3">JPG, PNG or GIF — any size</span>
                    </div>
                </div>

            </div>

            {/* Examples Section */}
            <div className="w-full pt-10 pb-0 pl-5 md:px-5 mt-4 md:mt-12">
                <div className="font-serif italic text-[1.4rem] text-text mb-5 pr-5">Try a demo puzzle ✦</div>
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-8 pr-8 -webkit-overflow-scrolling-touch md:grid md:grid-cols-3 md:gap-6 md:pb-0 md:pr-0 no-scrollbar">
                    {DEMOS.map(demo => {
                        // Pre-render miniature canvas for the demo card manually via data uri or just simple divs
                        // Since it's N=14, computing CSS grid for the thumbnail is easy and faster than canvas.
                        return (
                            <div
                                key={demo.label}
                                className="min-w-[240px] md:min-w-[180px] md:flex-1 bg-white rounded-[20px] shadow overflow-hidden cursor-pointer snap-start shrink-0 transition-transform active:scale-97 hover:-translate-y-1"
                                onClick={() => playDemo(demo)}
                            >
                                <div className="bg-empty h-[140px] flex items-center justify-center overflow-hidden">
                                    <div
                                        className="inline-grid blur-[2px] opacity-70"
                                        style={{ gridTemplateColumns: `repeat(${N}, 4px)`, gap: '0px' }}
                                    >
                                        {Array.from({ length: N * N }).map((_, i) => {
                                            const r = Math.floor(i / N);
                                            const c = i % N;
                                            return (
                                                <div
                                                    key={i}
                                                    className={`w-[4px] h-[4px] ${demo.fn(r, c, N) ? 'bg-[#2d2d2d]' : 'bg-transparent'}`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="p-3.5 px-4 flex items-center justify-between">
                                    <span className="font-serif italic text-[16px] text-text">{demo.label}</span>
                                    <span className="font-mono text-[12px] text-terra">Try this →</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Credits Section */}
            <div className="mt-12 mb-8 text-center text-[18px] text-[#6b6560] font-serif italic">
                Created by Tanmay Shah
            </div>

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
