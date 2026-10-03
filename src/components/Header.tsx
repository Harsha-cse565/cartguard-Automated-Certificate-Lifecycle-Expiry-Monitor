import React, { useState } from 'react';
import {
  ShieldAlert,
  Download,
  RefreshCw,
  UserCheck,
  ChevronDown,
  Layers,
  Activity,
  FileText,
  Sliders,
  Bell,
  Cpu,
  Lock,
  KeyRound,
} from 'lucide-react';
import { User } from '../types.ts';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User;
  onSwitchRole: (role: string) => void;
  openAlertsCount: number;
  onTriggerFleetScan: () => void;
  isScanning: boolean;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onSwitchRole,
  openAlertsCount,
  onTriggerFleetScan,
  isScanning,
  onOpenLogin,
  onLogout,
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'endpoints', label: 'Endpoints' },
    { id: 'certificates', label: 'Certificates' },
    { id: 'findings', label: 'Findings' },
    { id: 'alerts', label: 'Alerts', badge: openAlertsCount },
    { id: 'remediation', label: 'Remediation' },
    { id: 'simulation', label: 'Simulation Mode' },
    { id: 'reports', label: 'Reports' },
    { id: 'audit', label: 'Audit Logs' },
    { id: 'policy', label: 'Policy' },
  ];

  return (
    <header className="bg-slate-950/95 backdrop-blur border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Brand title */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition-colors shadow-sm">
                <Lock className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                    CERTGUARD
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-cyan-950/80 text-cyan-400 border border-cyan-800 px-1.5 py-0.2 rounded font-semibold tracking-wider">
                    v2026.4
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Automated Certificate Lifecycle & Expiry Monitor
                </div>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              const isSim = item.id === 'simulation';
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`relative px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-800 text-cyan-300 border border-slate-700/80 shadow-inner'
                      : isSim
                      ? 'text-cyan-400/90 hover:text-cyan-300 hover:bg-slate-900/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  {isSim && <Cpu className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-red-950 text-red-400 border border-red-800 font-bold tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile/Compact tabs dropdown indicator */}
          <div className="xl:hidden flex items-center">
            <select
              value={currentTab}
              onChange={(e) => onSelectTab(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} {item.badge ? `(${item.badge})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Scan Fleet Button */}
            <button
              onClick={onTriggerFleetScan}
              disabled={isScanning}
              title="Trigger continuous compliance inspection across all registered endpoints"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm ${
                isScanning
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isScanning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isScanning ? 'Scanning...' : 'Scan Fleet'}</span>
            </button>

            {/* Download Source Code ZIP */}
            <a
              href="/api/download-zip"
              download="certguard-source.zip"
              title="Download Complete Source Code in .ZIP format"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-all shadow-sm shadow-cyan-900/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Source Code (.ZIP)</span>
            </a>

            {/* Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700/80 flex items-center justify-center text-cyan-400 text-[10px] font-bold">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="font-semibold text-slate-200 text-[11px] leading-tight flex items-center gap-1">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    {currentUser.role}
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1.5 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                    Simulate Role (RBAC)
                  </div>
                  <button
                    onClick={() => {
                      onSwitchRole('Administrator');
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      currentUser.role === 'Administrator' ? 'text-cyan-400 font-semibold bg-slate-800/40' : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-medium">Administrator</div>
                      <div className="text-[10px] text-slate-500">Full control, policy edit & simulations</div>
                    </div>
                    {currentUser.role === 'Administrator' && <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      onSwitchRole('Security Analyst');
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      currentUser.role === 'Security Analyst' ? 'text-cyan-400 font-semibold bg-slate-800/40' : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-medium">Security Analyst</div>
                      <div className="text-[10px] text-slate-500">Triage findings, view evidence & reports</div>
                    </div>
                    {currentUser.role === 'Security Analyst' && <UserCheck className="w-3.5 h-3.5" />}
                  </button>

                  <div className="border-t border-slate-800 my-1"></div>

                  <button
                    onClick={() => {
                      setRoleMenuOpen(false);
                      onOpenLogin();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Switch Account / Sign In</span>
                  </button>

                  <button
                    onClick={() => {
                      setRoleMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign Out (Lock Console)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
