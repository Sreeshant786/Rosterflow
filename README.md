# RosterFlow — Smart Workforce & Operations Roster Management System

> **Datastraw AI + Tech Internship Assessment Solution**  
> An enterprise-grade, deterministic workforce scheduling platform designed for operations managers coordinating 30+ associates across multiple business pods, 15 D2C brands, and diverse operating calendars.

---

## 🌟 Executive Overview

In multi-brand operational environments, generating rosters is fundamentally a **constrained optimization and compliance challenge**, not a random assignment or visual layout problem. 

**RosterFlow** is built with a production-grade decoupled architecture:
- **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0, Pydantic, and SQLite (local dev) / PostgreSQL (production).
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, and Recharts.
- **Engines**: Deterministic Scheduling Engine, Multi-Dimensional Conflict Detection Engine, and Audit Trail Preserver.

---

## 🏗️ System Architecture & Database Design

### 1. Database Entity-Relationship Model (12 Core Models)

The relational schema decouples workforce availability, brand operating requirements, and scheduled roster states:

```
[ Pod ] 1 ──< [ Employee ] 1 ──< [ EmployeeAssignment ] >── 1 [ Brand ]
                  │                          │                     │
                  │                          │                     └──< [ OperatingRule ] >── 1 [ Process ]
                  ├──< [ EmployeeAvailability ]
                  ├──< [ LeaveRequest ]
                  └──< [ RosterEntry ] >── 1 [ Roster ] 1 ──< [ RosterChangeLog ]
```

#### Table Definitions:
1. **`employees`**: Associate identity (`employee_code`, `full_name`, `email`, `pod_id`, `designation`, `joining_date`, `preferred_weekly_off`, `max_consecutive_days`).
2. **`pods`**: Operational units (`pod_name`, `pod_lead_id`, `description`).
3. **`brands`**: Managed D2C brands (`brand_name`, `description`, `active_status`).
4. **`processes`**: Work streams: Customer Support (CS), Abandoned Cart Conversion (ACC), Retention, Non-Delivery Report (NDR), Other Operations.
5. **`employee_assignments`**: M:N mapping associating employees with brands and processes (`is_primary`, `assignment_status`).
6. **`operating_rules`**: Brand-process operational requirements (`operating_type`, `sunday_off`, `public_holiday_off`, `minimum_staff_required`, `applicable_days`, `shift_start`, `shift_end`).
7. **`employee_availabilities`**: Explicit availability overrides (`AVAILABLE`, `UNAVAILABLE`, `PREFERRED_OFF`).
8. **`leave_requests`**: Planned leaves & comp-offs (`PLANNED_LEAVE`, `CASUAL_LEAVE`, `COMP_OFF`, `approval_status`).
9. **`public_holidays`**: Official company/national holidays (`date`, `holiday_name`).
10. **`rosters`**: Monthly roster state (`month`, `year`, `status`: `Draft` | `Pending Approval` | `Published`, `published_at`, `published_by`).
11. **`roster_entries`**: Daily assigned shift state (`work_date`, `status`: `Working`, `Weekly Off`, `Public Holiday`, `Leave`, `Comp-Off`, `Unavailable`, `shift_start`, `shift_end`).
12. **`roster_changelogs`**: Immutable audit logs (`roster_id`, `employee_id`, `changed_date`, `old_status`, `new_status`, `reason`, `changed_by`, `created_at`).

---

## ⚙️ Deterministic Scheduling Engine

The scheduler (`app/services/scheduling_engine.py`) generates rosters **deterministically without LLM hallucinations or pseudo-randomness**.

### 1. Hard Constraints (Mandatory Coverage & Compliance)
1. **Approved Leave Exclusion**: Employees with approved leave or comp-off are never scheduled to work.
2. **Unavailability Respect**: Associates marked unavailable cannot be assigned.
3. **Overlapping Shift Prevention**: Maximum 1 working shift per employee per date.
4. **Skill & Process Mapping**: Employees can only be scheduled for brands and processes they are formally qualified for.
5. **Brand Operational Calendar**: Shifting adheres to brand operating type (`EVERYDAY`, `EVERYDAY_EXCEPT_HOLIDAYS`, `SUNDAYS_AND_HOLIDAYS_OFF`).
6. **Minimum Staffing Threshold**: Each open operational slot requires meeting `minimum_staff_required`.

### 2. Soft Constraints (Preferences & Fairness)
1. **Preferred Weekly Off**: Respecting preferred rest day (Sunday, Monday, Saturday) unless mandatory coverage dictates otherwise.
2. **Consecutive Days Cap**: Avoiding scheduling employees for more than 6 consecutive days without a rest day.
3. **Fair Monthly Workload Distribution**: Balancing total working shifts across peers in the same pod.
4. **Predictable Tie-Breaking**: Deterministic sorting by `(penalty_score, current_shifts, employee_id)` guarantees idempotent scheduling.

### 3. Allocation Strategy
1. Determine active operational slots for each day of the month based on brand rules.
2. **Most-Constrained-First Priority**: Operational slots with the fewest available eligible candidates (e.g. single-resource brands) are filled first.
3. Candidates are scored based on soft constraints. The top $N$ candidates are assigned `Working`.
4. Associates not assigned working shifts are categorized with explicit statuses: `Leave`, `Comp-Off`, `Unavailable`, `Public Holiday`, or `Weekly Off`.
5. Unfilled operational requirements are immediately passed to the Conflict Detection Engine.

---

## 🛡️ Multi-Dimensional Conflict Detection Engine

The validator (`app/services/conflict_engine.py`) runs:
1. **Post-generation**
2. **Post manual edit**
3. **On availability or leave updates**
4. **Pre-publication** (blocks publishing if `critical_count > 0`).

### Conflict Classification:
- **`CRITICAL`**: Missing coverage for mandatory brand operational hours, duplicate shifts, or shifts assigned during approved leave/unavailability. Blocks publication.
- **`WARNING`**: Violation of preferred weekly off or excessive consecutive days worked.
- **`INFO`**: Operational notes and backup assignments.

### Intelligent Backup Recommendation:
For any coverage gap or unavailability, the engine evaluates all active associates:
- Checks qualification for the target process.
- Verifies associate is not already scheduled on that date.
- Ranks candidates by suitability score (100% = same process, 80% = same pod, 60% = cross-pod available).
- Generates 1-click backup assignments for the manager.

---

## 💼 Single-Resource vs Multi-Resource Brand Dynamics

- **Single-Resource Brands (~80% of brands, e.g. Kalyan Organics, Zouk Lifestyle)**:
  - 1 dedicated associate handles customer operations.
  - Generates seamless coverage during normal operations.
  - **Failure Mode**: When that associate takes planned leave or emergency unavailability, the system identifies the gap and surfaces qualified backups.
- **Multi-Resource Brands (~20% of brands, e.g. Bombay Shaving Co., The Whole Truth, Wakefit Home)**:
  - 2 to 3 associates cover distinct processes (CS, ACC, NDR, Retention) or share high-volume customer support.
  - Roster coverage is validated independently per process.

---

## 🔄 The Mandatory Hiring Scenario (Walkthrough)

RosterFlow includes an interactive **Scenario Walkthrough** module (`/scenario`):

1. **Step 1 (Baseline)**: Generate the November 2026 roster. Kalyan Organics (single-resource brand) has full coverage via Arjun Patel (EMP005).
2. **Step 2 (Inject Unavailability)**: Mark Arjun Patel UNAVAILABLE on 14 Nov 2026.
3. **Validation & Detection**: The system catches the deficit (`MISSING_COVERAGE`), flags it as `CRITICAL`, and ranks eligible backups (e.g., Pooja Hegde).
4. **Step 3 (Manual Backup Assignment)**: Assign the recommended backup.
5. **Resolution & Audit**: Revalidation confirms 0 critical conflicts remain. The change is permanently recorded in `roster_changelogs`.

---

## 🚀 Getting Started & Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run database tests (15/15 test suite)
python -m pytest tests -v

# Start FastAPI development server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run frontend tests
npm run test:run  # or npx vitest run

# Build for production
npm run build

# Start frontend dev server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Production Deployment

Run the complete stack with PostgreSQL, Backend, and Frontend:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

---

## 📋 Comprehensive Assessment Answers

### 1. Database Relationships
Employees belong to Pods. Brands and Processes have an M:N relationship with Employees via `EmployeeAssignment`. Operating rules govern minimum staffing requirements independently per Brand and Process. Rosters contain daily `RosterEntry` records, and every edit writes an immutable `RosterChangeLog`.

### 2. Scheduling Algorithm
A deterministic greedy heuristic with constraint-satisfaction scoring. Operational slots are sorted by difficulty (fewest available resources first). Eligible candidates are scored by soft penalties and tie-broken by ID, guaranteeing reproducible output.

### 3. Hard vs Soft Constraints
Hard constraints (leaves, unavailabilities, shift conflicts, brand operating rules) can never be violated; any violation creates a CRITICAL conflict that blocks publication. Soft constraints (preferred rest days, consecutive shift streaks) are optimized via scoring penalties.

### 4. Single-Resource vs Multi-Resource Brands
Single-resource brands rely on a dedicated associate; an absence immediately flags a critical conflict requiring backup intervention. Multi-resource brands distribute processes across several staff, enabling parallel or shared coverage.

### 5. Handling Employee Unavailability
Recorded in `employee_availabilities`. The scheduling engine treats unavailability as a hard non-working constraint, generates an `Unavailable` entry, and searches for eligible replacements.

### 6. Handling Insufficient Staffing
If required staffing cannot be satisfied, the engine generates the best feasible draft, creates a `MISSING_COVERAGE` conflict, displays the expected vs actual count, and computes ranked backup candidates.

### 7. Automation vs Human Approval
- **Automated**: Schedule generation, calendar computation, conflict detection, backup candidate scoring, export formatting.
- **Human Approval Required**: Final roster publication, manual shift overrides, leave approvals, backup selection.

### 8. Scaling to 2x Employees & Brands (60+ Associates, 30+ Brands)
- SQLAlchemy indexes on `(work_date, employee_id)` and `(roster_id, brand_id, process_id)` ensure $O(1)$ lookups.
- Batch saving (`bulk_save_objects`) executes in $<100\text{ ms}$.
- For $10\times$ scaling, integer linear programming (e.g. Google OR-Tools) can replace the greedy solver without altering the REST API or UI.

### 9. What Would Be Improved with 1 Additional Development Week
1. **Shift Swapping Portal**: Allow associates to propose peer-to-peer shift swaps with pod lead approval workflows.
2. **Email/Slack Webhook Notifications**: Real-time alerts to managers when an approved leave triggers a coverage gap.
3. **Automated Backup Fallback Rules**: Optional automated assignment of the highest-ranked backup if an absence occurs within 24 hours of shift start.
