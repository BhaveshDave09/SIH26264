# AICTE Sentinel — Integrated Cross-Bureau Complaint & Coordination Dashboard

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-orange.svg)](https://sih.gov.in)
[![Problem Statement ID](https://img.shields.io/badge/Problem%20Statement%20ID-26264-blue.svg)](https://sih.gov.in)
[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tests](https://img.shields.io/badge/Tests-15%2F15%20Passing-brightgreen.svg)](#automated-testing)

> **Smart India Hackathon 2026 — Problem Statement ID 26264**  
> **Title:** *Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells.*

---

## 1. Executive Summary & Problem Context

The All India Council for Technical Education (AICTE) receives complaints and statutory submissions regarding thousands of technical institutions across India from students, faculty, whistleblowers, and institutional management. Today, multiple autonomous Bureaus and Cells process these matters independently:
- **Regulation Bureau (RB):** Handles regulatory non-compliance, unauthorized fee hikes, unapproved courses, and punitive inspection proceedings.
- **Public Grievance Redressal Cell (PGRC):** Investigates student complaints regarding faculty harassment, arbitrary degree withholding, and hostel grievances.
- **Approval Bureau (AB):** Oversees annual Extension of Approval (EoA), seat matrix revisions, and statutory affiliation status.
- **Finance Bureau (FB):** Monitors PMSSS scholarships, faculty salary discrepancies, and misuse of Central grants.

### The Operational Challenge
When these bodies operate in informational silos without an integrated intelligence layer:
1. **Duplicate Inquiries:** Multiple inquiry committees are dispatched to the same campus simultaneously for related matters.
2. **Action Conflicts:** The Approval Bureau may grant an Extension of Approval or seat increase to an institution at the exact time the Regulation Bureau is executing punitive withdrawal procedures.
3. **Escalation Delays:** Stakeholder complaints sit in unmonitored queues with no cross-bureau visibility into who currently holds the primary file.
4. **Lack of Institutional Memory:** Case officers lack an instant 360-degree timeline of past violations and ongoing disputes when opening a newly lodged grievance.

### The AICTE Sentinel Solution
**AICTE Sentinel** is an enterprise-grade full-stack platform providing real-time cross-bureau visibility, an explainable **Cross-Bureau Case Intelligence Engine**, an **Inter-Bureau Coordination Center**, automated **SLA & Escalation tracking**, and a **Tamper-Evident SHA-256 Hash-Linked Audit Ledger**. 

Crucially, **AICTE Sentinel assists human officials without autonomously issuing regulatory sanctions or altering judicial outcomes**.

---

## 2. Key Architecture & Features

```
                         AICTE SENTINEL ARCHITECTURE
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           React + TypeScript                           │
  │        Tailwind CSS v4 • TanStack Query • Lucide • Recharts            │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │ REST API (JSON)
  ┌───────────────────────────────────▼────────────────────────────────────┐
  │                            FastAPI Backend                             │
  │   ├── Role & Attribute Based Access Control (RBAC/ABAC)                │
  │   ├── Cross-Bureau Case Intelligence Engine (RapidFuzz + Multi-Signal) │
  │   ├── SLA Deadline & Auto-Escalation Engine                            │
  │   ├── Coordination Health Analytics Engine (Score 0-100)               │
  │   └── Cryptographic SHA-256 Hash-Linked Audit Ledger                   │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │ SQLAlchemy ORM
  ┌───────────────────────────────────▼────────────────────────────────────┐
  │                      SQLite Relational Database                        │
  │   Institutions • Cases • Relationships • Tasks • Audit • Notifications │
  └────────────────────────────────────────────────────────────────────────┘
```

### A. Cross-Bureau Case Intelligence Engine (Primary USP)
The engine correlates incoming complaints and existing cases across all bureaus using a transparent, multi-signal scoring model:
1. **Permanent Institution ID Match ($W = 0.50$):** Canonical AICTE Permanent ID exact match is the strongest signal linking two proceedings to the exact same physical campus.
2. **Normalized Name & Alias Matching ($W = 0.20$):** RapidFuzz token sort and token set ratios overcome typographical variations (e.g., *"Apex Inst of Tech"* vs *"Apex Institute of Technology"*).
3. **Category & Context Affinity ($W = 0.15$):** Correlates related complaint categories (e.g., *Fee Overcharging* vs *Financial Irregularities*).
4. **Complaint Text Token Jaccard Similarity ($W = 0.15$):** Evaluates shared linguistic markers, phrases, and evidence references.
5. **Action Conflict Detection (Automatic Boost + Flag):** Specifically detects situations where one bureau is pursuing punitive/regulatory action while another bureau handles grievance or approval actions.

**Classification Outcomes:**
- `POTENTIAL_DUPLICATE` (Score &ge; 0.85 with exact Permanent ID match)
- `ACTION_CONFLICT` (Cross-bureau regulatory inquiry concurrent with grievance/approval)
- `RELATED_CASE` (Shared institution with thematic overlap)
- `COORDINATION_RECOMMENDED` (General multi-bureau presence on the same campus)

### B. Institution 360° Profile
A consolidated master record for every institution featuring:
- AICTE Permanent ID, verified address, region, and aliases.
- Case breakdown by Bureau (RB, PGRC, Approval, Finance).
- Case status distribution (Pending, Under Process, Disposed, Overdue).
- Real-time **Cross-Bureau Overlap Alert Banners**.
- Historical case activity and related-case graph.

### C. Inter-Bureau Coordination Center
Officials do not rely on ad-hoc phone calls or lost paper memos. The platform provides:
- Formal **Coordination Tasks** with originating bureau, participating bureaus, owner assignment, priority, and strict due dates.
- Interactive inter-bureau update timeline with remarks and handoff tracking.
- Status workflow (`OPEN` &rarr; `ACCEPTED` &rarr; `IN_PROGRESS` &rarr; `WAITING_FOR_RESPONSE` &rarr; `RESOLVED`).

### D. SLA Monitoring & Auto-Escalation Engine
- Evaluates case age and time elapsed since last official action.
- Categorizes cases into **Normal**, **Approaching Deadline (&le; 7 days remaining)**, and **Overdue**.
- One-click or scheduled **SLA Auto-Escalation Cycle** that transitions overdue cases to `ESCALATED` and logs high-priority notifications for Bureau Heads.

### E. Tamper-Evident SHA-256 Hash-Linked Audit Ledger
Every sensitive action (case creation, bureau transfer, status update, overlap decision, escalation) is appended to a cryptographic hash chain:
$$\text{Block Hash} = \text{SHA-256}(\text{Previous Hash} + \text{Canonical JSON Payload})$$
- Built-in verification endpoint (`/api/v1/audit/verify`) mathematically verifies chain integrity.
- Interactive demonstration feature allows judges to **Simulate Tampering** (corrupting a past block) and witness the ledger immediately identify the exact compromised block ID, followed by a **Restore Chain** action.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | Enterprise web portal with full type safety |
| **Bundler & Tooling** | Vite 8.3 | High-velocity HMR and optimized production bundling |
| **Styling & Icons** | Tailwind CSS v4 + Lucide React | Clean, high-contrast, official government portal UI |
| **State & Data Fetching** | TanStack Query (React Query) | Cache management, optimistic UI, background polling |
| **Data Visualizations** | Recharts | Multi-bureau workload bars and monthly intake trends |
| **Backend Framework** | Python 3.11+ / FastAPI | High-performance asynchronous REST API |
| **Data Validation** | Pydantic V2 | Strict type enforcement for all request/response models |
| **ORM & Database** | SQLAlchemy 2.0 + SQLite | Relational database modeling with foreign keys |
| **Matching Algorithms** | RapidFuzz + Custom Intelligence | Fast C-optimized fuzzy string matching and multi-signal scoring |
| **Authentication & AuthZ** | PBKDF2-HMAC-SHA256 + PyJWT | Secure salted password hashing and role/bureau RBAC/ABAC |
| **Testing Suite** | Pytest | Comprehensive unit and integration test coverage |

---

## 4. Demo Accounts & Credentials

The database is pre-seeded with 6 role-specific personas for realistic role-based access demonstrations. 

> **Tip:** The Login Page includes convenient **1-Click Persona Quick-Buttons** to instantly authenticate without manual typing.

| Role | Username | Password | Bureau / Cell | Permitted Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Super Administrator** | `superadmin` | `Admin@123` | *All Bureaus* | Global system governance, user management, global oversight |
| **Regulation Bureau Head** | `rb_head` | `Bureau@123` | Regulation Bureau (RB) | Full authority over RB cases, inter-bureau coordination reviews |
| **PGRC Cell Head** | `pgrc_head` | `Bureau@123` | PGRC | Full authority over PGRC grievances and student complaints |
| **Bureau Officer** | `rb_officer` | `Officer@123` | Regulation Bureau (RB) | Case investigations, status updates, evidence attachment |
| **Regional Officer** | `ro_north` | `Regional@123` | Northern Region (RO) | Regional oversight and campus inspection coordination |
| **Management Viewer** | `mgmt_viewer` | `Viewer@123` | AICTE Executive Cell | Read-only executive analytics, report generation, audit viewing |

---

## 5. Quickstart & Windows Run Instructions

### Prerequisites
- **Python 3.11+** (Python 3.11, 3.12, or 3.13)
- **Node.js 18+** & `npm`
- Windows 10/11 (or macOS/Linux)

---

### Option 1: 1-Click Windows Launcher (Recommended)
Double-click `start_all.bat` in the project root:
```bat
start_all.bat
```
This script launches the backend on `http://127.0.0.1:8000` and the frontend on `http://127.0.0.1:5173` in separate command windows.

---

### Option 2: Step-by-Step Manual Startup

#### 1. Backend Setup
```bash
# In the repository root:
python -m pip install -r backend/requirements.txt

# Reset and seed database with 8 institutions, 25 cases, and audit chain:
python backend/app/seed/seed_data.py

# Start the FastAPI server:
python backend/run_backend.py
```
*Backend is accessible at:* `http://127.0.0.1:8000`  
*Interactive Swagger API Docs:* `http://127.0.0.1:8000/docs`

#### 2. Frontend Setup
```bash
# In a new terminal, navigate to frontend:
cd frontend

# Install node dependencies (if not already installed):
npm install

# Start the Vite development server:
npm run dev -- --host 127.0.0.1 --port 5173
```
*Frontend is accessible at:* `http://127.0.0.1:5173`

---

### Option 3: Resetting Demo Data
To restore the demonstration database back to its clean baseline at any point during testing:
```bash
# Option A: Run batch script
reseed_db.bat

# Option B: Run Python seeder
python backend/app/seed/seed_data.py
```

---

### Option 3: 1-Click Cloud Deployment (Render.com)

The repository includes a production-ready [`render.yaml`](render.yaml) Blueprint that deploys both the FastAPI backend and React frontend with zero manual configuration.

1. Sign up / Log in to [Render](https://render.com) with your GitHub account.
2. In the Render Dashboard, click **New +** &rarr; **Blueprint**.
3. Connect your repository: **`BhaveshDave09/SIH26264`**.
4. Render detects [`render.yaml`](render.yaml) and creates:
   - **`nivaranx-api`**: FastAPI Web Service (Python, SQLite, Uvicorn, Health checks).
   - **`nivaranx-ui`**: React Static Site (100% free hosting, auto-rewrites for SPA routing).
5. Click **Apply**. Within ~2 minutes, your live public URL will be active and ready to share with SIH evaluators!

---

## 6. SIH 2026 Judge Demonstration Script (Step-by-Step)


Follow this 10-step sequence to demonstrate the entire lifecycle of a cross-bureau conflict resolution:

### Step 1: Sign in with Persona Switcher
1. Navigate to `http://127.0.0.1:5173`.
2. Notice the modern, accessible Indian Government Portal styling.
3. Click the **Super Administrator** quick-login button, then click **Secure Sign In**.

### Step 2: Executive Dashboard & Coordination Health
1. Observe the live KPI cards: **Total Cases (25)**, **Pending (14)**, **Under Process (7)**, **Disposed (4)**, **Overdue (4)**, and **Cross-Bureau Alerts (3)**.
2. View the **Coordination Health Score (74/100)**: Quantifies cross-bureau friction based on unresolved inter-bureau tasks and overdue handoffs.
3. Review the interactive Recharts graphs: **Workload Distribution by Bureau** (RB, PGRC, Approval, Finance) and **Monthly Complaint Intake Trends**.

### Step 3: Institution 360° Profile
1. Click **Institutions** on the left sidebar.
2. Search for `"Apex"` and select **Apex Institute of Technology** (`1-1029384751`).
3. View the 360-degree profile showing:
   - Factual institutional metadata, regional affiliation, and known aliases.
   - Distinct cases filed across both Regulation Bureau and PGRC.
   - An active **Cross-Bureau Overlap Alert** banner warning officials of concurrent inquiries.

### Step 4: Primary USP — Overlap Intelligence
1. Click **Overlap Intelligence** on the left sidebar.
2. Review the detected candidate pairs:
   - **Case-001 (RB)**: Punitive inspection regarding unauthorized management quota fee extraction.
   - **Case-002 (PGRC)**: Student grievance regarding illegal withholding of original marksheets for non-payment of extra fees.
3. Note the transparent explanation:
   - Same Permanent Institution ID (`1-1029384751`) &rarr; 100% confidence.
   - Shared thematic category &rarr; Fee Irregularities.
   - **Action Conflict Detected**: Regulation Bureau punitive proceedings concurrent with student grievance redressal.

### Step 5: Official Review Decision Workflow
1. Click **Official Review Decision** on the Apex Institute overlap alert.
2. Select **Confirm Related**.
3. Enter review remarks: *"Confirmed related inter-bureau cases. Establishing joint task force between Regulation Bureau and PGRC."*
4. Ensure **Establish inter-bureau coordination task** is checked and click **Commit Official Decision**.
5. The relationship is permanently committed to both cases in persistent backend storage.

### Step 6: Inter-Bureau Coordination Center
1. Click **Coordination Center** on the sidebar.
2. Notice the newly established coordination task (`COORD-2026-003`).
3. Click the task to view participating bureaus (RB & PGRC), assignees, due dates, and post an inter-bureau coordination note.

### Step 7: Case Management & Audit Tracking
1. Click **All Cases** on the sidebar.
2. Filter cases by Bureau (`RB`) or Priority (`HIGH` / `URGENT`).
3. Open any case (e.g., `AICTE/RB/2026/001`).
4. Click **Update Status**, select `UNDER_PROCESS`, enter a mandatory action remark, and save.
5. Notice that the update instantly appears in the case timeline and records a new block in the cryptographic audit trail.

### Step 8: SLA & Auto-Escalation Engine
1. Click **SLA & Escalations** on the sidebar.
2. View cases segmented by deadline urgency (Overdue vs Approaching Deadline &le; 7 days).
3. Click **Trigger SLA Auto-Escalation Cycle**. The engine evaluates case ages and transitions overdue items to `ESCALATED`, logging system alerts.

### Step 9: Tamper-Evident SHA-256 Hash Chain Verification
1. Click **Audit Trail** on the sidebar.
2. Inspect the cryptographic hash ledger table showing Event IDs, Actors, Actions, Payloads, Previous Hashes, and Current Hashes.
3. Click **Verify Chain Integrity** &rarr; System verifies each block against $\text{SHA-256}(\text{prev\_hash} + \text{canonical\_payload})$ and reports **Valid Chain (0 errors)**.
4. Click **Simulate Tamper** &rarr; Artificially alters a historical database payload.
5. Click **Verify Chain Integrity** &rarr; Notice the ledger immediately catches the breach and pinpoints the exact compromised block ID!
6. Click **Restore Chain** &rarr; Restores the correct cryptographic state.

### Step 10: Reports & CSV Export
1. Click **Reports & Analytics** on the sidebar.
2. Filter reports by bureau, date range, or region.
3. Click **Export Filtered Cases CSV** to download a real-time CSV generated directly from backend database queries.

---

## 7. Automated Testing

The backend test suite covers authentication, role authorization, multi-signal intelligence, SLA calculations, dashboard aggregates, and cryptographic hash verification.

Run tests using Pytest:
```bash
python -m pytest backend/tests -v
```

### Test Suite Execution Output
```
backend/tests/test_api_endpoints.py::test_health_check_endpoint PASSED   [  6%]
backend/tests/test_api_endpoints.py::test_auth_login_success PASSED      [ 13%]
backend/tests/test_api_endpoints.py::test_auth_login_invalid_password_rejected PASSED [ 20%]
backend/tests/test_api_endpoints.py::test_get_dashboard_stats_authenticated PASSED [ 26%]
backend/tests/test_api_endpoints.py::test_institution_directory_and_360_profile PASSED [ 33%]
backend/tests/test_api_endpoints.py::test_audit_verify_api_endpoint PASSED [ 40%]
backend/tests/test_audit.py::test_audit_chain_validity PASSED            [ 46%]
backend/tests/test_audit.py::test_audit_chain_tamper_detection PASSED    [ 53%]
backend/tests/test_auth.py::test_password_hashing_and_verification PASSED [ 60%]
backend/tests/test_auth.py::test_jwt_token_creation_and_payload PASSED   [ 66%]
backend/tests/test_cases_and_sla.py::test_sla_evaluation PASSED          [ 73%]
backend/tests/test_cases_and_sla.py::test_dashboard_statistics_from_db PASSED [ 80%]
backend/tests/test_intelligence.py::test_text_similarity PASSED          [ 86%]
backend/tests/test_intelligence.py::test_category_affinity PASSED        [ 93%]
backend/tests/test_intelligence.py::test_case_pair_evaluation PASSED     [100%]

============================= 15 passed in 2.67s ==============================
```

---

## 8. API Specification

All backend endpoints are versioned under `/api/v1` and generate interactive OpenAPI documentation.

### Core Endpoints
- **Authentication**:
  - `POST /api/v1/auth/login`: Issue JWT token
  - `GET /api/v1/auth/me`: Current user session and permissions
- **Institutions**:
  - `GET /api/v1/institutions`: Paginated directory with search & filters
  - `GET /api/v1/institutions/{id}`: 360-degree institution profile
  - `POST /api/v1/institutions`: Register new institution
- **Cases**:
  - `GET /api/v1/cases`: Filter cases by bureau, status, priority, category, SLA
  - `POST /api/v1/cases`: Lodge new complaint / case
  - `GET /api/v1/cases/{id}`: Full case detail, timeline, and document metadata
  - `PATCH /api/v1/cases/{id}/status`: Update status with mandatory audit remark
  - `POST /api/v1/cases/{id}/transfer`: Inter-bureau transfer with justification
  - `POST /api/v1/cases/{id}/assign`: Assign case officer
- **Cross-Bureau Intelligence**:
  - `GET /api/v1/intelligence/candidates`: Scan database for overlapping cases
  - `POST /api/v1/intelligence/review`: Submit official review decision
  - `POST /api/v1/intelligence/scan-all`: Trigger full database scan
- **Coordination Center**:
  - `GET /api/v1/coordination/tasks`: List inter-bureau tasks
  - `POST /api/v1/coordination/tasks`: Create new coordination task
  - `POST /api/v1/coordination/tasks/{id}/updates`: Post inter-bureau update
- **SLA & Escalation**:
  - `GET /api/v1/sla/summary`: SLA counts and aging distribution
  - `POST /api/v1/sla/evaluate`: Trigger automated escalation sweep
- **Audit & Cryptographic Verification**:
  - `GET /api/v1/audit/trail`: Paginated cryptographic audit events
  - `GET /api/v1/audit/verify`: Verify hash chain integrity
  - `POST /api/v1/audit/simulate-tamper`: Demonstration tamper injection
  - `POST /api/v1/audit/restore-chain`: Demonstration chain restoration
- **Reports & Analytics**:
  - `GET /api/v1/reports/bureau-summary`: Bureau performance breakdown
  - `GET /api/v1/reports/export-cases-csv`: Streaming CSV export

---

## 9. Security, Governance & Production Limitations

### Security & Privacy Protections Built In
1. **Zero External Data Exfiltration:** The system runs completely locally without sending confidential complaints or institution details to external third-party AI APIs.
2. **Server-Enforced RBAC & ABAC:** Access controls are validated on every FastAPI route; frontend menu hiding is purely ergonomic and cannot bypass endpoint authorization.
3. **Canonical Serialization:** Audit hashes use deterministic JSON keys and UTC timestamps, eliminating hash mismatch due to formatting variance.

### Limitations of this Prototype & Production Roadmap
- **Fictional Data Only:** All institutions, complaints, and officer names included in this build are 100% fictional demonstrations for SIH 2026.
- **Identity Provider (IdP):** This prototype uses standalone PBKDF2/JWT authentication. In national production deployment, AICTE would integrate with **Parichay (National Single Sign-On)**, NIC LDAP, or Aadhaar-based DigiLocker verification.
- **Database Scaling:** The local prototype uses SQLite for instant portability without external database installation. In production, this drops in directly to **PostgreSQL** with read-replicas.
- **Hardware Security Module (HSM):** While the SHA-256 hash-chain guarantees internal tamper-evidence against casual tampering, an enterprise production deployment would anchor periodic checkpoint hashes to an external HSM or Government Blockchain ledger.

---

## 10. Summary for Evaluators

**AICTE Sentinel** fulfills every requirement of **SIH 2026 Problem Statement 26264**:
- Unified 360° visibility eliminates inter-bureau blind spots.
- Multi-signal case correlation catches duplicates and action conflicts with explainable reasoning.
- Human-in-the-loop coordination empowers officials rather than black-box AI decisions.
- Cryptographic audit trail guarantees accountability for every administrative action.
- 100% runnable out of the box with zero paid API dependencies.
