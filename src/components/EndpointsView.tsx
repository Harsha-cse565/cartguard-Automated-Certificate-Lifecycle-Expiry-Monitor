import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  Cpu,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Clock,
  ArrowUpDown,
  Lock,
} from 'lucide-react';
import { Endpoint, Environment, Severity, CertificateStatus, User } from '../types.ts';

interface EndpointsViewProps {
  endpoints: Endpoint[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onFilterEnvChange: (env: string) => void;
  onFilterSeverityChange: (sev: string) => void;
  onFilterStatusChange: (status: string) => void;
  onInspect: (id: string) => void;
  onAnalyze: (id: string) => void;
  onSimulate: (id: string) => void;
  onDelete: (id: string) => void;
  onAddEndpoint: (data: any) => Promise<void>;
  currentUser: User;
  activeScanId: string | null;
}

export const EndpointsView: React.FC<EndpointsViewProps> = ({
  endpoints,
  pagination,
  onPageChange,
  onSearchChange,
  onFilterEnvChange,
  onFilterSeverityChange,
  onFilterStatusChange,
  onInspect,
  onAnalyze,
  onSimulate,
  onDelete,
  onAddEndpoint,
  currentUser,
  activeScanId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for Add Endpoint
  const [newHostname, setNewHostname] = useState('');
  const [newPort, setNewPort] = useState('443');
  const [newProtocol, setNewProtocol] = useState<'https' | 'tls' | 'smtps' | 'imaps'>('https');
  const [newEnv, setNewEnv] = useState<Environment>('Production');
  const [newOwner, setNewOwner] = useState('');
  const [newService, setNewService] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMonitoringEnabled, setNewMonitoringEnabled] = useState(true);
  const [newAuthorizedConfirmed, setNewAuthorizedConfirmed] = useState(false);
  const [isSandboxMode, setIsSandboxMode] = useState(true);
  const [sampleDaysRemaining, setSampleDaysRemaining] = useState('30');
  const [sampleCipherSuite, setSampleCipherSuite] = useState('TLS_AES_256_GCM_SHA384');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchTerm);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthorizedConfirmed) {
      setFormError('You must confirm that you are authorized to monitor this endpoint.');
      return;
    }
    if (!newHostname.trim()) {
      setFormError('Please specify a valid hostname.');
      return;
    }

    setFormError('');
    setFormSubmitting(true);

    try {
      await onAddEndpoint({
        hostname: newHostname,
        port: Number(newPort),
        protocol: newProtocol,
        environment: newEnv,
        owner: newOwner || currentUser.name,
        businessService: newService || 'Web Service',
        description: newDescription || 'Authorized monitored endpoint',
        monitoringEnabled: newMonitoringEnabled,
        authorizedConfirmed: newAuthorizedConfirmed,
        isSandbox: isSandboxMode,
        sampleDaysRemaining: Number(sampleDaysRemaining),
        sampleTlsVersion: 'TLSv1.3',
        sampleCipherSuite,
      });

      setShowAddModal(false);
      // Reset form
      setNewHostname('');
      setNewAuthorizedConfirmed(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to register endpoint');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Controls: Search, Filters & Add Endpoint */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              onSearchChange(e.target.value);
            }}
            placeholder="Search hostname, owner, or business service..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </form>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Environment Filter */}
          <select
            value={selectedEnv}
            onChange={(e) => {
              setSelectedEnv(e.target.value);
              onFilterEnvChange(e.target.value);
            }}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Environments</option>
            <option value="Production">Production</option>
            <option value="Staging">Staging</option>
            <option value="Development">Development</option>
            <option value="Sandbox">Sandbox</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => {
              setSelectedSeverity(e.target.value);
              onFilterSeverityChange(e.target.value);
            }}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="HEALTHY">Healthy</option>
          </select>

          {/* Add Endpoint Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Endpoint</span>
          </button>
        </div>
      </div>

      {/* Endpoints Table Container */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Endpoint</th>
                <th className="py-3 px-3">Environment</th>
                <th className="py-3 px-3">Port / Protocol</th>
                <th className="py-3 px-3">Certificate Status</th>
                <th className="py-3 px-3">Days Remaining</th>
                <th className="py-3 px-3">Cipher Posture</th>
                <th className="py-3 px-3">Risk Score</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Last Checked</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {endpoints.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                    No matching authorized endpoints found in inventory.
                  </td>
                </tr>
              ) : (
                endpoints.map((ep) => {
                  const isScanningThis = activeScanId === ep.id;
                  const isCrit = ep.risk.severity === 'CRITICAL';
                  const isHigh = ep.risk.severity === 'HIGH';

                  return (
                    <tr key={ep.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Hostname & Service */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white font-mono text-[12px] flex items-center gap-1.5">
                          {ep.isSandbox && (
                            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                              Sandbox
                            </span>
                          )}
                          <span>{ep.hostname}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {ep.businessService} · <span className="text-slate-500">{ep.owner}</span>
                        </div>
                      </td>

                      {/* Environment */}
                      <td className="py-3 px-3">
                        <span className="text-slate-300 font-medium">{ep.environment}</span>
                      </td>

                      {/* Port & Protocol */}
                      <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">
                        {ep.protocol.toUpperCase()} / {ep.port}
                      </td>

                      {/* Certificate Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`font-semibold text-[11px] ${
                            ep.certificate.status === 'VALID'
                              ? 'text-emerald-400'
                              : ep.certificate.status === 'EXPIRING_SOON'
                              ? 'text-amber-400'
                              : ep.certificate.status === 'CRITICAL'
                              ? 'text-rose-400'
                              : 'text-red-500'
                          }`}
                        >
                          {ep.certificate.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Days Remaining */}
                      <td className="py-3 px-3">
                        <span
                          className={`font-mono tabular-nums font-bold ${
                            ep.certificate.daysRemaining <= 0
                              ? 'text-red-400'
                              : ep.certificate.daysRemaining <= 7
                              ? 'text-rose-400'
                              : ep.certificate.daysRemaining <= 30
                              ? 'text-amber-400'
                              : 'text-slate-200'
                          }`}
                        >
                          {ep.certificate.daysRemaining <= 0
                            ? 'EXPIRED'
                            : `${ep.certificate.daysRemaining}d`}
                        </span>
                      </td>

                      {/* Cipher Status */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span
                            className={`font-bold text-[11px] ${
                              ep.cipher.status === 'STRONG'
                                ? 'text-emerald-400'
                                : ep.cipher.status === 'ACCEPTABLE'
                                ? 'text-sky-400'
                                : ep.cipher.status === 'WEAK'
                                ? 'text-orange-400'
                                : 'text-red-400'
                            }`}
                          >
                            {ep.cipher.status}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                            {ep.cipher.tlsVersion}
                          </span>
                        </div>
                      </td>

                      {/* Risk Score */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums font-bold text-white text-xs">
                            {ep.risk.riskScore}
                          </span>
                          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                ep.risk.riskScore >= 80
                                  ? 'bg-red-500'
                                  : ep.risk.riskScore >= 60
                                  ? 'bg-orange-500'
                                  : ep.risk.riskScore >= 35
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.max(ep.risk.riskScore, 5)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                            isCrit
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : isHigh
                              ? 'bg-orange-950 text-orange-400 border border-orange-800'
                              : ep.risk.severity === 'MEDIUM'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {ep.risk.severity}
                        </span>
                      </td>

                      {/* Last Checked */}
                      <td className="py-3 px-3 text-[11px] text-slate-400 tabular-nums">
                        {new Date(ep.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Certificate */}
                          <button
                            onClick={() => onInspect(ep.id)}
                            title="Inspect X.509 Certificate details"
                            className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                          >
                            Inspect
                          </button>

                          {/* Re-analyze Single */}
                          <button
                            onClick={() => onAnalyze(ep.id)}
                            disabled={isScanningThis}
                            title="Re-run TLS handshake analysis"
                            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isScanningThis ? 'animate-spin text-cyan-400' : ''}`} />
                          </button>

                          {/* Simulate */}
                          <button
                            onClick={() => onSimulate(ep.id)}
                            title="Open What-If Simulation"
                            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Cpu className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete (Admin only) */}
                          {currentUser.role === 'Administrator' && (
                            <button
                              onClick={() => onDelete(ep.id)}
                              title="Delete endpoint"
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-white">{endpoints.length}</span> of{' '}
            <span className="font-semibold text-white">{pagination.total}</span> endpoints
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              Previous
            </button>
            <span className="font-mono px-2">
              {pagination.page} / {Math.max(1, pagination.totalPages)}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Endpoint Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Register Monitored Endpoint</h3>
                <p className="text-xs text-slate-400">Add an authorized service endpoint or sandbox target</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 rounded bg-red-950/80 border border-red-800 text-red-300 text-xs">
                  {formError}
                </div>
              )}

              {/* Hostname & Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-slate-300 font-semibold">Hostname / FQDN *</label>
                  <input
                    type="text"
                    required
                    value={newHostname}
                    onChange={(e) => setNewHostname(e.target.value)}
                    placeholder="e.g. secure-vault.demo.local"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Port</label>
                  <input
                    type="number"
                    value={newPort}
                    onChange={(e) => setNewPort(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Protocol & Environment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Protocol</label>
                  <select
                    value={newProtocol}
                    onChange={(e) => setNewProtocol(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value="https">HTTPS (Web / API)</option>
                    <option value="tls">Direct TLS / TCP</option>
                    <option value="smtps">SMTPS (Mail Relay)</option>
                    <option value="imaps">IMAPS</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Environment</label>
                  <select
                    value={newEnv}
                    onChange={(e) => setNewEnv(e.target.value as Environment)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value="Production">Production (1.3x multiplier)</option>
                    <option value="Staging">Staging (1.0x)</option>
                    <option value="Development">Development (0.8x)</option>
                    <option value="Sandbox">Sandbox (0.6x)</option>
                  </select>
                </div>
              </div>

              {/* Owner & Business Service */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Owner / Team</label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    placeholder="e.g. Platform SecOps"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Business Service</label>
                  <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    placeholder="e.g. Identity Federation"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Operational context and asset criticality details..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              {/* Sandbox Sample Parameters */}
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">Sandbox Test Parameters</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Deterministic Seed</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-400">Sample Expiry (Days)</label>
                    <input
                      type="number"
                      value={sampleDaysRemaining}
                      onChange={(e) => setSampleDaysRemaining(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Cipher Configuration</label>
                    <select
                      value={sampleCipherSuite}
                      onChange={(e) => setSampleCipherSuite(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200"
                    >
                      <option value="TLS_AES_256_GCM_SHA384">Modern TLS 1.3 (AEAD Strong)</option>
                      <option value="ECDHE-RSA-AES128-GCM-SHA256">TLS 1.2 ECDHE (PFS Strong)</option>
                      <option value="TLS_RSA_WITH_3DES_EDE_CBC_SHA">3DES Sweet32 (Weak)</option>
                      <option value="TLS_RSA_WITH_RC4_128_SHA">RC4 Stream (Critical)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Mandatory Authorization Confirmation (Section 1 & 9) */}
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/80 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="authConfirm"
                  required
                  checked={newAuthorizedConfirmed}
                  onChange={(e) => setNewAuthorizedConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-cyan-700 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="authConfirm" className="text-slate-200 font-medium cursor-pointer leading-tight">
                  <span className="text-cyan-400 font-bold block mb-0.5">Mandatory Compliance Attestation:</span>
                  "I am authorized to monitor this endpoint."
                  <span className="block text-[11px] text-slate-400 mt-0.5">
                    Monitoring is strictly restricted to supplied, authorized, or sandbox endpoints.
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || !newAuthorizedConfirmed}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
                >
                  {formSubmitting ? 'Registering...' : 'Register Endpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
