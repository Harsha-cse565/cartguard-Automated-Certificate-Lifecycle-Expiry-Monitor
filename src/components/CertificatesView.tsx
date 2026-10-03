import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Layers,
  Cpu,
} from 'lucide-react';
import { Endpoint, CertificateStatus } from '../types.ts';

interface CertificatesViewProps {
  endpoints: Endpoint[];
  onInspectEndpoint: (endpointId: string) => void;
  onSimulateEndpoint: (endpointId: string) => void;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  endpoints,
  onInspectEndpoint,
  onSimulateEndpoint,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = endpoints.filter((ep) => {
    if (statusFilter !== 'All' && ep.certificate.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        ep.hostname.toLowerCase().includes(q) ||
        ep.certificate.commonName.toLowerCase().includes(q) ||
        ep.certificate.issuer.toLowerCase().includes(q) ||
        ep.certificate.serialNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyan-400" />
            X.509 Certificate Inventory & Hierarchy
          </h2>
          <p className="text-xs text-slate-400">
            Cryptographic metadata, public key specifications, validation horizons, and certificate authorities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search CN, issuer, serial..."
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 text-xs rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Statuses</option>
            <option value="VALID">Valid</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="CRITICAL">Critical</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((ep) => {
          const cert = ep.certificate;
          const isExpired = cert.daysRemaining <= 0;
          const isCritical = cert.daysRemaining <= 7 && !isExpired;

          return (
            <div
              key={ep.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-3 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-mono font-bold text-white text-xs truncate max-w-[200px]">
                      {ep.hostname}
                    </h3>
                    <div className="text-[11px] text-slate-400 mt-0.5">{ep.businessService}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                      isExpired
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : isCritical
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : cert.daysRemaining <= 30
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {isExpired ? 'EXPIRED' : `${cert.daysRemaining}d left`}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs pt-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Issuer:</span>
                    <span className="text-slate-200 truncate max-w-[170px]">{cert.issuer}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Key / Algorithm:</span>
                    <span className="font-mono text-slate-300">
                      {cert.publicKeyAlgorithm} ({cert.keySize}-bit)
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Valid Horizon:</span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {new Date(cert.validUntil).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Serial:</span>
                    <span className="font-mono text-[10px] text-slate-500 truncate max-w-[170px]">
                      {cert.serialNumber}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  onClick={() => onInspectEndpoint(ep.id)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
                >
                  Full Inspection
                </button>
                <button
                  onClick={() => onSimulateEndpoint(ep.id)}
                  className="px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800/80 rounded transition-colors flex items-center gap-1"
                >
                  <Cpu className="w-3 h-3" />
                  <span>Simulate</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
