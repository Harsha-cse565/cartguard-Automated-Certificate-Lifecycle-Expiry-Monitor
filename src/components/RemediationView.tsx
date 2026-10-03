import React, { useState } from 'react';
import {
  Wrench,
  AlertOctagon,
  Clock,
  Sliders,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { RecommendationItem } from '../types.ts';

interface RemediationViewProps {
  recommendations: RecommendationItem[];
  onInspectEndpoint: (endpointId: string) => void;
}

export const RemediationView: React.FC<RemediationViewProps> = ({
  recommendations,
  onInspectEndpoint,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    'All',
    'Immediate Actions',
    'Upcoming Actions',
    'Configuration Improvements',
  ];

  const filtered = recommendations.filter((r) => {
    if (activeCategory !== 'All' && r.category !== activeCategory) return false;
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            Remediation Action Center
          </h2>
          <p className="text-xs text-slate-400">
            Engineered playbooks, configuration templates, and operational renewal steps
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeCategory === cat
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations Cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
            No remediation tasks in this category. All systems aligned.
          </div>
        ) : (
          filtered.map((item) => {
            const isP0 = item.priority === 'P0';
            const isP1 = item.priority === 'P1';

            return (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        isP0
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : isP1
                          ? 'bg-orange-950 text-orange-400 border border-orange-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {item.priority} · {item.severity}
                    </span>
                    <button
                      onClick={() => onInspectEndpoint(item.endpointId)}
                      className="font-mono font-bold text-white text-xs hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      <span>{item.hostname}</span>
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </button>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {item.environment}
                    </span>
                  </div>

                  <span className="text-[11px] font-medium text-slate-400">
                    Category: <span className="text-slate-300">{item.category}</span>
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="text-slate-300 font-semibold">{item.issue}</div>
                  <p className="text-slate-400 leading-relaxed">{item.recommendation}</p>

                  <div className="pt-2">
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block mb-1">
                      Step-by-Step Resolution Procedures:
                    </span>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-300 text-[11px]">
                      {item.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {item.commandSnippet && (
                    <div className="mt-3 relative">
                      <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-t border-t border-x border-slate-800 text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Terminal className="w-3 h-3 text-cyan-400" />
                          Suggested Hardening Command
                        </span>
                        <button
                          onClick={() => handleCopy(item.id, item.commandSnippet!)}
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === item.id ? 'Copied' : 'Copy Snippet'}</span>
                        </button>
                      </div>
                      <pre className="p-3 bg-black/90 rounded-b border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto select-all">
                        {item.commandSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
