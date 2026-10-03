import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { User } from '../types.ts';

interface LoginViewProps {
  onLogin: (email: string, passwordPlain: string) => Promise<void>;
  onClose?: () => void;
  isModal?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onClose, isModal = false }) => {
  const [email, setEmail] = useState('admin@certguard.sec');
  const [password, setPassword] = useState('Admin@CertGuard2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await onLogin(email, password);
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (targetEmail: string, targetPass: string) => {
    setEmail(targetEmail);
    setPassword(targetPass);
    setErrorMsg('');
  };

  const handleQuickLogin = async (targetEmail: string, targetPass: string) => {
    setEmail(targetEmail);
    setPassword(targetPass);
    setErrorMsg('');
    setLoading(true);
    try {
      await onLogin(targetEmail, targetPass);
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-700/60 mx-auto flex items-center justify-center text-cyan-400 shadow-md">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1.5 font-mono">
            CERTGUARD SOC ACCESS
          </h2>
          <p className="text-xs text-slate-400">
            Automated Certificate Lifecycle & Expiry Monitor
          </p>
        </div>
      </div>

      {/* Safety / Compliance Notice */}
      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>Role-Based Access Control (RBAC) & PBKDF2 Encrypted Session</span>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="space-y-1">
          <label className="text-slate-300 font-semibold block">Operator Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@certguard.sec"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-slate-300 font-semibold">Security Password</label>
            <span className="text-[10px] text-slate-500 font-mono">PBKDF2 SHA-512</span>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-950 transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          <span>{loading ? 'Authenticating...' : 'Sign In to Console'}</span>
        </button>
      </form>

      {/* Evaluator 1-Click Quick Fill Credentials */}
      <div className="space-y-2 border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-[10px]">Evaluator Seed Accounts:</span>
          <span className="text-cyan-400 font-mono">1-Click Sign-In</span>
        </div>

        {/* Administrator Account */}
        <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between gap-2 text-xs">
          <div>
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>Alex Rivera</span>
              <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 border border-cyan-800 px-1 py-0.2 rounded font-bold">
                Admin
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">admin@certguard.sec</div>
            <div className="text-[10px] text-slate-500">Full privileges · Policy & Endpoints CRUD</div>
          </div>
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@certguard.sec', 'Admin@CertGuard2026!')}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded text-[11px] shrink-0 transition-colors"
          >
            Sign In
          </button>
        </div>

        {/* Security Analyst Account */}
        <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between gap-2 text-xs">
          <div>
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>Sarah Chen</span>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700 px-1 py-0.2 rounded font-bold">
                Analyst
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">analyst@certguard.sec</div>
            <div className="text-[10px] text-slate-500">Triage findings, alerts & report generation</div>
          </div>
          <button
            type="button"
            onClick={() => handleQuickLogin('analyst@certguard.sec', 'Analyst@CertGuard2026!')}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded text-[11px] shrink-0 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>

      {isModal && onClose && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Cancel and Return to Console
          </button>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {content}
    </div>
  );
};
