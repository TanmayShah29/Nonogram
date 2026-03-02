import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    onComplete: () => void;
    duration?: number;
}

export function Toast({ message, onComplete, duration = 2200 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, duration);
        return () => clearTimeout(timer);
    }, [message, duration, onComplete]);

    return (
        <div className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 bg-ok text-white font-mono text-[12px] px-[18px] py-[8px] rounded-full z-[9999] whitespace-nowrap shadow-md pointer-events-none animate-[toastUp_0.25s_ease-out_forwards]">
            {message}
            <style jsx>{`
                @keyframes toastUp {
                    from { transform: translateX(-50%) translateY(8px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
