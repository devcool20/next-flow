'use client';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import { Tooltip } from '../shared/Tooltip';
import { useWorkflowStore } from '@/lib/store';
import {
  ChevronDown,
  GitFork,
  Hand,
  History,
  ImageIcon,
  Keyboard,
  Moon,
  MousePointer2,
  Plus,
  RotateCcw,
  RotateCw,
  Scissors,
  Share2,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export type ThemeMode = 'dark' | 'light';
type RightPanelMode = 'assets' | 'versions';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('versions');
  const [rightMenuOpen, setRightMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const rightMenuRef = useRef<HTMLDivElement | null>(null);
  const undoGraph = useWorkflowStore((state) => state.undoGraph);
  const redoGraph = useWorkflowStore((state) => state.redoGraph);
  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);
  const runSelectedWorkflow = useWorkflowStore((state) => state.runSelectedWorkflow);
  const deleteSelectedNodes = useWorkflowStore((state) => state.deleteSelectedNodes);
  const interactionMode = useWorkflowStore((state) => state.interactionMode);
  const setInteractionMode = useWorkflowStore((state) => state.setInteractionMode);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('nextflow-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      // eslint-disable-next-line
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('nextflow-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Never intercept when the user is typing in an input, textarea or editable element
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
      const isRedo =
        ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'z') ||
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y');

      if (!isUndo && !isRedo) {
        const isDelete = event.key === 'Delete' || event.key === 'Backspace';
        if (isDelete && !isTyping) {
          event.preventDefault();
          deleteSelectedNodes();
        }
        return;
      }

      if (!isTyping) {
        event.preventDefault();
        if (isUndo) {
          undoGraph();
        } else {
          redoGraph();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteSelectedNodes, redoGraph, undoGraph]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rightMenuRef.current) return;
      if (!rightMenuRef.current.contains(event.target as Node)) {
        setRightMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleMainIconClick = () => {
    setRightMenuOpen(false);
    setRightOpen((prev) => !prev);
  };

  const handleModeSelect = (mode: RightPanelMode) => {
    setRightPanelMode(mode);
    setRightOpen(true);
    setRightMenuOpen(false);
  };

  return (
    <div
      data-theme={theme}
      className={`nextflow-shell relative flex h-screen w-screen overflow-hidden ${
        theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#eff3f8] text-[#0f172a]'
      }`}
    >
      <LeftSidebar isOpen={leftOpen} theme={theme} onToggle={() => setLeftOpen((prev) => !prev)} />

      <main className="relative flex-1">
        <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex h-16 items-center justify-between px-6">
          <div className="pointer-events-auto flex items-center gap-2">
            <WorkspaceMenu theme={theme} />
          </div>

          <div className="pointer-events-auto flex items-center gap-4">
            <IconGhostButton
              icon={theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              active
              theme={theme}
              tooltip="Toggle Theme"
              tooltipSide="bottom"
            />
            <TextGhostButton icon={<Share2 size={14} />} text="Share" theme={theme} />
            <TextGhostButton icon={<Sparkles size={14} />} text="Turn workflow into app" theme={theme} />

            <div className="relative flex items-center gap-2" ref={rightMenuRef}>
              <div
                className={`flex h-9 items-center rounded-xl border transition-colors ${
                  theme === 'dark' ? 'border-white/5 bg-[#1a1a1a]/90' : 'border-[#d8dfeb] bg-white/95'
                }`}
              >
                <Tooltip content={rightPanelMode === 'assets' ? 'Assets' : 'History'} side="bottom">
                  <button
                    onClick={handleMainIconClick}
                    className={`flex h-full items-center justify-center rounded-l-xl px-3 hover:text-white ${
                      theme === 'dark' ? 'text-[#8e8e8e] hover:bg-white/5' : 'text-[#5f6f88] hover:bg-[#f1f4f9]'
                    } ${rightOpen ? (theme === 'dark' ? 'text-white' : 'text-[#0f172a]') : ''}`}
                  >
                    {rightPanelMode === 'assets' ? <ImageIcon size={14} /> : <History size={14} />}
                  </button>
                </Tooltip>
                <div className={`h-4 w-[1px] ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'}`} />
                <Tooltip content="Options" side="bottom">
                  <button
                    onClick={() => setRightMenuOpen((prev) => !prev)}
                    className={`flex h-full items-center justify-center rounded-r-xl px-2 hover:text-white ${
                      theme === 'dark' ? 'text-[#8e8e8e] hover:bg-white/5' : 'text-[#5f6f88] hover:bg-[#f1f4f9]'
                    } ${rightMenuOpen ? (theme === 'dark' ? 'text-white' : 'text-[#0f172a]') : ''}`}
                  >
                    <ChevronDown size={14} className={`transition-transform ${rightMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                </Tooltip>
              </div>

              {rightMenuOpen && (
                <div
                  className={`absolute right-0 top-11 z-50 w-72 rounded-2xl border p-2 shadow-[0_20px_40px_-20px_rgba(0,0,0,1)] ${
                    theme === 'dark' ? 'border-white/10 bg-[#121316]' : 'border-[#d6dde9] bg-white'
                  }`}
                >
                  <MenuItem
                    icon={<ImageIcon size={15} className={theme === 'dark' ? 'text-[#bcc6d8]' : 'text-[#4f5d77]'} />}
                    label="Asset History"
                    shortcut="Ctrl+Alt+A"
                    onClick={() => handleModeSelect('assets')}
                    theme={theme}
                  />
                  <MenuItem
                    icon={<History size={15} className={theme === 'dark' ? 'text-[#bcc6d8]' : 'text-[#4f5d77]'} />}
                    label="Version History"
                    shortcut="Ctrl+Alt+S"
                    onClick={() => handleModeSelect('versions')}
                    theme={theme}
                  />
                </div>
              )}
            </div>
          </div>
        </header>

        {children}

        <div className="absolute bottom-6 left-6 z-30 flex items-center gap-2">
          <IconGhostButton icon={<RotateCcw size={14} />} onClick={undoGraph} theme={theme} tooltip="Undo" tooltipShortcut="⌘" tooltipShortcutLabel="Z" />
          <IconGhostButton icon={<RotateCw size={14} />} onClick={redoGraph} theme={theme} tooltip="Redo" tooltipShortcut="⌘" tooltipShortcutLabel="Y" />
          <TextGhostButton icon={<Keyboard size={14} />} text="Keyboard shortcuts" theme={theme} />
        </div>

        <div
          className={`absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-[1.25rem] border p-2 transition-all ${
            theme === 'dark' ? 'border-white/10 bg-[#1a1a1a]/95 shadow-2xl' : 'border-neutral-200/50 bg-white/80 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
          }`}
        >
          <DockButton
            icon={<Plus size={16} />}
            onClick={() => window.dispatchEvent(new CustomEvent('nextflow:add-node', { detail: { type: 'text' } }))}
            theme={theme}
            tooltip="Add Node"
          />
          <DockButton icon={<MousePointer2 size={16} />} active={interactionMode === 'select'} onClick={() => setInteractionMode('select')} theme={theme} tooltip="Draw Selection" tooltipShortcut="⌘" tooltipShortcutLabel="Drag" />
          <DockButton icon={<Hand size={16} />} active={interactionMode === 'pan'} onClick={() => setInteractionMode('pan')} theme={theme} tooltip="Pan Canvas" tooltipShortcut="Space" tooltipShortcutLabel="Drag" />
          <DockButton icon={<Scissors size={16} />} onClick={() => setInteractionMode('cut')} active={interactionMode === 'cut'} theme={theme} tooltip="Disconnect" tooltipShortcut="⇧" tooltipShortcutLabel="Drag" />
          <DockButton icon={<Sparkles size={16} />} onClick={() => void runSelectedWorkflow()} theme={theme} tooltip="Run Selection" tooltipShortcut="⌘" tooltipShortcutLabel="↵" />
          <DockButton icon={<GitFork size={16} />} onClick={() => void runWorkflow()} theme={theme} tooltip="Run All Nodes" tooltipShortcut="⇧" tooltipShortcutLabel="↵" />
        </div>


      </main>

      <RightSidebar isOpen={rightOpen} mode={rightPanelMode} theme={theme} />
    </div>
  );
}

function IconGhostButton({
  icon,
  onClick,
  active = false,
  rounded = 'rounded-xl',
  size = 'h-9 w-9',
  theme = 'dark',
  tooltip,
  tooltipSide = 'top',
  tooltipShortcut,
  tooltipShortcutLabel,
}: {
  icon: ReactNode;
  onClick?: () => void;
  active?: boolean;
  rounded?: string;
  size?: string;
  theme?: ThemeMode;
  tooltip?: string;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  tooltipShortcut?: string;
  tooltipShortcutLabel?: string;
}) {
  const darkClass = active ? 'border-white/20 text-white' : 'border-white/5 text-[#8e8e8e] hover:text-white';
  const lightClass = active ? 'border-[#cfd7e4] bg-white text-[#0f172a]' : 'border-[#d8dfeb] bg-white/95 text-[#5f6f88] hover:text-[#0f172a]';

  const btn = (
    <button
      onClick={onClick}
      className={`${size} ${rounded} flex items-center justify-center border transition-colors ${
        theme === 'dark' ? `bg-[#1a1a1a]/90 ${darkClass}` : lightClass
      }`}
    >
      {icon}
    </button>
  );

  if (tooltip) {
    return <Tooltip content={tooltip} side={tooltipSide} shortcut={tooltipShortcut} shortcutLabel={tooltipShortcutLabel} className="h-full">{btn}</Tooltip>;
  }
  return btn;
}

function TextGhostButton({ icon, text, theme = 'dark' }: { icon: ReactNode; text: string; theme?: ThemeMode }) {
  return (
    <button
      className={`flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition-colors ${
        theme === 'dark'
          ? 'border-white/5 bg-[#1a1a1a]/90 text-[#8e8e8e] hover:text-white'
          : 'border-[#d8dfeb] bg-white/95 text-[#5f6f88] hover:text-[#0f172a]'
      }`}
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}

function DockButton({
  icon,
  active,
  onClick,
  theme = 'dark',
  tooltip,
  tooltipSide = 'top',
  tooltipShortcut,
  tooltipShortcutLabel,
}: {
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
  theme?: ThemeMode;
  tooltip?: string;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  tooltipShortcut?: string;
  tooltipShortcutLabel?: string;
}) {
  const btn = (
    <button
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
        theme === 'dark'
          ? active
            ? 'bg-white/10 text-white'
            : 'text-[#8e8e8e] hover:bg-white/5 hover:text-white'
          : active
            ? 'bg-[#e8edf5] text-[#0f172a]'
            : 'text-[#64748b] hover:bg-[#eef2f7] hover:text-[#0f172a]'
      }`}
    >
      {icon}
    </button>
  );

  if (tooltip) {
    return <Tooltip content={tooltip} side={tooltipSide} shortcut={tooltipShortcut} shortcutLabel={tooltipShortcutLabel} className="h-full">{btn}</Tooltip>;
  }

  return btn;
}

function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  theme = 'dark',
}: {
  icon: ReactNode;
  label: string;
  shortcut: string;
  onClick: () => void;
  theme?: ThemeMode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${
        theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-[#f1f4f9]'
      }`}
    >
      <span className={`flex items-center gap-2.5 text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-[#111827]'}`}>
        {icon}
        {label}
      </span>
      <span className={`text-xs ${theme === 'dark' ? 'text-[#8d97aa]' : 'text-[#6b7a90]'}`}>{shortcut}</span>
    </button>
  );
}

function WorkspaceMenu({ theme }: { theme: ThemeMode }) {
  const pathname = usePathname();
  const router = useRouter();
  const workflowId = pathname.split('/').pop();
  
  const [workspaceName, setWorkspaceName] = useState(() => {
    if (typeof window === 'undefined') return 'Untitled';
    return window.localStorage.getItem('nextflow-workspace-name') || 'Untitled';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.localStorage.setItem('nextflow-workspace-name', workspaceName);
  }, [workspaceName]);
  
  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const exportWorkspace = () => {
    const state = useWorkflowStore.getState();
    const data = JSON.stringify({ nodes: state.nodes, edges: state.edges }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspaceName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <div
        className={`flex h-9 items-center rounded-xl border transition-all duration-300 ${
          theme === 'dark' ? 'border-white/10 bg-black shadow-[0_4px_12px_rgba(0,0,0,0.5)]' : 'border-[#d6dde9] bg-white text-[#0f172a] shadow-sm'
        }`}
      >
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className={`flex h-full items-center justify-center gap-1.5 rounded-l-xl px-2.5 transition-colors ${
            theme === 'dark' ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-[#5f6f88] hover:bg-[#f1f4f9] hover:text-[#0f172a]'
          }`}
        >
          <div className="flex h-[20px] w-[20px] items-center justify-center rounded bg-white text-[10px] font-black text-black">
            N
          </div>
          <ChevronDown size={12} className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`h-4 w-[1px] ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'}`} />
        <div className={`relative flex items-center overflow-hidden transition-all duration-300 ease-out ${isFocused ? 'w-48' : 'w-24'}`}>
          <input
            type="text"
            value={workspaceName}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className={`h-full w-full bg-transparent px-3 text-[13px] font-bold focus:outline-none focus:ring-0 ${
              theme === 'dark' ? 'text-white' : 'text-[#0f172a]'
            }`}
          />
        </div>
      </div>

      {menuOpen && (
        <div
          className={`absolute left-0 top-11 z-50 w-64 rounded-2xl border p-2 shadow-[0_24px_48px_-12px_rgba(0,0,0,1)] ${
            theme === 'dark' ? 'border-white/10 bg-[#111111]' : 'border-[#d6dde9] bg-white'
          }`}
        >
          <div className="px-3 py-2 mb-1 border-b border-white/5">
             <div className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Workflow ID</div>
             <div className="text-[12px] text-white/60 font-mono truncate select-all" title={workflowId}>{workflowId}</div>
          </div>
          <MenuItem icon={<div className="pl-1 text-xs font-bold">&larr;</div>} label="Back to Nodes" shortcut="" onClick={() => router.push('/nodes')} theme={theme} />
          <MenuItem icon={<Sparkles size={15} />} label="Turn into App" shortcut="" onClick={() => {}} theme={theme} />
          <MenuItem icon={<Share2 size={15} />} label="Import" shortcut="" onClick={() => {}} theme={theme} />
          <MenuItem icon={<Share2 size={15} className="rotate-180" />} label="Export" shortcut="" onClick={exportWorkspace} theme={theme} />
        </div>
      )}
    </div>
  );
}
