'use client';
import { useState } from 'react';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0A0A] text-white">
      <LeftSidebar isOpen={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} />
      
      <main className="flex-1 relative">
        {children}
      </main>

      <RightSidebar isOpen={rightOpen} onToggle={() => setRightOpen(!rightOpen)} />
    </div>
  );
}
