import React from 'react';

export type ToolType = 'fill' | 'cross' | 'notes';

interface ToolbarProps {
    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    onUndo: () => void;
    canUndo: boolean;
}

export default function Toolbar({ activeTool, onToolChange, onUndo, canUndo }: ToolbarProps) {
    return (
        <div className="flex md:flex-row items-center justify-center gap-[6px] md:gap-[8px] fixed md:static bottom-[calc(20px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 md:translate-x-0 z-50 bg-[#faf7f2]/85 md:bg-transparent backdrop-blur-md md:backdrop-blur-none p-[10px] md:p-0 rounded-[16px] md:rounded-none shadow-[0_8px_32px_rgba(0,0,0,0.08)] md:shadow-none border border-white/40 md:border-none w-[calc(100%-40px)] max-w-[380px] md:w-auto md:max-w-none order-2 md:h-[44px]">
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
            <ToolButton
                active={activeTool === 'notes'}
                onClick={() => onToolChange('notes')}
                label="• Dots"
            />
            <button
                onClick={onUndo}
                disabled={!canUndo}
                className="flex-1 md:flex-none w-auto md:w-[44px] h-[44px] rounded-DEFAULT bg-black/5 md:bg-bg border-none md:border md:border-solid md:border-bdr font-mono text-[15px] text-body cursor-pointer transition-colors active:scale-95 flex items-center justify-center ml-[4px] md:ml-[8px] disabled:opacity-40"
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
                flex-1 md:flex-none w-auto md:w-[60px] h-[44px] rounded-DEFAULT border border-solid font-mono text-[12px] md:text-[15px] cursor-pointer transition-colors active:scale-[0.98] select-none
                ${active
                    ? 'bg-terra border-terra text-white'
                    : 'bg-bg border-bdr text-body hover:bg-white'
                }
            `}
        >
            {label}
        </button>
    );
}
