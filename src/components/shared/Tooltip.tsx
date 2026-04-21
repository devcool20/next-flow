import React, { ReactNode } from 'react';
import { clsx } from 'clsx';

type TooltipProps = {
  children: ReactNode;
  content: string;
  shortcut?: string;
  shortcutLabel?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string; // Appends to the wrapper div
};

export function Tooltip({ children, content, shortcut, shortcutLabel, side = 'top', className }: TooltipProps) {
  const positioning = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 -translate-y-1/2 ml-3',
  };

  const arrowPositioning = {
    top: 'top-[calc(100%-4px)] left-1/2 -translate-x-1/2 border-b border-r',
    bottom: 'bottom-[calc(100%-4px)] left-1/2 -translate-x-1/2 border-t border-l',
    left: 'left-[calc(100%-4px)] top-1/2 -translate-y-1/2 border-t border-r',
    right: 'right-[calc(100%-4px)] top-1/2 -translate-y-1/2 border-b border-l',
  };

  return (
    <div className={clsx("group relative flex items-center justify-center", className)}>
      {children}
      <div className={clsx(
        "pointer-events-none absolute z-[9999] flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-200", 
        positioning[side]
      )}>
        <div className="relative flex items-center bg-white px-3 py-1.5 rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.15)] ring-1 ring-black/5 dark:ring-white/10 dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <span className="text-[13px] font-medium text-neutral-900 whitespace-nowrap leading-none">{content}</span>
          {(shortcut || shortcutLabel) && (
            <div className="ml-2.5 flex items-center gap-1">
              {shortcut && <kbd className="text-[11px] font-sans text-neutral-400 bg-neutral-50 px-1 pb-[1px] leading-tight rounded-[4px] border border-neutral-200">{shortcut}</kbd>}
              {shortcutLabel && <kbd className="text-[11px] font-sans text-neutral-400 bg-neutral-50 px-1 pb-[1px] leading-tight rounded-[4px] border border-neutral-200">{shortcutLabel}</kbd>}
            </div>
          )}
          <div className={clsx("absolute w-2 h-2 bg-white rotate-45 border-neutral-200/50", arrowPositioning[side])} />
        </div>
      </div>
    </div>
  );
}
