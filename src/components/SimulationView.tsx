import React, { useState } from 'react';
import {
  Cpu,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  KeyRound,
  Layers,
  Flame,
  Info,
} from 'lucide-react';
import { Endpoint, Alert, Finding, Environment } from '../types.ts';

interface SimulationViewProps {
  endpoints: Endpoint[];
  onApplySimulation: (params: {
    endpointId: string;
    daysRemaining?: number;
    cipherSuite?: string;
    tlsVersion?: string;
    environment?: string;
    notes?: string;
  }) => Promise<{ endpoint: Endpoint; alerts: Alert[]; findings: Finding[] }>;
  onResetDemo: () => Promise<void>;
  onInspectEndpoint: (endpointId: string) => void;
  preselectedEndpointId?: string;
}

export const SimulationView: React.FC<SimulationViewProps> = ({
  endpoints,
  onApplySimulation,
  onResetDemo,
  onInspectEndpoint,
  preselectedEndpointId,
}) => {
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(
    preselectedEndpointId || (endpoints.find((e) => e.hostname.includes('payment'))?.id || endpoints[0]?.id || '')
  );

  const activeEndpoint = endpoints.find((e) => e.id === selectedEndpointId) || endpoints[0];

  // Simulation inputs
  const [simDaysRemaining, setSimDaysRemaining] = useState<number>(
    activeEndpoint ? activeEndpoint.certificate.daysRemaining : 30
  );
  const [simCipherSuite, setSimCipherSuite] = useState<string>(
    activeEndpoint ? activeEndpoint.cipher.cipherSuite : 'TLS_AES_256_GCM_SHA384'
  );
  const [simTlsVersion, setSimTlsVersion] = useState<string>(
    activeEndpoint ? activeEndpoint.cipher.tlsVersion : 'TLSv1.3'
  );
  const [simEnvironment, setSimEnvironment] = useState<Environment>(
    activeEndpoint ? activeEndpoint.environment : 'Production'
  );

  const [isApplying, setIsApplying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    endpoint: Endpoint;
    alerts: Alert[];
    findings: Finding[];
    previousState: {
      days: number;
      cipher: string;
      severity: string;
      score: number;
      priority: string;
    };
  } | null>(null);

  // Sync inputs when selected endpoint changes
  const handleSelectEndpoint = (id: string) => {
    setSelectedEndpointId(id);
    const ep = endpoints.find((e) => e.id === id);
    if (ep) {
      setSimDaysRemaining(ep.certificate.daysRemaining);
      setSimCipherSuite(ep.cipher.cipherSuite);
      setSimTlsVersion(ep.cipher.tlsVersion);
      setSimEnvironment(ep.environment);
      setLastResult(null);
    }
  };

  const handleApply = async () => {
    if (!activeEndpoint) return;
    setIsApplying(true);

    const previousState = {
      days: activeEndpoint.certificate.daysRemaining,
      cipher: `${activeEndpoint.cipher.tlsVersion} / ${activeEndpoint.cipher.cipherSuite}`,
      severity: activeEndpoint.risk.severity,
      score: activeEndpoint.risk.riskScore,
      priority: activeEndpoint.risk.priority,
    };

    try {
      const res = await onApplySimulation({
        endpointId: activeEndpoint.id,
        daysRemaining: simDaysRemaining,
        cipherSuite: simCipherSuite,
        tlsVersion: simTlsVersion,
        environment: simEnvironment,
        notes: `Simulated via What-If mode: Expiry=${simDaysRemaining}d, Cipher=${simCipherSuite}`,
      });

      setLastResult({
        endpoint: res.endpoint,
        alerts: res.alerts,
        findings: res.findings,
        previousState,
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset entire demo environment back to pristine baseline dataset?')) {
      setIsResetting(true);
      try {
        await onResetDemo();
        setLastResult(null);
      } finally {
        setIsResetting(false);
      }
    }
  };

  // Hackathon Preset Scenarios
  const applyPresetScenario = (type: 'EXPIRY_OUTAGE' | 'WEAK_SWEET32' | 'CRITICAL_RC4') => {
    if (!activeEndpoint) return;

    if (type === 'EXPIRY_OUTAGE') {
      setSimDaysRemaining(4);
      setSimTlsVersion('TLSv1.3');
      setSimCipherSuite('TLS_AES_256_GCM_SHA384');
    } else if (type === 'WEAK_SWEET32') {
      setSimDaysRemaining(90);
      setSimTlsVersion('TLSv1.2');
      setSimCipherSuite('TLS_RSA_WITH_3DES_EDE_CBC_SHA');
    } else if (type === 'CRITICAL_RC4') {
      setSimDaysRemaining(12);
      setSimTlsVersion('TLSv1.0');
      setSimCipherSuite('TLS_RSA_WITH_RC4_128_SHA');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              <Cpu className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              Live What-If Simulation Sandbox
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Interactively alter certificate expiry horizons, downgrade cipher suites, or switch environments. The backend risk engine recalculates downstream scores, updates severity, and triggers automated alerts in real time.
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-2 border border-slate-700 transition-colors shrink-0"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset Demo Baseline</span>
        </button>
      </div>

      {/* Preset Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => applyPresetScenario('EXPIRY_OUTAGE')}
          className="p-3 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-red-900/60 rounded-xl text-left transition-all group"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-rose-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Scenario 1: Critical Expiry
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Preset</span>
          </div>
          <div className="text-xs font-bold text-white group-hover:text-rose-300">
            Drop Expiry from 30d → 4 Days
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Triggers P0 emergency renewal escalation and critical finding alert.
          </div>
        </button>

        <button
          onClick={() => applyPresetScenario('WEAK_SWEET32')}
          className="p-3 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-900/60 rounded-xl text-left transition-all group"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Scenario 2: Sweet32 Cipher
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Preset</span>
          </div>
          <div className="text-xs font-bold text-white group-hover:text-amber-300">
            Inject 3DES-EDE-CBC Cipher
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Demonstrates weak cipher policy violation & plaintext recovery risk.
          </div>
        </button>

        <button
          onClick={() => applyPresetScenario('CRITICAL_RC4')}
          className="p-3 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-red-900/60 rounded-xl text-left transition-all group"
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-red-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              Scenario 3: Deprecated TLS 1.0
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Preset</span>
          </div>
          <div className="text-xs font-bold text-white group-hover:text-red-300">
            TLS 1.0 + Broken RC4 Stream
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Dual failure: Deprecated protocol (RFC 8996) + critical cipher.
          </div>
        </button>
      </div>

      {/* Main Simulation Control Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Target Endpoint Parameters</h3>
            <span className="text-[10px] font-mono text-cyan-400 uppercase">Active Controller</span>
          </div>

          {/* Select Target Endpoint */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Monitored Target Endpoint</label>
            <select
              value={selectedEndpointId}
              onChange={(e) => handleSelectEndpoint(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
            >
              {endpoints.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.hostname} ({e.environment}) — Expiry: {e.certificate.daysRemaining}d, Cipher: {e.cipher.status}
                </option>
              ))}
            </select>
          </div>

          {/* Environment */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Environment Multiplier Tier</label>
            <select
              value={simEnvironment}
              onChange={(e) => setSimEnvironment(e.target.value as Environment)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="Production">Production (1.3x High Impact Weight)</option>
              <option value="Staging">Staging (1.0x Baseline)</option>
              <option value="Development">Development (0.8x Reduced)</option>
              <option value="Sandbox">Sandbox (0.6x Non-critical)</option>
            </select>
          </div>

          {/* Days Remaining Slider & Input */}
          <div className="space-y-2 p-3 bg-slate-950/80 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Certificate Days Remaining
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={simDaysRemaining}
                  onChange={(e) => setSimDaysRemaining(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-xs font-mono font-bold text-white"
                />
                <span className="text-xs text-slate-400">days</span>
              </div>
            </div>

            <input
              type="range"
              min="-10"
              max="180"
              step="1"
              value={simDaysRemaining}
              onChange={(e) => setSimDaysRemaining(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-10d (Expired)</span>
              <span>0d (Today)</span>
              <span className="text-rose-400 font-semibold">7d (Crit)</span>
              <span className="text-amber-400 font-semibold">30d (Med)</span>
              <span>180d</span>
            </div>
          </div>

          {/* TLS Version & Cipher Suite Selection */}
          <div className="space-y-3 p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Negotiated TLS Protocol</label>
              <select
                value={simTlsVersion}
                onChange={(e) => setSimTlsVersion(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
              >
                <option value="TLSv1.3">TLSv1.3 (Modern Recommended)</option>
                <option value="TLSv1.2">TLSv1.2 (Standard Baseline)</option>
                <option value="TLSv1.1">TLSv1.1 (Deprecated RFC 8996)</option>
                <option value="TLSv1.0">TLSv1.0 (Insecure Legacy)</option>
                <option value="SSLv3">SSLv3 (Obsolete / POODLE Vulnerable)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Cipher Suite</label>
              <select
                value={simCipherSuite}
                onChange={(e) => setSimCipherSuite(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 font-mono"
              >
                <option value="TLS_AES_256_GCM_SHA384">TLS_AES_256_GCM_SHA384 (AEAD Strong)</option>
                <option value="TLS_CHACHA20_POLY1305_SHA256">TLS_CHACHA20_POLY1305_SHA256 (AEAD Strong)</option>
                <option value="ECDHE-RSA-AES256-GCM-SHA384">ECDHE-RSA-AES256-GCM-SHA384 (PFS Strong)</option>
                <option value="ECDHE-RSA-AES128-GCM-SHA256">ECDHE-RSA-AES128-GCM-SHA256 (PFS Strong)</option>
                <option value="ECDHE-RSA-AES256-SHA384">ECDHE-RSA-AES256-SHA384 (CBC Mode Acceptable)</option>
                <option value="TLS_RSA_WITH_AES_128_CBC_SHA">TLS_RSA_WITH_AES_128_CBC_SHA (Static RSA - No PFS)</option>
                <option value="TLS_RSA_WITH_3DES_EDE_CBC_SHA">TLS_RSA_WITH_3DES_EDE_CBC_SHA (Sweet32 Weak)</option>
                <option value="TLS_RSA_WITH_RC4_128_SHA">TLS_RSA_WITH_RC4_128_SHA (RC4 Broken Critical)</option>
              </select>
            </div>
          </div>

          {/* Apply Simulation Button */}
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-950 transition-all"
          >
            <Cpu className={`w-4 h-4 ${isApplying ? 'animate-spin' : ''}`} />
            <span>{isApplying ? 'Processing Simulation Pipeline...' : 'Apply Simulation & Recalculate Risk'}</span>
          </button>
        </div>

        {/* Live Downstream Impact Panel (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Downstream Real-Time Impact</h3>
            <span className="text-[10px] font-mono text-slate-400">Risk & Triage Output</span>
          </div>

          {!lastResult ? (
            <div className="h-72 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
              <Cpu className="w-10 h-10 text-slate-600" />
              <div className="text-xs font-semibold text-slate-300">Ready to simulate</div>
              <p className="text-[11px] text-slate-500 max-w-sm">
                Adjust the parameters on the left or select a preset, then click Apply. You will see the before-and-after comparison of risk score, severity, priority, generated alerts, and recommendations.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Before vs After Comparison Grid */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Before vs. After Delta
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Before */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Previous State</span>
                    <div className="text-xs font-bold text-slate-300">{lastResult.previousState.severity}</div>
                    <div className="text-[11px] font-mono text-slate-400">Score: {lastResult.previousState.score} pts</div>
                    <div className="text-[11px] text-slate-500 mt-1">Expiry: {lastResult.previousState.days}d</div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">{lastResult.previousState.cipher}</div>
                  </div>

                  {/* After */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-cyan-800/80 shadow-sm">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase block mb-1">Updated State</span>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                          lastResult.endpoint.risk.severity === 'CRITICAL'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : lastResult.endpoint.risk.severity === 'HIGH'
                            ? 'bg-orange-950 text-orange-400 border border-orange-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {lastResult.endpoint.risk.severity}
                      </span>
                      <span>({lastResult.endpoint.risk.riskScore} pts)</span>
                    </div>
                    <div className="text-[11px] font-mono text-rose-400 font-semibold mt-1">
                      Priority: {lastResult.endpoint.risk.priority}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      Expiry: {lastResult.endpoint.certificate.daysRemaining}d
                    </div>
                    <div className="text-[10px] font-mono text-cyan-300 truncate">
                      {lastResult.endpoint.cipher.cipherSuite}
                    </div>
                  </div>
                </div>
              </div>

              {/* Generated Findings & Alerts */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Downstream Events Triggered</span>
                  <span className="text-cyan-400 font-mono">{lastResult.findings.length} findings, {lastResult.alerts.length} alerts</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {lastResult.findings.map((f) => (
                    <div key={f.id} className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{f.title}</span>
                        <span className="text-[10px] font-mono text-red-400 font-bold">+{f.evidence.riskContribution} pts</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">{f.evidence.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Link to inspect */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => onInspectEndpoint(lastResult.endpoint.id)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                >
                  <span>Inspect Full Certificate & Audit Chain</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
