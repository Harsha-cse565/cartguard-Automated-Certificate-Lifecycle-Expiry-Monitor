import React, { useEffect, useState } from 'react';
import { ScopeNoticeBanner } from './components/ScopeNoticeBanner.tsx';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { EndpointsView } from './components/EndpointsView.tsx';
import { CertificatesView } from './components/CertificatesView.tsx';
import { FindingsView } from './components/FindingsView.tsx';
import { AlertsView } from './components/AlertsView.tsx';
import { RemediationView } from './components/RemediationView.tsx';
import { SimulationView } from './components/SimulationView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { AuditLogsView } from './components/AuditLogsView.tsx';
import { PolicyView } from './components/PolicyView.tsx';
import { CertificateInspectModal } from './components/CertificateInspectModal.tsx';
import { LoginView } from './components/LoginView.tsx';
import {
  Alert,
  AuditLog,
  DashboardCharts,
  DashboardSummary,
  Endpoint,
  Finding,
  FindingStatus,
  RecommendationItem,
  SecurityPolicy,
  User,
} from './types.ts';
import {
  analyzeEndpoint,
  analyzeFleet,
  applySimulation,
  createEndpoint,
  deleteEndpoint,
  fetchAlerts,
  fetchAuditLogs,
  fetchCurrentUser,
  fetchDashboardCharts,
  fetchDashboardSummary,
  fetchEndpoints,
  fetchFindings,
  fetchJob,
  fetchPolicy,
  fetchRecommendations,
  fetchReportData,
  loginUser,
  logoutUser,
  resetDemoEnvironment,
  switchUserRole,
  updateAlertStatus,
  updateFindingStatus,
  updatePolicy,
} from './api.ts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'usr_admin',
    name: 'Alex Rivera',
    email: 'admin@certguard.sec',
    role: 'Administrator',
  });

  // Data states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [findings, setFindings] = useState<Finding[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reportData, setReportData] = useState<any>(null);

  // Filter & Search states
  const [endpointSearch, setEndpointSearch] = useState('');
  const [endpointEnv, setEndpointEnv] = useState('All');
  const [endpointSeverity, setEndpointSeverity] = useState('All');
  const [endpointStatus, setEndpointStatus] = useState('All');

  // Loading & Scanning states
  const [loading, setLoading] = useState(true);
  const [isFleetScanning, setIsFleetScanning] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [fleetScanProgress, setFleetScanProgress] = useState(0);

  // Inspect Modal State
  const [inspectEndpointId, setInspectEndpointId] = useState<string | null>(null);
  const [simulationTargetEndpointId, setSimulationTargetEndpointId] = useState<string | undefined>(undefined);

  // Load all initial data
  const loadInitialData = async () => {
    try {
      const [uRes, sumRes, chartRes, epRes, fndRes, altRes, recRes, polRes, audRes, repRes] =
        await Promise.all([
          fetchCurrentUser(),
          fetchDashboardSummary(),
          fetchDashboardCharts(),
          fetchEndpoints({ page: 1, limit: 12 }),
          fetchFindings(),
          fetchAlerts(),
          fetchRecommendations(),
          fetchPolicy(),
          fetchAuditLogs(),
          fetchReportData(),
        ]);

      setCurrentUser(uRes.user);
      setSummary(sumRes);
      setCharts(chartRes);
      setEndpoints(epRes.data);
      setPagination(epRes.pagination);
      setFindings(fndRes);
      setAlerts(altRes);
      setRecommendations(recRes);
      setPolicy(polRes);
      setAuditLogs(audRes);
      setReportData(repRes);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload endpoints when page/filter changes
  const reloadEndpoints = async (page = pagination.page) => {
    try {
      const res = await fetchEndpoints({
        page,
        limit: 12,
        search: endpointSearch,
        env: endpointEnv,
        severity: endpointSeverity,
        status: endpointStatus,
      });
      setEndpoints(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to reload endpoints:', err);
    }
  };

  // Switch role handler
  const handleSwitchRole = async (role: string) => {
    try {
      const res = await switchUserRole(role);
      setCurrentUser(res.user);
      const audRes = await fetchAuditLogs();
      setAuditLogs(audRes);
    } catch (err) {
      console.error('Role switch failed:', err);
    }
  };

  // Login handler
  const handleLogin = async (email: string, passwordPlain: string) => {
    const res = await loginUser(email, passwordPlain);
    setCurrentUser(res.user);
    setIsAuthenticated(true);
    setShowLoginModal(false);
    await loadInitialData();
  };

  // Logout handler
  const handleLogout = async () => {
    await logoutUser();
    setIsAuthenticated(false);
  };

  // Fleet scan action
  const handleTriggerFleetScan = async () => {
    if (isFleetScanning) return;
    setIsFleetScanning(true);
    setFleetScanProgress(10);

    try {
      const { jobId } = await analyzeFleet();

      // Poll job progress
      const pollInterval = setInterval(async () => {
        try {
          const job = await fetchJob(jobId);
          setFleetScanProgress(job.progress);

          if (job.status === 'Completed' || job.status === 'Failed') {
            clearInterval(pollInterval);
            setIsFleetScanning(false);
            setFleetScanProgress(100);

            // Refresh full system state
            await loadInitialData();
            setTimeout(() => setFleetScanProgress(0), 1000);
          }
        } catch {
          clearInterval(pollInterval);
          setIsFleetScanning(false);
        }
      }, 300);
    } catch (err) {
      console.error('Fleet scan failed:', err);
      setIsFleetScanning(false);
    }
  };

  // Single endpoint analyze
  const handleAnalyzeEndpoint = async (id: string) => {
    setActiveScanId(id);
    try {
      const { jobId } = await analyzeEndpoint(id);
      const pollInterval = setInterval(async () => {
        try {
          const job = await fetchJob(jobId);
          if (job.status === 'Completed' || job.status === 'Failed') {
            clearInterval(pollInterval);
            setActiveScanId(null);
            await loadInitialData();
          }
        } catch {
          clearInterval(pollInterval);
          setActiveScanId(null);
        }
      }, 250);
    } catch (err) {
      console.error('Analyze endpoint failed:', err);
      setActiveScanId(null);
    }
  };

  // Add endpoint
  const handleAddEndpoint = async (data: any) => {
    await createEndpoint(data);
    await loadInitialData();
  };

  // Delete endpoint
  const handleDeleteEndpoint = async (id: string) => {
    if (confirm('Are you sure you want to remove this endpoint from monitored inventory?')) {
      await deleteEndpoint(id);
      await loadInitialData();
    }
  };

  // Update finding status
  const handleUpdateFindingStatus = async (id: string, status: FindingStatus, note?: string) => {
    await updateFindingStatus(id, status, note);
    const [fndRes, audRes, sumRes] = await Promise.all([
      fetchFindings(),
      fetchAuditLogs(),
      fetchDashboardSummary(),
    ]);
    setFindings(fndRes);
    setAuditLogs(audRes);
    setSummary(sumRes);
  };

  // Update alert status
  const handleUpdateAlertStatus = async (id: string, status: any) => {
    await updateAlertStatus(id, status);
    const [altRes, audRes, sumRes] = await Promise.all([
      fetchAlerts(),
      fetchAuditLogs(),
      fetchDashboardSummary(),
    ]);
    setAlerts(altRes);
    setAuditLogs(audRes);
    setSummary(sumRes);
  };

  // Apply Simulation
  const handleApplySimulation = async (params: any) => {
    const res = await applySimulation(params);
    await loadInitialData();
    return res;
  };

  // Reset Demo
  const handleResetDemo = async () => {
    await resetDemoEnvironment();
    await loadInitialData();
  };

  // Update Policy
  const handleUpdatePolicy = async (newPolicy: SecurityPolicy) => {
    await updatePolicy(newPolicy);
    await loadInitialData();
  };

  // Open modal / simulation helper
  const handleOpenSimulationForEndpoint = (endpointId: string) => {
    setSimulationTargetEndpointId(endpointId);
    setCurrentTab('simulation');
  };

  const inspectedEndpoint = endpoints.find((e) => e.id === inspectEndpointId) || null;

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Banner: Mandatory Scope & Safety Requirement */}
      <ScopeNoticeBanner />

      {/* Fleet Scan Progress Bar */}
      {isFleetScanning && (
        <div className="bg-cyan-950 border-b border-cyan-800 text-xs px-4 py-1.5 flex items-center justify-between text-cyan-200">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-semibold">Continuous Fleet Inspection in progress:</span>
            <span className="font-mono">{fleetScanProgress}% completed</span>
          </div>
          <div className="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${fleetScanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Top Bar Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        onSwitchRole={handleSwitchRole}
        openAlertsCount={summary ? summary.openAlerts : 0}
        onTriggerFleetScan={handleTriggerFleetScan}
        isScanning={isFleetScanning}
        onOpenLogin={() => setShowLoginModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            summary={summary}
            charts={charts}
            loading={loading}
            onSelectTab={setCurrentTab}
            onInspectEndpoint={(id) => setInspectEndpointId(id)}
            onOpenSimulationForEndpoint={handleOpenSimulationForEndpoint}
          />
        )}

        {currentTab === 'endpoints' && (
          <EndpointsView
            endpoints={endpoints}
            pagination={pagination}
            onPageChange={(page) => reloadEndpoints(page)}
            onSearchChange={(search) => {
              setEndpointSearch(search);
              setTimeout(() => reloadEndpoints(1), 100);
            }}
            onFilterEnvChange={(env) => {
              setEndpointEnv(env);
              setTimeout(() => reloadEndpoints(1), 100);
            }}
            onFilterSeverityChange={(sev) => {
              setEndpointSeverity(sev);
              setTimeout(() => reloadEndpoints(1), 100);
            }}
            onFilterStatusChange={(stat) => {
              setEndpointStatus(stat);
              setTimeout(() => reloadEndpoints(1), 100);
            }}
            onInspect={(id) => setInspectEndpointId(id)}
            onAnalyze={handleAnalyzeEndpoint}
            onSimulate={handleOpenSimulationForEndpoint}
            onDelete={handleDeleteEndpoint}
            onAddEndpoint={handleAddEndpoint}
            currentUser={currentUser}
            activeScanId={activeScanId}
          />
        )}

        {currentTab === 'certificates' && (
          <CertificatesView
            endpoints={endpoints}
            onInspectEndpoint={(id) => setInspectEndpointId(id)}
            onSimulateEndpoint={handleOpenSimulationForEndpoint}
          />
        )}

        {currentTab === 'findings' && (
          <FindingsView
            findings={findings}
            onUpdateFindingStatus={handleUpdateFindingStatus}
            currentUser={currentUser}
            onInspectEndpoint={(id) => setInspectEndpointId(id)}
          />
        )}

        {currentTab === 'alerts' && (
          <AlertsView
            alerts={alerts}
            onUpdateAlertStatus={handleUpdateAlertStatus}
            currentUser={currentUser}
            onInspectEndpoint={(id) => setInspectEndpointId(id)}
          />
        )}

        {currentTab === 'remediation' && (
          <RemediationView
            recommendations={recommendations}
            onInspectEndpoint={(id) => setInspectEndpointId(id)}
          />
        )}

        {currentTab === 'simulation' && (
          <SimulationView
            endpoints={endpoints}
            onApplySimulation={handleApplySimulation}
            onResetDemo={handleResetDemo}
            onInspectEndpoint={(id) => setInspectEndpointId(id)}
            preselectedEndpointId={simulationTargetEndpointId}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            reportData={reportData}
            loading={loading}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'audit' && <AuditLogsView logs={auditLogs} />}

        {currentTab === 'policy' && (
          <PolicyView
            policy={policy}
            onUpdatePolicy={handleUpdatePolicy}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Certificate Inspection Modal */}
      {inspectEndpointId && (
        <CertificateInspectModal
          endpoint={inspectedEndpoint}
          onClose={() => setInspectEndpointId(null)}
          onOpenSimulation={handleOpenSimulationForEndpoint}
        />
      )}

      {/* Login / Switch Account Modal */}
      {showLoginModal && (
        <LoginView
          onLogin={handleLogin}
          isModal
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-400">CERTGUARD</span> — Automated Certificate Lifecycle & Expiry Monitor · WEBX 2026
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-500 font-mono">
              Restricted to Authorized Sandboxes
            </span>
            <a
              href="/api/download-zip"
              download="certguard-source.zip"
              className="text-cyan-400 hover:text-cyan-300 font-semibold text-[11px]"
            >
              Download Complete Source Code (.ZIP)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
