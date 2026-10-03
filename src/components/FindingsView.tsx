import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
  Copy,
  Check,
  UserCheck,
  Terminal,
} from 'lucide-react';
import { Finding, FindingStatus, Severity, User } from '../types.ts';

interface FindingsViewProps {
  findings: Finding[];
  onUpdateFindingStatus: (id: string, status: FindingStatus, note?: string) => Promise<void>;
  currentUser: User;
  onInspectEndpoint: (endpointId: string) => void;
}

export const FindingsView: React.FC<FindingsViewProps> = ({
  findings,
  onUpdateFindingStatus,
  currentUser,
  onInspectEndpoint,
}) => {
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== 'All' && f.severity !== severityFilter) return false;
    if (statusFilter !== 'All' && f.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        f.hostname.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStatusChange = async (id: string, newStatus: FindingStatus) => {
    setUpdatingId(id);
    try {
      await onUpdateFindingStatus(id, newStatus, statusNote || `Status updated to ${newStatus} by ${currentUser.name}`);
      setStatusNote('');
      // update currently selected finding if open
      if (selectedFinding && selectedFinding.id === id) {
        setSelectedFinding({
          ...selectedFinding,
          status: newStatus,
        });
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search findings by hostname, ID, or title..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Ignored">Ignored</option>
          </select>
        </div>
      </div>

      {/* Main Container: Table + Evidence Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Findings Table (8 cols when panel open, or 12 cols) */}
        <div className={`${selectedFinding ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all`}>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Finding</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Risk Score</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredFindings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                        No findings matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredFindings.map((f) => {
                      const isSelected = selectedFinding?.id === f.id;
                      const isCrit = f.severity === 'CRITICAL';
                      const isHigh = f.severity === 'HIGH';

                      return (
                        <tr
                          key={f.id}
                          onClick={() => setSelectedFinding(f)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-slate-800/90 border-l-2 border-l-cyan-400'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="font-semibold text-white font-mono text-[12px] flex items-center gap-1.5">
                              <span>{f.hostname}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {f.title}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              ID: {f.id} · {new Date(f.detectedAt).toLocaleDateString()}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                                isCrit
                                  ? 'bg-red-950 text-red-400 border border-red-800'
                                  : isHigh
                                  ? 'bg-orange-950 text-orange-400 border border-orange-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}
                            >
                              {f.severity}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`font-mono font-bold text-[11px] ${
                                f.priority === 'P0'
                                  ? 'text-red-400'
                                  : f.priority === 'P1'
                                  ? 'text-orange-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {f.priority}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-white tabular-nums">
                            {f.riskScore}
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                                f.status === 'Open'
                                  ? 'bg-red-950/60 text-red-300 border border-red-800/60'
                                  : f.status === 'Acknowledged'
                                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                  : f.status === 'In Progress'
                                  ? 'bg-sky-950/60 text-sky-300 border border-sky-800/60'
                                  : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                              }`}
                            >
                              {f.status}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFinding(f);
                              }}
                              className="px-2 py-1 text-[11px] font-medium text-cyan-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center gap-1 ml-auto"
                            >
                              <span>Evidence</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Evidence & Explanation Panel (Section 16 - Dedicated interactive view) */}
        {selectedFinding && (
          <div className="lg:col-span-5 bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-5 shadow-xl sticky top-20 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-bold">
                  Evidence & Audit Justification
                </span>
                <h3 className="text-sm font-bold text-white font-mono mt-1">
                  WHY IS THIS ENDPOINT {selectedFinding.severity}?
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  Target: <span className="font-mono text-cyan-300">{selectedFinding.hostname}</span> (
                  {selectedFinding.environment})
                </div>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Core Finding Summary */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Finding Category:</span>
                <span className="font-mono text-slate-200 font-semibold">{selectedFinding.findingType}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Severity & Risk Score:</span>
                <span className="font-mono font-bold text-white">
                  {selectedFinding.severity} ({selectedFinding.riskScore}/100) · Priority {selectedFinding.priority}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Risk Contribution:</span>
                <span className="font-mono text-rose-400 font-bold">
                  +{selectedFinding.evidence.riskContribution} points
                </span>
              </div>
            </div>

            {/* Detailed Evidence Block (Section 16) */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                Empirical Evidence & Policy Match
              </h4>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">Observed Endpoint Condition</span>
                  <div className="font-mono text-rose-300 font-semibold text-xs mt-0.5">
                    {selectedFinding.evidence.observedValue}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Configured Security Policy Rule</span>
                  <div className="font-mono text-slate-300 text-[11px] mt-0.5">
                    {selectedFinding.evidence.policyThreshold}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">Root Cause Explanation</span>
                  <p className="text-slate-300 text-xs leading-relaxed mt-0.5">
                    {selectedFinding.evidence.explanation}
                  </p>
                </div>
              </div>
            </div>

            {/* Recommended Remediation & Code Snippet */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Actionable Remediation
              </h4>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="font-semibold text-white">{selectedFinding.recommendation.title}</div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {selectedFinding.recommendation.summary}
                </p>

                <div className="pt-2">
                  <span className="text-slate-500 text-[10px] block mb-1">Standard Execution Steps:</span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                    {selectedFinding.recommendation.actionSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>

                {selectedFinding.recommendation.remediationCommand && (
                  <div className="mt-3 relative">
                    <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-t border-t border-x border-slate-800 text-[10px] text-slate-400">
                      <span>Remediation CLI Snippet</span>
                      <button
                        onClick={() => copyToClipboard(selectedFinding.recommendation.remediationCommand!)}
                        className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                      >
                        {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-2.5 bg-black/80 rounded-b border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto select-all">
                      {selectedFinding.recommendation.remediationCommand}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Finding Workflow State Management */}
            <div className="space-y-2 border-t border-slate-800 pt-3 text-xs">
              <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Triage Status Management
              </h4>

              <div className="flex flex-wrap gap-1.5">
                {(['Open', 'Acknowledged', 'In Progress', 'Resolved', 'Ignored'] as FindingStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      disabled={updatingId === selectedFinding.id}
                      onClick={() => handleStatusChange(selectedFinding.id, status)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                        selectedFinding.status === status
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {status}
                    </button>
                  )
                )}
              </div>

              {/* Status Note input */}
              <input
                type="text"
                placeholder="Optional audit justification note..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
              />

              {/* Status Audit History */}
              {selectedFinding.statusHistory && selectedFinding.statusHistory.length > 0 && (
                <div className="pt-2">
                  <span className="text-slate-500 text-[10px] block mb-1">Status Audit Trail:</span>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {selectedFinding.statusHistory.map((hist, idx) => (
                      <div key={idx} className="text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded">
                        <span className="text-slate-300 font-semibold">{hist.status}</span> by {hist.user} ·{' '}
                        {new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {hist.note && <div className="text-slate-500 italic mt-0.5">"{hist.note}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
