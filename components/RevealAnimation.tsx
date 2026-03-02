'use client';
/* eslint-disable */
import React, { useMemo, useRef } from 'react';
import { Button } from './ui/Button';
import { PuzzleData } from '@/lib/puzzleEncoder';

const CONFETTI_COLORS = ['#f4845f', '#ffd93d', '#4caf88', '#6bb5ff', '#f78fb3', '#c9b8ff'];

interface RevealAnimationProps {
    puzzleData: PuzzleData;
    timeStr: string;
    onClose: () => void;
    onShareResult: () => void;
    onSaveImage: () => void; // Using the canvas drawing magic
}

export default function RevealAnimation({ puzzleData, timeStr, onClose, onShareResult, onSaveImage }: RevealAnimationProps) {
    const confettiPieces = useMemo(() =>
        Array.from({ length: 80 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            top: -10 - Math.random() * 10,
            delay: Math.random() * 2.5,
            duration: 2.5 + Math.random() * 2,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 720,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            width: 6 + Math.random() * 8,
            height: 8 + Math.random() * 6,
            xDrift: (Math.random() - 0.5) * 200,
        }))
        , []);

    return (
        <div className="fixed inset-0 z-[500] bg-[#faf7f2]/50 backdrop-blur-[4px] flex items-end" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            {/* Confetti */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden h-[120vh]">
                {confettiPieces.map((piece) => (
                    <div
                        key={piece.id}
                        className="absolute rounded-[2px]"
                        style={{
                            left: `${piece.left}vw`,
                            top: `${piece.top}vh`,
                            width: piece.width,
                            height: piece.height,
                            background: piece.color,
                            transform: `rotate(${piece.rotation}deg)`,
                            animation: `cfall ${piece.duration}s linear forwards`,
                            animationDelay: `${piece.delay}s`,
                            ['--x-drift' as any]: `${piece.xDrift}px`,
                            ['--r-speed' as any]: `${piece.rotation + piece.rotationSpeed}deg`
                        }}
                    />
                ))}
            </div>

            <div className="bg-white rounded-t-[24px] shadow-[0_-8px_60px_rgba(0,0,0,0.12)] p-[12px_24px_calc(24px+env(safe-area-inset-bottom,0px))] w-full max-w-[540px] mx-auto animate-[sheetUp_0.4s_cubic-bezier(.22,1,.36,1)] z-10">
                <div className="w-[36px] h-[4px] bg-bdr rounded-[4px] mx-auto mb-[20px]" />
                <h2 className="font-serif italic text-[clamp(20px,5vw,28px)] text-text mb-[4px]">
                    Solved in {timeStr} ✦
                </h2>
                <div className="text-[14px] text-body flex items-baseline justify-between mb-[18px]">
                    <span>{puzzleData.title || ''}</span>
                    <span className="font-mono text-[12px] text-muted bg-bg px-2 py-0.5 rounded-full border border-bdr shrink-0">
                        {puzzleData.cols} × {puzzleData.rows}
                    </span>
                </div>
                {puzzleData.thumb && (
                    <img
                        src={puzzleData.thumb}
                        className="block w-full h-[180px] object-cover rounded-[14px] mb-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
                        alt="Revealed photo"
                    />
                )}

                <div className="flex flex-col gap-[10px]">
                    <Button variant="terra" size="full" onClick={onShareResult}>
                        Share Result
                    </Button>
                    <div className="flex gap-[10px]">
                        <Button variant="outline" className="flex-1" onClick={onSaveImage}>
                            Save Image
                        </Button>
                        <Button variant="ghost" className="flex-1" onClick={onClose}>
                            Play Another
                        </Button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes cfall {
                    to {
                        transform: translateY(110vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                @keyframes sheetUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
