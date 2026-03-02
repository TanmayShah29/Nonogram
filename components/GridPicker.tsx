import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from './ui/Button';
import { DIFF_COLORS, DIFF_NAMES } from '@/lib/utils';
import { PuzzleData } from '@/lib/puzzleEncoder';
import { suggestGridSizes, generatePreview, updateBestPick, processImage, resizeForStorage, GridOption as INGridOption, loadImageFromFile, processPipelineFallback } from '@/lib/imageToNonogram';

interface GridPickerProps {
    onBack: () => void;
    onComplete: () => void;
}

type LocalGridOption = INGridOption & {
    previewGrid?: number[][];
    greyscale?: number[][];
    baseThreshold?: number;
    method?: string;
};

export default function GridPicker({ onBack, onComplete }: GridPickerProps) {
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [options, setOptions] = useState<LocalGridOption[]>([]);
    const [selectedIdx, setSelectedIdx] = useState<number>(2);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [previewSrc, setPreviewSrc] = useState<string>('');
    const puzzlePreviewCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [thresholdOffset, setThresholdOffset] = useState<number>(0);

    const baseOptionsRef = useRef<LocalGridOption[]>([]);

    useEffect(() => {
        let isCancelled = false;
        const init = async () => {
            const stored = sessionStorage.getItem('revelio_upload');
            if (!stored) { onBack(); return; }

            // Convert base64 back to File/Blob for existing pipeline
            const res = await fetch(stored);
            const blob = await res.blob();
            const file = new File([blob], "upload.png", { type: blob.type });
            if (!isCancelled) {
                setUploadedFile(file);
                setPreviewSrc(stored);
            }

            const img = await loadImageFromFile(file);
            if (isCancelled) return;

            const initialOpts = suggestGridSizes(img.width, img.height);
            const loadedOpts: LocalGridOption[] = [];

            for (const opt of initialOpts) {
                const { grid, fillRatio, greyscale, baseThreshold, method } = await generatePreview(file, opt.cols, opt.rows);
                if (isCancelled) return;
                loadedOpts.push({ ...opt, fillRatio, previewGrid: grid, greyscale, baseThreshold, method, thresholdOffset: 0 });
            }

            const finalOpts = updateBestPick(loadedOpts);
            if (!isCancelled) {
                baseOptionsRef.current = finalOpts; // save base
                setOptions(finalOpts);
                const bestIdx = finalOpts.findIndex(o => o.isBestPick) || 0;
                setSelectedIdx(bestIdx);
            }
        };
        init();
        return () => { isCancelled = true; };
    }, [onBack]);

    // Apply real-time threshold offset
    useEffect(() => {
        if (baseOptionsRef.current.length === 0) return;

        const newOpts = baseOptionsRef.current.map(opt => {
            if (!opt.greyscale || opt.baseThreshold === undefined || !opt.method) return opt;
            const { grid, fillRatio } = processPipelineFallback(opt.previewGrid!, opt.greyscale, opt.method, opt.baseThreshold, thresholdOffset);

            let warning = '';
            if (fillRatio < 0.15) warning = 'Very few filled cells — try a larger grid';
            else if (fillRatio > 0.85) warning = 'Too dense — try a smaller grid';

            return { ...opt, previewGrid: grid, fillRatio, warning, thresholdOffset };
        });

        // Retain the 'isBestPick' badge from original suggestion
        newOpts.forEach((o, i) => o.isBestPick = baseOptionsRef.current[i].isBestPick);
        setOptions(newOpts);
    }, [thresholdOffset]);

    useEffect(() => {
        if (options.length > 0 && selectedIdx >= 0) {
            updatePreview(options[selectedIdx]);
        }
    }, [selectedIdx, options]);

    const updatePreview = (opt: LocalGridOption) => {
        if (!opt.previewGrid || !puzzlePreviewCanvasRef.current || !previewContainerRef.current) return;
        const cv = puzzlePreviewCanvasRef.current;
        const container = previewContainerRef.current;

        const cardWidth = container.clientWidth;
        const cardHeight = container.clientHeight;

        const CARD_INNER_WIDTH = cardWidth; // Padding is on the parent div
        const CARD_INNER_HEIGHT = cardHeight;

        const cellSize = Math.min(
            Math.floor(CARD_INNER_WIDTH / opt.cols),
            Math.floor(CARD_INNER_HEIGHT / opt.rows)
        );

        cv.width = cellSize * opt.cols;
        cv.height = cellSize * opt.rows;

        renderGridToCanvas(cv, opt.previewGrid, opt.cols, opt.rows, cellSize);
    };

    function renderGridToCanvas(canvas: HTMLCanvasElement, grid: number[][], cols: number, rows: number, cellSize: number) {
        const ctx = canvas.getContext('2d')!;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#faf7f2';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c] === 1) {
                    ctx.fillStyle = '#2d2d2d';
                    ctx.fillRect(
                        c * cellSize + 1,
                        r * cellSize + 1,
                        cellSize - 1,
                        cellSize - 1
                    );
                }
            }
        }
    }

    const handleSelect = (idx: number) => setSelectedIdx(idx);

    // Generate click logic remains mostly unchanged, relies on `options[selectedIdx]` memory
    const handleGenerateClick = async () => {
        if (!uploadedFile) return;
        setIsGenerating(true);
        try {
            const opt = options[selectedIdx];
            const puzzle = await processImage(uploadedFile, opt);
            const thumbBase64 = await resizeForStorage(uploadedFile);

            const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();

            const pData: PuzzleData = {
                id: shortId,
                title: 'Can you guess what this is? 👀',
                thumb: thumbBase64,
                cols: puzzle.cols,
                rows: puzzle.rows,
                grid: puzzle.grid,
                rowClues: puzzle.rowClues,
                colClues: puzzle.colClues,
                diffIdx: selectedIdx,
                logicDiff: puzzle.difficulty,
                pw: '' // initialization
            };

            const { encodePuzzle } = require('@/lib/puzzleEncoder');
            sessionStorage.setItem('revelio_puzzle', encodePuzzle(pData));
            onComplete();
        } catch (e) {
            console.error(e);
            alert("Failed to generate puzzle.");
        } finally {
            setIsGenerating(false);
        }
    };

    const selectedOpt = options[selectedIdx];

    return (
        <div className="flex flex-col items-center pt-2 px-5 pb-[calc(100px+0px)] gap-4 w-full mx-auto max-w-[680px]">
            <div className="w-full">
                <button
                    onClick={onBack}
                    className="bg-transparent border-none text-muted font-mono text-[14px] cursor-pointer py-3 pr-4 -ml-2 inline-flex items-center hover:text-terra active:opacity-60 min-h-[44px]"
                >
                    <span className="mr-1 text-[18px]">←</span> Back
                </button>
            </div>

            <h2 className="font-serif italic text-[clamp(18px,4vw,26px)] text-text text-center max-w-[480px] mt-2">
                How detailed should your puzzle be?
            </h2>

            {selectedOpt?.warning && (
                <div className="bg-[#fff8f0] border border-[#f4c09f] text-[#c26b3a] text-[13px] p-[10px_14px] rounded-DEFAULT max-w-[480px] w-full text-center leading-relaxed">
                    ⚠️ {selectedOpt.warning}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 w-full items-stretch">
                <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="font-mono text-[11px] text-[#b0a89e] tracking-[0.08em] uppercase">ORIGINAL</div>
                    <div className="bg-[#ffffff] rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.07)] p-4 w-full h-[240px] md:h-[360px] flex flex-col items-center justify-center overflow-hidden border border-[#ede8e1]">
                        {previewSrc && <img src={previewSrc} className="block w-full h-full object-contain rounded-[8px]" alt="Original" />}
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="font-mono text-[11px] text-[#b0a89e] tracking-[0.08em] uppercase">PUZZLE PREVIEW</div>
                    <div className="bg-[#ffffff] rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.07)] p-4 w-full h-[240px] md:h-[360px] flex flex-col items-center justify-center overflow-hidden border border-[#ede8e1]">
                        <div className="w-full h-full flex flex-col items-center justify-center rounded-[8px] overflow-hidden" ref={previewContainerRef}>
                            <canvas ref={puzzlePreviewCanvasRef} className="block mx-auto rounded-[8px]" style={{ imageRendering: 'pixelated' }} />
                            {selectedOpt && process.env.NODE_ENV === 'development' && (
                                <div style={{ fontSize: '10px', color: '#888', marginTop: '4px', flexShrink: 0 }}>
                                    Fill: {((selectedOpt.fillRatio || 0) * 100).toFixed(1)}% · Method: {selectedOpt.method}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Threshold Slider Container */}
            <div className="flex flex-col items-center w-full max-w-[320px] mt-3 px-1">
                <div className="flex justify-between w-full font-mono text-[11px] text-muted mb-2 tracking-tight">
                    <span>Lighter ←</span>
                    <span className="text-body font-bold">Contrast</span>
                    <span>→ Darker</span>
                </div>
                <div className="w-full relative py-3 flex items-center">
                    <input
                        type="range"
                        min="-50"
                        max="50"
                        value={thresholdOffset}
                        onChange={e => setThresholdOffset(parseInt(e.target.value, 10))}
                        className="w-full h-[6px] rounded-full bg-[#ede8e1] appearance-none focus:outline-none focus:ring-2 focus:ring-terra/30 accent-terra cursor-ew-resize slider-thumb-large"
                    />
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:flex-wrap md:justify-center gap-2 w-full max-w-[480px] md:max-w-[680px] mb-6 mt-4">
                {options.map((opt, idx) => {
                    const isActive = idx === selectedIdx;
                    const isBest = opt.isBestPick;
                    return (
                        <div
                            key={idx}
                            onClick={() => handleSelect(idx)}
                            className={`
                                relative bg-white rounded-DEFAULT shadow flex items-center gap-3 p-[12px_14px] cursor-pointer border-l-4 transition-all duration-150 min-h-[72px] select-none active:scale-98
                                md:flex-col md:text-center md:w-[124px] md:min-w-[124px] md:flex-none md:border-l-0 md:border-2 md:p-[14px_10px] md:min-h-0 md:rounded-lg
                                ${isActive ? 'border-l-terra bg-[#fef8f5] md:border-terra md:-translate-y-1 md:shadow-[0_8px_24px_rgba(244,132,95,.18)]' : 'border-l-transparent md:border-transparent'}
                            `}
                        >
                            {isBest && (
                                <div className="hidden md:block absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full z-10 whitespace-nowrap border border-yellow-500 shadow-sm">
                                    ★ BEST PICK
                                </div>
                            )}

                            <div className="rounded-[6px] overflow-hidden shrink-0 w-[56px] h-[56px] md:w-[72px] md:h-[72px] bg-empty flex items-center justify-center border border-[#ede8e1]">
                                {opt.previewGrid ? (
                                    <ThumbnailCanvas previewGrid={opt.previewGrid} cols={opt.cols} rows={opt.rows} />
                                ) : (
                                    <div className="w-full h-full bg-body/10 animate-pulse" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0 md:flex-none md:w-full">
                                <div className="flex items-center gap-2 mb-0.5 md:justify-center">
                                    <span className="font-serif italic text-[16px] text-text whitespace-nowrap">{opt.label}</span>
                                    {isBest && <span className="md:hidden text-[10px] bg-yellow-400 text-yellow-900 font-bold px-1.5 py-0.5 rounded-sm line-height-none">★</span>}
                                </div>
                                <div className="font-mono text-[11px] text-muted flex items-center gap-1.5 md:justify-center">
                                    <div className="w-[10px] h-[10px] rounded-full shrink-0" style={{ backgroundColor: DIFF_COLORS[Math.min(idx, 4)] }} />
                                    {opt.cols} × {opt.rows}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#faf7f2]/95 backdrop-blur-[10px] p-[12px_20px_calc(12px+env(safe-area-inset-bottom,0px))] border-t border-bdr">
                <Button
                    variant="terra"
                    size="full"
                    onClick={handleGenerateClick}
                    disabled={isGenerating || options.length === 0}
                >
                    {isGenerating ? 'Creating… ✨' : 'Create Puzzle →'}
                </Button>
            </div>
        </div>
    );
}

const ThumbnailCanvas = ({ previewGrid, cols, rows }: { previewGrid: number[][], cols: number, rows: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            const imgData = ctx.createImageData(cols, rows);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const idx = (r * cols + c) * 4;
                    const val = previewGrid[r][c] === 1 ? 45 : 255;
                    imgData.data[idx] = val;
                    imgData.data[idx + 1] = val;
                    imgData.data[idx + 2] = val;
                    imgData.data[idx + 3] = 255;
                }
            }
            ctx.putImageData(imgData, 0, 0);
        }
    }, [previewGrid, cols, rows]);
    return <canvas ref={canvasRef} width={cols} height={rows} className="max-w-[56px] max-h-[56px] md:max-w-[72px] md:max-h-[72px] [image-rendering:pixelated]" />;
};
