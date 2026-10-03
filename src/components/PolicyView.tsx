import React, { useState } from 'react';
import { Sliders, ShieldCheck, Save, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { SecurityPolicy, User } from '../types.ts';

interface PolicyViewProps {
  policy: SecurityPolicy | null;
  onUpdatePolicy: (newPolicy: SecurityPolicy) => Promise<void>;
  currentUser: User;
}

export const PolicyView: React.FC<PolicyViewProps> = ({
  policy,
  onUpdatePolicy,
  currentUser,
}) => {
  const [formData, setFormData] = useState<SecurityPolicy | null>(
    policy ? JSON.parse(JSON.stringify(policy)) : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!formData) return null;

  const isAdmin = currentUser.role === 'Administrator';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMsg('Administrator privileges required to update security policy');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      await onUpdatePolicy(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update policy');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Security Policy & Risk Scoring Configuration
          </h2>
          <p className="text-xs text-slate-400">
            Define organizational thresholds for certificate expiration urgency, prohibited cipher suites, and environment risk multipliers
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving || !isAdmin}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-sm transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving & Recalculating Fleet...' : 'Save & Enforce Policy'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Security policy saved. All inventory endpoints and findings recalculated against updated thresholds.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-lg text-xs">
          {errorMsg}
        </div>
      )}

      {!isAdmin && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Read-only mode active. Switch role to <strong>Administrator</strong> in top bar to edit security policy thresholds.</span>
        </div>
      )}

      {/* 1. Expiry Thresholds */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
          1. Certificate Expiry Policy Thresholds (Days)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">Critical Threshold</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                disabled={!isAdmin}
                value={formData.expiryThresholds.criticalDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiryThresholds: {
                      ...formData.expiryThresholds,
                      criticalDays: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono text-white font-bold"
              />
              <span className="text-slate-500 font-mono">days</span>
            </div>
            <span className="text-[10px] text-slate-500">Triggers P0 emergency renewal</span>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">High Urgency</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                disabled={!isAdmin}
                value={formData.expiryThresholds.highDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiryThresholds: {
                      ...formData.expiryThresholds,
                      highDays: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono text-white font-bold"
              />
              <span className="text-slate-500 font-mono">days</span>
            </div>
            <span className="text-[10px] text-slate-500">Triggers P1 priority finding</span>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">Medium Warning</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                disabled={!isAdmin}
                value={formData.expiryThresholds.mediumDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiryThresholds: {
                      ...formData.expiryThresholds,
                      mediumDays: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono text-white font-bold"
              />
              <span className="text-slate-500 font-mono">days</span>
            </div>
            <span className="text-[10px] text-slate-500">Expiring soon category</span>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">Low Horizon</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                disabled={!isAdmin}
                value={formData.expiryThresholds.lowDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiryThresholds: {
                      ...formData.expiryThresholds,
                      lowDays: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono text-white font-bold"
              />
              <span className="text-slate-500 font-mono">days</span>
            </div>
            <span className="text-[10px] text-slate-500">Routine rotation boundary</span>
          </div>
        </div>
      </div>

      {/* 2. Cipher & TLS Policy */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
          2. Cryptographic Configuration Policy
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">Minimum Allowed TLS Version</label>
            <select
              disabled={!isAdmin}
              value={formData.cipherPolicy.minimumTlsVersion}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  cipherPolicy: {
                    ...formData.cipherPolicy,
                    minimumTlsVersion: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
            >
              <option value="TLSv1.3">TLSv1.3 Only (Strict Modern)</option>
              <option value="TLSv1.2">TLSv1.2 (Standard Enterprise Minimum)</option>
              <option value="TLSv1.1">TLSv1.1 (Not Recommended)</option>
            </select>
            <span className="text-[10px] text-slate-500">Connections negotiated below this version trigger High/Critical finding</span>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">Minimum RSA Key Length</label>
            <select
              disabled={!isAdmin}
              value={formData.cipherPolicy.minimumKeySizeRsa}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  cipherPolicy: {
                    ...formData.cipherPolicy,
                    minimumKeySizeRsa: Number(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
            >
              <option value={2048}>2048 bits (NIST SP 800-57 Compliant)</option>
              <option value={3072}>3072 bits (High Security)</option>
              <option value={4096}>4096 bits (Ultra Secure)</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-slate-300 font-semibold block">Prohibited Cipher Suites & Keywords</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.cipherPolicy.prohibitedCiphers.join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  cipherPolicy: {
                    ...formData.cipherPolicy,
                    prohibitedCiphers: e.target.value.split(',').map((s) => s.trim()),
                  },
                })
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded font-mono text-cyan-300 text-xs"
            />
            <span className="text-[10px] text-slate-500">Comma-separated patterns to flag as weak/critical</span>
          </div>
        </div>
      </div>

      {/* 3. Environment Multipliers */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
          3. Environment Risk Multipliers
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-300 block mb-1">Production</label>
            <input
              type="number"
              step="0.1"
              disabled={!isAdmin}
              value={formData.riskWeights.productionMultiplier}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  riskWeights: {
                    ...formData.riskWeights,
                    productionMultiplier: Number(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono text-white"
            />
          </div>

          <div>
            <label className="text-slate-300 block mb-1">Staging</label>
            <input
              type="number"
              step="0.1"
              disabled={!isAdmin}
              value={formData.riskWeights.stagingMultiplier}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  riskWeights: {
                    ...formData.riskWeights,
                    stagingMultiplier: Number(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono text-white"
            />
          </div>

          <div>
            <label className="text-slate-300 block mb-1">Development</label>
            <input
              type="number"
              step="0.1"
              disabled={!isAdmin}
              value={formData.riskWeights.developmentMultiplier}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  riskWeights: {
                    ...formData.riskWeights,
                    developmentMultiplier: Number(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono text-white"
            />
          </div>

          <div>
            <label className="text-slate-300 block mb-1">Sandbox</label>
            <input
              type="number"
              step="0.1"
              disabled={!isAdmin}
              value={formData.riskWeights.sandboxMultiplier}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  riskWeights: {
                    ...formData.riskWeights,
                    sandboxMultiplier: Number(e.target.value),
                  },
                })
              }
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono text-white"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
