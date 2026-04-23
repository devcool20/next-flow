'use client';

import { SignIn } from '@clerk/nextjs';

export default function NodesAuthModal() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080b12] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,#1d4ed855,transparent_45%),radial-gradient(circle_at_bottom_left,#0ea5e955,transparent_40%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#101725]/85 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 px-1 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8eb6ff]">NextFlow Nodes</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Sign In To Continue</h1>
            <p className="mt-2 text-sm text-white/65">Authenticate with Clerk to open your workflows and templates.</p>
          </div>
          <SignIn routing="hash" forceRedirectUrl="/nodes" />
        </div>
      </div>
    </div>
  );
}
