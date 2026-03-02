import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'terra' | 'outline' | 'ghost' | 'pill';
    size?: 'default' | 'sm' | 'full';
}

export function Button({ variant = 'terra', size = 'default', className = '', children, ...props }: ButtonProps) {
    const baseClass = "btn font-mono inline-flex items-center justify-center gap-2 border-none cursor-pointer transition-colors transition-transform duration-100 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-95";

    let variantClass = "";
    switch (variant) {
        case 'terra':
            variantClass = "bg-terra hover:bg-terra-d text-white font-medium";
            break;
        case 'outline':
            variantClass = "bg-white text-terra border-2 border-terra border-solid";
            break;
        case 'ghost':
            variantClass = "bg-transparent text-body border border-solid border-bdr hover:border-muted";
            break;
        case 'pill':
            variantClass = "bg-white text-muted border border-solid border-bdr hover:border-terra hover:text-terra rounded-full";
            break;
    }

    let sizeClass = "";
    switch (size) {
        case 'default':
            sizeClass = "text-[15px] min-h-[56px] rounded-[14px] px-[20px]";
            if (variant === 'pill') {
                sizeClass = "text-[11px] min-h-[32px] rounded-full px-[14px]";
            }
            break;
        case 'sm':
            sizeClass = "text-[11px] min-h-[36px] rounded-DEFAULT px-[12px]";
            break;
        case 'full':
            sizeClass = "text-[15px] min-h-[56px] rounded-[14px] px-[20px] w-full relative";
            break;
    }

    return (
        <button
            className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
