# CERTGUARD — Automated Certificate Lifecycle & Expiry Monitor
**Enterprise Cybersecurity Monitoring Platform for WEBX 2026**

> **Mandatory Scope & Safety Notice:**
> *"Monitoring is restricted to authorized and sandboxed endpoints. Zero unauthorized external or internet-wide scanning is performed."*

---

## 1. Project Overview & Problem Statement

**Problem Statement:**
Discover TLS/SSL endpoints, identify certificate expiry risk and weak ciphers, and present prioritized remediation information.

Modern distributed architectures often rely on hundreds of microservices, edge load balancers, and third-party gateways. Unmonitored X.509 certificate expirations cause catastrophic service outages, while legacy or misconfigured cipher suites expose organizations to data interception and compliance failures (PCI-DSS 4.0, NIST SP 800-52r2, RFC 8996).

**CERTGUARD** provides an end-to-end, production-grade cybersecurity solution implementing the complete lifecycle:
```text
AUTHORIZED ENDPOINT
       ↓
ENDPOINT INVENTORY
       ↓
CERTIFICATE INSPECTION (X.509)
       ↓
EXPIRY ANALYSIS
       ↓
CIPHER ANALYSIS (TLS/PFS)
       ↓
RISK ENGINE (Itemized Scoring)
       ↓
PRIORITY ENGINE (P0–P3)
       ↓
FINDINGS CENTER
       ↓
EVIDENCE & EXPLANATION PANEL
       ↓
REMEDIATION CENTER (Playbooks & CLI)
       ↓
ALERT CENTER (Triage & Acknowledgment)
       ↓
INTERACTIVE DASHBOARD & CHARTS
       ↓
AUDIT TRAIL & EXECUTIVE REPORTS
```

---

## 2. Full-Stack Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        React SPA Frontend                              │
│   · Dark SOC Theme (Plus Jakarta Sans + JetBrains Mono)                │
│   · KPI Cards, SVG Charts (Risk Donut, Expiry Timeline, Cipher Trends) │
│   · Interactive Evidence Drawer ("WHY IS THIS ENDPOINT CRITICAL?")     │
│   · Live What-If Simulator with Real-Time Recalculation                │
│   · One-Click Full Source Code (.ZIP) Download                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Express Full-Stack Server                       │
│  ┌──────────────────────┐  ┌────────────────────┐  ┌────────────────┐  │
│  │   Expiry Engine      │  │   Cipher Engine    │  │  Risk Engine   │  │
│  │  · Days remaining    │  │  · TLS 1.0–1.3     │  │  · Multipliers │  │
│  │  · Policy thresholds │  │  · PFS / AEAD / CBC│  │  · Severity    │  │
│  │  · SLA categorization│  │  · Sweet32 / RC4   │  │  · P0–P3 Rules │  │
│  └──────────────────────┘  └────────────────────┘  └────────────────┘  │
│                                   │                                    │
│  ┌────────────────────────────────▼─────────────────────────────────┐  │
│  │   Background Job Queue (Queued → Running → Completed / Failed)   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                   │                                    │
│  ┌────────────────────────────────▼─────────────────────────────────┐  │
│  │   In-Memory Relational Store with Complete Seed Data & Audit     │  │
│  │   (Endpoints, Certificates, Findings, Alerts, Recommendations)   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React icons, motion
- **Backend:** Node.js 22, Express, tsx
- **Cryptographic & Analysis Engines:**
  - Automated X.509 validity calculator
  - Handshake cipher suite evaluator (PFS, key exchange, encryption, integrity)
  - Multi-variable risk weighting engine
  - Job Queue engine with live progress
- **Testing:** Automated regression test suite (`tests/engine.test.ts`)
- **Deployment:** Multi-stage `Dockerfile`, `docker-compose.yml`

---

## 4. Transparent Risk Scoring Model

CertGuard enforces a **transparent, fully explainable scoring formula**:

$$\text{Final Risk Score} = \min(100, \text{Base Risk Points} \times \text{Environment Multiplier})$$

### Base Scoring Rules:
- **Expired Certificate ($\le 0$ days):** $+100\text{ points}$ (CRITICAL)
- **Critical Expiry ($\le 7$ days):** $+90\text{ points}$ (CRITICAL)
- **High Expiry ($\le 14$ days):** $+70\text{ points}$ (HIGH)
- **Medium Expiry ($\le 30$ days):** $+40\text{ points}$ (MEDIUM)
- **Low Expiry ($\le 90$ days):** $+10\text{ points}$ (LOW)
- **Prohibited / Sweet32 Cipher (3DES / RC4):** $+100\text{ points}$ (CRITICAL)
- **Deprecated TLS Protocol (TLS 1.0 / 1.1 / SSLv3):** $+70\text{ points}$ (HIGH)
- **Missing Forward Secrecy (Static RSA key exchange):** $+70\text{ points}$ (HIGH)
- **Legacy CBC Mode without AEAD:** $+20\text{ points}$ (ACCEPTABLE)
- **Weak RSA Key Length ($< 2048$ bits):** $+60\text{ points}$

### Environment Weight Multipliers:
- **Production:** $1.3\times$ (High business blast radius)
- **Staging:** $1.0\times$ (Pre-production baseline)
- **Development:** $0.8\times$ (Non-customer facing)
- **Sandbox:** $0.6\times$ (Test target)

### Priority Classification:
- **P0 – Immediate:** Active outage (Expired) OR critical production expiry ($\le 7$ days) OR active critical cipher exploit in production.
- **P1 – Urgent:** High expiry ($\le 14$ days) OR deprecated protocol in production.
- **P2 – Planned:** Medium warning ($\le 30$ days) OR legacy cipher hardening.
- **P3 – Informational:** Healthy long-lived certs ($> 90$ days).

---

## 5. Main 11-Step Hackathon Demo Walkthrough

Judges can verify the complete workflow directly in the running app:

1. **Step 1 — Review Dashboard:** Open the Dashboard to view real computed KPIs (25 endpoints, Healthy, Expiring Soon, Expired, Critical, High, Weak Ciphers, Open Alerts) and interactive SVG charts.
2. **Step 2 — Endpoint Inventory:** Go to **Endpoints** tab. Filter by Environment `Production` or Severity `Critical`. Select `payment.demo.local`.
3. **Step 3 — Inspect Certificate:** Click **Inspect** to see full X.509 metadata (Subject, CN, SANs, Issuer, SHA-256 fingerprint, 3-tier certificate chain validation, and lifecycle audit history).
4. **Step 4 — Trigger Analysis:** Click the refresh icon on any endpoint or **Scan Fleet** in top bar. Observe background job transitions from `Queued` $\to$ `Running` $\to$ `Completed`.
5. **Step 5 — Investigate Evidence:** Click **Findings** and choose `payment.demo.local`. Review the dedicated **"WHY IS THIS ENDPOINT CRITICAL?"** panel showing observed days, matched policy rule, risk point breakdown, and remediation CLI command.
6. **Step 6 — Open Simulation Mode:** Click **Simulation Mode** in the navigation header.
7. **Step 7 — Scenario 1 (Expiry Simulation):**
   - Select `payment.demo.local`
   - Adjust the days remaining slider from `30 days` down to `4 days`
   - Click **Apply Simulation**
   - Instantly observe: Risk transitions to **CRITICAL**, Priority escalates to **P0**, automated alert is dispatched, and dashboard KPIs recalculate!
8. **Step 8 — Scenario 2 (Cipher Simulation):**
   - In Simulation Mode, switch cipher suite from `TLS_AES_256_GCM_SHA384` to `TLS_RSA_WITH_3DES_EDE_CBC_SHA`
   - Click **Apply Simulation**
   - Observe: Cipher status transitions from **STRONG** to **WEAK**, Sweet32 vulnerability is flagged, and risk score escalates.
9. **Step 9 — Alert Operations:** Click **Alerts** tab. Observe the newly generated critical alert. Click **Acknowledge** or **Resolve**.
10. **Step 10 — Remediation Playbook:** Go to **Remediation** tab. View prioritized action steps and copy the tailored Certbot/Nginx CLI snippet.
11. **Step 11 — Export Reports & Source Code:** Go to **Reports** tab. Export as CSV or JSON, print PDF summary, or click **Download Source Code (.ZIP)** to download the complete standalone project archive.

---

## 6. Seeded Demo Users & RBAC

| Name | Role | Email | Permissions |
| :--- | :--- | :--- | :--- |
| **Alex Rivera** | Administrator | `alex.rivera@certguard.sec` | Full access, endpoint CRUD, policy customization, simulations, demo reset |
| **Sarah Chen** | Security Analyst | `sarah.chen@certguard.sec` | Inspect endpoints, triage findings, acknowledge alerts, view evidence, generate reports |

*Switch roles anytime via the top right user menu.*

---

## 7. REST API Documentation

### System & Dashboard
- `GET /api/dashboard/summary` — Computed fleet summary metrics
- `GET /api/dashboard/charts` — Distribution data for donut, timeline, and cipher charts
- `GET /api/download-zip` — Streams complete project source code in `.zip` format

### Endpoints
- `GET /api/endpoints` — Paginated endpoint inventory (supports `search`, `env`, `severity`, `status`, `sortBy`)
- `POST /api/endpoints` — Register authorized endpoint (requires `authorizedConfirmed: true`)
- `GET /api/endpoints/:id` — Get single endpoint details
- `PUT /api/endpoints/:id` — Update endpoint configuration
- `DELETE /api/endpoints/:id` — Delete endpoint (Admin only)
- `POST /api/endpoints/:id/analyze` — Trigger single endpoint inspection background job
- `POST /api/endpoints/analyze-all` — Queue continuous fleet scan background job
- `GET /api/endpoints/:id/certificate` — Detailed X.509 metadata, chain & lifecycle

### Findings & Evidence
- `GET /api/findings` — List security findings
- `GET /api/findings/:id` — Get finding by ID
- `PATCH /api/findings/:id` — Update status (`Open`, `Acknowledged`, `In Progress`, `Resolved`, `Ignored`) and audit note

### Alerts & Remediation
- `GET /api/alerts` — List alerts
- `PATCH /api/alerts/:id` — Update alert status
- `GET /api/recommendations` — Prioritized remediation action items

### Live Simulation
- `POST /api/simulations/apply` — Apply What-If parameters and re-evaluate downstream risk
- `POST /api/simulations/reset` — Restore initial 25-endpoint demo dataset

### Audit Logs & Policy
- `GET /api/audit-logs` — Immutable audit log trail
- `GET /api/policy` — Current security policy thresholds
- `PUT /api/policy` — Update security policy and recalculate fleet (Admin only)

---

## 8. Quick Start & Deployment

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Run automated backend engine tests
npm test

# 3. Start development server
npm run dev
# Server listening on http://localhost:3000
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build -d

# Check logs
docker-compose logs -f
```

---

## 9. Verification & Testing

Run the included automated test suite:
```bash
npm test
```
Verifies:
- 20 assertions covering expired detection, critical/high/medium thresholds, Sweet32 3DES cipher detection, RC4 stream bias, PFS enforcement, environment weighting math, and P0-P3 priority assignment.
