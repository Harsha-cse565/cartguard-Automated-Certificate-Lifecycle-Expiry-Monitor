import {
  Alert,
  AuditLog,
  BackgroundJob,
  CertificateInfo,
  CipherObservation,
  DashboardCharts,
  DashboardSummary,
  Endpoint,
  Finding,
  RecommendationItem,
  SecurityPolicy,
  User,
} from './types.ts';

export function getAuthToken(): string | null {
  return localStorage.getItem('certguard_jwt_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('certguard_jwt_token', token);
  } else {
    localStorage.removeItem('certguard_jwt_token');
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function loginUser(email: string, passwordPlain: string): Promise<{ success: boolean; user: User; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: passwordPlain }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Authentication failed' }));
    throw new Error(err.error || 'Authentication failed');
  }
  const data = await res.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } finally {
    setAuthToken(null);
  }
}

export async function fetchCurrentUser(): Promise<{ user: User; availableUsers: User[] }> {
  const res = await fetch('/api/auth/current-user', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export async function switchUserRole(role: string): Promise<{ success: boolean; user: User; token?: string }> {
  const res = await fetch('/api/auth/switch-role', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error('Failed to switch user role');
  const data = await res.json();
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch('/api/dashboard/summary');
  if (!res.ok) throw new Error('Failed to fetch dashboard summary');
  return res.json();
}

export async function fetchDashboardCharts(): Promise<DashboardCharts> {
  const res = await fetch('/api/dashboard/charts');
  if (!res.ok) throw new Error('Failed to fetch dashboard charts');
  return res.json();
}

export async function fetchEndpoints(params?: {
  search?: string;
  env?: string;
  severity?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  data: Endpoint[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.env) query.set('env', params.env);
  if (params?.severity) query.set('severity', params.severity);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const res = await fetch(`/api/endpoints?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch endpoints');
  return res.json();
}

export async function fetchEndpointById(id: string): Promise<Endpoint> {
  const res = await fetch(`/api/endpoints/${id}`);
  if (!res.ok) throw new Error('Failed to fetch endpoint details');
  return res.json();
}

export async function createEndpoint(data: any): Promise<Endpoint> {
  const res = await fetch('/api/endpoints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to add endpoint' }));
    throw new Error(err.error || 'Failed to add endpoint');
  }
  return res.json();
}

export async function deleteEndpoint(id: string): Promise<boolean> {
  const res = await fetch(`/api/endpoints/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete endpoint' }));
    throw new Error(err.error || 'Failed to delete endpoint');
  }
  return true;
}

export async function analyzeEndpoint(id: string): Promise<{ message: string; jobId: string }> {
  const res = await fetch(`/api/endpoints/${id}/analyze`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to initiate analysis');
  return res.json();
}

export async function analyzeFleet(): Promise<{ message: string; jobId: string; totalEndpoints: number }> {
  const res = await fetch('/api/endpoints/analyze-all', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to initiate fleet analysis');
  return res.json();
}

export async function fetchJob(id: string): Promise<BackgroundJob> {
  const res = await fetch(`/api/jobs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch job');
  return res.json();
}

export async function fetchFindings(params?: {
  severity?: string;
  status?: string;
  endpointId?: string;
  search?: string;
}): Promise<Finding[]> {
  const query = new URLSearchParams();
  if (params?.severity) query.set('severity', params.severity);
  if (params?.status) query.set('status', params.status);
  if (params?.endpointId) query.set('endpointId', params.endpointId);
  if (params?.search) query.set('search', params.search);

  const res = await fetch(`/api/findings?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch findings');
  return res.json();
}

export async function updateFindingStatus(id: string, status: string, note?: string): Promise<Finding> {
  const res = await fetch(`/api/findings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note }),
  });
  if (!res.ok) throw new Error('Failed to update finding status');
  return res.json();
}

export async function fetchAlerts(params?: { status?: string; severity?: string }): Promise<Alert[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.severity) query.set('severity', params.severity);

  const res = await fetch(`/api/alerts?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function updateAlertStatus(id: string, status: string): Promise<Alert> {
  const res = await fetch(`/api/alerts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update alert');
  return res.json();
}

export async function fetchRecommendations(): Promise<RecommendationItem[]> {
  const res = await fetch('/api/recommendations');
  if (!res.ok) throw new Error('Failed to fetch recommendations');
  return res.json();
}

export async function fetchPolicy(): Promise<SecurityPolicy> {
  const res = await fetch('/api/policy');
  if (!res.ok) throw new Error('Failed to fetch policy');
  return res.json();
}

export async function updatePolicy(policy: SecurityPolicy): Promise<SecurityPolicy> {
  const res = await fetch('/api/policy', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(policy),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update policy' }));
    throw new Error(err.error || 'Failed to update policy');
  }
  const result = await res.json();
  return result.policy;
}

export async function applySimulation(params: {
  endpointId: string;
  daysRemaining?: number;
  cipherSuite?: string;
  tlsVersion?: string;
  environment?: string;
  notes?: string;
}): Promise<{ success: boolean; endpoint: Endpoint; alerts: Alert[]; findings: Finding[] }> {
  const res = await fetch('/api/simulations/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Simulation failed' }));
    throw new Error(err.error || 'Simulation failed');
  }
  return res.json();
}

export async function resetDemoEnvironment(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/simulations/reset', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo');
  return res.json();
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch('/api/audit-logs');
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function fetchReportData(): Promise<any> {
  const res = await fetch('/api/reports');
  if (!res.ok) throw new Error('Failed to generate report');
  return res.json();
}
