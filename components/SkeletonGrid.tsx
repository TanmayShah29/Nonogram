'use client';

import React from 'react';

interface SkeletonGridProps {
    cols: number;
    rows: number;
}

export default function SkeletonGrid({ cols, rows }: SkeletonGridProps) {
    return (
        <div className="flex flex-col flex-1 items-center justify-center p-4 min-h-0 relative animate-pulse">
            <div className="bg-white rounded-[16px] shadow-sm border border-[#ede8e1] p-4 flex flex-col gap-4">
                <div className="flex gap-4">
                    {/* Row Clues Skeleton */}
                    <div className="flex flex-col gap-[1px] pt-[40px]">
                        {Array.from({ length: rows }).map((_, i) => (
                            <div key={i} className="h-[24px] w-[32px] bg-[#f0ece6] rounded-[2px] self-end" />
                        ))}
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Col Clues Skeleton */}
                        <div className="flex gap-[1px] pl-[1px]">
                            {Array.from({ length: cols }).map((_, i) => (
                                <div key={i} className="w-[24px] h-[40px] bg-[#f0ece6] rounded-[2px]" />
                            ))}
                        </div>

                        {/* Grid Skeleton */}
                        <div
                            className="inline-grid gap-[1px] bg-[#ede8e1] border border-[#ede8e1]"
                            style={{
                                gridTemplateColumns: `repeat(${cols}, 24px)`,
                                gridTemplateRows: `repeat(${rows}, 24px)`
                            }}
                        >
                            {Array.from({ length: cols * rows }).map((_, i) => (
                                <div key={i} className="w-[24px] h-[24px] bg-white" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-8 h-4 w-32 bg-[#f0ece6] rounded-full" />
        </div>
    );
}
