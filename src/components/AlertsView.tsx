import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ExternalLink,
  Check,
} from 'lucide-react';
import { Alert, AlertStatus, Severity, User } from '../types.ts';

interface AlertsViewProps {
  alerts: Alert[];
  onUpdateAlertStatus: (id: string, status: AlertStatus) => Promise<void>;
  currentUser: User;
  onInspectEndpoint: (endpointId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onUpdateAlertStatus,
  currentUser,
  onInspectEndpoint,
}) => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter !== 'All' && a.status !== statusFilter) return false;
    if (severityFilter !== 'All' && a.severity !== severityFilter) return false;
    return true;
  });

  const handleAction = async (id: string, status: AlertStatus) => {
    setProcessingId(id);
    try {
      await onUpdateAlertStatus(id, status);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-cyan-400" />
            Security Alert Operations Center
          </h2>
          <p className="text-xs text-slate-400">
            Real-time critical findings and automated triage escalation queue
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
            No active alerts matching selected criteria.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCrit = alert.severity === 'CRITICAL';
            const isOpen = alert.status === 'Open';
            const isAck = alert.status === 'Acknowledged';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isOpen && isCrit
                    ? 'bg-red-950/20 border-red-800/80 shadow-sm shadow-red-950/20'
                    : isOpen
                    ? 'bg-orange-950/20 border-orange-800/80'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center ${
                      isCrit
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'bg-orange-950 text-orange-400 border border-orange-800'
                    }`}
                  >
                    <ShieldAlert className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-white text-xs">
                        {alert.hostname}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {alert.environment}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                          isCrit
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-orange-950 text-orange-400 border border-orange-800'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200">{alert.title}</h4>
                    <p className="text-[11px] text-slate-400 max-w-2xl">{alert.message}</p>

                    <div className="text-[10px] text-slate-500 font-mono pt-0.5">
                      Triggered {new Date(alert.triggeredAt).toLocaleString()}
                      {alert.acknowledgedBy && (
                        <span> · Acknowledged by {alert.acknowledgedBy}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                  <button
                    onClick={() => onInspectEndpoint(alert.endpointId)}
                    className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Inspect
                  </button>

                  {isOpen && (
                    <button
                      onClick={() => handleAction(alert.id, 'Acknowledged')}
                      disabled={processingId === alert.id}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded-lg transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}

                  {alert.status !== 'Resolved' && (
                    <button
                      onClick={() => handleAction(alert.id, 'Resolved')}
                      disabled={processingId === alert.id}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Resolve</span>
                    </button>
                  )}

                  {alert.status === 'Resolved' && (
                    <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Resolved</span>
                    </span>
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
