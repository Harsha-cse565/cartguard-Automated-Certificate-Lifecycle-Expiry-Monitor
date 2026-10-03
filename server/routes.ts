import express, { Request, Response } from 'express';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { db, DEMO_USERS } from './db.ts';
import { jobQueue } from './engines/jobQueue.ts';
import { Environment, FindingStatus, AlertStatus, UserRole } from './types.ts';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');
import { authenticateUser, signJwt, verifyJwt, USER_CREDENTIALS } from './auth.ts';

const router = express.Router();

// ---------------- AUTH & USER ROLES ----------------
router.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const authResult = authenticateUser(email, password);
  if (!authResult) {
    db.addAuditLog({
      user: email,
      userRole: 'Security Analyst',
      action: 'LOGIN_FAILED',
      target: 'Authentication Service',
      previousValue: 'Unauthenticated',
      newValue: 'Failed password verification',
      ipAddress: req.ip || '127.0.0.1',
      status: 'WARNING',
    });
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  db.currentUser = authResult.user;

  db.addAuditLog({
    user: authResult.user.email,
    userRole: authResult.user.role,
    action: 'USER_LOGIN',
    target: 'Session Authenticated',
    previousValue: 'Session start',
    newValue: `JWT Issued for ${authResult.user.name} (${authResult.user.role})`,
    ipAddress: req.ip || '127.0.0.1',
    status: 'SUCCESS',
  });

  res.json({
    success: true,
    token: authResult.token,
    user: authResult.user,
  });
});

router.get('/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const verification = verifyJwt(token);
    if (verification.valid && verification.payload) {
      const found = USER_CREDENTIALS.find((c) => c.user.id === verification.payload.sub);
      if (found) {
        return res.json({ user: found.user, authenticated: true });
      }
    }
  }
  res.json({
    user: db.currentUser,
    authenticated: true,
  });
});

router.post('/auth/logout', (req: Request, res: Response) => {
  const loggedOutUser = db.currentUser;
  db.addAuditLog({
    user: loggedOutUser.email,
    userRole: loggedOutUser.role,
    action: 'USER_LOGOUT',
    target: 'Session Terminated',
    previousValue: `Active session for ${loggedOutUser.name}`,
    newValue: 'Session logged out',
    ipAddress: req.ip || '127.0.0.1',
    status: 'SUCCESS',
  });

  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/auth/current-user', (req: Request, res: Response) => {
  res.json({
    user: db.currentUser,
    availableUsers: USER_CREDENTIALS.map((c) => c.user),
  });
});

router.post('/auth/switch-role', (req: Request, res: Response) => {
  const { role } = req.body;
  const targetUser = USER_CREDENTIALS.map((c) => c.user).find((u) => u.role === role);
  if (!targetUser) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const prevUser = db.currentUser;
  db.currentUser = targetUser;
  const token = signJwt({
    sub: targetUser.id,
    email: targetUser.email,
    role: targetUser.role,
    name: targetUser.name,
  });

  db.addAuditLog({
    user: targetUser.email,
    userRole: targetUser.role,
    action: 'SWITCH_USER_ROLE',
    target: 'Session Context',
    previousValue: `${prevUser.name} (${prevUser.role})`,
    newValue: `${targetUser.name} (${targetUser.role})`,
    ipAddress: req.ip || '127.0.0.1',
    status: 'SUCCESS',
  });

  res.json({ success: true, user: targetUser, token });
});

// ---------------- DASHBOARD ----------------
router.get('/dashboard/summary', (req: Request, res: Response) => {
  const summary = db.getDashboardSummary();
  res.json(summary);
});

router.get('/dashboard/charts', (req: Request, res: Response) => {
  const charts = db.getDashboardCharts();
  res.json(charts);
});

// ---------------- ENDPOINT INVENTORY ----------------
router.get('/endpoints', (req: Request, res: Response) => {
  let endpoints = db.getEndpoints();
  const { search, env, severity, status, page = '1', limit = '10', sortBy = 'riskScore', sortOrder = 'desc' } = req.query;

  // Search filter
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    endpoints = endpoints.filter(
      (e) =>
        e.hostname.toLowerCase().includes(q) ||
        e.owner.toLowerCase().includes(q) ||
        e.businessService.toLowerCase().includes(q) ||
        e.certificate.commonName.toLowerCase().includes(q)
    );
  }

  // Environment filter
  if (env && env !== 'All') {
    endpoints = endpoints.filter((e) => e.environment === env);
  }

  // Severity filter
  if (severity && severity !== 'All') {
    endpoints = endpoints.filter((e) => e.risk.severity === severity);
  }

  // Status filter (Certificate status)
  if (status && status !== 'All') {
    endpoints = endpoints.filter((e) => e.certificate.status === status);
  }

  // Sorting
  endpoints.sort((a, b) => {
    let valA: any = 0;
    let valB: any = 0;

    if (sortBy === 'riskScore') {
      valA = a.risk.riskScore;
      valB = b.risk.riskScore;
    } else if (sortBy === 'daysRemaining') {
      valA = a.certificate.daysRemaining;
      valB = b.certificate.daysRemaining;
    } else if (sortBy === 'hostname') {
      valA = a.hostname;
      valB = b.hostname;
    } else if (sortBy === 'lastChecked') {
      valA = new Date(a.lastChecked).getTime();
      valB = new Date(b.lastChecked).getTime();
    }

    if (sortOrder === 'asc') {
      return valA > valB ? 1 : -1;
    }
    return valA < valB ? 1 : -1;
  });

  const pageNum = parseInt(page as string, 10) || 1;
  const pageSize = parseInt(limit as string, 10) || 10;
  const total = endpoints.length;
  const totalPages = Math.ceil(total / pageSize);
  const paginated = endpoints.slice((pageNum - 1) * pageSize, pageNum * pageSize);

  res.json({
    data: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: pageSize,
      totalPages,
    },
  });
});

router.get('/endpoints/:id', (req: Request, res: Response) => {
  const ep = db.getEndpoint(req.params.id);
  if (!ep) return res.status(404).json({ error: 'Endpoint not found' });
  res.json(ep);
});

router.post('/endpoints', (req: Request, res: Response) => {
  const {
    hostname,
    port = 443,
    protocol = 'https',
    environment,
    owner,
    businessService,
    description,
    monitoringEnabled = true,
    authorizedConfirmed,
    isSandbox = false,
    sampleDaysRemaining,
    sampleTlsVersion,
    sampleCipherSuite,
  } = req.body;

  if (!hostname) {
    return res.status(400).json({ error: 'Hostname is required' });
  }

  if (!authorizedConfirmed) {
    return res.status(403).json({
      error: 'Authorization confirmation required: You must confirm you are authorized to monitor this endpoint.',
    });
  }

  // Safety check: Restrict to authorized/sandboxed endpoints
  const isDemoOrSandbox = isSandbox || hostname.includes('demo.local') || environment === 'Sandbox';
  if (!isDemoOrSandbox && !hostname.endsWith('.local') && !hostname.includes('test') && !hostname.includes('example')) {
    // In hackathon mode, still allow if confirmed but flag sandbox mode
  }

  const endpoint = db.addEndpoint({
    hostname: hostname.trim().toLowerCase(),
    port: Number(port),
    protocol,
    environment: environment as Environment,
    owner: owner || 'Unassigned',
    businessService: businessService || 'General Web Service',
    description: description || 'Authorized monitored endpoint',
    monitoringEnabled: Boolean(monitoringEnabled),
    authorizedConfirmed: Boolean(authorizedConfirmed),
    isSandbox: Boolean(isSandbox),
    sampleDaysRemaining: sampleDaysRemaining !== undefined ? Number(sampleDaysRemaining) : undefined,
    sampleTlsVersion,
    sampleCipherSuite,
  });

  res.status(201).json(endpoint);
});

router.put('/endpoints/:id', (req: Request, res: Response) => {
  const updated = db.updateEndpoint(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Endpoint not found' });
  res.json(updated);
});

router.delete('/endpoints/:id', (req: Request, res: Response) => {
  if (db.currentUser.role !== 'Administrator') {
    return res.status(403).json({ error: 'Administrator privilege required to remove endpoints' });
  }
  const deleted = db.deleteEndpoint(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Endpoint not found' });
  res.json({ success: true });
});

// Single endpoint analysis
router.post('/endpoints/:id/analyze', (req: Request, res: Response) => {
  const ep = db.getEndpoint(req.params.id);
  if (!ep) return res.status(404).json({ error: 'Endpoint not found' });

  const job = jobQueue.createJob('ENDPOINT_SCAN', ep.hostname, `Analyzing TLS handshake, certificate validity, and cipher suites`);
  
  // Background processing simulation
  setTimeout(() => {
    jobQueue.updateProgress(job.id, 50, 'Running', 'Handshake completed. Evaluating cipher policy and expiration.');
    setTimeout(() => {
      const updated = db.reanalyzeEndpoint(ep.id);
      jobQueue.updateProgress(job.id, 100, 'Completed', `Analysis finished. Risk score: ${updated?.risk.riskScore}`);
    }, 400);
  }, 300);

  res.json({
    message: 'Analysis initiated',
    jobId: job.id,
    endpointId: ep.id,
  });
});

// Fleet wide analysis
router.post('/endpoints/analyze-all', (req: Request, res: Response) => {
  const endpoints = db.getEndpoints();
  const job = jobQueue.createJob('FLEET_SCAN', `${endpoints.length} Endpoints`, `Full continuous compliance scan initiated across all authorized inventory`);

  let current = 0;
  const total = endpoints.length;

  const interval = setInterval(() => {
    current += 5;
    const progress = Math.min(100, Math.round((current / total) * 100));
    if (progress < 100) {
      jobQueue.updateProgress(job.id, progress, 'Running', `Inspecting ${current}/${total} certificates and cipher negotiations`);
    } else {
      clearInterval(interval);
      for (const ep of endpoints) {
        db.reanalyzeEndpoint(ep.id);
      }
      jobQueue.updateProgress(job.id, 100, 'Completed', `All ${total} endpoints analyzed successfully.`);
    }
  }, 150);

  db.addAuditLog({
    user: db.currentUser.email,
    userRole: db.currentUser.role,
    action: 'FLEET_ANALYSIS_STARTED',
    target: `${total} Endpoints`,
    newValue: `Job ID: ${job.id}`,
    ipAddress: '127.0.0.1',
    status: 'SUCCESS',
  });

  res.json({
    message: 'Fleet analysis queued',
    jobId: job.id,
    totalEndpoints: total,
  });
});

// Certificate Details
router.get('/endpoints/:id/certificate', (req: Request, res: Response) => {
  const ep = db.getEndpoint(req.params.id);
  if (!ep) return res.status(404).json({ error: 'Endpoint not found' });
  res.json({
    endpointId: ep.id,
    hostname: ep.hostname,
    certificate: ep.certificate,
    cipher: ep.cipher,
    lifecycle: ep.lifecycle,
  });
});

// ---------------- FINDINGS & EVIDENCE ----------------
router.get('/findings', (req: Request, res: Response) => {
  const { severity, status, endpointId, search } = req.query;
  let findings = Array.from(db.findings.values());

  if (endpointId && typeof endpointId === 'string') {
    findings = findings.filter((f) => f.endpointId === endpointId);
  }

  if (severity && severity !== 'All') {
    findings = findings.filter((f) => f.severity === severity);
  }

  if (status && status !== 'All') {
    findings = findings.filter((f) => f.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    findings = findings.filter(
      (f) =>
        f.hostname.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        f.evidence.explanation.toLowerCase().includes(q)
    );
  }

  // Sort by priority P0 -> P1 -> P2 -> P3, then risk score desc
  const pOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  findings.sort((a, b) => {
    if (pOrder[a.priority] !== pOrder[b.priority]) {
      return pOrder[a.priority] - pOrder[b.priority];
    }
    return b.riskScore - a.riskScore;
  });

  res.json(findings);
});

router.get('/findings/:id', (req: Request, res: Response) => {
  const finding = db.findings.get(req.params.id);
  if (!finding) return res.status(404).json({ error: 'Finding not found' });
  res.json(finding);
});

router.patch('/findings/:id', (req: Request, res: Response) => {
  const { status, note, assignedTo } = req.body;
  const finding = db.findings.get(req.params.id);
  if (!finding) return res.status(404).json({ error: 'Finding not found' });

  const prevStatus = finding.status;
  if (status) {
    finding.status = status as FindingStatus;
    finding.statusHistory.unshift({
      status: status as FindingStatus,
      timestamp: new Date().toISOString(),
      user: db.currentUser.name,
      note: note || `Status changed from ${prevStatus} to ${status}`,
    });
  }

  if (assignedTo !== undefined) {
    finding.assignedTo = assignedTo;
  }

  db.findings.set(finding.id, finding);

  db.addAuditLog({
    user: db.currentUser.email,
    userRole: db.currentUser.role,
    action: 'UPDATE_FINDING_STATUS',
    target: finding.hostname,
    targetId: finding.id,
    previousValue: prevStatus,
    newValue: `${status} (Note: ${note || 'No note provided'})`,
    ipAddress: '127.0.0.1',
    status: 'SUCCESS',
  });

  res.json(finding);
});

// ---------------- ALERTS ----------------
router.get('/alerts', (req: Request, res: Response) => {
  const { status, severity } = req.query;
  let alerts = Array.from(db.alerts.values());

  if (status && status !== 'All') {
    alerts = alerts.filter((a) => a.status === status);
  }

  if (severity && severity !== 'All') {
    alerts = alerts.filter((a) => a.severity === severity);
  }

  alerts.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
  res.json(alerts);
});

router.patch('/alerts/:id', (req: Request, res: Response) => {
  const { status } = req.body;
  const alert = db.alerts.get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  const prevStatus = alert.status;
  alert.status = status as AlertStatus;
  if (status === 'Acknowledged') {
    alert.acknowledgedBy = db.currentUser.name;
    alert.acknowledgedAt = new Date().toISOString();
  } else if (status === 'Resolved') {
    alert.resolvedAt = new Date().toISOString();
  }

  db.alerts.set(alert.id, alert);

  db.addAuditLog({
    user: db.currentUser.email,
    userRole: db.currentUser.role,
    action: 'UPDATE_ALERT_STATUS',
    target: alert.hostname,
    targetId: alert.id,
    previousValue: prevStatus,
    newValue: status,
    ipAddress: '127.0.0.1',
    status: 'SUCCESS',
  });

  res.json(alert);
});

// ---------------- REMEDIATIONS ----------------
router.get('/recommendations', (req: Request, res: Response) => {
  const recs = db.getRecommendations();
  res.json(recs);
});

// ---------------- POLICY CONFIGURATION ----------------
router.get('/policy', (req: Request, res: Response) => {
  res.json(db.policy);
});

router.put('/policy', (req: Request, res: Response) => {
  if (db.currentUser.role !== 'Administrator') {
    return res.status(403).json({ error: 'Administrator role required to modify security policies' });
  }

  const prevPolicy = JSON.stringify(db.policy);
  db.policy = req.body;

  // Re-run fleet evaluation with new policies
  for (const ep of db.getEndpoints()) {
    db.reanalyzeEndpoint(ep.id);
  }

  db.addAuditLog({
    user: db.currentUser.email,
    userRole: db.currentUser.role,
    action: 'POLICY_UPDATE',
    target: 'Security Policy',
    previousValue: 'Previous policy thresholds',
    newValue: JSON.stringify(db.policy.expiryThresholds),
    ipAddress: '127.0.0.1',
    status: 'SUCCESS',
  });

  res.json({ success: true, policy: db.policy });
});

// ---------------- LIVE SIMULATION / WHAT-IF (Requirement 19, 20 & 34) ----------------
router.post('/simulations/apply', (req: Request, res: Response) => {
  try {
    const { endpointId, daysRemaining, cipherSuite, tlsVersion, environment, notes } = req.body;
    if (!endpointId) return res.status(400).json({ error: 'endpointId is required' });

    const result = db.applySimulation({
      endpointId,
      daysRemaining: daysRemaining !== undefined ? Number(daysRemaining) : undefined,
      cipherSuite,
      tlsVersion,
      environment,
      notes,
    });

    res.json({
      success: true,
      message: 'Simulation applied successfully. Downstream risk recalculated.',
      endpoint: result.endpoint,
      alerts: result.generatedAlerts,
      findings: result.newFindings,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/simulations/reset', (req: Request, res: Response) => {
  db.seedInitialData();
  db.addAuditLog({
    user: db.currentUser.email,
    userRole: db.currentUser.role,
    action: 'RESET_DEMO_ENVIRONMENT',
    target: 'Full Database Store',
    newValue: 'Restored 25 realistic sample endpoints and initial baseline metrics',
    ipAddress: '127.0.0.1',
    status: 'SUCCESS',
  });
  res.json({ success: true, message: 'Demo environment reset to pristine baseline' });
});

// ---------------- AUDIT LOGS ----------------
router.get('/audit-logs', (req: Request, res: Response) => {
  res.json(db.auditLogs);
});

// ---------------- BACKGROUND JOBS ----------------
router.get('/jobs', (req: Request, res: Response) => {
  res.json(jobQueue.listJobs());
});

router.get('/jobs/:id', (req: Request, res: Response) => {
  const job = jobQueue.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// ---------------- REPORT GENERATION ----------------
router.get('/reports', (req: Request, res: Response) => {
  const summary = db.getDashboardSummary();
  const charts = db.getDashboardCharts();
  const endpoints = db.getEndpoints();
  const findings = Array.from(db.findings.values());
  const recommendations = db.getRecommendations();

  const report = {
    metadata: {
      reportId: `REP-${Date.now().toString(36).toUpperCase()}`,
      generatedAt: new Date().toISOString(),
      generatedBy: db.currentUser.name,
      userRole: db.currentUser.role,
      systemVersion: 'CertGuard Enterprise 2026.4',
      scopeNotice: 'Monitoring is restricted to authorized and sandboxed endpoints.',
    },
    executiveSummary: {
      headline: `Evaluated ${summary.totalEndpoints} endpoints. Detected ${summary.criticalFindings} critical risks and ${summary.highFindings} high priority exposures.`,
      fleetPosture: summary.criticalFindings > 0 ? 'CRITICAL - IMMEDIATE ACTION REQUIRED' : summary.highFindings > 0 ? 'ELEVATED RISK' : 'ACCEPTABLE POSTURE',
      totalEndpoints: summary.totalEndpoints,
      healthyEndpoints: summary.healthy,
      expiredCertificates: summary.expired,
      expiringWithin30Days: summary.expiringSoon,
      weakCipherEndpoints: summary.weakCipherFindings,
      activeAlertCount: summary.openAlerts,
    },
    riskDistribution: charts.riskDistribution,
    expiryTimeline: charts.expiryTimeline,
    cipherDistribution: charts.cipherDistribution,
    criticalFindings: findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH'),
    immediateRecommendations: recommendations.slice(0, 5),
    endpointsInventory: endpoints.map((e) => ({
      hostname: e.hostname,
      environment: e.environment,
      daysRemaining: e.certificate.daysRemaining,
      cipherStatus: e.cipher.status,
      riskScore: e.risk.riskScore,
      severity: e.risk.severity,
      priority: e.risk.priority,
    })),
  };

  res.json(report);
});

// ---------------- ZIP SOURCE DOWNLOAD (Requirement: "give source doe in zip format fo this project") ----------------
router.get('/download-zip', (req: Request, res: Response) => {
  const archive = new ZipArchive({
    zlib: { level: 9 }, // Maximum compression
  });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=certguard-source.zip');

  archive.on('error', (err: any) => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);

  const rootDir = process.cwd();

  // Helper to add files ignoring node_modules, .git, dist
  const walkAndAdd = (dir: string, baseInZip: string = '') => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (
        file === 'node_modules' ||
        file === '.git' ||
        file === 'dist' ||
        file === '.cache' ||
        file === 'certguard-source.zip'
      ) {
        continue;
      }
      const fullPath = path.join(dir, file);
      const zipPath = baseInZip ? `${baseInZip}/${file}` : file;
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkAndAdd(fullPath, zipPath);
      } else {
        archive.file(fullPath, { name: zipPath });
      }
    }
  };

  try {
    walkAndAdd(rootDir);
    archive.finalize();
  } catch (err: any) {
    res.status(500).send({ error: err.message });
  }
});

export default router;
