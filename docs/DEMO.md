# Syncron Smart Roster Management System — Demo Walkthrough Guide

## Core flow (use this for the video)

This continuous path demonstrates the full loop: baseline generation, dynamic conflict generation on leave creation, algorithmic replacement search, and conflict resolution back to baseline.

### 1. Generate December 2026 Roster
- Navigate to `http://localhost:3000/roster?month=12&year=2026`.
- Click **Generate Roster** (or **Regenerate Roster**).
- Confirm generation in the modal.
- Observe:
  - Total open conflicts: **34** (visible on the **Publish Roster** badge: 23 blocking errors, 11 soft warnings).
  - Shifts generated: **1,054** entries for 34 active employees across 31 days.
- Click **Dashboard** in the sidebar:
  - Coverage rate: **97.9%** (1,143 filled / 1,167 required slots).
  - Open issues: **34** (23 critical errors, 11 soft warnings).

### 2. Add Approved Leave for a Clean Single-Resource Brand
- Click **Team & Pods** in the sidebar (`/team`).
- In the search bar, type `Arjun Singh`.
  - Arjun Singh is the sole employee assigned to **Kashmir Looms** on the **CS** process (operating Monday through Saturday with zero baseline conflicts in December 2026).
- Click the **Availability** button on Arjun Singh's row to open the Availability Drawer.
- Click **Add Rule / Leave**.
- Configure the leave:
  - **Type**: `LEAVE`
  - **Status**: `APPROVED`
  - **Start Date**: `2026-12-08` (Tuesday, working day, non-holiday)
  - **End Date**: `2026-12-08`
  - **Reason**: `Personal family leave`
- Click **Add Availability**.
- Observe the toast notification:
  - Title: `"Availability record added"`
  - Message: `"1 conflict opened, 0 resolved"`
- Observe the **Change Impact Panel** displayed at the top of the drawer:
  - Summary chip: `1 Gap Created`.
  - Details: `2026-12-08 • Kashmir Looms | Process: CS | Staff: 1 → 0 / 1 req | Status: GAP`.
- Close the drawer.

### 3. Inspect New Coverage Gap in Conflict Center
- Navigate to **Conflict Center** in the sidebar (`/conflicts?month=12&year=2026`).
- Observe:
  - **Open Issues** tab badge has increased from 34 to **35** (+1).
  - **Critical Errors** counter increments to **24** (Soft Warnings remain 11).
- In the table, observe the new row:
  - **Brand & Process**: Kashmir Looms • CS
  - **Date**: Tuesday, Dec 8, 2026
  - **Conflict Type**: `COVERAGE_GAP` (Severity: `ERROR`)
  - **Staffing Level**: `0 / 1 staff`
  - **Diagnosis**: `Coverage gap: 0 of 1 required staff allocated for Kashmir Looms CS on 2026-12-08. Arjun Singh is unavailable (LEAVE: Personal family leave).`

### 4. Find and Assign an Eligible Replacement
- Click on the **Kashmir Looms CS** row to open the **Conflict Resolution Drawer**.
- The drawer calls `GET /api/conflicts/:id/replacements` and displays the ranked eligible candidates:
  1. **Siddharth Sen** (`siddharth.sen@datastraw.io`) — Pod Gamma | Primary: SpiceRoute Global | Month Shifts: 6 days | Badged: **Fairest Match** (#1)
- Click the **Assign** button next to **Siddharth Sen**.
- Observe the toast notification:
  - Title: `"Replacement assigned successfully"`
  - Message: `"0 conflicts opened, 1 resolved"`

### 5. Confirm Return to Baseline
- In the Conflict Center:
  - The **Open Issues** badge returns to **34** (23 critical errors, 11 soft warnings).
  - The **Resolved History** tab now shows the resolved Kashmir Looms conflict with a resolution timestamp and assigned replacement employee name.
- Click **Dashboard** in the sidebar:
  - Coverage rate returns to **97.9%** (1,143 / 1,167 slots).
  - Open issues returns to **34**.

---

## The 5 Operational Roster Views

Syncron provides 5 distinct operational perspectives accessible from the view switcher at the top of `/roster`:

### 1. Company View (`?view=company`)
- Complete matrix of all 34 employees across days 1–31.
- Clear status badges: `W` (Working), `WO` (Weekly Off), `LV` (Approved Leave), `CO` (Comp Off), `PH` (Public Holiday Off).
- Conflict badge indicators on cells with open issues.
- Quick search by employee name, filter by organizational pod, and pagination.

### 2. Pod View (`?view=pod`)
- Organizational grouping across all 5 pods:
  - **Pod Alpha - Core Commerce** (Lead: Aarav Sharma)
  - **Pod Beta - Growth Brands** (Lead: Swati Deshmukh)
  - **Pod Gamma - Enterprise & Retention** (Lead: Rohan Iyer)
  - **Pod Delta - High Volume Support** (Lead: Vikram Malhotra)
  - **Pod Epsilon - Operations & Logistics** (Lead: Divya Pillai)
- Displays pod lead badge, total member headcount, total monthly shifts worked, and individual member utilization.

### 3. Brand View (`?view=brand`)
- Operational SLA view displaying all 25 brands (20 single-resource, 5 multi-employee) and their assigned processes against days 1–31.
- Each cell displays `allocated / required` staff counts:
  - **Emerald (`OK`)**: Daily requirement fully satisfied.
  - **Amber (`PARTIAL`)**: Partial coverage (e.g. Indus Techworks Retention on Tuesdays with 1/2 staff).
  - **Rose (`GAP`)**: Zero coverage (e.g. Kalyan Organics CS on Sundays with 0/1 staff).

### 4. Process View (`?view=process`)
- Process-centric breakdown across all 6 core processes:
  - `CS` (Customer Support)
  - `ACC` (Account Management)
  - `NDR` (Non-Delivery Reports)
  - `Retention` (Customer Retention)
  - `Escalations` (High Priority Escalations)
  - `Catalog` (Catalog & Listing Operations)
- Displays total required daily headcount vs total allocated staff, with expandable brand-level drill-down.

### 5. Employee View (`?view=employee`)
- Individual monthly calendar timeline for any selected employee.
- Shows daily shift cards with brand and process badges, hours, and warning notes.
- Quick employee switcher dropdown in the toolbar.

---

## Soft Constraints (Employee Shift Preferences)

Syncron distinguishes between **hard constraints** (weekly off, approved leave, single-resource multi-process exclusivity) and **soft constraints** (employee preferred off days):

- **Engine Behavior**:
  - Evaluated during roster generation and validation.
  - When an employee is scheduled on their preferred off day, the engine generates a soft warning: `PREFERENCE_VIOLATION` with severity `WARNING`.
  - **Publish Invariant**: Soft warnings **never block publishing**. The Publish modal only halts on open `ERROR` conflicts.
- **UI Indication**:
  - Conflict Center displays separate KPI cards for **Critical Errors** (blocking) vs **Soft Warnings** (non-blocking).
  - Severity dropdown filter allows toggling between `All Severities`, `Errors (Blocking)`, and `Warnings (Soft)`.
  - Preference warnings are badged in amber with a heart icon and tooltip explaining that business needs override soft preferences.
- **Managing Preferences**:
  - Open `/team` -> Click **Availability** on any employee row.
  - Scroll to **Shift Preferences (Soft Constraints)** to view active preferred off days.
  - Add or remove preferred off days; draft rosters automatically re-sync without full regeneration.

---

## Real-Time Change Impact Analysis Panel

Whenever an operator creates or modifies an availability rule or coverage requirement:
- The backend evaluates the exact delta on active draft rosters:
  - Compares `allocatedBefore` vs `allocatedAfter` for every affected date, brand, and process.
  - Flags each slot as `STILL_COVERED`, `PARTIAL`, or `GAP`.
- The frontend renders an inline **Change Impact Panel**:
  - Total affected slots count.
  - Summary chips for created gaps, partial coverage, and preserved coverage.
  - Scrollable slot breakdown with remaining employee names and staffing count transitions.

---

## Configurability Controls

Syncron exposes full runtime control over business rules without touching code:

1. **Brand Operating Rules** (`/brands`):
   - Working days toggle (Sundays through Saturdays).
   - "Open on Public Holidays" toggle.
2. **Coverage Requirements & Overrides** (`/brands` -> Operating Rules):
   - Default minimum staffing per process.
   - Date-specific overrides (e.g. holiday staffing surges).
   - Weekday-specific overrides.
3. **Public Holiday Calendar** (`/brands` -> Public Holidays):
   - Add, edit, or delete statutory public holidays with active date picker.
4. **Pod Governance** (`/team`):
   - Designate and reassign pod leads with non-destructive validation.
