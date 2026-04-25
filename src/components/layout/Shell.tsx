'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';
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
  X,
  TypeIcon,
  Brain,
  Film,
  Crop,
  ImageMinus,
  Search,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export type ThemeMode = 'dark' | 'light';
type RightPanelMode = 'assets' | 'versions';

export default function Shell({
  children,
  workflowId,
  initialWorkflowName,
}: {
  children: React.ReactNode;
  workflowId?: string;
  initialWorkflowName?: string;
}) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  // Auto-collapse left sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setLeftOpen(false);
      }
    };
    
    // Set initial state
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('versions');
  const [rightMenuOpen, setRightMenuOpen] = useState(false);
  const theme = useWorkflowStore((state) => state.theme);
  const setTheme = useWorkflowStore((state) => state.setTheme);
  const rightMenuRef = useRef<HTMLDivElement | null>(null);
  const undoGraph = useWorkflowStore((state) => state.undoGraph);
  const redoGraph = useWorkflowStore((state) => state.redoGraph);
  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);
  const runSelectedWorkflow = useWorkflowStore((state) => state.runSelectedWorkflow);
  const deleteSelectedNodes = useWorkflowStore((state) => state.deleteSelectedNodes);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const onOpenSearch = () => setIsSearchModalOpen(true);
    window.addEventListener('nextflow:open-search', onOpenSearch);
    return () => window.removeEventListener('nextflow:open-search', onOpenSearch);
  }, []);
  
  const tools = [
    { type: 'text', icon: <TypeIcon size={16} />, label: 'Text', color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
    { type: 'image', icon: <ImageIcon size={16} />, label: 'Image', color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/15' },
    { type: 'video', icon: <Film size={16} />, label: 'Video', color: 'text-amber-400', bgColor: 'bg-amber-500/15' },
    { type: 'llm', icon: <Brain size={16} />, label: 'LLM', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
    { type: 'crop', icon: <Crop size={16} />, label: 'Crop', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15' },
    { type: 'extract', icon: <ImageMinus size={16} />, label: 'Extract', color: 'text-cyan-400', bgColor: 'bg-cyan-500/15' },
  ].filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const interactionMode = useWorkflowStore((state) => state.interactionMode);
  const setInteractionMode = useWorkflowStore((state) => state.setInteractionMode);
  const selectedCount = useWorkflowStore((state) => state.nodes.filter((n) => n.selected).length);

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
      data-theme={theme || 'dark'}
      className={`nextflow-shell relative flex h-screen w-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]`}
    >
      <LeftSidebar isOpen={leftOpen} theme={theme} onToggle={() => setLeftOpen((prev) => !prev)} />

      <main className="relative flex-1 min-w-0 h-full overflow-hidden">
        <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex h-16 items-center justify-between px-6">
          <div className="pointer-events-auto flex items-center gap-2">
            <WorkspaceMenu key={workflowId ?? 'workspace'} theme={theme} workflowId={workflowId} initialWorkflowName={initialWorkflowName} />
          </div>

          <div className="pointer-events-auto flex items-center gap-4">
            <IconGhostButton
              icon={theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    className={`flex h-full items-center justify-center rounded-l-xl px-3 outline-none focus:outline-none focus:ring-0 active:bg-transparent select-none transition-colors ${
                      theme === 'dark' 
                        ? 'text-[#8e8e8e] hover:text-white' 
                        : 'text-[#5f6f88] hover:text-[#0f172a]'
                    } ${rightOpen ? (theme === 'dark' ? 'text-white' : 'text-[#0f172a]') : ''}`}
                  >
                    {rightPanelMode === 'assets' ? <ImageIcon size={14} /> : <History size={14} />}
                  </button>
                </Tooltip>
                <div className={`h-4 w-[1px] ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'}`} />
                <Tooltip content="Options" side="bottom">
                  <button
                    onClick={() => setRightMenuOpen((prev) => !prev)}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    className={`flex h-full items-center justify-center rounded-r-xl px-2 outline-none focus:outline-none focus:ring-0 active:bg-transparent select-none transition-colors ${
                      theme === 'dark' 
                        ? 'text-[#8e8e8e] hover:text-white' 
                        : 'text-[#5f6f88] hover:text-[#0f172a]'
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
          className={`absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-[1rem] border p-1 transition-all ${
            theme === 'dark' ? 'border-white/10 bg-[#1a1a1a]/95 shadow-2xl' : 'border-neutral-200/50 bg-white/80 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
          }`}
        >
          <DockButton
            icon={<Plus size={19} />}
            onClick={() => window.dispatchEvent(new CustomEvent('nextflow:add-node', { detail: { type: 'text' } }))}
            theme={theme}
            tooltip="Add Node"
          />
          <DockButton icon={<MousePointer2 size={19} />} active={interactionMode === 'select'} onClick={() => setInteractionMode('select')} theme={theme} tooltip="Draw Selection" tooltipShortcut="⌘" tooltipShortcutLabel="Drag" />
          <DockButton icon={<Hand size={19} />} active={interactionMode === 'pan'} onClick={() => setInteractionMode('pan')} theme={theme} tooltip="Pan Canvas" tooltipShortcut="Space" tooltipShortcutLabel="Drag" />
          <DockButton icon={<Scissors size={19} />} onClick={() => setInteractionMode('cut')} active={interactionMode === 'cut'} theme={theme} tooltip="Disconnect" tooltipShortcut="⇧" tooltipShortcutLabel="Drag" />
          <DockButton 
            icon={
              <div className="relative">
                <Sparkles size={19} />
                {selectedCount > 0 && (
                  <span className="absolute -right-3 -top-3 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white shadow-sm">
                    {selectedCount}
                  </span>
                )}
              </div>
            } 
            onClick={() => void runSelectedWorkflow()} 
            theme={theme} 
            tooltip={selectedCount > 0 ? `Run ${selectedCount} selected ${selectedCount === 1 ? 'node' : 'nodes'}` : "Run Selection"} 
            tooltipShortcut="⌘" 
            tooltipShortcutLabel="↵" 
          />
          <DockButton icon={<GitFork size={19} />} onClick={() => void runWorkflow()} theme={theme} tooltip="Run All Nodes" tooltipShortcut="⇧" tooltipShortcutLabel="↵" />
        </div>


      </main>

      <RightSidebar isOpen={rightOpen} mode={rightPanelMode} theme={theme} />

      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setIsSearchModalOpen(false)}>
          <div className={clsx("w-[480px] overflow-hidden rounded-2xl border shadow-2xl", theme === 'dark' ? "border-white/10 bg-[#121316]" : "border-neutral-200 bg-white")} onClick={e => e.stopPropagation()}>
            <div className={clsx("flex items-center px-4 pt-4 pb-2 border-b", theme === 'dark' ? "border-white/5" : "border-black/5")}>
              <Search className="mr-3 text-[#5f6a7d]" size={20} />
              <input
                type="text"
                autoFocus
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={clsx("flex-1 bg-transparent text-xl font-medium focus:outline-none", theme === 'dark' ? "text-white" : "text-[#0f172a]")}
              />
              <button onClick={() => setIsSearchModalOpen(false)} className={clsx("rounded-md p-1 transition-colors", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-black/5")}>
                <X size={18} className="text-neutral-500" />
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
              {tools.map(tool => (
                <div 
                  key={tool.type} 
                  className={clsx("flex cursor-pointer items-center gap-4 rounded-xl p-3 transition-colors", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-black/5")} 
                  onClick={() => { 
                    window.dispatchEvent(new CustomEvent('nextflow:add-node', { detail: { type: tool.type } })); 
                    setIsSearchModalOpen(false); 
                  }}
                >
                  <div className={clsx("flex h-12 w-12 items-center justify-center rounded-xl shadow-sm", tool.bgColor, tool.color)}>
                    {tool.icon}
                  </div>
                  <div>
                    <div className={clsx("font-semibold", theme === 'dark' ? "text-white" : "text-[#0f172a]")}>{tool.label}</div>
                    <div className={clsx("text-xs opacity-50")}>Add {tool.label} node to canvas</div>
                  </div>
                </div>
              ))}
              {tools.length === 0 && (
                <div className="py-8 text-center text-sm opacity-30">No tools found matching &quot;{searchQuery}&quot;</div>
              )}
            </div>
          </div>
        </div>
      )}
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
      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors outline-none focus:outline-none focus:ring-0 select-none ${
        theme === 'dark'
          ? active
            ? 'bg-white/10 text-white shadow-inner'
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

function WorkspaceMenu({
  theme,
  workflowId: workflowIdProp,
  initialWorkflowName,
}: {
  theme: ThemeMode;
  workflowId?: string;
  initialWorkflowName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workflowIdFromPath = pathname.startsWith('/nodes/') ? pathname.split('/').pop() : undefined;
  const workflowId = workflowIdProp ?? workflowIdFromPath;

  const [workspaceName, setWorkspaceName] = useState(() => {
    if (initialWorkflowName?.trim()) {
      return initialWorkflowName.trim();
    }
    if (typeof window === 'undefined') return 'Untitled';
    return window.localStorage.getItem('nextflow-workspace-name') || 'Untitled';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const lastSavedNameRef = useRef((initialWorkflowName?.trim() || 'Untitled').trim());
  const latestNameRef = useRef((initialWorkflowName?.trim() || 'Untitled').trim());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.localStorage.setItem('nextflow-workspace-name', workspaceName);
    latestNameRef.current = workspaceName;
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

  const persistWorkflowName = useCallback(async (nextName: string) => {
    if (!workflowId) return;
    const normalized = nextName.trim();
    if (!normalized || normalized === lastSavedNameRef.current) return;
    try {
      setIsSavingName(true);
      const response = await fetch('/api/workflow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, name: normalized }),
      });
      if (response.ok) {
        lastSavedNameRef.current = normalized;
      }
    } finally {
      setIsSavingName(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (!workflowId) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void persistWorkflowName(workspaceName);
    }, 650);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [workspaceName, workflowId, persistWorkflowName]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      void persistWorkflowName(latestNameRef.current);
    };
  }, [persistWorkflowName]);

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

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.nodes && data.edges) {
          useWorkflowStore.getState().setNodes(data.nodes);
          useWorkflowStore.getState().setEdges(data.edges);
          setMenuOpen(false);
        }
      } catch (error) {
        console.error('Failed to import workflow:', error);
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative flex items-center" ref={menuRef}>
      <div
        className={`flex h-11 items-center rounded-2xl border transition-all duration-300 p-1.5 ${
          theme === 'dark' ? 'border-white/10 bg-[#202020] shadow-[0_8px_24px_rgba(0,0,0,0.5)]' : 'border-[#d6dde9] bg-white text-[#0f172a] shadow-sm'
        }`}
      >
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className={`flex h-full items-center justify-center gap-2 rounded-xl px-2 transition-colors ${
            theme === 'dark' ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-[#5f6f88] hover:bg-[#f1f4f9] hover:text-[#0f172a]'
          }`}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[11px] font-black text-black shadow-sm">
            N
          </div>
          <ChevronDown size={12} className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json"
          onChange={handleImport}
        />
        <div className={`h-4 w-[1px] ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'}`} />
        <div className={`relative flex items-center overflow-hidden transition-all duration-300 ease-out ${isFocused ? 'w-48' : 'w-24'}`}>
          <input
            type="text"
            value={workspaceName}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              void persistWorkflowName(workspaceName);
            }}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className={`h-full w-full bg-transparent px-3 text-[13px] font-bold focus:outline-none focus:ring-0 ${
              theme === 'dark' ? 'text-white' : 'text-[#0f172a]'
            }`}
          />
          {isSavingName && (
            <span className="pointer-events-none absolute right-2 text-[10px] text-white/40">
              ...
            </span>
          )}
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
          <MenuItem icon={<Share2 size={15} />} label="Import" shortcut="" onClick={() => fileInputRef.current?.click()} theme={theme} />
          <MenuItem icon={<Share2 size={15} className="rotate-180" />} label="Export" shortcut="" onClick={exportWorkspace} theme={theme} />
        </div>
      )}
    </div>
  );
}
