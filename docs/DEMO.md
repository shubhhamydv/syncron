# Demo Walkthrough Guide

## Core flow (use this for the video)

This continuous path demonstrates the full loop: baseline generation, dynamic conflict generation on leave creation, algorithmic replacement search, and conflict resolution back to baseline.

### 1. Generate December 2026 Roster
- Navigate to `http://localhost:3000/roster?month=12&year=2026`.
- Click **Generate Roster** (or **Regenerate Roster**).
- Confirm generation in the modal.
- Observe:
  - Total open conflicts: **18** (visible on the **Publish Roster** badge).
  - Shifts generated: **1,116** entries for 36 active employees.
- Click **Dashboard** in the sidebar:
  - Coverage rate: **97.6%** (759 filled / 778 required slots).
  - Open conflicts: **18**.

### 2. Add Approved Leave for a Clean Single-Resource Brand
- Click **Team & Pods** in the sidebar (`/team`).
- In the search bar, type `Neha Joshi`.
  - Neha Joshi is the sole employee assigned to **ChaiMakers** on the **CS** process (which has 0 baseline conflicts in December 2026).
- Click the **Availability** button on Neha Joshi's row to open the Availability Drawer.
- Click **Add Rule / Leave**.
- Configure the leave:
  - **Type**: `LEAVE`
  - **Status**: `APPROVED`
  - **Start Date**: `2026-12-01`
  - **End Date**: `2026-12-01`
  - **Reason**: `Family emergency`
- Click **Add Availability**.
- Observe the toast notification:
  - Title: `"Availability record added"`
  - Message: `"1 conflict opened, 0 resolved"`

### 3. Inspect New Coverage Gap in Conflict Center
- Navigate to **Conflict Center** (`/conflicts?month=12&year=2026`).
- Observe:
  - **Open Issues** tab badge has increased from 18 to **19**.
  - **Coverage Gaps (0 Staff)** counter increments by 1.
- In the table, observe the new row:
  - **Brand & Process**: ChaiMakers • CS
  - **Date**: Tuesday, Dec 1, 2026
  - **Conflict Type**: `COVERAGE_GAP`
  - **Staffing Level**: `0 / 1 staff`
  - **Diagnosis**: `Coverage gap: 0 of 1 required staff allocated for ChaiMakers CS on 2026-12-01. Neha Joshi is unavailable (LEAVE: Family emergency).`

### 4. Find and Assign an Eligible Replacement
- Click on the **ChaiMakers CS** row to open the **Conflict Resolution Drawer**.
- The drawer calls `GET /api/conflicts/:id/replacements` and displays 2 eligible candidates:
  1. **Kunal Shah** (`kunal.shah@datastraw.io`) — Primary: SpiceRoute Global | Month Shifts: 0 days | Badged: **Fairest Match** (#1)
  2. **Siddharth Sen** (`siddharth.sen@datastraw.io`) — Primary: SpiceRoute Global | Month Shifts: 0 days (#2)
- Click the **Assign** button next to **Kunal Shah**.
- Observe the toast notification:
  - Title: `"Replacement assigned successfully"`
  - Message: `"0 conflicts opened, 1 resolved"`

### 5. Confirm Return to Baseline
- In the Conflict Center:
  - The **Open Issues** badge returns to **18**.
  - The **Resolved History** tab now shows the resolved ChaiMakers conflict with a resolution timestamp.
- Click **Dashboard** in the sidebar:
  - Coverage rate returns to **97.6%** (759 / 778 slots).
  - Open conflicts returns to **18**.

---

## Secondary Features Walkthrough

### 1. Brand Operational SLA View
- Navigate to **Monthly Roster** (`/roster?month=12&year=2026`).
- Click the **Brand Operational View** toggle in the header.
- The view renders daily requirement rows `(Brand, Process)` against days 1–31:
  - Cells display `allocated / required` staff counts.
  - Emerald (`OK`): requirement satisfied.
  - Orange (`PARTIAL`): partial coverage (e.g. Indus Techworks Retention on Tuesdays with 1/2 staff).
  - Rose (`GAP`): zero coverage (e.g. Kalyan Organics CS on Sundays with 0/1 staff).

### 2. Manual Shift Editing & 422 Hard Constraint Override
- Switch back to the **Employee Grid** view.
- Locate **Rohan Iyer** on **December 15, 2026** (marked `LV` for approved leave).
- Click the cell to open the **Shift Action Panel**.
- Attempt to set Status to `WORKING` and click **Save Shift**.
- The server returns HTTP 422 with code `LEAVE_CONFLICT`:
  - `Employee Rohan Iyer is on approved LEAVE (Medical consultation (Trap 3: Combined with Sneha Nair Tue weekly-off)). Use { override: true } to force.`
- Click **Override Anyway**.
- The server accepts the explicit override with `{ override: true }`:
  - Toast notification reports: `"Shift updated successfully. 1 conflict opened, 1 resolved"`.
  - The old `COVERAGE_GAP` conflict for Indus Retention on 2026-12-15 is resolved.
  - A new `LEAVE_CONFLICT` is opened for Indus Retention on 2026-12-15 recording the leave violation.

### 3. Team Governance & Non-Destructive Lead Selection
- Navigate to **Team & Pods** (`/team`).
- Review the 5 organizational pods: Alpha, Beta, Gamma, Delta, Epsilon.
- Click **Designate Lead** on Pod Alpha:
  - The modal lists only active members belonging to Pod Alpha.
  - Select the current lead (**Aarav Sharma**) and click **Save Lead**.
  - Toast notification confirms: `"Pod Lead Updated: Designated lead for Pod Alpha - Core Commerce updated successfully."`

### 4. Operating Rules & Coverage Requirements Editor
- Navigate to **Brands & Operating Rules** (`/brands`).
- Review operating rules:
  - Working day toggle buttons (Sun 0 through Sat 6).
  - "Open on Holidays" checkbox.
  - "Min Staff" number input.
- Click the **Assignment Matrix** tab to view employee certifications per brand/process.
- Click the **Public Holidays** tab to view scheduled holidays for November–December 2026.

### 5. Safe Roster Publishing
- Navigate to **Monthly Roster** (`/roster?month=12&year=2026`).
- Click **Publish Roster**.
- The modal halts publication because 18 open conflicts exist:
  - `"Cannot publish roster with 18 open conflict(s). Review conflicts in the Conflict Center or force publish."`
- Click **Force Publish Anyway**:
  - Roster status transitions to **`PUBLISHED`**.
  - Generation and shift edit actions are locked to prevent unintended modifications.
