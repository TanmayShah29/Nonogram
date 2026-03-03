import React, { useState, useEffect, useRef, useCallback } from 'react';
import PuzzleGrid from './PuzzleGrid';
import Toolbar, { ToolType } from './Toolbar';
import { Button } from './ui/Button';
import RevealAnimation from './RevealAnimation';
import { PuzzleData } from '@/lib/puzzleEncoder';
import { computeClues } from '@/lib/nonogram';

// FUTURE FEATURES (do not implement yet):
// 1. Multiplayer/collaborative solving — WebSockets, real-time
// 2. Puzzle packs/collections — multiple puzzles one link
// 3. Timed challenge mode — countdown timer, creator sets limit
// 4. Puzzle comments/reactions — emoji reactions after solve
// 5. Animated GIF support — each frame = one puzzle
// 6. Custom cell shapes — circles, diamonds
// 7. Sound pack selection — audio themes
// 8. Puzzle history/profile page — creator stats

interface PuzzlePlayerProps {
    puzzleData: PuzzleData;
    isCreatorMode?: boolean;
    onBack: () => void;
}

function findMostHelpfulRow(
    playerGrid: number[][],
    solution: number[][],
    alreadyHinted: Set<number>
): number {
    let bestRow = -1;
    let mostErrors = 0;

    for (let r = 0; r < solution.length; r++) {
        if (alreadyHinted.has(r)) continue;
        let errors = 0;
        let attempts = 0;
        for (let c = 0; c < solution[r].length; c++) {
            if (playerGrid[r][c] !== 0) attempts++;
            if (playerGrid[r][c] !== solution[r][c]) errors++;
        }
        const score = attempts > 0 ? errors * 2 : errors;
        if (score > mostErrors) {
            mostErrors = score;
            bestRow = r;
        }
    }

    if (bestRow === -1) {
        let mostFilled = 0;
        for (let r = 0; r < solution.length; r++) {
            if (alreadyHinted.has(r)) continue;
            const filled = solution[r].filter(c => c === 1).length;
            if (filled > mostFilled) {
                mostFilled = filled;
                bestRow = r;
            }
        }
    }
    return bestRow;
}


const safeSave = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // localStorage blocked (private mode) — continue without saving
    }
};

const safeRemove = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch { }
};


export default function PuzzlePlayer({ puzzleData, isCreatorMode, onBack }: PuzzlePlayerProps) {
    const { cols, rows, rowClues, colClues, grid: answerGrid, id } = puzzleData;

    const [playerGrid, setPlayerGrid] = useState<number[][]>(() =>
        Array.from({ length: rows }, () => Array(cols).fill(0))
    );

    const [activeTool, setActiveTool] = useState<ToolType>('fill');
    const [timerSec, setTimerSec] = useState(0);
    const [timerOn, setTimerOn] = useState(false);
    const [undoStack, setUndoStack] = useState<{ r: number, c: number, prev: number }[][]>([]);

    const [clueDoneRows, setClueDoneRows] = useState<boolean[]>(Array(rows).fill(false));
    const [clueDoneCols, setClueDoneCols] = useState<boolean[]>(Array(cols).fill(false));

    // Status
    const [playState, setPlayState] = useState<'preview' | 'playing'>('preview');
    const [solveCount, setSolveCount] = useState(0);
    const [toastMsg, setToastMsg] = useState('');
    const [progress, setProgress] = useState(0);

    // Hints
    const [hintCell, setHintCell] = useState<{ type: 'row' | 'col', index: number } | null>(null);
    const [hintedRows, setHintedRows] = useState<Set<number>>(new Set());
    const [nextHintAt, setNextHintAt] = useState(5 * 60);
    const [manualHintsUsed, setManualHintsUsed] = useState(0);
    const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Win / Reveal State
    const [isRevealed, setIsRevealed] = useState(false);
    const [showWinSheet, setShowWinSheet] = useState(false);
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);
    const [isGivingUp, setIsGivingUp] = useState(false);

    const actxRef = useRef<AudioContext | null>(null);
    const hasRevealed = useRef(false);

    useEffect(() => {
        if (toastMsg) {
            const t = setTimeout(() => setToastMsg(''), 4000);
            return () => clearTimeout(t);
        }
    }, [toastMsg]);

    useEffect(() => {
        // Load save - check if exists
        if (id && !isCreatorMode) {
            const saved = localStorage.getItem(`nono_${id}`);
            if (saved) {
                setShowRestorePrompt(true);
            }
            setSolveCount(parseInt(localStorage.getItem(`revelio_solves_${id}`) || '0', 10));
        }

        // Setup Audio Context interaction listener
        const initAudio = () => {
            if (!actxRef.current) {
                try {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    if (!AudioContextClass) return;
                    actxRef.current = new AudioContextClass();
                } catch (e) {
                    console.error("Failed to initialize AudioContext:", e);
                }
            }
        };
        document.addEventListener('pointerdown', initAudio, { once: true });
        document.addEventListener('keydown', initAudio, { once: true });

        return () => {
            document.removeEventListener('pointerdown', initAudio);
            document.removeEventListener('keydown', initAudio);
        };
    }, [id]);

    const handleRestore = () => {
        const saved = localStorage.getItem(`nono_${id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.grid && parsed.grid.length === rows) {
                    setPlayerGrid(parsed.grid);
                    if (parsed.time) setTimerSec(parsed.time);
                    if (parsed.tool) setActiveTool(parsed.tool);
                    if (parsed.hintedRows) setHintedRows(new Set(parsed.hintedRows));
                    if (parsed.nextHintAt) setNextHintAt(parsed.nextHintAt);
                } else if (Array.isArray(parsed)) {
                    // Legacy support
                    setPlayerGrid(parsed);
                }
            } catch (e) { }
        }
        setShowRestorePrompt(false);
        setPlayState('playing');
    };

    const handleSkipRestore = () => {
        safeRemove(`nono_${id}`);
        setShowRestorePrompt(false);
        setPlayState('playing');
    };

    // Timer Interval
    useEffect(() => {
        if (!timerOn) return;
        const interval = setInterval(() => {
            setTimerSec(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [timerOn]);

    // Auto Hint logic
    useEffect(() => {
        if (timerSec >= nextHintAt && !isRevealed && !isGivingUp && playState === 'playing') {
            const bestRow = findMostHelpfulRow(playerGrid, answerGrid, hintedRows);
            if (bestRow !== -1) {
                setHintedRows(prev => new Set([...prev, bestRow]));
                setNextHintAt(prev => prev + 5 * 60);
                setToastMsg(`💡 A hint appeared in row ${bestRow + 1}...`);
            }
        }
    }, [timerSec, nextHintAt, isRevealed, isGivingUp, playState]);

    // Validation Effect (runs whenever playerGrid changes)
    useEffect(() => {
        let win = true;
        let filledCount = 0;
        const newlyDoneRows = [...clueDoneRows];
        const newlyDoneCols = [...clueDoneCols];
        let playedSound = false;

        const bin = playerGrid.map(row => row.map(v => v === 1 ? 1 : 0));

        // Rows
        for (let r = 0; r < rows; r++) {
            const rmText = computeClues(bin[r]).join(',');
            const ansText = computeClues(answerGrid[r]).join(',');
            const isDone = rmText === ansText;
            if (isDone && !clueDoneRows[r]) playedSound = true;
            newlyDoneRows[r] = isDone;
        }

        // Cols
        for (let c = 0; c < cols; c++) {
            const colBin = bin.map(row => row[c]);
            const colAns = answerGrid.map(row => row[c]);
            const cmText = computeClues(colBin).join(',');
            const ansText = computeClues(colAns).join(',');
            const isDone = cmText === ansText;
            if (isDone && !clueDoneCols[c]) playedSound = true;
            newlyDoneCols[c] = isDone;
        }

        if (playedSound && actxRef.current) {
            const actx = actxRef.current;
            const osc = actx.createOscillator();
            const gain = actx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, actx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, actx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.1, actx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.1);
            osc.connect(gain); gain.connect(actx.destination);
            osc.start(); osc.stop(actx.currentTime + 0.1);
        }

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tv = answerGrid[r][c] === 1;
                const pv = playerGrid[r][c] === 1;
                if (playerGrid[r][c] === 1 || playerGrid[r][c] === 2 || playerGrid[r][c] === 3) filledCount++;
                if (tv !== pv) win = false;
            }
        }

        setClueDoneRows(newlyDoneRows);
        setClueDoneCols(newlyDoneCols);

        const prog = Math.min(100, Math.round((filledCount / (rows * cols)) * 100));
        setProgress(prog);

        if (id && timerOn && !isCreatorMode) {
            const saveObj = {
                grid: playerGrid,
                time: timerSec,
                tool: activeTool,
                hintedRows: Array.from(hintedRows),
                nextHintAt,
                updatedAt: Date.now()
            };
            safeSave(`nono_${id}`, JSON.stringify(saveObj));
        }

        const atLeastOneFilled = playerGrid.some(row => row.some(v => v === 1));

        if (win && atLeastOneFilled && !hasRevealed.current) {
            hasRevealed.current = true;
            setTimerOn(false);
            if (id && !isCreatorMode) {
                safeRemove(`nono_${id}`);
                const prevSolves = parseInt(localStorage.getItem(`revelio_solves_${id}`) || '0', 10);
                safeSave(`revelio_solves_${id}`, String(prevSolves + 1));
            }

            if (isCreatorMode) {
                sessionStorage.setItem('revelio_playtested', 'true');
                sessionStorage.setItem('revelio_solve_time', formatTime(timerSec));
            }

            setTimeout(() => {
                setIsRevealed(true);
                setTimeout(() => setShowWinSheet(true), 1600);
            }, 200);
        }
    }, [playerGrid]);

    const handleApplyCell = useCallback((r: number, c: number, v: number) => {
        // Start timer ONLY on first cell interaction
        if (!timerOn && !isRevealed && !showRestorePrompt && !isGivingUp) {
            setTimerOn(true);
        }
        setPlayerGrid(prev => {
            const next = [...prev];
            next[r] = [...next[r]];
            next[r][c] = v;
            return next;
        });
    }, [timerOn, isRevealed, showRestorePrompt, isGivingUp]);

    const handleDragEnd = useCallback((group: { r: number, c: number, prev: number }[]) => {
        setUndoStack(prev => {
            const next = [...prev, group];
            if (next.length > 50) next.shift();
            return next;
        });
    }, []);

    const handleUndo = () => {
        if (undoStack.length === 0) return;
        const newStack = [...undoStack];
        const group = newStack.pop()!;

        setPlayerGrid(prev => {
            const next = [...prev];
            for (let i = group.length - 1; i >= 0; i--) {
                const step = group[i];
                next[step.r] = [...next[step.r]];
                next[step.r][step.c] = step.prev;
            }
            return next;
        });
        setUndoStack(newStack);
    };

    const forceHint = () => {
        if (manualHintsUsed >= 3 && !isCreatorMode) return;
        const bestRow = findMostHelpfulRow(playerGrid, answerGrid, hintedRows);
        if (bestRow !== -1) {
            setHintedRows(prev => new Set([...prev, bestRow]));
            if (!isCreatorMode) setManualHintsUsed(h => h + 1);
            setToastMsg(`💡 Forced hint appeared in row ${bestRow + 1}...`);
        } else {
            setToastMsg('No useful hints available right now!');
        }
    };

    const handleHintPointerDown = () => {
        if (manualHintsUsed >= 3 && !isCreatorMode) return;
        hintTimeoutRef.current = setTimeout(() => {
            hintTimeoutRef.current = null;
            forceHint();
        }, 500);
    };

    const handleHintPointerUp = () => {
        if (hintTimeoutRef.current) {
            clearTimeout(hintTimeoutRef.current);
            hintTimeoutRef.current = null;
        }
    };

    const handleHintClick = () => {
        if (!hintTimeoutRef.current && (isCreatorMode || manualHintsUsed > 0)) return; // long press fired
        if (manualHintsUsed >= 3 && !isCreatorMode) return;
        const remaining = nextHintAt - timerSec;
        const m = Math.floor(remaining / 60);
        const s = String(remaining % 60).padStart(2, '0');
        setToastMsg(`Next auto-hint in ${m}:${s} (Long press to force!)`);
    };

    const handleCheck = () => {
        let filled = 0;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (playerGrid[r][c] !== 0) filled++;

        if (filled / (rows * cols) < 0.3) {
            setToastMsg('Fill in more cells first!');
            return;
        }

        let bad = false;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (playerGrid[r][c] === 0) continue;
                if ((playerGrid[r][c] === 1 ? 1 : 0) !== answerGrid[r][c]) {
                    bad = true;
                    const el = document.querySelector(`.gcell[data-r="${r}"][data-c="${c}"]`);
                    if (el) { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 800); }
                } else {
                    const el = document.querySelector(`.gcell[data-r="${r}"][data-c="${c}"]`);
                    if (el) { el.classList.add('ok-flash'); setTimeout(() => el.classList.remove('ok-flash'), 800); }
                }
            }
        }
        if (!bad) setToastMsg('Looking good! ✓');
    };

    // Give Up Stats
    const [giveUpStats, setGiveUpStats] = useState<{ correct: number, wrong: number, missed: number } | null>(null);

    const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
        const s = String(secs % 60).padStart(2, '0');
        return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
    };

    const handleGiveUp = () => {
        if (!window.confirm('Reveal the solution?')) return;
        setTimerOn(false);
        setIsGivingUp(true);
        if (id && !isCreatorMode) safeRemove(`nono_${id}`);

        // Calculate stats
        let correct = 0, wrong = 0, missed = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const isFilledInAnswer = answerGrid[r][c] === 1;
                const isFilledByPlayer = playerGrid[r][c] === 1;
                if (isFilledInAnswer && isFilledByPlayer) correct++;
                else if (!isFilledInAnswer && isFilledByPlayer) wrong++;
                else if (isFilledInAnswer && !isFilledByPlayer) missed++;
            }
        }
        setGiveUpStats({ correct, wrong, missed });

        // Reveal the truth after 3 seconds
        setTimeout(() => {
            setPlayerGrid(answerGrid.map(row => row.map(v => v === 1 ? 1 : 0)));
            setIsRevealed(true);
            setIsGivingUp(false);
            setTimeout(() => setShowWinSheet(true), 1600);
        }, 3000);
    };

    if (playState === 'preview') {
        const diffLabel = ['Easy', 'Medium', 'Hard', 'Expert'][puzzleData.diffIdx || 0] || 'Medium';
        const diffColor = ['#4caf88', '#f9c74f', '#f4845f', '#e84747'][puzzleData.diffIdx || 0] || '#f9c74f';
        let estTime = '~5 min';
        if (isCreatorMode && sessionStorage.getItem('revelio_solve_time')) {
            estTime = `${sessionStorage.getItem('revelio_solve_time')} (creator)`;
        } else {
            estTime = ['~2 min', '~5 min', '~12 min', '~25 min'][puzzleData.diffIdx || 0] || '~5 min';
        }

        let solveText = "Be the first to solve it!";
        if (solveCount === 1) solveText = "1 person has solved this";
        else if (solveCount > 1 && solveCount < 10) solveText = `${solveCount} people have solved this`;
        else if (solveCount >= 10) solveText = `🔥 ${solveCount} people have solved this`;

        return (
            <div className="flex flex-col h-full bg-[#faf7f2] fixed inset-0 z-[100] items-center justify-center p-6 text-center animate-in fade-in duration-300">
                <div className="max-w-[340px] w-full flex flex-col items-center gap-4">
                    <h1 className="font-serif italic font-medium text-[24px] text-text mb-2">Revelio 🧩</h1>

                    <div className="w-full aspect-[4/3] rounded-[16px] overflow-hidden shadow-sm mb-2 bg-[#eae5db] border-[4px] border-white relative">
                        <div
                            className="absolute inset-[-10px] bg-cover bg-center"
                            style={{
                                backgroundImage: `url(${puzzleData.thumb})`,
                                filter: 'blur(14px) brightness(1.05)',
                                transform: 'scale(1.08)'
                            }}
                        />
                    </div>

                    <h2 className="font-serif italic text-[22px] text-text">"{puzzleData.title}"</h2>

                    <div className="flex items-center justify-center gap-3 w-full mt-2">
                        <div className="bg-white border border-bdr rounded-[8px] px-3 py-2 flex flex-col items-center shadow-sm w-1/3">
                            <span className="font-mono text-[14px] font-bold text-text">{cols}×{rows}</span>
                            <span className="font-sans text-[10px] uppercase text-muted mt-1 tracking-widest">Grid</span>
                        </div>
                        <div className="bg-white border border-bdr rounded-[8px] px-3 py-2 flex flex-col items-center shadow-sm w-1/3" style={{ borderBottom: `3px solid ${diffColor}` }}>
                            <span className="font-mono text-[14px] font-bold text-text" style={{ color: diffColor }}>{diffLabel}</span>
                            <span className="font-sans text-[10px] uppercase text-muted mt-1 tracking-widest">Diff</span>
                        </div>
                        <div className="bg-white border border-bdr rounded-[8px] px-3 py-2 flex flex-col items-center shadow-sm w-1/3">
                            <span className="font-mono text-[14px] font-bold text-text">{estTime}</span>
                            <span className="font-sans text-[10px] uppercase text-muted mt-1 tracking-widest">Time</span>
                        </div>
                    </div>

                    <div className="text-[14px] text-body mt-4 mb-2 font-sans font-medium">
                        {solveText}
                    </div>

                    <Button variant="terra" size="full" className="h-[56px] rounded-[12px] text-[18px] font-serif italic mt-2" onClick={() => setPlayState('playing')}>
                        Solve the puzzle →
                    </Button>

                    <p className="text-[13px] text-muted italic mt-4 max-w-[240px]">
                        Can you solve it and reveal the hidden photo?
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#faf7f2] fixed inset-0 z-[100]">
            {isCreatorMode && (
                <div className="w-full h-[36px] bg-[#ffd93d] flex items-center justify-center relative shrink-0 pt-[env(safe-area-inset-top,0px)] box-content">
                    <span className="font-sans text-[13px] font-bold text-black px-4 truncate max-w-[80%] md:max-w-none text-center">
                        🎮 Creator Preview<span className="hidden md:inline"> — this is what your friend will see</span>
                    </span>
                    <button onClick={onBack} className="absolute right-0 top-[env(safe-area-inset-top,0px)] h-[36px] px-4 font-mono text-[12px] font-bold text-black/70 hover:text-black flex items-center transition-colors">
                        ← Back to share
                    </button>
                </div>
            )}

            {/* Topbar */}
            <div className="flex items-center gap-3 p-[10px_16px] bg-white border-b border-solid border-bdr flex-nowrap relative z-20 min-h-[56px]">
                <button
                    onClick={onBack}
                    className="bg-transparent border-none text-muted font-mono text-[14px] cursor-pointer py-2 pr-3 -ml-1 inline-flex items-center hover:text-terra active:opacity-60 whitespace-nowrap shrink-0"
                >
                    <span className="mr-1">←</span> Back
                </button>

                <h1 className="font-serif italic font-medium text-[16px] text-text truncate max-w-[40%] md:max-w-[300px]">
                    {puzzleData.title}
                </h1>

                <div id="timer" className="font-mono text-[14px] font-bold text-text ml-auto tabular-nums bg-bg px-2.5 py-1 rounded-[6px] border border-bdr whitespace-nowrap">
                    {formatTime(timerSec)}
                </div>

                <div className="hidden md:flex ml-auto order-3">
                    <Toolbar activeTool={activeTool} onToolChange={setActiveTool} onUndo={handleUndo} canUndo={undoStack.length > 0} />
                </div>

                <div className="flex items-center gap-2 order-4">
                    <button
                        onPointerDown={handleHintPointerDown}
                        onPointerUp={handleHintPointerUp}
                        onPointerLeave={handleHintPointerUp}
                        onClick={handleHintClick}
                        disabled={!isCreatorMode && manualHintsUsed >= 3}
                        className="font-mono text-[12px] bg-white border border-solid border-bdr text-body px-3 py-1.5 rounded-full cursor-pointer hover:border-terra disabled:opacity-50 select-none touch-none"
                    >
                        💡 {isCreatorMode || manualHintsUsed < 3 ? (isCreatorMode ? 'Hint' : `${3 - manualHintsUsed} Hints`) : 'No hints'}
                    </button>
                    <button
                        onClick={handleCheck}
                        className="font-mono text-[11px] bg-white border border-solid border-bdr text-muted px-3 py-1.5 rounded-full cursor-pointer hover:border-terra hover:text-terra"
                    >
                        ✓ Check
                    </button>
                    <button
                        onClick={handleGiveUp}
                        className="font-mono text-[14px] bg-transparent border-none text-muted w-8 h-8 rounded-[8px] flex items-center justify-center hover:bg-bg cursor-pointer"
                    >
                        ⋮
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-[480px] mx-auto px-5 mt-3 mb-1 flex items-center gap-3 shrink-0">
                <div className="flex-1 h-[6px] bg-[#e0e0e0] rounded-[3px] overflow-hidden">
                    <div className="h-full bg-success transition-[width_0.3s]" style={{ width: `${progress}%` }} />
                </div>
                <div className="font-mono text-[11px] text-muted min-w-[36px] text-right">
                    {progress}%
                </div>
            </div>

            {/* Main Game Grid Component */}
            <PuzzleGrid
                puzzleData={puzzleData}
                playerGrid={playerGrid}
                answerGrid={answerGrid}
                activeTool={activeTool}
                onApplyCell={handleApplyCell}
                onDragEnd={handleDragEnd}
                clueDoneRows={clueDoneRows}
                clueDoneCols={clueDoneCols}
                isRevealed={isRevealed}
                hintCell={hintCell}
                hintedRows={hintedRows}
            />

            {/* Mobile Toolbar Overlay */}
            <div className="md:hidden">
                <Toolbar activeTool={activeTool} onToolChange={setActiveTool} onUndo={handleUndo} canUndo={undoStack.length > 0} />
            </div>

            {toastMsg && (
                <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-none">
                    <div className="bg-text/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-[13px] shadow-lg flex items-center gap-2">
                        <span>💡</span> {toastMsg}
                    </div>
                </div>
            )}

            {/* Overlays */}
            {showRestorePrompt && (
                <div className="fixed inset-0 z-[300] bg-white/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[24px] shadow-[0_12px_48px_rgba(0,0,0,0.15)] p-8 max-w-[340px] w-full text-center flex flex-col gap-6 border border-bdr">
                        <div className="text-[40px]">💾</div>
                        <div>
                            <h3 className="font-serif italic text-[22px] text-text mb-2">Welcome back!</h3>
                            <p className="text-[14px] text-body leading-relaxed">We found a saved attempt at this puzzle. Would you like to pick up where you left off?</p>
                        </div>
                        <div className="flex flex-col gap-3 mt-2">
                            <Button variant="terra" size="full" onClick={handleRestore}>Resume Puzzle</Button>
                            <button onClick={handleSkipRestore} className="font-mono text-[13px] text-muted py-2 hover:underline">Start Fresh</button>
                        </div>
                    </div>
                </div>
            )}

            {isGivingUp && (
                <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-[2px] pointer-events-none flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="flex flex-col gap-4 items-center">
                        <div className="bg-white rounded-full px-6 py-3 font-mono text-[14px] shadow-lg flex items-center gap-3">
                            <span className="animate-spin text-terra text-[18px]">◌</span>
                            Revealing Solution...
                        </div>
                        {isCreatorMode ? (
                            <div className="bg-white rounded-[20px] p-5 shadow-xl border border-bdr animate-in slide-in-from-bottom-4 duration-700 delay-500 max-w-[280px] w-full text-center flex flex-col gap-4 mt-4">
                                <p className="font-sans text-[15px] italic text-body">
                                    Your friends will have to figure this out themselves 😈
                                </p>
                                <Button variant="terra" size="full" onClick={onBack}>← Back to Share</Button>
                            </div>
                        ) : giveUpStats && (
                            <div className="bg-white rounded-[20px] p-5 shadow-xl border border-bdr animate-in slide-in-from-bottom-4 duration-700 delay-500 max-w-[280px] w-full text-center mt-4">
                                <h4 className="font-serif italic text-[18px] mb-3">Better luck next time!</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-[18px] font-bold text-success">{giveUpStats.correct}</span>
                                        <span className="text-[10px] uppercase text-muted">Correct</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[18px] font-bold text-[#e55039]">{giveUpStats.wrong}</span>
                                        <span className="text-[10px] uppercase text-muted">Wrong</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[18px] font-bold text-[#4a69bd]">{giveUpStats.missed}</span>
                                        <span className="text-[10px] uppercase text-muted">Missed</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="full" onClick={onBack} className="mt-4">Back to home</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showWinSheet && (
                <RevealAnimation
                    puzzleData={puzzleData}
                    timeStr={formatTime(timerSec)}
                    isCreatorMode={isCreatorMode}
                    timerSec={timerSec}
                    onClose={onBack}
                    onShareResult={() => {
                        const text = `I solved the Revelio puzzle "${puzzleData.title}" in ${formatTime(timerSec)}!\n${location.href}`;
                        if (navigator.share) navigator.share({ text, url: location.href });
                        else {
                            navigator.clipboard.writeText(text);
                            setToastMsg('Result copied!');
                        }
                    }}
                    onSaveImage={() => {
                        // Drawing social card logic via canvas
                        const cv = document.createElement('canvas');
                        cv.width = 1080; cv.height = 1920;
                        const ctx = cv.getContext('2d');
                        if (!ctx) return;
                        ctx.fillStyle = '#faf7f2'; ctx.fillRect(0, 0, 1080, 1920);

                        ctx.fillStyle = '#f4845f'; ctx.font = 'italic 700 80px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillText('Revelio', 540, 250);
                        ctx.fillStyle = '#2d2d2d'; ctx.font = '600 50px -apple-system, sans-serif'; ctx.fillText(`I solved "${puzzleData.title}"!`, 540, 400);
                        ctx.font = '400 40px -apple-system, sans-serif'; ctx.fillStyle = '#6b6661'; ctx.fillText(`Time: ${formatTime(timerSec)}  •  Size: ${cols}x${rows}`, 540, 480);

                        if (puzzleData.thumb) {
                            const img = new window.Image();
                            img.onload = () => {
                                const imgSize = 700;
                                let dw = img.width, dh = img.height;
                                const ratio = dw / dh;
                                if (ratio > 1) { dw = imgSize; dh = imgSize / ratio; } else { dh = imgSize; dw = imgSize * ratio; }
                                ctx.save(); ctx.translate(540 - dw / 2, 960 - dh / 2);
                                ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
                                ctx.drawImage(img, 0, 0, dw, dh); ctx.restore();
                                ctx.fillStyle = '#b0a89e'; ctx.font = '30px -apple-system, sans-serif'; ctx.fillText('Make your own: revelio.link', 540, 1800);
                                const link = document.createElement('a'); link.download = `revelio_result_${puzzleData.id || 'puzzle'}.png`; link.href = cv.toDataURL('image/png'); link.click();
                            };
                            img.src = puzzleData.thumb;
                        }
                    }}
                />
            )}
        </div>
    );
}

function getDeterminableCells(L: number, runs: number[]): number[] {
    if (runs.length === 0) { const res = []; for (let i = 0; i < L; i++) res.push(i); return res; }
    const sum = runs.reduce((a, b) => a + b, 0); const slack = L - sum - (runs.length - 1);
    const res = []; let curr = 0; if (slack < 0) return [];
    if (slack === 0) { const res = []; for (let i = 0; i < L; i++) res.push(i); return res; }
    for (const c of runs) {
        if (c > slack) { const start = curr + slack; const end = curr + c; for (let i = start; i < end; i++) res.push(i); }
        curr += c + 1;
    }
    return res;
}
