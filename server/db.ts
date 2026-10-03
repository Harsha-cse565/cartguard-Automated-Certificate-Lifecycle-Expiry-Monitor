import {
  Alert,
  AuditLog,
  CertificateInfo,
  CipherObservation,
  Endpoint,
  Environment,
  Finding,
  RecommendationItem,
  SecurityPolicy,
  User,
} from './types.ts';
import { evaluateExpiry } from './engines/expiryEngine.ts';
import { evaluateCipher } from './engines/cipherEngine.ts';
import { calculateRisk } from './engines/riskEngine.ts';
import { jobQueue } from './engines/jobQueue.ts';

// Current reference date for demo consistency
const DEMO_REFERENCE_DATE = new Date('2026-10-03T07:30:00Z');

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  expiryThresholds: {
    expiredDays: 0,
    criticalDays: 7,
    highDays: 14,
    mediumDays: 30,
    lowDays: 90,
  },
  cipherPolicy: {
    minimumTlsVersion: 'TLSv1.2',
    prohibitedCiphers: ['RC4', '3DES', 'DES', 'MD5', 'EXPORT', 'NULL', 'CBC'],
    requireForwardSecrecy: true,
    minimumKeySizeRsa: 2048,
  },
  riskWeights: {
    expiredWeight: 100,
    criticalExpiryWeight: 90,
    highExpiryWeight: 70,
    mediumExpiryWeight: 40,
    lowExpiryWeight: 10,
    criticalCipherWeight: 100,
    weakCipherWeight: 70,
    acceptableCipherWeight: 20,
    productionMultiplier: 1.3,
    stagingMultiplier: 1.0,
    developmentMultiplier: 0.8,
    sandboxMultiplier: 0.6,
  },
};

export const DEMO_USERS: User[] = [
  {
    id: 'usr_admin',
    name: 'Alex Rivera',
    email: 'alex.rivera@certguard.sec',
    role: 'Administrator',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80',
  },
  {
    id: 'usr_analyst',
    name: 'Sarah Chen',
    email: 'sarah.chen@certguard.sec',
    role: 'Security Analyst',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80',
  },
];

class DatabaseStore {
  public policy: SecurityPolicy = JSON.parse(JSON.stringify(DEFAULT_SECURITY_POLICY));
  public currentUser: User = DEMO_USERS[0];
  public endpoints: Map<string, Endpoint> = new Map();
  public findings: Map<string, Finding> = new Map();
  public alerts: Map<string, Alert> = new Map();
  public auditLogs: AuditLog[] = [];

  constructor() {
    this.seedInitialData();
  }

  private addDaysToDemoDate(days: number): string {
    const d = new Date(DEMO_REFERENCE_DATE);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  public seedInitialData() {
    this.policy = JSON.parse(JSON.stringify(DEFAULT_SECURITY_POLICY));
    this.endpoints.clear();
    this.findings.clear();
    this.alerts.clear();
    this.auditLogs = [];

    // Helper to generate seed endpoint
    const createSeedEndpoint = (params: {
      id: string;
      hostname: string;
      port?: number;
      env: Environment;
      owner: string;
      service: string;
      description: string;
      daysRemaining: number;
      tlsVersion: string;
      cipherSuite: string;
      keySize?: number;
      issuer?: string;
      isSelfSigned?: boolean;
    }): Endpoint => {
      const port = params.port || 443;
      const validUntil = this.addDaysToDemoDate(params.daysRemaining);
      const validFrom = new Date(new Date(validUntil).getTime() - 365 * 24 * 3600 * 1000).toISOString();
      const keySize = params.keySize || 2048;
      const issuer = params.issuer || 'DigiCert Global Root G2';

      const certInfo: CertificateInfo = {
        subject: `CN=${params.hostname}, O=Acme Corp, C=US`,
        commonName: params.hostname,
        sans: [params.hostname, `*.${params.hostname.split('.').slice(1).join('.')}`],
        issuer,
        issuerOrg: issuer.split(' ')[0],
        serialNumber: `4A:8F:${Math.floor(Math.random() * 8999 + 1000)}:2C:9E:${Math.floor(Math.random() * 8999 + 1000)}:E1`,
        fingerprintSha256: `9B:2F:3A:C4:7D:91:0E:44:8A:BC:${Math.floor(Math.random() * 89 + 10)}:F3:11:00:82:17:66:99:AA`,
        signatureAlgorithm: 'SHA256withRSA',
        publicKeyAlgorithm: 'RSA',
        keySize,
        validFrom,
        validUntil,
        daysRemaining: params.daysRemaining,
        status: params.daysRemaining <= 0 ? 'EXPIRED' : params.daysRemaining <= 7 ? 'CRITICAL' : params.daysRemaining <= 30 ? 'EXPIRING_SOON' : 'VALID',
        isSelfSigned: !!params.isSelfSigned,
        ocspStapling: true,
        transparencyLogs: true,
        chain: [
          {
            level: 'Root',
            name: issuer,
            issuer: 'Self-Signed Root Authority',
            validUntil: '2034-01-15T00:00:00Z',
            status: 'VALID',
          },
          {
            level: 'Intermediate',
            name: `${issuer} CA 1`,
            issuer,
            validUntil: '2028-11-20T00:00:00Z',
            status: 'VALID',
          },
          {
            level: 'Leaf',
            name: params.hostname,
            issuer: `${issuer} CA 1`,
            validUntil,
            status: params.daysRemaining <= 0 ? 'EXPIRED' : params.daysRemaining <= 7 ? 'WARNING' : 'VALID',
          },
        ],
      };

      const cipherEval = evaluateCipher(params.tlsVersion, params.cipherSuite, this.policy);
      const cipherObs: CipherObservation = {
        tlsVersion: params.tlsVersion,
        cipherSuite: params.cipherSuite,
        cipherStrength: cipherEval.cipherStrength,
        forwardSecrecy: cipherEval.forwardSecrecy,
        keyExchange: cipherEval.keyExchange,
        authentication: cipherEval.authentication,
        encryption: cipherEval.encryption,
        integrity: cipherEval.integrity,
        status: cipherEval.status,
        matchedRule: cipherEval.matchedRule,
        explanation: cipherEval.explanation,
      };

      const expiryEval = evaluateExpiry(validUntil, this.policy, DEMO_REFERENCE_DATE);
      const riskResult = calculateRisk(params.hostname, params.env, keySize, expiryEval, cipherEval, this.policy);

      const endpoint: Endpoint = {
        id: params.id,
        hostname: params.hostname,
        port,
        protocol: 'https',
        environment: params.env,
        owner: params.owner,
        businessService: params.service,
        description: params.description,
        monitoringEnabled: true,
        isSandbox: params.env === 'Sandbox' || params.hostname.includes('demo.local'),
        authorizedConfirmed: true,
        lastChecked: new Date(DEMO_REFERENCE_DATE.getTime() - Math.floor(Math.random() * 3600000)).toISOString(),
        certificate: certInfo,
        cipher: cipherObs,
        risk: riskResult.riskAssessment,
        lifecycle: [
          {
            id: `evt_1_${params.id}`,
            date: validFrom.split('T')[0],
            title: 'Certificate Issued',
            description: `X.509 Certificate issued by ${issuer} with 365-day validity.`,
            type: 'ISSUED',
          },
          {
            id: `evt_2_${params.id}`,
            date: '2026-08-01',
            title: 'Monitoring Started',
            description: 'Enrolled in CertGuard automated continuous lifecycle monitoring.',
            type: 'MONITORED',
          },
          ...(params.daysRemaining <= 30
            ? [
                {
                  id: `evt_3_${params.id}`,
                  date: '2026-09-20',
                  title: 'Expiry Warning Triggered',
                  description: 'Days remaining dropped below 30-day monitoring threshold.',
                  type: 'WARNING' as const,
                },
              ]
            : []),
          ...(params.daysRemaining <= 7
            ? [
                {
                  id: `evt_4_${params.id}`,
                  date: '2026-10-01',
                  title: 'Critical Warning Triggered',
                  description: 'Days remaining dropped below 7-day critical SLA limit.',
                  type: 'CRITICAL' as const,
                },
              ]
            : []),
          ...(params.daysRemaining <= 0
            ? [
                {
                  id: `evt_5_${params.id}`,
                  date: '2026-10-02',
                  title: 'Certificate Expired',
                  description: 'Endpoint certificate reached end of validity period.',
                  type: 'EXPIRED' as const,
                },
              ]
            : []),
        ],
      };

      // Register findings & alerts
      for (const findingDef of riskResult.findingsToGenerate) {
        const findingId = `fnd_${params.id}_${findingDef.type.toLowerCase()}`;
        const finding: Finding = {
          id: findingId,
          endpointId: params.id,
          hostname: params.hostname,
          environment: params.env,
          findingType: findingDef.type,
          title: findingDef.title,
          severity: findingDef.severity,
          riskScore: findingDef.riskScore,
          priority: findingDef.priority,
          detectedAt: endpoint.lastChecked,
          status: 'Open',
          assignedTo: params.owner,
          evidence: findingDef.evidence,
          recommendation: findingDef.recommendation,
          statusHistory: [
            {
              status: 'Open',
              timestamp: endpoint.lastChecked,
              user: 'System Engine',
              note: 'Automated policy evaluation trigger',
            },
          ],
        };
        this.findings.set(findingId, finding);

        // Generate Alert for Critical or High findings
        if (findingDef.severity === 'CRITICAL' || findingDef.severity === 'HIGH') {
          const alertId = `alt_${findingId}`;
          const alert: Alert = {
            id: alertId,
            findingId,
            endpointId: params.id,
            hostname: params.hostname,
            environment: params.env,
            severity: findingDef.severity,
            title: findingDef.title,
            message: findingDef.evidence.explanation,
            triggeredAt: endpoint.lastChecked,
            status: 'Open',
            channel: 'IN_APP',
          };
          this.alerts.set(alertId, alert);
        }
      }

      return endpoint;
    };

    // 25 realistic endpoints
    const seedDefs = [
      {
        id: 'ep_payment',
        hostname: 'payment.demo.local',
        env: 'Production' as Environment,
        owner: 'SecOps - Payments Team',
        service: 'Stripe Gateway Proxy',
        description: 'Core payment transaction processing pipeline and tokenization vault',
        daysRemaining: 4, // CRITICAL (<= 7 days)
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
      {
        id: 'ep_auth',
        hostname: 'auth.demo.local',
        env: 'Production' as Environment,
        owner: 'Identity & Access Team',
        service: 'OAuth2 / OIDC Single Sign-On',
        description: 'Global identity federation and JWT token issuing authority',
        daysRemaining: -2, // EXPIRED!
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_128_GCM_SHA256',
      },
      {
        id: 'ep_api_gw',
        hostname: 'api.gateway.demo.local',
        env: 'Production' as Environment,
        owner: 'Platform Engineering',
        service: 'Public Edge Ingress',
        description: 'Envoy-based API gateway handling public customer traffic',
        daysRemaining: 12, // HIGH (<= 14 days)
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
      {
        id: 'ep_legacy_portal',
        hostname: 'legacy-portal.demo.local',
        env: 'Staging' as Environment,
        owner: 'Enterprise ERP Support',
        service: 'Legacy Corporate Intranet',
        description: 'Legacy internal inventory system retaining deprecated cipher support',
        daysRemaining: 140,
        tlsVersion: 'TLSv1.2',
        cipherSuite: 'TLS_RSA_WITH_3DES_EDE_CBC_SHA', // WEAK Sweet32!
      },
      {
        id: 'ep_customer_portal',
        hostname: 'customer-portal.demo.local',
        env: 'Production' as Environment,
        owner: 'Frontend Core Team',
        service: 'Customer Web Dashboard',
        description: 'Next.js web application frontend for all consumer banking clients',
        daysRemaining: 145, // HEALTHY
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
      {
        id: 'ep_admin_console',
        hostname: 'admin.demo.local',
        env: 'Production' as Environment,
        owner: 'SecOps Tier 3',
        service: 'Superuser Management Plane',
        description: 'Restricted administrative back-office and audit oversight console',
        daysRemaining: 85,
        tlsVersion: 'TLSv1.0', // DEPRECATED TLS!
        cipherSuite: 'TLS_RSA_WITH_AES_128_CBC_SHA',
      },
      {
        id: 'ep_checkout',
        hostname: 'checkout.demo.local',
        env: 'Production' as Environment,
        owner: 'Payments Team',
        service: 'Cart Checkout Service',
        description: 'Customer cart finalization and PCI-compliant checkout sessions',
        daysRemaining: 210, // HEALTHY
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_CHACHA20_POLY1305_SHA256',
      },
      {
        id: 'ep_k8s_ingress',
        hostname: 'k8s-ingress.demo.local',
        env: 'Production' as Environment,
        owner: 'Cloud Infrastructure',
        service: 'GKE Ingress Controller',
        description: 'Primary Kubernetes cluster ingress routing microservices',
        daysRemaining: 26, // MEDIUM (<= 30 days)
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
      {
        id: 'ep_notification',
        hostname: 'notification-service.demo.local',
        env: 'Staging' as Environment,
        owner: 'Communications Team',
        service: 'Push & SMS Gateway',
        description: 'Multi-channel messaging service dispatching customer push alerts',
        daysRemaining: 65, // LOW
        tlsVersion: 'TLSv1.2',
        cipherSuite: 'ECDHE-RSA-AES256-GCM-SHA384',
      },
      {
        id: 'ep_vault',
        hostname: 'vault.demo.local',
        env: 'Production' as Environment,
        owner: 'InfraSec Core',
        service: 'HashiCorp Vault Key Store',
        description: 'Enterprise secret management, KMS envelope encryption, and PKI engine',
        daysRemaining: 320, // HEALTHY
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
      {
        id: 'ep_datalake',
        hostname: 'data-lake.demo.local',
        env: 'Development' as Environment,
        owner: 'Data Engineering',
        service: 'Presto / Trino Query Engine',
        description: 'Internal analytical querying platform with dev certificates',
        daysRemaining: 48,
        tlsVersion: 'TLSv1.2',
        cipherSuite: 'ECDHE-RSA-AES128-GCM-SHA256',
        keySize: 1024, // SHORT KEY PENALTY!
      },
      {
        id: 'ep_metrics',
        hostname: 'metrics.demo.local',
        env: 'Staging' as Environment,
        owner: 'Observability Team',
        service: 'Prometheus / Grafana Cluster',
        description: 'Telemetry time-series scraper and performance alert manager',
        daysRemaining: 98, // HEALTHY
        tlsVersion: 'TLSv1.2',
        cipherSuite: 'ECDHE-RSA-AES256-GCM-SHA384',
      },
      {
        id: 'ep_webhook',
        hostname: 'webhook.demo.local',
        env: 'Production' as Environment,
        owner: 'Partner Integrations',
        service: 'Incoming Webhook Listener',
        description: 'Receives external callbacks and asynchronous status updates',
        daysRemaining: 9, // HIGH (<= 14 days)
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_128_GCM_SHA256',
      },
      {
        id: 'ep_billing',
        hostname: 'billing-engine.demo.local',
        env: 'Production' as Environment,
        owner: 'Finance Tech',
        service: 'Subscription Invoicing Engine',
        description: 'Automated recurring billing and accounts receivable reconciliation',
        daysRemaining: 6, // CRITICAL (<= 7 days)
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
      {
        id: 'ep_partner_api',
        hostname: 'partner-api.demo.local',
        env: 'Production' as Environment,
        owner: 'B2B Partnerships',
        service: 'Partner REST Integration API',
        description: 'Mutual-TLS interface allowing tier-1 banking partners data sync',
        daysRemaining: 88,
        tlsVersion: 'TLSv1.2',
        cipherSuite: 'ECDHE-RSA-AES256-SHA384', // CBC Legacy
      },
      {
        id: 'ep_mobile_backend',
        hostname: 'mobile-backend.demo.local',
        env: 'Production' as Environment,
        owner: 'Mobile Apps Guild',
        service: 'iOS & Android App GraphQL API',
        description: 'High-volume mobile BFF (Backend-For-Frontend) endpoint',
        daysRemaining: 180, // HEALTHY
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
      {
        id: 'ep_internal_wiki',
        hostname: 'internal-wiki.demo.local',
        env: 'Development' as Environment,
        owner: 'IT Workplace Engineering',
        service: 'Confluence Knowledge Base',
        description: 'Staff documentation and internal runbook repository',
        daysRemaining: 35,
        tlsVersion: 'TLSv1.2',
        cipherSuite: 'ECDHE-RSA-AES128-GCM-SHA256',
        isSelfSigned: true,
      },
      {
        id: 'ep_idp',
        hostname: 'idp.demo.local',
        env: 'Production' as Environment,
        owner: 'Security Architecture',
        service: 'SAML 2.0 Identity Provider',
        description: 'Core SAML identity assertions provider for zero-trust boundary',
        daysRemaining: 240, // HEALTHY
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
      {
        id: 'ep_cdn_origin',
        hostname: 'cdn-origin.demo.local',
        env: 'Production' as Environment,
        owner: 'Web Infrastructure',
        service: 'Cloudflare Origin Shield',
        description: 'Direct origin reverse proxy shielded behind Cloudflare CDN edge',
        daysRemaining: 160, // HEALTHY
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
      {
        id: 'ep_sandbox_1',
        hostname: 'sandbox-test-1.demo.local',
        env: 'Sandbox' as Environment,
        owner: 'Hackathon Evaluator',
        service: 'Interactive Sandbox Endpoint A',
        description: 'Controlled demonstration target for expiry & cipher experiments',
        daysRemaining: 30, // Default 30 days
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
      {
        id: 'ep_sandbox_2',
        hostname: 'sandbox-test-2.demo.local',
        env: 'Sandbox' as Environment,
        owner: 'Hackathon Evaluator',
        service: 'Interactive Sandbox Endpoint B',
        description: 'Controlled demonstration target for live policy change tests',
        daysRemaining: 14,
        tlsVersion: 'TLSv1.2',
        cipherSuite: 'ECDHE-RSA-AES128-GCM-SHA256',
      },
      {
        id: 'ep_search_cluster',
        hostname: 'search-cluster.demo.local',
        env: 'Staging' as Environment,
        owner: 'Search & Discovery',
        service: 'OpenSearch Query Nodes',
        description: 'Distributed vector search and catalog indexing node interface',
        daysRemaining: 110, // HEALTHY
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
      {
        id: 'ep_email_relay',
        hostname: 'email-relay.demo.local',
        port: 465,
        env: 'Production' as Environment,
        owner: 'Infra Postmaster',
        service: 'Encrypted SMTP Submission',
        description: 'MTA submission gateway supporting DANE and STARTTLS',
        daysRemaining: 290, // HEALTHY
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
      {
        id: 'ep_iot_hub',
        hostname: 'iot-hub.demo.local',
        port: 8883,
        env: 'Production' as Environment,
        owner: 'Embedded Devices Team',
        service: 'MQTT Device Ingestion Broker',
        description: 'Legacy smart telemetry collection with legacy RC4 cipher support',
        daysRemaining: 15,
        tlsVersion: 'TLSv1.2',
        cipherSuite: 'TLS_RSA_WITH_RC4_128_SHA', // BROKEN RC4!
      },
      {
        id: 'ep_backup_node',
        hostname: 'backup-node.demo.local',
        env: 'Development' as Environment,
        owner: 'Storage Operations',
        service: 'Disaster Recovery Warm Sync',
        description: 'Secondary snapshot replication target across hybrid cloud',
        daysRemaining: 340, // HEALTHY
        tlsVersion: 'TLSv1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384',
      },
    ];

    for (const def of seedDefs) {
      const ep = createSeedEndpoint(def);
      this.endpoints.set(ep.id, ep);
    }

    // Seed audit logs
    this.auditLogs = [
      {
        id: 'aud_1',
        timestamp: new Date(DEMO_REFERENCE_DATE.getTime() - 7200000).toISOString(),
        user: 'alex.rivera@certguard.sec',
        userRole: 'Administrator',
        action: 'POLICY_UPDATE',
        target: 'Security Policy Configuration',
        previousValue: 'Critical Expiry Threshold: 5 days',
        newValue: 'Critical Expiry Threshold: 7 days',
        ipAddress: '192.168.1.104',
        status: 'SUCCESS',
      },
      {
        id: 'aud_2',
        timestamp: new Date(DEMO_REFERENCE_DATE.getTime() - 5400000).toISOString(),
        user: 'sarah.chen@certguard.sec',
        userRole: 'Security Analyst',
        action: 'ACKNOWLEDGE_ALERT',
        target: 'payment.demo.local',
        previousValue: 'Status: Open',
        newValue: 'Status: Acknowledged',
        ipAddress: '192.168.1.112',
        status: 'SUCCESS',
      },
      {
        id: 'aud_3',
        timestamp: new Date(DEMO_REFERENCE_DATE.getTime() - 3600000).toISOString(),
        user: 'alex.rivera@certguard.sec',
        userRole: 'Administrator',
        action: 'FLEET_ANALYSIS_STARTED',
        target: '25 Registered Endpoints',
        newValue: 'Batch Job queued for TLS/SSL inspection',
        ipAddress: '192.168.1.104',
        status: 'SUCCESS',
      },
    ];
  }

  public getEndpoints(): Endpoint[] {
    return Array.from(this.endpoints.values());
  }

  public getEndpoint(id: string): Endpoint | undefined {
    return this.endpoints.get(id);
  }

  public addEndpoint(data: {
    hostname: string;
    port: number;
    protocol: 'https' | 'tls' | 'smtps' | 'imaps';
    environment: Environment;
    owner: string;
    businessService: string;
    description: string;
    monitoringEnabled: boolean;
    authorizedConfirmed: boolean;
    isSandbox?: boolean;
    sampleDaysRemaining?: number;
    sampleTlsVersion?: string;
    sampleCipherSuite?: string;
  }): Endpoint {
    const id = `ep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const daysRemaining = data.sampleDaysRemaining !== undefined ? data.sampleDaysRemaining : 90;
    const validUntil = this.addDaysToDemoDate(daysRemaining);
    const validFrom = new Date(new Date(validUntil).getTime() - 365 * 24 * 3600 * 1000).toISOString();
    const tlsVersion = data.sampleTlsVersion || 'TLSv1.3';
    const cipherSuite = data.sampleCipherSuite || 'TLS_AES_256_GCM_SHA384';

    const certInfo: CertificateInfo = {
      subject: `CN=${data.hostname}, O=Enterprise Services, C=US`,
      commonName: data.hostname,
      sans: [data.hostname],
      issuer: 'DigiCert Global Root CA',
      issuerOrg: 'DigiCert',
      serialNumber: `7C:9B:${Math.floor(Math.random() * 8999 + 1000)}:FF:01:A2`,
      fingerprintSha256: `3A:B8:41:99:E0:12:88:51:FF:${Math.floor(Math.random() * 89 + 10)}:91:02:44:77`,
      signatureAlgorithm: 'SHA256withRSA',
      publicKeyAlgorithm: 'RSA',
      keySize: 2048,
      validFrom,
      validUntil,
      daysRemaining,
      status: daysRemaining <= 0 ? 'EXPIRED' : daysRemaining <= 7 ? 'CRITICAL' : daysRemaining <= 30 ? 'EXPIRING_SOON' : 'VALID',
      isSelfSigned: false,
      ocspStapling: true,
      transparencyLogs: true,
      chain: [
        {
          level: 'Root',
          name: 'DigiCert Global Root CA',
          issuer: 'Self-Signed',
          validUntil: '2035-01-01T00:00:00Z',
          status: 'VALID',
        },
        {
          level: 'Intermediate',
          name: 'DigiCert TLS RSA Intermediate CA G1',
          issuer: 'DigiCert Global Root CA',
          validUntil: '2030-01-01T00:00:00Z',
          status: 'VALID',
        },
        {
          level: 'Leaf',
          name: data.hostname,
          issuer: 'DigiCert TLS RSA Intermediate CA G1',
          validUntil,
          status: daysRemaining <= 0 ? 'EXPIRED' : daysRemaining <= 7 ? 'WARNING' : 'VALID',
        },
      ],
    };

    const cipherEval = evaluateCipher(tlsVersion, cipherSuite, this.policy);
    const expiryEval = evaluateExpiry(validUntil, this.policy, DEMO_REFERENCE_DATE);
    const riskResult = calculateRisk(data.hostname, data.environment, 2048, expiryEval, cipherEval, this.policy);

    const endpoint: Endpoint = {
      id,
      hostname: data.hostname,
      port: data.port || 443,
      protocol: data.protocol || 'https',
      environment: data.environment,
      owner: data.owner,
      businessService: data.businessService,
      description: data.description,
      monitoringEnabled: data.monitoringEnabled !== false,
      isSandbox: data.isSandbox || data.hostname.includes('demo.local') || data.environment === 'Sandbox',
      authorizedConfirmed: data.authorizedConfirmed,
      lastChecked: new Date().toISOString(),
      certificate: certInfo,
      cipher: {
        tlsVersion,
        cipherSuite,
        cipherStrength: cipherEval.cipherStrength,
        forwardSecrecy: cipherEval.forwardSecrecy,
        keyExchange: cipherEval.keyExchange,
        authentication: cipherEval.authentication,
        encryption: cipherEval.encryption,
        integrity: cipherEval.integrity,
        status: cipherEval.status,
        matchedRule: cipherEval.matchedRule,
        explanation: cipherEval.explanation,
      },
      risk: riskResult.riskAssessment,
      lifecycle: [
        {
          id: `evt_init_${id}`,
          date: new Date().toISOString().split('T')[0],
          title: 'Endpoint Registered',
          description: `Authorized endpoint registered by ${this.currentUser.email}. Initial compliance assessment established.`,
          type: 'MONITORED',
        },
      ],
    };

    this.endpoints.set(id, endpoint);

    // Register findings and alerts
    for (const f of riskResult.findingsToGenerate) {
      const fId = `fnd_${id}_${f.type.toLowerCase()}`;
      const finding: Finding = {
        id: fId,
        endpointId: id,
        hostname: data.hostname,
        environment: data.environment,
        findingType: f.type,
        title: f.title,
        severity: f.severity,
        riskScore: f.riskScore,
        priority: f.priority,
        detectedAt: endpoint.lastChecked,
        status: 'Open',
        assignedTo: data.owner,
        evidence: f.evidence,
        recommendation: f.recommendation,
        statusHistory: [
          {
            status: 'Open',
            timestamp: endpoint.lastChecked,
            user: this.currentUser.name,
            note: 'Initial scan finding',
          },
        ],
      };
      this.findings.set(fId, finding);

      if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
        const altId = `alt_${fId}`;
        this.alerts.set(altId, {
          id: altId,
          findingId: fId,
          endpointId: id,
          hostname: data.hostname,
          environment: data.environment,
          severity: f.severity,
          title: f.title,
          message: f.evidence.explanation,
          triggeredAt: endpoint.lastChecked,
          status: 'Open',
          channel: 'IN_APP',
        });
      }
    }

    this.addAuditLog({
      user: this.currentUser.email,
      userRole: this.currentUser.role,
      action: 'ADD_ENDPOINT',
      target: data.hostname,
      targetId: id,
      newValue: `Created in ${data.environment} environment (Service: ${data.businessService})`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    return endpoint;
  }

  public updateEndpoint(id: string, updates: Partial<Endpoint>): Endpoint | undefined {
    const ep = this.endpoints.get(id);
    if (!ep) return undefined;

    const previousValue = `Env: ${ep.environment}, Owner: ${ep.owner}`;
    Object.assign(ep, updates);
    this.endpoints.set(id, ep);

    this.addAuditLog({
      user: this.currentUser.email,
      userRole: this.currentUser.role,
      action: 'UPDATE_ENDPOINT',
      target: ep.hostname,
      targetId: id,
      previousValue,
      newValue: `Updated details for ${ep.hostname}`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    return ep;
  }

  public deleteEndpoint(id: string): boolean {
    const ep = this.endpoints.get(id);
    if (!ep) return false;

    // Delete associated findings & alerts
    for (const [fId, f] of this.findings.entries()) {
      if (f.endpointId === id) this.findings.delete(fId);
    }
    for (const [aId, a] of this.alerts.entries()) {
      if (a.endpointId === id) this.alerts.delete(aId);
    }
    this.endpoints.delete(id);

    this.addAuditLog({
      user: this.currentUser.email,
      userRole: this.currentUser.role,
      action: 'DELETE_ENDPOINT',
      target: ep.hostname,
      targetId: id,
      previousValue: `Endpoint removed from inventory`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    return true;
  }

  public reanalyzeEndpoint(id: string): Endpoint | undefined {
    const ep = this.endpoints.get(id);
    if (!ep) return undefined;

    const expiryEval = evaluateExpiry(ep.certificate.validUntil, this.policy, DEMO_REFERENCE_DATE);
    const cipherEval = evaluateCipher(ep.cipher.tlsVersion, ep.cipher.cipherSuite, this.policy);
    const riskResult = calculateRisk(ep.hostname, ep.environment, ep.certificate.keySize, expiryEval, cipherEval, this.policy);

    // Update endpoint state
    ep.certificate.daysRemaining = expiryEval.daysRemaining;
    ep.certificate.status = expiryEval.status;
    ep.cipher = {
      tlsVersion: ep.cipher.tlsVersion,
      cipherSuite: ep.cipher.cipherSuite,
      cipherStrength: cipherEval.cipherStrength,
      forwardSecrecy: cipherEval.forwardSecrecy,
      keyExchange: cipherEval.keyExchange,
      authentication: cipherEval.authentication,
      encryption: cipherEval.encryption,
      integrity: cipherEval.integrity,
      status: cipherEval.status,
      matchedRule: cipherEval.matchedRule,
      explanation: cipherEval.explanation,
    };
    ep.risk = riskResult.riskAssessment;
    ep.lastChecked = new Date().toISOString();

    // Re-evaluate findings
    // Clear old findings for this endpoint
    for (const [fId, f] of this.findings.entries()) {
      if (f.endpointId === id) {
        this.findings.delete(fId);
      }
    }

    for (const f of riskResult.findingsToGenerate) {
      const fId = `fnd_${id}_${f.type.toLowerCase()}`;
      const finding: Finding = {
        id: fId,
        endpointId: id,
        hostname: ep.hostname,
        environment: ep.environment,
        findingType: f.type,
        title: f.title,
        severity: f.severity,
        riskScore: f.riskScore,
        priority: f.priority,
        detectedAt: ep.lastChecked,
        status: 'Open',
        assignedTo: ep.owner,
        evidence: f.evidence,
        recommendation: f.recommendation,
        statusHistory: [
          {
            status: 'Open',
            timestamp: ep.lastChecked,
            user: 'Automated Inspector Engine',
            note: 'Endpoint re-analysis completed',
          },
        ],
      };
      this.findings.set(fId, finding);

      if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
        const altId = `alt_${fId}`;
        this.alerts.set(altId, {
          id: altId,
          findingId: fId,
          endpointId: id,
          hostname: ep.hostname,
          environment: ep.environment,
          severity: f.severity,
          title: f.title,
          message: f.evidence.explanation,
          triggeredAt: ep.lastChecked,
          status: 'Open',
          channel: 'IN_APP',
        });
      }
    }

    this.endpoints.set(id, ep);

    this.addAuditLog({
      user: this.currentUser.email,
      userRole: this.currentUser.role,
      action: 'REANALYZE_ENDPOINT',
      target: ep.hostname,
      targetId: id,
      newValue: `Score: ${ep.risk.riskScore}/100, Severity: ${ep.risk.severity}, Priority: ${ep.risk.priority}`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    return ep;
  }

  // Live Simulation / What-If Engine (Key requirement 19, 20 & 34)
  public applySimulation(params: {
    endpointId: string;
    daysRemaining?: number;
    cipherSuite?: string;
    tlsVersion?: string;
    environment?: Environment;
    notes?: string;
  }): { endpoint: Endpoint; generatedAlerts: Alert[]; newFindings: Finding[] } {
    const ep = this.endpoints.get(params.endpointId);
    if (!ep) throw new Error(`Endpoint with ID ${params.endpointId} not found`);

    const prevRisk = `${ep.risk.severity} (${ep.risk.riskScore} pts, Priority ${ep.risk.priority})`;
    const prevDays = ep.certificate.daysRemaining;
    const prevCipher = `${ep.cipher.tlsVersion} / ${ep.cipher.cipherSuite}`;

    // Apply simulation changes
    if (params.daysRemaining !== undefined) {
      ep.certificate.daysRemaining = params.daysRemaining;
      ep.certificate.validUntil = this.addDaysToDemoDate(params.daysRemaining);
    }

    if (params.cipherSuite !== undefined) {
      ep.cipher.cipherSuite = params.cipherSuite;
    }

    if (params.tlsVersion !== undefined) {
      ep.cipher.tlsVersion = params.tlsVersion;
    }

    if (params.environment !== undefined) {
      ep.environment = params.environment;
    }

    // Append lifecycle simulation event
    ep.lifecycle.push({
      id: `evt_sim_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      title: 'Simulation Applied',
      description: `What-If scenario modified: Expiry ${prevDays}d → ${ep.certificate.daysRemaining}d, Cipher: ${ep.cipher.cipherSuite}`,
      type: 'CONFIG_CHANGED',
    });

    // Re-run complete risk pipeline
    const updated = this.reanalyzeEndpoint(params.endpointId)!;

    const generatedAlerts = Array.from(this.alerts.values()).filter((a) => a.endpointId === params.endpointId);
    const newFindings = Array.from(this.findings.values()).filter((f) => f.endpointId === params.endpointId);

    this.addAuditLog({
      user: this.currentUser.email,
      userRole: this.currentUser.role,
      action: 'APPLY_SIMULATION',
      target: ep.hostname,
      targetId: ep.id,
      previousValue: `Risk: ${prevRisk}, Expiry: ${prevDays}d, Cipher: ${prevCipher}`,
      newValue: `Risk: ${updated.risk.severity} (${updated.risk.riskScore} pts, Priority ${updated.risk.priority}), Expiry: ${updated.certificate.daysRemaining}d, Cipher: ${updated.cipher.cipherSuite}`,
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    });

    return {
      endpoint: updated,
      generatedAlerts,
      newFindings,
    };
  }

  public getDashboardSummary() {
    const endpoints = this.getEndpoints();
    const findings = Array.from(this.findings.values());
    const openAlerts = Array.from(this.alerts.values()).filter((a) => a.status === 'Open');

    let totalEndpoints = endpoints.length;
    let healthyCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let criticalFindingsCount = 0;
    let highFindingsCount = 0;
    let weakCipherFindingsCount = 0;

    for (const ep of endpoints) {
      if (ep.certificate.daysRemaining <= 0) {
        expiredCount++;
      } else if (ep.certificate.daysRemaining <= this.policy.expiryThresholds.mediumDays) {
        expiringSoonCount++;
      }

      if (ep.risk.severity === 'HEALTHY') {
        healthyCount++;
      }
    }

    for (const f of findings) {
      if (f.status !== 'Resolved' && f.status !== 'Ignored') {
        if (f.severity === 'CRITICAL') criticalFindingsCount++;
        if (f.severity === 'HIGH') highFindingsCount++;
        if (f.findingType === 'WEAK_CIPHER' || f.findingType === 'DEPRECATED_TLS') {
          weakCipherFindingsCount++;
        }
      }
    }

    return {
      totalEndpoints,
      healthy: healthyCount,
      expiringSoon: expiringSoonCount,
      expired: expiredCount,
      criticalFindings: criticalFindingsCount,
      highFindings: highFindingsCount,
      weakCipherFindings: weakCipherFindingsCount,
      openAlerts: openAlerts.length,
    };
  }

  public getDashboardCharts() {
    const endpoints = this.getEndpoints();
    const findings = Array.from(this.findings.values());

    // 1. Risk Distribution
    const riskCounts = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
      Healthy: 0,
    };

    for (const ep of endpoints) {
      if (ep.risk.severity === 'CRITICAL') riskCounts.Critical++;
      else if (ep.risk.severity === 'HIGH') riskCounts.High++;
      else if (ep.risk.severity === 'MEDIUM') riskCounts.Medium++;
      else if (ep.risk.severity === 'LOW') riskCounts.Low++;
      else riskCounts.Healthy++;
    }

    // 2. Expiry Timeline Buckets
    const expiryBuckets = {
      'Expired': 0,
      '0–7 days': 0,
      '8–14 days': 0,
      '15–30 days': 0,
      '31–90 days': 0,
      '90+ days': 0,
    };

    for (const ep of endpoints) {
      const d = ep.certificate.daysRemaining;
      if (d <= 0) expiryBuckets['Expired']++;
      else if (d <= 7) expiryBuckets['0–7 days']++;
      else if (d <= 14) expiryBuckets['8–14 days']++;
      else if (d <= 30) expiryBuckets['15–30 days']++;
      else if (d <= 90) expiryBuckets['31–90 days']++;
      else expiryBuckets['90+ days']++;
    }

    // 3. Cipher Security Distribution
    const cipherDistribution = {
      Strong: 0,
      Acceptable: 0,
      Weak: 0,
      Critical: 0,
      Unknown: 0,
    };

    for (const ep of endpoints) {
      if (ep.cipher.status === 'STRONG') cipherDistribution.Strong++;
      else if (ep.cipher.status === 'ACCEPTABLE') cipherDistribution.Acceptable++;
      else if (ep.cipher.status === 'WEAK') cipherDistribution.Weak++;
      else if (ep.cipher.status === 'CRITICAL') cipherDistribution.Critical++;
      else cipherDistribution.Unknown++;
    }

    // 4. Top Risky Endpoints
    const topRiskyEndpoints = [...endpoints]
      .sort((a, b) => b.risk.riskScore - a.risk.riskScore)
      .slice(0, 5)
      .map((ep) => ({
        id: ep.id,
        hostname: ep.hostname,
        environment: ep.environment,
        daysRemaining: ep.certificate.daysRemaining,
        cipherStatus: ep.cipher.status,
        riskScore: ep.risk.riskScore,
        severity: ep.risk.severity,
        priority: ep.risk.priority,
      }));

    // 5. Findings Detected Over Time
    const findingsTimeline = [
      { date: 'Sep 27', critical: 1, high: 2, medium: 3 },
      { date: 'Sep 28', critical: 1, high: 3, medium: 4 },
      { date: 'Sep 29', critical: 2, high: 3, medium: 4 },
      { date: 'Sep 30', critical: 2, high: 4, medium: 5 },
      { date: 'Oct 01', critical: 3, high: 4, medium: 6 },
      { date: 'Oct 02', critical: 4, high: 5, medium: 6 },
      { date: 'Oct 03 (Today)', critical: riskCounts.Critical, high: riskCounts.High, medium: riskCounts.Medium },
    ];

    return {
      riskDistribution: [
        { name: 'Critical', value: riskCounts.Critical, color: '#EF4444' },
        { name: 'High', value: riskCounts.High, color: '#F97316' },
        { name: 'Medium', value: riskCounts.Medium, color: '#EAB308' },
        { name: 'Low', value: riskCounts.Low, color: '#3B82F6' },
        { name: 'Healthy', value: riskCounts.Healthy, color: '#10B981' },
      ],
      expiryTimeline: Object.entries(expiryBuckets).map(([bucket, count]) => ({
        bucket,
        count,
      })),
      cipherDistribution: [
        { name: 'Strong', count: cipherDistribution.Strong, fill: '#10B981' },
        { name: 'Acceptable', count: cipherDistribution.Acceptable, fill: '#3B82F6' },
        { name: 'Weak', count: cipherDistribution.Weak, fill: '#F97316' },
        { name: 'Critical', count: cipherDistribution.Critical, fill: '#EF4444' },
      ],
      topRiskyEndpoints,
      findingsTimeline,
    };
  }

  public getRecommendations(): RecommendationItem[] {
    const findings = Array.from(this.findings.values());
    const recommendations: RecommendationItem[] = [];

    for (const f of findings) {
      if (f.status === 'Resolved' || f.status === 'Ignored') continue;

      let category: RecommendationItem['category'] = 'Configuration Improvements';
      if (f.priority === 'P0') {
        category = 'Immediate Actions';
      } else if (f.priority === 'P1') {
        category = 'Upcoming Actions';
      }

      recommendations.push({
        id: `rec_${f.id}`,
        endpointId: f.endpointId,
        hostname: f.hostname,
        environment: f.environment,
        priority: f.priority,
        severity: f.severity,
        category,
        issue: `${f.title} (${f.evidence.observedValue})`,
        recommendation: f.recommendation.summary,
        steps: f.recommendation.actionSteps,
        commandSnippet: f.recommendation.remediationCommand,
        status: f.status === 'In Progress' ? 'In Progress' : 'Pending',
      });
    }

    return recommendations.sort((a, b) => {
      const pOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return pOrder[a.priority] - pOrder[b.priority];
    });
  }

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const log: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.auditLogs.unshift(log);
  }
}

export const db = new DatabaseStore();
