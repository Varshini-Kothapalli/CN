# Automated Network Connectivity Diagnosis and Failure Localization System

A full-stack, offline, evidence-based network diagnostic and failure localization web application designed for Computer Networks lab environments using **Cisco Packet Tracer**.

---

## 1. Project Objective & Core Concept

When troubleshooting simulated networks in Cisco Packet Tracer, students and engineers execute network commands such as `ping`, `tracert`, `show ip interface brief`, and `show ip route`. Identifying the exact root cause across multiple routers, switches, and subnets often requires tedious manual correlation.

This application acts as an **expert diagnostic advisor**:
1. You configure your network topology in Cisco Packet Tracer.
2. You run diagnostic commands inside Packet Tracer and enter the structured findings or paste the raw command outputs into this application.
3. The Python-based, rule-driven diagnostic engine analyzes the supplied evidence against the topology graph.
4. The system localizes the fault to specific links, interfaces, or router tables, assigning calibrated confidence ratings (High / Medium / Low).
5. After applying corrective action in Packet Tracer, you can run a follow-up test and perform **Comparative Recovery Verification** to verify recovery.

> **IMPORTANT NOTICE:** This application operates strictly offline as an evidence-based analyzer. It does **not** maintain a direct socket or API hook to Cisco Packet Tracer. All test evidence is manually provided by the user.

---

## 2. Technology Stack

- **Frontend**:
  - React 19 (Vite)
  - Vanilla CSS Modern Technical Dark Design System
  - Lucide React (Networking, device, and status iconography)
  - Recharts (Fault distribution analytics)
- **Backend**:
  - Python 3.10+
  - FastAPI (REST API endpoints)
  - Pydantic v2 (Validation & type schemas)
  - Pytest & HTTPX (Automated test suite)
- **Storage**:
  - Thread-safe, atomic JSON storage engine with temp-file swap (`backend/data/`)

---

## 3. Architecture & Directory Structure

```
CN cbp/
├── backend/
│   ├── main.py                  # FastAPI application & REST endpoints
│   ├── models.py                # Pydantic schemas (Networks, Devices, Reports, Rules)
│   ├── diagnostic_engine.py     # Rule pipeline, graph path finder & failure localization
│   ├── rules.py                 # Diagnostic Rules A through I
│   ├── parsers.py               # Cisco IOS CLI regex parsers (ping, traceroute, routes)
│   ├── report_service.py        # Before-and-after session comparison & recovery verifier
│   ├── storage.py               # Thread-safe atomic JSON file storage
│   ├── sample_data.py           # Pre-configured multi-router Cisco sample topology
│   ├── guide_data.py            # 11 Network troubleshooting knowledge base guides
│   ├── scenarios.py             # 8 Predefined Packet Tracer test scenarios
│   ├── requirements.txt         # Backend Python dependencies
│   ├── tests/
│   │   ├── test_diagnostic_engine.py  # Pytest suite covering all 8 required scenarios
│   │   └── integration_test.py        # End-to-end API integration verification script
│   └── data/
│       ├── networks.json        # Persisted network topologies
│       └── diagnostics.json     # Persisted diagnostic reports & session history
├── frontend/
│   ├── src/
│   │   ├── api.js               # REST API client
│   │   ├── App.jsx              # Main React application layout & tab state
│   │   ├── index.css            # Technical dark design system & print stylesheet
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Header navigation & engine status heartbeat
│   │   │   └── DisclaimerBanner.jsx # Manual collection notice banner
│   │   └── pages/
│   │       ├── Dashboard.jsx            # Real metrics, Recharts breakdown, recent runs
│   │       ├── NetworkConfig.jsx        # Topology preview, device/link CRUD, sample loader
│   │       ├── RunDiagnostics.jsx       # Diagnostic runner with 1-click scenario presets
│   │       ├── DiagnosticReportView.jsx # Detailed report, path diagram, Cisco actions, export
│   │       ├── DiagnosticHistory.jsx    # Session history & side-by-side comparison modal
│   │       └── TroubleshootingGuide.jsx # 11 Failure guides with copyable Cisco IOS commands
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 4. Prerequisites

- **Python**: Version 3.10 or higher
- **Node.js**: Version 18 or higher (with `npm`)
- **Cisco Packet Tracer** (Recommended for simulating networks)

---

## 5. Installation & Setup Instructions (Windows)

### Step 1: Open a Terminal in the Project Directory

```powershell
cd "c:\Users\varsh\OneDrive\Documents\CN cbp"
```

### Step 2: Install Backend Dependencies

```powershell
pip install -r backend/requirements.txt
```

### Step 3: Install Frontend Dependencies

```powershell
cd frontend
npm install
cd ..
```

---

## 6. Running the Application

### Option A: Start the Backend Server (Terminal 1)

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API will run at: `http://127.0.0.1:8000`*  
*Interactive Swagger docs available at: `http://127.0.0.1:8000/docs`*

### Option B: Start the Frontend Development Server (Terminal 2)

```powershell
cd frontend
npm run dev
```
*Frontend UI will open at: `http://localhost:5173`*

---

## 7. Running Automated Tests

Run the full automated test suite covering all 8 required network scenarios:

```powershell
python -m pytest backend/tests/test_diagnostic_engine.py -v
```

Run the end-to-end integration verification script:

```powershell
python backend/tests/integration_test.py
```

---

## 8. Sample Cisco Packet Tracer Topology

The application comes pre-loaded with a standard multi-router enterprise lab topology:

```
PC1 (192.168.10.10/24)
  │ [FastEthernet0]
  ▼
SW1 (Switch)
  │ [GigabitEthernet0/1]
  ▼
R1 (192.168.10.1/24 on G0/0)
  │ [Serial0/1/0: 10.0.12.1/30]
  ▼
R2 (Serial0/1/0: 10.0.12.2/30, Serial0/1/1: 10.0.23.1/30, G0/0: 192.168.20.1/24)
  ├── SW2 -> PC2 (192.168.20.10/24, GW: 192.168.20.1)
  │ [Serial0/1/1: 10.0.23.1/30]
  ▼
R3 (Serial0/1/0: 10.0.23.2/30, G0/0: 192.168.30.1/24)
  │ [GigabitEthernet0/0]
  ▼
SW3 (Switch)
  │ [FastEthernet0/1]
  ▼
Server1 (192.168.30.10/24, GW: 192.168.30.1)
```

### IP Addressing Table

| Device | Interface | IP Address | Subnet Mask | Default Gateway |
|---|---|---|---|---|
| **PC1** | FastEthernet0 | 192.168.10.10 | 255.255.255.0 | 192.168.10.1 |
| **R1** | GigabitEthernet0/0 | 192.168.10.1 | 255.255.255.0 | N/A |
| **R1** | Serial0/1/0 | 10.0.12.1 | 255.255.255.252 | N/A |
| **R2** | Serial0/1/0 | 10.0.12.2 | 255.255.255.252 | N/A |
| **R2** | Serial0/1/1 | 10.0.23.1 | 255.255.255.252 | N/A |
| **R2** | GigabitEthernet0/0 | 192.168.20.1 | 255.255.255.0 | N/A |
| **PC2** | FastEthernet0 | 192.168.20.10 | 255.255.255.0 | 192.168.20.1 |
| **R3** | Serial0/1/0 | 10.0.23.2 | 255.255.255.252 | N/A |
| **R3** | GigabitEthernet0/0 | 192.168.30.1 | 255.255.255.0 | N/A |
| **Server1** | FastEthernet0 | 192.168.30.10 | 255.255.255.0 | 192.168.30.1 |

---

## 9. How to Collect Diagnostic Evidence from Cisco Packet Tracer

| Objective | Device | Command | What to Look For |
|---|---|---|---|
| **Check Local Host IP** | PC1 / PC2 | `ipconfig /all` | Check IP, mask, and default gateway |
| **Test Local Gateway** | PC1 | `ping 192.168.10.1` | Reply vs Request timed out |
| **Trace Path Across WAN** | PC1 | `tracert 192.168.30.10` | Last responding hop IP before `* * *` |
| **Check Interface States** | R1 / R2 / R3 | `show ip interface brief` | `administratively down` vs `up` / `down` |
| **Check Routing Prefixes** | R1 / R2 / R3 | `show ip route` | Look for `S 192.168.30.0/24 via 10.0.12.2` |
| **Check Port Security & ACL** | R1 / R2 | `show access-lists` | Look for deny match counters |

---

## 10. The 8 Supported Diagnostic Test Scenarios

The web interface includes **1-click preset buttons** under **Run Diagnostics** for immediate testing of each scenario:

1. **Healthy End-to-End Network**:
   - PC1 pings Server1 (100% success). All hops respond.
   - Result: `HEALTHY` (High confidence).
2. **Incorrect Default Gateway on PC1**:
   - PC1 has gateway configured as `192.168.10.99`. Gateway ping fails.
   - Result: `FAULT DETECTED` (Rule A / Source Host Configuration Mismatch).
3. **Router Interface Administratively Down**:
   - R1 `Serial0/1/0` is shut down (`administratively down`).
   - Result: `FAULT DETECTED` (Rule C / Interface shutdown on communication path).
4. **Missing Static Route on R1**:
   - Route to `192.168.30.0/24` is absent from R1's routing table.
   - Result: `FAULT DETECTED` (Rule E / Missing Static Route to destination prefix).
5. **Inter-Router Link Failure (R2 to R3)**:
   - PC1 reaches R1 and R2; R3 fails.
   - Result: `FAULT DETECTED` (Failure region localized to R2-R3 Serial link segment).
6. **Destination Unreachable with No Additional Evidence**:
   - Ping fails, gateway is OK, but user supplied no router outputs.
   - Result: `POSSIBLE FAULT` (Rule F / Engine advises next commands rather than guessing).
7. **Contradictory Evidence**:
   - User inputs destination ping = PASS, but gateway ping = FAIL.
   - Result: `POSSIBLE FAULT` (Flags logical inconsistency and requests re-test).
8. **Comparative Recovery Verification**:
   - Compare a faulty session against a post-fix session in Diagnostic History.
   - Result: `RECOVERED` (Verified connectivity restoration).

---

## 11. Interpreting Diagnostic Reports

- **Status Categories**:
  - `HEALTHY`: All connectivity criteria passed without contradictions.
  - `FAULT DETECTED`: Specific evidence confirms an active fault (e.g., admin down, missing route, config mismatch).
  - `POSSIBLE FAULT`: Failure detected, but specific root cause requires hop-by-hop verification.
  - `INSUFFICIENT EVIDENCE`: Too few tests executed to isolate the issue.
- **Confidence Ratings**:
  - `High`: Specific command outputs (e.g., `show ip route` or `show ip int brief`) directly confirm the condition on the active path.
  - `Medium`: Test results narrow the fault to a segment or plausible set of causes.
  - `Low`: Minimal data provided or contradictory results detected.
- **Observations vs. Inferences**:
  - *Observation*: "PC1 ping to 192.168.30.10 timed out."
  - *Inference*: "R1 dropped the packet because the prefix 192.168.30.0/24 is absent from its routing table."

---

## 12. Current Limitations

- **Manual Data Entry**: In this version, diagnostic outputs must be manually entered or pasted into the form; there is no live Packet Tracer telemetry socket.
- **Static IPv4 Support**: Focused on IPv4 subnetting and static routing; dynamic protocols (OSPF, EIGRP) can be diagnosed based on their presence in `show ip route`.
- **Single-Path Graph Assumption**: Fault localization assumes standard point-to-point routing topologies without multi-path ECMP.
