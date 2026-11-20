# Syncron - Smart Roster Management System
## Stage Demo & Live Walkthrough Guide

This document contains the step-by-step click-path for conducting a live demonstration of the **Syncron Smart Roster Management System**, built for the DataStraw AI Tech Internship assessment.

---

### Tech Stack & Architecture
- **Backend**: Node.js + Express + TypeScript, PostgreSQL, Prisma ORM, pure UTC scheduling engine in `/server/src/engine/`.
- **Frontend**: Vite + React + TypeScript, Tailwind CSS, TanStack Query, Recharts, Lucide Icons, pure date-fns.
- **Data Invariant**: Zero fake buttons, zero hardcoded numbers. Every statistic, shift, and conflict is computed live from the backend API.

---

### Prerequisites & Launching

#### 1. Database (PostgreSQL)
Ensure the PostgreSQL container is running on `localhost:5432`:
```powershell
docker start conflux-postgres
```

#### 2. Start the Backend API (Port 4000)
```powershell
cd server
npm run dev
```
Backend will start on `http://localhost:4000` with the API served at `http://localhost:4000/api`.

#### 3. Start the Frontend Application (Port 3000)
```powershell
cd client
npm run dev
```
Open `http://localhost:3000` in your web browser. It will automatically redirect to `/roster?month=12&year=2026`.

---

### Step-by-Step Stage Demo Click-Path

#### Phase 1: Monthly Roster Grid & Operational View (`/roster`)

1. **System Health & Date Context**:
   - Point out the top header: Month selector is on **December 2026**.
   - Note the **API Status: Online (Pure UTC)** indicator showing live backend connectivity.
   - If no roster has been generated yet, a clean empty state card prompts to generate December 2026.

2. **Generate Baseline Roster**:
   - Click the **"Generate Roster"** button in the controls header.
   - A confirmation dialog explains that the engine will evaluate all operating rules, working days, and approved leaves.
   - Click **"Generate Roster"**.
   - Within 1 second, a success toast notification appears: `"Generated schedule for 12/2026 with 18 conflict(s)"`.
   - The interactive 36-employee grid populates with 1,116 shifts (31 days).

3. **Explore the Employee Grid**:
   - Notice the **sticky header** with days 1–31 and weekday initials (weekends shaded).
   - Notice the **sticky employee column** with employee name, pod badge, and total working shift count (e.g. `22d`).
   - Hover over cells to see semantic badges:
     - `W` (Emerald) = Working shift with brand initials (e.g. `KO`, `ZS`, `BB`).
     - `OFF` (Slate) = Weekly off.
     - `LV` (Rose) = Approved leave.
     - `CO` (Amber) = Comp off.
     - `HD` (Sky) = Public holiday off.
     - `-` = Not scheduled.

4. **Filter Operations**:
   - Filter by **Pod**: Select `Pod Alpha - Core Commerce`. Observe the grid instantly filter to only Pod Alpha members.
   - Search for **"Vikram"**: Type `Vikram` in the search box to see Vikram Malhotra's multi-brand allocation across Veda Naturals and Desi Threads.
   - Click **"Reset Filters"**.

5. **Brand Operational SLA View**:
   - In the view switcher toggle, click **"Brand Operational View"**.
   - The view dynamically renders every `(Brand, Process)` pair against days 1–31 from `/api/rosters/:id/brand-view`.
   - Each cell shows `allocated / required` staffing with SLA health colors:
     - **Emerald (`OK`)**: Fully staffed to requirement.
     - **Orange (`PARTIAL`)**: Partial coverage (e.g., Indus Techworks Retention on Tuesdays with 1/2 staff).
     - **Rose (`GAP`)**: Zero staff (e.g., Kalyan Organics CS on Sundays, Zingy Spices Dec 7–9).

6. **Shift Detail Drawer & 422 Constraint Override**:
   - Switch back to **"Employee Grid"**.
   - Click on **Rohan Iyer**'s shift on **December 15, 2026** (marked `LV` for family wedding leave).
   - The **Shift Action Panel** drawer slides in from the right.
   - Point out the related conflict notice attached to this date.
   - In the dropdown, change Shift Status to `WORKING` and click **"Save Shift"**.
   - The backend engine rejects the mutation with a **422 Unprocessable Entity**.
   - The drawer displays an amber alert:
     > **Engine Constraint Violation [LEAVE_CONFLICT]**  
     > *Employee Rohan Iyer is on approved LEAVE (Family wedding). Use { override: true } to force.*
   - Point out the **"Override Anyway"** button.
   - Click **"Override Anyway"**. The backend accepts the explicit override, recalculates dependencies, and a toast reports: `"Shift updated successfully. 0 conflicts opened, 1 resolved"`.

---

#### Phase 2: Conflict Center & Algorithmic Replacements (`/conflicts`)

1. **Conflict Diagnostic Radar**:
   - Click **"Conflict Center"** in the sidebar navigation.
   - Point out the 4 KPI metric cards at the top:
     - **Total Open Issues** (18 baseline deliberate traps)
     - **Coverage Gaps (0 Staff)** (e.g., 4 Sunday gaps for Kalyan Organics, 3 leave gaps for Zingy Spices)
     - **Staff Shortages** (e.g., Indus Techworks Retention on Tuesdays)
     - **Multi-Brand Overlaps** (Vikram Malhotra Friday dual operating days)
   - Note the **Open Issues** vs **Resolved History** tabs with real-time count badges.

2. **Resolving a Sunday Coverage Gap (Trap T7)**:
   - Filter by Type: `COVERAGE_GAP`.
   - Click on the row for **Kalyan Organics • CS on Sunday, Dec 6, 2026** (`0 / 1 staff`).
   - The **Conflict Resolution Drawer** slides in from the right:
     - Displays full conflict diagnosis: *Sole assigned employee Aarav Sharma is on weekly off.*
     - Calls `/api/conflicts/:id/replacements` in real-time.
   - Point out the **Eligible Cross-Brand Replacements** section:
     - Qualified staff certified for CS across other brands are listed.
     - Ranked by **fairest workload distribution** (fewest working days in December so far).
     - Candidate #1 is badged as **"Fairest Match"**.
   - Click the **"Assign"** button next to Candidate #1 (e.g., *Gaurav Chopra* or *Yash Singhania*).
   - A success mutation toast appears: `"Replacement assigned successfully. 0 conflicts opened, 1 resolved"`.
   - The conflict disappears from the "Open Issues" tab and moves into the **"Resolved History"** tab with resolution timestamp.

---

#### Phase 3: Executive KPI Dashboard (`/dashboard`)

1. **Executive Metrics Overview**:
   - Click **"Dashboard"** in the sidebar.
   - Review live metrics:
     - **Coverage Rate %**: Shows live percentage of filled slots vs required slots (with color-coded progress bar).
     - **Open Conflicts**: Total unresolved issues.
     - **Active Staff**: 36 active team members.
     - **Client Brands**: 15 monitored brands.

2. **Analytics & Diagnostics**:
   - **Open Conflicts by Category**: Recharts horizontal bar chart breaking down issues into Coverage Gaps, Insufficient Staff, Overlaps, and Leave Conflicts.
   - **Brand Coverage Health Ranking**: Table sorted with lowest coverage SLAs at the top to direct management attention to vulnerable client accounts.
   - **Conflicts Needing Attention**: Quick-action card listing priority gaps with a 1-click **"Resolve"** link routing directly into the Conflict Center.

---

#### Phase 4: Team Governance & Pods (`/team`)

1. **Organizational Pods & Designated Leads**:
   - Click **"Team & Pods"** in the sidebar.
   - View all 5 pods: Alpha, Beta, Gamma, Delta, Epsilon.
   - Click **"Designate Lead"** on Pod Alpha.
   - In the modal, point out that only active members of Pod Alpha appear as selectable options (enforcing the strict relational rule). Select a member and save.

2. **Employee Availability & Dynamic Conflict Resync**:
   - In the employee directory table, search for **"Aarav Sharma"**.
   - Click the **"Availability"** button.
   - The Availability Drawer opens showing Aarav's weekly off (Sunday).
   - Click **"Add Rule / Leave"**:
     - Type: `LEAVE`
     - Status: `APPROVED`
     - Dates: `2026-12-10` to `2026-12-12`
     - Reason: `Annual medical checkup`
   - Click **"Add Availability"**.
   - Watch the mutation toast fire: the backend engine instantly detects that Aarav is the sole resource for Kalyan Organics and dynamically opens new `COVERAGE_GAP` conflicts on the December draft roster!

---

#### Phase 5: Brand Governance & Rules Editor (`/brands`)

1. **Operating Rules & SLA Editor**:
   - Click **"Brands & Operating Rules"** in the sidebar.
   - Point out the 3 sub-views: **Operating Rules & SLA**, **Assignment Matrix**, and **Public Holidays**.
   - On the Operating Rules tab, toggle the working day pills (Sun through Sat) for a brand or toggle **"Open on Holidays"**.
   - Adjust the **Min Staff** number and click **"Save Rule"**. Notice the toast reporting the draft conflict re-synchronization.

2. **Public Holidays**:
   - Switch to the **Public Holidays** tab to view the Nov–Dec 2026 holidays (Guru Nanak Jayanti, Christmas, New Year's Eve, etc.).

---

#### Phase 6: Safe Roster Publishing (`/roster`)

1. **Guard Against Unresolved Conflicts**:
   - Return to **"Monthly Roster"** (`/roster`).
   - Click the **"Publish Roster"** button in the header.
   - Because open conflicts remain, the **Publish Modal** halts the publication:
     > **Unresolved Conflicts Detected**  
     > *There are X open conflict(s) remaining in this roster.*
   - Point out that this prevents accidental release of understaffed schedules to client brands.

2. **Force Publish**:
   - Click **"Force Publish Anyway"**.
   - The roster transitions to **`PUBLISHED`** status (marked by the emerald badge).
   - Regenerate and entry edit controls lock into read-only mode, guaranteeing audit integrity.

---

### End of Stage Demo
This concludes the full demonstration of Syncron's enterprise-grade automated roster scheduling system.
