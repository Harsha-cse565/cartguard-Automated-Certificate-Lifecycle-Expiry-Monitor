import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export const ScopeNoticeBanner: React.FC = () => {
  return (
    <div className="bg-slate-900/90 border-b border-slate-800 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-slate-300">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-cyan-400 font-semibold uppercase tracking-wider text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          Safety Boundary
        </span>
        <span className="text-slate-600 hidden sm:inline">|</span>
        <span className="font-medium text-slate-200">
          Monitoring is restricted to authorized and sandboxed endpoints.
        </span>
      </div>
      <div className="flex items-center gap-3 text-slate-400 text-[11px]">
        <span>Deterministic Demo Sandbox Active</span>
        <span className="text-slate-700">·</span>
        <span className="font-mono text-cyan-400/90">Zero Unauthorized External Probing</span>
      </div>
    </div>
  );
};
