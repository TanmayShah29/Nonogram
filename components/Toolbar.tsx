import React from 'react';

export type ToolType = 'fill' | 'cross';

interface ToolbarProps {
    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    onUndo: () => void;
    canUndo: boolean;
}

export default function Toolbar({ activeTool, onToolChange, onUndo, canUndo }: ToolbarProps) {
    return (
        <div className="flex md:flex-row items-center justify-center gap-[8px] fixed md:static bottom-[calc(20px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 md:translate-x-0 z-50 bg-[#faf7f2]/90 md:bg-transparent backdrop-blur-lg md:backdrop-blur-none p-[12px] md:p-0 rounded-[20px] md:rounded-none shadow-[0_12px_40px_rgba(0,0,0,0.12)] md:shadow-none border border-white/60 md:border-none w-[calc(100%-32px)] max-w-[340px] md:w-auto md:max-w-none order-2 md:h-[44px]">
            <ToolButton
                active={activeTool === 'fill'}
                onClick={() => onToolChange('fill')}
                label="■ Fill"
            />
            <ToolButton
                active={activeTool === 'cross'}
                onClick={() => onToolChange('cross')}
                label="✕ Cross"
            />
            <button
                onClick={onUndo}
                disabled={!canUndo}
                className="flex-none w-[52px] md:w-[44px] h-[48px] md:h-[44px] rounded-[12px] md:rounded-DEFAULT bg-black/5 md:bg-bg border-none md:border md:border-solid md:border-bdr font-mono text-[18px] md:text-[15px] text-body cursor-pointer transition-colors active:scale-90 flex items-center justify-center ml-[4px] md:ml-[8px] disabled:opacity-30"
            >
                ↶
            </button>
        </div>
    );
}

function ToolButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`
                flex-1 md:flex-none w-auto md:w-[72px] h-[48px] md:h-[44px] rounded-[12px] md:rounded-DEFAULT border-none md:border md:border-solid font-mono text-[14px] md:text-[15px] cursor-pointer transition-all active:scale-[0.96] select-none shadow-sm md:shadow-none
                ${active
                    ? 'bg-terra text-white font-bold'
                    : 'bg-white md:bg-bg text-body md:text-muted hover:text-body'
                }
            `}
        >
            {label}
        </button>
    );
}
