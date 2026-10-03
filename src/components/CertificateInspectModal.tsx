import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Layers,
  KeyRound,
  FileCheck,
  Calendar,
  Lock,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { Endpoint } from '../types.ts';

interface CertificateInspectModalProps {
  endpoint: Endpoint | null;
  onClose: () => void;
  onOpenSimulation: (endpointId: string) => void;
}

export const CertificateInspectModal: React.FC<CertificateInspectModalProps> = ({
  endpoint,
  onClose,
  onOpenSimulation,
}) => {
  if (!endpoint) return null;

  const cert = endpoint.certificate;
  const cipher = endpoint.cipher;
  const isExpired = cert.daysRemaining <= 0;
  const isCritical = cert.daysRemaining <= 7 && !isExpired;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                isExpired
                  ? 'bg-red-950 text-red-400 border border-red-800'
                  : isCritical
                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}
            >
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono">{endpoint.hostname}</h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {endpoint.environment}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {endpoint.businessService} · Managed by {endpoint.owner}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenSimulation(endpoint.id);
              }}
              className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Simulate What-If</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-xs">
          {/* Expiry Status Callout */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              isExpired
                ? 'bg-red-950/40 border-red-800/80 text-red-200'
                : isCritical
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                : cert.daysRemaining <= 30
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 shrink-0" />
              <div>
                <div className="font-bold text-sm tracking-tight">
                  {isExpired
                    ? 'Certificate is Expired — Immediate Outage'
                    : isCritical
                    ? `Emergency Renewal Required: ${cert.daysRemaining} Days Remaining`
                    : cert.daysRemaining <= 30
                    ? `Expiring Soon: ${cert.daysRemaining} Days Remaining`
                    : `Active & Healthy: ${cert.daysRemaining} Days Remaining`}
                </div>
                <div className="text-[11px] opacity-90 mt-0.5">
                  Valid from {new Date(cert.validFrom).toLocaleDateString()} to{' '}
                  <span className="font-semibold underline">
                    {new Date(cert.validUntil).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-2xl font-extrabold font-mono tabular-nums">
                {isExpired ? 'EXPIRED' : `${cert.daysRemaining}d`}
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                {cert.status}
              </div>
            </div>
          </div>

          {/* Certificate Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subject & SANs */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Subject & Identity
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">Common Name (CN)</span>
                  <span className="font-mono text-slate-200 font-semibold">{cert.commonName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Subject Distinguished Name</span>
                  <span className="font-mono text-slate-300 break-all text-[11px]">{cert.subject}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Subject Alternative Names (SANs)</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cert.sans.map((san) => (
                      <span
                        key={san}
                        className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-mono text-[10px]"
                      >
                        {san}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Issuer & Authority */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Issuer & Authority
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">Issuer Common Name</span>
                  <span className="font-medium text-slate-200">{cert.issuer}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Organization</span>
                  <span className="text-slate-300">{cert.issuerOrg}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px]">OCSP Stapling</span>
                    <span className="text-emerald-400 font-semibold text-[11px]">
                      {cert.ocspStapling ? 'Enabled (Valid)' : 'Disabled'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Certificate Transparency</span>
                    <span className="text-emerald-400 font-semibold text-[11px]">
                      {cert.transparencyLogs ? 'Logged in 3 CT Logs' : 'Missing'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Parameters */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cryptographic Parameters & Fingerprints
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 block text-[10px]">Public Key Algorithm</span>
                <span className="font-mono text-slate-200 font-semibold">{cert.publicKeyAlgorithm}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Key Size</span>
                <span
                  className={`font-mono font-bold ${
                    cert.keySize < 2048 ? 'text-red-400' : 'text-slate-200'
                  }`}
                >
                  {cert.keySize} bits {cert.keySize < 2048 ? '(Vulnerable)' : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Signature Algorithm</span>
                <span className="font-mono text-slate-200">{cert.signatureAlgorithm}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Serial Number</span>
                <span className="font-mono text-slate-300 text-[11px] truncate block">{cert.serialNumber}</span>
              </div>
            </div>
            <div className="pt-1">
              <span className="text-slate-500 block text-[10px]">SHA-256 Fingerprint</span>
              <span className="font-mono text-[11px] text-cyan-400 break-all select-all">
                {cert.fingerprintSha256}
              </span>
            </div>
          </div>

          {/* Certificate Hierarchy Chain */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Certificate Validation Chain (Root → Leaf)
              </h4>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                Chain Valid to Trusted Root
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {cert.chain.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded bg-slate-900 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{link.name}</span>
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-normal">
                          [{link.level}]
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">Issued by: {link.issuer}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                        link.status === 'VALID'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : link.status === 'WARNING'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {link.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observed TLS / Cipher Suite Snapshot */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Observed TLS Handshake & Cipher Suite
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Negotiated Protocol</span>
                <span className="font-mono text-white font-bold">{cipher.tlsVersion}</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Forward Secrecy (PFS)</span>
                <span className={`font-mono font-bold ${cipher.forwardSecrecy ? 'text-emerald-400' : 'text-red-400'}`}>
                  {cipher.forwardSecrecy ? 'Yes (ECDHE)' : 'No (Static RSA)'}
                </span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Cipher Strength</span>
                <span className="font-mono text-white font-bold">{cipher.cipherStrength} bits</span>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Integrity / MAC</span>
                <span className="font-mono text-white font-bold">{cipher.integrity}</span>
              </div>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Active Cipher Suite</span>
              <span className="font-mono text-xs text-cyan-300 font-semibold">{cipher.cipherSuite}</span>
              <p className="text-[11px] text-slate-400 mt-1">{cipher.explanation}</p>
            </div>
          </div>

          {/* Certificate Lifecycle History (Section 21) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Certificate Lifecycle Audit Timeline
            </h4>
            <div className="space-y-2 border-l-2 border-slate-800 ml-2 pl-3">
              {endpoint.lifecycle.map((event) => (
                <div key={event.id} className="relative py-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400">{event.date}</span>
                    <span className="font-semibold text-slate-200">{event.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{event.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-slate-900/90 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
