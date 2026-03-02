import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ToolType } from './Toolbar';
import { PuzzleData } from '@/lib/puzzleEncoder';
import { isMob } from '@/lib/utils';

interface PuzzleGridProps {
    puzzleData: PuzzleData;
    playerGrid: number[][]; // 0: empty, 1: filled, 2: crossed, 3: noted
    activeTool: ToolType;
    onApplyCell: (r: number, c: number, v: number) => void;
    onDragEnd: (currentGroup: { r: number, c: number, prev: number }[]) => void;
    clueDoneRows: boolean[];
    clueDoneCols: boolean[];
    isRevealed: boolean;
    answerGrid: number[][];
    hintCell?: { type: 'row' | 'col', index: number } | null;
}

export default function PuzzleGrid({ puzzleData, playerGrid, activeTool, onApplyCell, onDragEnd, clueDoneRows, clueDoneCols, isRevealed, hintCell, answerGrid }: PuzzleGridProps) {
    const { rows, cols, rowClues, colClues } = puzzleData;
    const wrapRef = useRef<HTMLDivElement>(null);
    const [currentZoom, setCurrentZoom] = useState<number>(1);

    // Drag state
    const isDragging = useRef(false);
    const dragState = useRef<number | null>(null);
    const dragAxis = useRef<'row' | 'col' | null>(null);
    const dragStartCell = useRef<{ r: number, c: number } | null>(null);
    const lastTouchedCell = useRef<{ r: number, c: number } | null>(null);
    const currentUndoGroup = useRef<{ r: number, c: number, prev: number }[]>([]);

    const [dimensions, setDimensions] = useState({ CS: 28, W: 0, H: 0, CLW: 28, numW: 14, fs: 11 });
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    useEffect(() => {
        if (toastMsg) {
            const t = setTimeout(() => setToastMsg(null), 4000);
            return () => clearTimeout(t);
        }
    }, [toastMsg]);

    useEffect(() => {
        const calculateDimensions = () => {
            if (!wrapRef.current || !wrapRef.current.parentElement) return;
            const scrollEl = wrapRef.current.parentElement;
            const avW = (scrollEl.clientWidth || 350) - 24;
            const avH = (scrollEl.clientHeight || 500) - 24;

            const maxRowNums = Math.max(...rowClues.map(r => r.length));
            const maxColNums = Math.max(...colClues.map(c => c.length));

            const CLUE_NUM_W = 14;
            const clueAreaW = maxRowNums * CLUE_NUM_W + 8;
            const clueAreaH = maxColNums * 18 + 4;

            const cellByW = Math.floor((avW - clueAreaW) / cols);
            const cellByH = Math.floor((avH - clueAreaH) / rows);
            const CS = Math.max(18, Math.min(38, cellByW, cellByH)); // cell size
            const CLW = Math.max(CLUE_NUM_W, CS);
            const clueFontSize = Math.max(8, Math.min(11, Math.floor(CLW * 0.5)));

            setDimensions({ CS, W: clueAreaW, H: clueAreaH, CLW, numW: CLUE_NUM_W, fs: clueFontSize });
        };

        calculateDimensions();
        window.addEventListener('resize', calculateDimensions);

        // Auto-fit after a tiny delay to ensure mount dimensions are parsed
        setTimeout(() => {
            if (wrapRef.current && wrapRef.current.parentElement) {
                const scrollEl = wrapRef.current.parentElement;
                const zw = wrapRef.current;
                const wW = scrollEl.clientWidth - 20;
                const wH = scrollEl.clientHeight - 20;
                const gW = zw.scrollWidth;
                const gH = zw.scrollHeight;

                if (gW && gH) {
                    const scale = Math.min(wW / gW, wH / gH, 1);
                    setCurrentZoom(scale);

                    if (scale < 0.8 && isMob()) {
                        setToastMsg('Pinch to zoom & pan the grid ↔');
                    }
                }
            }
        }, 150);

        return () => window.removeEventListener('resize', calculateDimensions);
    }, [cols, rows, rowClues, colClues]);

    const handleDragStart = (r: number, c: number) => {
        let ns = 0;
        if (activeTool === 'fill') ns = playerGrid[r][c] === 1 ? 0 : 1;
        else if (activeTool === 'cross') ns = playerGrid[r][c] === 2 ? 0 : 2;
        else if (activeTool === 'notes') ns = playerGrid[r][c] === 3 ? 0 : 3;

        isDragging.current = true;
        dragState.current = ns;
        dragAxis.current = null;
        dragStartCell.current = { r, c };
        lastTouchedCell.current = { r, c };
        currentUndoGroup.current = [];

        applyToCell(r, c);
    };

    const handleDragMove = (r: number, c: number) => {
        if (!isDragging.current || dragStartCell.current === null || lastTouchedCell.current === null) return;

        if (!dragAxis.current) {
            if (r !== dragStartCell.current.r && c !== dragStartCell.current.c) return;
            if (r !== dragStartCell.current.r) dragAxis.current = 'col';
            else if (c !== dragStartCell.current.c) dragAxis.current = 'row';
        }

        if (dragAxis.current === 'row' && r !== dragStartCell.current.r) return;
        if (dragAxis.current === 'col' && c !== dragStartCell.current.c) return;

        const rStart = Math.min(lastTouchedCell.current.r, r);
        const rEnd = Math.max(lastTouchedCell.current.r, r);
        const cStart = Math.min(lastTouchedCell.current.c, c);
        const cEnd = Math.max(lastTouchedCell.current.c, c);

        for (let i = rStart; i <= rEnd; i++) {
            for (let j = cStart; j <= cEnd; j++) {
                applyToCell(i, j);
            }
        }
        lastTouchedCell.current = { r, c };
    };

    const applyToCell = (r: number, c: number) => {
        if (dragState.current === null || playerGrid[r][c] === dragState.current) return;
        currentUndoGroup.current.push({ r, c, prev: playerGrid[r][c] });
        onApplyCell(r, c, dragState.current);
    };

    const handleDragEnd = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;
        if (currentUndoGroup.current.length > 0) {
            onDragEnd([...currentUndoGroup.current]);
            currentUndoGroup.current = [];
        }
    }, [onDragEnd]);

    useEffect(() => {
        const handleMouseUp = () => handleDragEnd();
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchend', handleMouseUp);
        window.addEventListener('touchcancel', handleMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
            window.removeEventListener('touchcancel', handleMouseUp);
        };
    }, [handleDragEnd]);

    const onTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current) return;
        // e.preventDefault(); // handled in PuzzlePlayer via css overscroll-none or passive:false ref
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!target) return;
        const el = target.closest('.gcell') as HTMLElement;
        if (el) {
            const r = parseInt(el.dataset.r || '0');
            const c = parseInt(el.dataset.c || '0');
            handleDragMove(r, c);
        }
    };

    const zoomIn = () => setCurrentZoom(z => Math.min(3, z + 0.3));
    const zoomOut = () => setCurrentZoom(z => Math.max(isMob() ? 0.4 : 0.8, z - 0.3));

    const maxD = Math.hypot(rows, cols);

    return (
        <div className="flex-1 overflow-auto touch-pan-x touch-pan-y flex justify-center items-start p-[16px_16px_calc(100px+env(safe-area-inset-bottom,0px))]" id="puzzleScrollWrap">
            <div
                ref={wrapRef}
                className={`bg-white p-0 inline-block origin-top-left border-[3px] border-[#b0a89e] shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${isDragging.current ? 'touch-none' : ''}`}
                style={{ transform: `scale(${currentZoom})` }}
                onContextMenu={e => e.preventDefault()}
            >
                <div className="inline-grid grid-cols-[auto_auto] grid-rows-[auto_auto] select-none text-opacity-100">

                    {/* Corner */}
                    <div
                        className="bg-[#eeebe5] border-r-[3px] border-b-[3px] border-[#b0a89e]"
                        style={{ width: dimensions.W, height: dimensions.H, opacity: isRevealed ? 0.1 : 1 }}
                    />

                    {/* Column Header */}
                    <div className="flex bg-[#eeebe5] border-b-[3px] border-[#b0a89e] items-end" style={{ height: dimensions.H, opacity: isRevealed ? 0.1 : 1 }}>
                        {colClues.map((clue, c) => {
                            const isHint = hintCell?.type === 'col' && hintCell.index === c;
                            return (
                                <div
                                    key={c}
                                    className={`flex flex-col justify-end items-center overflow-hidden ${clueDoneCols[c] ? 'clue-group-done' : ''}`}
                                    style={{
                                        width: dimensions.CLW,
                                        height: dimensions.H,
                                        borderRight: ((c + 1) % 5 === 0 && c < cols - 1) ? '3px solid #b0a89e' : '1px solid #d4cdc5',
                                        background: isHint ? 'rgba(248, 223, 112, 0.6)' : 'transparent'
                                    }}
                                >
                                    {clue.map((n, i) => (
                                        <span key={i} className="col-clue-num font-mono text-[#6b6560] text-center block leading-tight font-medium" style={{ fontSize: dimensions.fs, width: dimensions.CLW, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {n}
                                        </span>
                                    ))}
                                </div>
                            );
                        })}
                    </div>

                    {/* Row Header */}
                    <div className="flex flex-col bg-[#eeebe5] border-r-[3px] border-[#b0a89e]" style={{ width: dimensions.W, opacity: isRevealed ? 0.1 : 1 }}>
                        {rowClues.map((clue, r) => {
                            const isHint = hintCell?.type === 'row' && hintCell.index === r;
                            return (
                                <div
                                    key={r}
                                    className={`flex flex-row items-center justify-end pr-1 gap-[3px] overflow-hidden ${clueDoneRows[r] ? 'clue-group-done' : ''}`}
                                    style={{
                                        height: dimensions.CS,
                                        width: dimensions.W,
                                        borderBottom: ((r + 1) % 5 === 0 && r < rows - 1) ? '3px solid #b0a89e' : '1px solid #d4cdc5',
                                        background: isHint ? 'rgba(248, 223, 112, 0.6)' : 'transparent'
                                    }}
                                >
                                    {clue.map((n, i) => (
                                        <span key={i} className="row-clue-num font-mono text-[#6b6560] text-right shrink-0 leading-none font-medium" style={{ fontSize: dimensions.fs, minWidth: dimensions.numW }}>
                                            {n}
                                        </span>
                                    ))}
                                </div>
                            );
                        })}
                    </div>

                    {/* Game Grid */}
                    <div
                        className="grid relative"
                        style={{
                            gridTemplateColumns: `repeat(${cols}, ${dimensions.CS}px)`,
                            gridTemplateRows: `repeat(${rows}, ${dimensions.CS}px)`,
                            backgroundImage: isRevealed && puzzleData.thumb ? `url(${puzzleData.thumb})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            transition: 'background-image 0.5s ease-in-out'
                        }}
                        onMouseDown={e => {
                            const el = (e.target as HTMLElement).closest('.gcell');
                            if (!el) return;
                            const r = parseInt((el as HTMLElement).dataset.r || '0');
                            const c = parseInt((el as HTMLElement).dataset.c || '0');
                            handleDragStart(r, c);
                        }}
                        onMouseOver={e => {
                            const el = (e.target as HTMLElement).closest('.gcell');
                            if (!el) return;
                            const r = parseInt((el as HTMLElement).dataset.r || '0');
                            const c = parseInt((el as HTMLElement).dataset.c || '0');
                            handleDragMove(r, c);
                        }}
                        onTouchStart={e => {
                            if (e.touches.length > 1) { handleDragEnd(); return; }
                            const el = (e.target as HTMLElement).closest('.gcell');
                            if (!el) return;
                            const r = parseInt((el as HTMLElement).dataset.r || '0');
                            const c = parseInt((el as HTMLElement).dataset.c || '0');
                            handleDragStart(r, c);
                        }}
                        onTouchMove={onTouchMove}
                    >
                        {Array.from({ length: rows * cols }).map((_, i) => {
                            const r = Math.floor(i / cols);
                            const c = i % cols;
                            const v = playerGrid[r][c];
                            const isAlt = Math.floor(r / 5) % 2 !== Math.floor(c / 5) % 2;
                            const isDarkRight = (c + 1) % 5 === 0 && c < cols - 1;
                            const isDarkBot = (r + 1) % 5 === 0 && r < rows - 1;

                            const isCorrect = answerGrid[r][c] === 1;

                            // Visual classes
                            let classes = `gcell `;
                            if (isAlt) classes += 'chunk-alt ';
                            if (isDarkRight) classes += 'chunk-dark ';
                            if (isDarkBot) classes += 'chunk-dark-bot ';

                            if (v === 1) classes += 'filled ';
                            else if (v === 2) classes += 'crossed ';
                            else if (v === 3) classes += 'noted ';

                            // Give up feedback classes
                            if (isRevealed) {
                                classes += 'reveal ';
                                if (!isCorrect && v === 1) classes += 'err-wrong '; // Filled but should be empty
                                if (isCorrect && (v === 0 || v === 2)) classes += 'err-missed '; // Empty/Crossed but should be filled
                                if (!isCorrect && v === 2) classes += 'err-wrong-cross '; // Crossed but should be empty (extra detail)
                            }

                            return (
                                <div
                                    key={i}
                                    className={classes}
                                    data-r={r}
                                    data-c={c}
                                    style={{
                                        width: dimensions.CS,
                                        height: dimensions.CS,
                                        fontSize: Math.max(8, Math.floor(dimensions.CS * 0.42)),
                                        ['--rd' as any]: isRevealed ? `${Math.hypot(r - rows / 2, c - cols / 2) / maxD * 1.2}s` : '0s'
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {toastMsg && (
                <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-none">
                    <div className="bg-text/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-[13px] shadow-lg flex items-center gap-2">
                        <span>💡</span> {toastMsg}
                    </div>
                </div>
            )}
            <div className="absolute bottom-5 right-5 bg-white rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.1)] flex items-center gap-2 px-3 py-1 z-10 transition-opacity">
                <button onClick={zoomOut} className="bg-transparent border-none text-[18px] px-2 py-1 cursor-pointer text-body">-</button>
                <span className="font-mono text-[12px] font-bold w-8 text-center">{(currentZoom).toFixed(1)}x</span>
                <button onClick={zoomIn} className="bg-transparent border-none text-[18px] px-2 py-1 cursor-pointer text-body">+</button>
            </div>
        </div>
    );
}
