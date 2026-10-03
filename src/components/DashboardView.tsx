import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  KeyRound,
  BellRing,
  ArrowRight,
  TrendingUp,
  Cpu,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { DashboardCharts, DashboardSummary } from '../types.ts';
import {
  RiskDonutChart,
  ExpiryTimelineBarChart,
  CipherDistributionBarChart,
  FindingsTrendChart,
} from './Charts.tsx';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  charts: DashboardCharts | null;
  loading: boolean;
  onSelectTab: (tab: string) => void;
  onInspectEndpoint: (endpointId: string) => void;
  onOpenSimulationForEndpoint: (endpointId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  charts,
  loading,
  onSelectTab,
  onInspectEndpoint,
  onOpenSimulationForEndpoint,
}) => {
  if (loading || !summary || !charts) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-sm font-medium text-slate-400">Loading certificate telemetry & analysis...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simulation Quick Scenario Callout for Hackathon Judges */}
      <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-900 border border-cyan-800/60 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-cyan-900 text-cyan-300 font-bold rounded border border-cyan-700">
              Interactive Hackathon Demo Flow
            </span>
            <span className="text-xs text-slate-400 font-medium">Step-by-step verification active</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Live Risk & Cipher Simulation Sandbox Ready
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Simulate real-time certificate expiration (e.g. 30d → 5d) or downgrade cipher suites to observe instantaneous backend recalculation of risk scores, alert generation, and remediation guidance.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            onClick={() => onSelectTab('simulation')}
            className="w-full md:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-950"
          >
            <Cpu className="w-4 h-4" />
            <span>Launch What-If Simulator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Endpoints */}
        <div
          onClick={() => onSelectTab('endpoints')}
          className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Endpoints</span>
            <span className="w-2 h-2 rounded-full bg-cyan-500 group-hover:scale-125 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
            {summary.totalEndpoints}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            100% continuous monitoring enabled
          </div>
        </div>

        {/* Healthy */}
        <div
          onClick={() => onSelectTab('endpoints')}
          className="bg-slate-900/80 border border-slate-800 hover:border-emerald-900/40 rounded-xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Healthy</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
            {summary.healthy}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Compliant with active security policy
          </div>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => onSelectTab('endpoints')}
          className="bg-slate-900/80 border border-slate-800 hover:border-amber-900/40 rounded-xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Expiring Soon</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tabular-nums">
            {summary.expiringSoon}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Valid for ≤ 30 days remaining
          </div>
        </div>

        {/* Expired */}
        <div
          onClick={() => onSelectTab('endpoints')}
          className="bg-slate-900/80 border border-slate-800 hover:border-red-900/40 rounded-xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Expired</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-500 font-mono tabular-nums">
            {summary.expired}
          </div>
          <div className="text-[11px] text-red-400/80 font-medium mt-1">
            Immediate outage / SSL_ERROR
          </div>
        </div>

        {/* Critical Findings */}
        <div
          onClick={() => onSelectTab('findings')}
          className="bg-slate-900/80 border border-slate-800 hover:border-red-900/40 rounded-xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Critical Findings</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-400 font-mono tabular-nums">
            {summary.criticalFindings}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Score ≥ 80 or P0 triage priority
          </div>
        </div>

        {/* High Findings */}
        <div
          onClick={() => onSelectTab('findings')}
          className="bg-slate-900/80 border border-slate-800 hover:border-orange-900/40 rounded-xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">High Findings</span>
            <TrendingUp className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-orange-400 font-mono tabular-nums">
            {summary.highFindings}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Score 60–79 requiring action
          </div>
        </div>

        {/* Weak Ciphers */}
        <div
          onClick={() => onSelectTab('findings')}
          className="bg-slate-900/80 border border-slate-800 hover:border-amber-900/40 rounded-xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Weak Ciphers</span>
            <KeyRound className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono tabular-nums">
            {summary.weakCipherFindings}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Sweet32, RC4 or TLS 1.0/1.1
          </div>
        </div>

        {/* Open Alerts */}
        <div
          onClick={() => onSelectTab('alerts')}
          className="bg-slate-900/80 border border-slate-800 hover:border-cyan-900/40 rounded-xl p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Open Alerts</span>
            <BellRing className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono tabular-nums">
            {summary.openAlerts}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pending analyst acknowledgement
          </div>
        </div>
      </div>

      {/* Main Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Risk Distribution Donut (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Risk Distribution</h3>
              <p className="text-xs text-slate-400">Endpoint classification by severity score</p>
            </div>
            <button
              onClick={() => onSelectTab('endpoints')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <RiskDonutChart data={charts.riskDistribution} />
        </div>

        {/* Certificate Expiry Timeline (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Certificate Expiry Timeline</h3>
              <p className="text-xs text-slate-400">Endpoint grouping by validity horizon</p>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Automated ACME Policy</span>
          </div>
          <ExpiryTimelineBarChart data={charts.expiryTimeline} />
        </div>
      </div>

      {/* Secondary Visualizations: Cipher Posture & Findings Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cipher Security Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-white">Cipher & Protocol Security</h3>
              <p className="text-xs text-slate-400">Cryptographic alignment with NIST SP 800-52r2</p>
            </div>
          </div>
          <CipherDistributionBarChart data={charts.cipherDistribution} />
        </div>

        {/* Findings Trend Over Time (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-white">Findings Detected Over Time</h3>
              <p className="text-xs text-slate-400">Historical trend of critical & high vulnerabilities</p>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">7-Day Rolling Horizon</span>
          </div>
          <FindingsTrendChart data={charts.findingsTimeline} />
        </div>
      </div>

      {/* Top Risky Endpoints Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Top Risky Endpoints</h3>
            <p className="text-xs text-slate-400">Prioritized by multi-variable risk scoring model</p>
          </div>
          <button
            onClick={() => onSelectTab('endpoints')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>View Full Inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Endpoint</th>
                <th className="py-2.5 px-3">Environment</th>
                <th className="py-2.5 px-3">Days Remaining</th>
                <th className="py-2.5 px-3">Cipher Posture</th>
                <th className="py-2.5 px-3">Risk Score</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {charts.topRiskyEndpoints.map((ep) => {
                const isCrit = ep.severity === 'CRITICAL';
                const isHigh = ep.severity === 'HIGH';

                return (
                  <tr key={ep.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white font-mono">{ep.hostname}</div>
                      <div className="text-[10px] text-slate-400">Priority: {ep.priority}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-300">{ep.environment}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-mono tabular-nums font-semibold ${
                          ep.daysRemaining <= 0
                            ? 'text-red-400'
                            : ep.daysRemaining <= 7
                            ? 'text-rose-400'
                            : ep.daysRemaining <= 30
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {ep.daysRemaining <= 0 ? 'EXPIRED' : `${ep.daysRemaining} days`}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold text-[11px] ${
                          ep.cipherStatus === 'STRONG'
                            ? 'text-emerald-400'
                            : ep.cipherStatus === 'ACCEPTABLE'
                            ? 'text-sky-400'
                            : ep.cipherStatus === 'WEAK'
                            ? 'text-orange-400'
                            : 'text-red-400'
                        }`}
                      >
                        {ep.cipherStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono tabular-nums font-bold text-white text-sm">
                          {ep.riskScore}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              ep.riskScore >= 80 ? 'bg-red-500' : ep.riskScore >= 60 ? 'bg-orange-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${ep.riskScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                          isCrit
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : isHigh
                            ? 'bg-orange-950 text-orange-400 border border-orange-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {ep.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onInspectEndpoint(ep.id)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => onOpenSimulationForEndpoint(ep.id)}
                          className="px-2 py-1 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800/80 rounded transition-colors flex items-center gap-1"
                        >
                          <Cpu className="w-3 h-3" />
                          <span>Simulate</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
