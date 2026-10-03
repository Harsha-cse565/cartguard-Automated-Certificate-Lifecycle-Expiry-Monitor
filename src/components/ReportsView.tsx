import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Layers,
  CheckCircle,
  Clock,
  KeyRound,
  FileCode,
} from 'lucide-react';
import { DashboardCharts, DashboardSummary, Endpoint, Finding, RecommendationItem, User } from '../types.ts';

interface ReportsViewProps {
  reportData: any;
  loading: boolean;
  currentUser: User;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reportData,
  loading,
  currentUser,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (loading || !reportData) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400">Compiling executive cryptographic report...</span>
      </div>
    );
  }

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `CertGuard_Report_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
    setDownloadSuccess('JSON report downloaded successfully');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const exportCSV = () => {
    const headers = ['Hostname', 'Environment', 'DaysRemaining', 'CipherStatus', 'RiskScore', 'Severity', 'Priority'];
    const rows = reportData.endpointsInventory.map((e: any) => [
      e.hostname,
      e.environment,
      e.daysRemaining,
      e.cipherStatus,
      e.riskScore,
      e.severity,
      e.priority,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');

    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `CertGuard_Endpoints_${new Date().toISOString().split('T')[0]}.csv`);
    dlAnchor.click();
    setDownloadSuccess('CSV dataset exported successfully');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const exec = reportData.executiveSummary;
  const meta = reportData.metadata;

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Executive Cryptographic Security Audit Report
          </h2>
          <p className="text-xs text-slate-400">
            Enterprise compliance summary, certificate validity inventory, and prioritized remediation actions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {downloadSuccess && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {downloadSuccess}
            </span>
          )}

          <button
            onClick={exportCSV}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={exportJSON}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          <a
            href="/api/download-zip"
            download="certguard-source.zip"
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Project Source (.ZIP)</span>
          </a>
        </div>
      </div>

      {/* Printable Report Document Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 text-xs text-slate-300 shadow-sm print:bg-white print:text-black print:border-none print:p-0">
        {/* Document Header */}
        <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white font-mono">
                CERTGUARD SECURITY OVERSIGHT
              </span>
              <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.2 rounded font-bold">
                CONFIDENTIAL
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Report ID: <span className="font-mono text-slate-300">{meta.reportId}</span> · Generated on{' '}
              {new Date(meta.generatedAt).toLocaleString()}
            </div>
          </div>

          <div className="text-right text-[11px] text-slate-400 font-mono">
            <div>Auditor: {meta.generatedBy} ({meta.userRole})</div>
            <div>Engine: {meta.systemVersion}</div>
          </div>
        </div>

        {/* Scope Notice in Report */}
        <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-400">
          <strong className="text-cyan-400">Scope Declaration:</strong> {meta.scopeNotice} All analyses conducted using authorized sample endpoints and simulated TLS handshakes in accordance with responsible testing policy.
        </div>

        {/* Executive Summary */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1">
            1. Executive Assessment
          </h3>
          <p className="text-sm text-slate-200 font-semibold leading-relaxed">
            {exec.headline}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Fleet Risk Status</span>
              <span className="font-bold text-xs text-rose-400 font-mono">{exec.fleetPosture}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Expired Certificates</span>
              <span className="font-bold text-sm text-red-500 font-mono tabular-nums">{exec.expiredCertificates}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Expiring ≤ 30 Days</span>
              <span className="font-bold text-sm text-amber-400 font-mono tabular-nums">{exec.expiringWithin30Days}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Weak / Broken Ciphers</span>
              <span className="font-bold text-sm text-amber-300 font-mono tabular-nums">{exec.weakCipherEndpoints}</span>
            </div>
          </div>
        </div>

        {/* Critical Findings Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1">
            2. Priority Findings Requiring Action
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                  <th className="py-2 px-2">Target Hostname</th>
                  <th className="py-2 px-2">Finding Title</th>
                  <th className="py-2 px-2">Severity</th>
                  <th className="py-2 px-2">Score</th>
                  <th className="py-2 px-2">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {reportData.criticalFindings.slice(0, 8).map((f: any) => (
                  <tr key={f.id}>
                    <td className="py-2 px-2 font-bold text-white">{f.hostname}</td>
                    <td className="py-2 px-2 text-slate-300 font-sans">{f.title}</td>
                    <td className="py-2 px-2 text-rose-400 font-bold">{f.severity}</td>
                    <td className="py-2 px-2 text-white">{f.riskScore}</td>
                    <td className="py-2 px-2 text-amber-400 font-bold">{f.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommended Immediate Actions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1">
            3. Recommended Immediate Action Items
          </h3>
          <div className="space-y-2">
            {reportData.immediateRecommendations.map((rec: any) => (
              <div key={rec.id} className="p-3 bg-slate-950 rounded border border-slate-800 text-xs">
                <div className="font-semibold text-white flex items-center justify-between">
                  <span>{rec.hostname} — {rec.issue}</span>
                  <span className="font-mono text-[10px] text-red-400 font-bold">{rec.priority}</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-1">{rec.recommendation}</p>
                {rec.commandSnippet && (
                  <pre className="mt-2 p-2 bg-slate-900 rounded font-mono text-[10px] text-cyan-300 overflow-x-auto">
                    {rec.commandSnippet}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sign-off */}
        <div className="border-t border-slate-800 pt-4 flex justify-between text-[10px] text-slate-500 font-mono">
          <div>Generated by CertGuard Automated Compliance Engine</div>
          <div>Page 1 of 1 · End of Security Briefing</div>
        </div>
      </div>
    </div>
  );
};
