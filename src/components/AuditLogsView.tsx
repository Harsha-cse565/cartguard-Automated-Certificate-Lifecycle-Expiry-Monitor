import React, { useState } from 'react';
import { ShieldCheck, Search, Clock, UserCheck, Terminal, Filter } from 'lucide-react';
import { AuditLog } from '../types.ts';

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'All' && log.action !== actionFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        log.target.toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const actions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Security & Administration Audit Trail
          </h2>
          <p className="text-xs text-slate-400">
            Immutable timeline of configuration changes, triage updates, simulations, and user activity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user, action, or target..."
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 text-xs rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Actions</option>
            {actions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">User & Role</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Target</th>
                <th className="py-3 px-4">Modifications / Audit Details</th>
                <th className="py-3 px-3 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs font-sans">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-400 tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      <span className="block text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-white font-sans font-semibold text-xs">{log.user}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{log.userRole}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold text-[10px] border border-slate-700">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-200 font-semibold">
                      {log.target}
                    </td>

                    <td className="py-3 px-4 font-sans text-xs max-w-md">
                      {log.previousValue && (
                        <div className="text-slate-500 line-through text-[11px]">
                          {log.previousValue}
                        </div>
                      )}
                      <div className="text-slate-300 font-medium">
                        {log.newValue}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
