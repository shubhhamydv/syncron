# Syncron - Smart Roster Management System

> DataStraw AI Tech Internship Technical Assessment

---

## 1. Overview & Live Deployment

Syncron is a deterministic multi-brand roster scheduling engine and management dashboard. It models operational service level requirements across client brands, maps employee process qualifications and approved availability, calculates monthly shift rosters, and detects constraint conflicts.

- **Live Application**: `https://syncron-client.vercel.app` *(Placeholder)*
- **API Base URL**: `https://syncron-api.onrender.com` *(Placeholder)*
- **API Health**: `https://syncron-api.onrender.com/api/health`

---

## 2. Assessment Requirements Traceability

| Requirement | Description | Implementation Location |
| :--- | :--- | :--- |
| **Normalized Schema** | Relational schema modeling 11 core entities with indexes and unique constraints | [prisma/schema.prisma](file:///c:/Users/shubham%20yadav/Desktop/syncron/server/prisma/schema.prisma) |
| **Realistic Seed Data** | 36 employees across 5 pods, 15 brands (80% single-resource), 6 processes, 6 designed traps | [server/src/lib/seed.ts](file:///c:/Users/shubham%20yadav/Desktop/syncron/server/src/lib/seed.ts) |
| **Pure Scheduling Engine** | Deterministic generator with zero I/O, pure UTC dates, and scarce-resource allocation | [server/src/engine/generate.ts](file:///c:/Users/shubham%20yadav/Desktop/syncron/server/src/engine/generate.ts) |
| **Independent Validator** | Independent re-derivation of daily requirements to detect gaps, shortages, and overlaps | [server/src/engine/validate.ts](file:///c:/Users/shubham%20yadav/Desktop/syncron/server/src/engine/validate.ts) |
| **Algorithmic Replacements** | Cross-brand replacement candidate ranking based on fair workload distribution | [server/src/engine/replacements.ts](file:///c:/Users/shubham%20yadav/Desktop/syncron/server/src/engine/replacements.ts) |
| **REST API Layer** | Express + TypeScript API with Zod validation, error handling, and transactional sync | [server/src/routes/](file:///c:/Users/shubham%20yadav/Desktop/syncron/server/src/routes/), [server/src/controllers/](file:///c:/Users/shubham%20yadav/Desktop/syncron/server/src/controllers/) |
| **Conflict Synchronization** | Dynamic re-sync on availability/shift mutations returning `{ opened, resolved }` | [server/src/services/syncService.ts](file:///c:/Users/shubham%20yadav/Desktop/syncron/server/src/services/syncService.ts) |
| **Monthly Roster Grid** | Sticky table with employee rows, dates 1–31, status color palette, and detail panel | [client/src/pages/RosterPage.tsx](file:///c:/Users/shubham%20yadav/Desktop/syncron/client/src/pages/RosterPage.tsx) |
| **Brand Operational View** | `(Brand, Process)` matrix showing allocated/required with OK, PARTIAL, GAP statuses | [client/src/components/roster/BrandGridView.tsx](file:///c:/Users/shubham%20yadav/Desktop/syncron/client/src/components/roster/BrandGridView.tsx) |
| **Conflict Center** | Open/Resolved tabs, severity counters, audit logs, and 1-click replacement drawer | [client/src/pages/ConflictCenterPage.tsx](file:///c:/Users/shubham%20yadav/Desktop/syncron/client/src/pages/ConflictCenterPage.tsx) |
| **Executive Dashboard** | Real-time KPIs, Recharts conflict category bar chart, and SLA health rankings | [client/src/pages/DashboardPage.tsx](file:///c:/Users/shubham%20yadav/Desktop/syncron/client/src/pages/DashboardPage.tsx) |
| **Team & Pod Governance** | Pod lead selector (strictly members), employee CRUD, and availability drawer | [client/src/pages/TeamPage.tsx](file:///c:/Users/shubham%20yadav/Desktop/syncron/client/src/pages/TeamPage.tsx) |
| **Brand Governance & Rules** | Working days toggles (0–6), holiday operation switch, and minimum staff editor | [client/src/pages/BrandsPage.tsx](file:///c:/Users/shubham%20yadav/Desktop/syncron/client/src/pages/BrandsPage.tsx) |

---

## 3. Architecture & Data Model

### Data Model Diagram

```
+-------------------------------------------------------------------------+
|                               POD                                       |
|  id, name, leadEmployeeId (FK -> Employee)                              |
+------------------------------------+------------------------------------+
                                     | 1
                                     | has many
                                     | N
+------------------------------------+------------------------------------+
|                             EMPLOYEE                                    |
|  id, name, email (unique), podId (FK -> Pod), status (ACTIVE/INACTIVE)  |
+---------+--------------------------+-------------------------+----------+
          | 1                        | 1                       | 1
          | has many                 | has many                | has many
          | N                        | N                       | N
+---------v---------------+  +-------v---------------+  +------v----------+
|  EMPLOYEE_AVAILABILITY  |  |      ASSIGNMENT       |  |  ROSTER_ENTRY   |
|  type (WEEKLY_OFF,      |  |  employeeId, brandId, |  |  rosterId, empId|
|        LEAVE, COMP_OFF) |  |  processId            |  |  brandId, procId|
|  dayOfWeek (0-6)        |  |  Unique(emp,brand,proc|  |  date, status   |
|  startDate, endDate     |  +-------+---------------+  +--------+--------+
|  status (APPROVED/PEND) |          |                           |
+-------------------------+          | belongs to                | belongs to
                                     |                           |
+------------------------------------+---------------------------+--------+
|                               BRAND                                     |
|  id, name (unique), status (ACTIVE/INACTIVE)                            |
+---------+----------------------------------------------------+----------+
          | 1                                                  | 1
          | has many                                           | has many
          | N                                                  | N
+---------v---------------+                            +-------v----------+
|     OPERATING_RULE      |                            | COVERAGE_REQ     |
|  brandId, processId     |                            |  brandId, procId |
|  workingDays (Int[])    |                            |  minimumStaff    |
|  operatesOnHolidays     |                            |  date, dayOfWeek |
+-------------------------+                            +------------------+
```

### Why PostgreSQL
1. **Relational Invariants**: Relational integrity prevents orphaned records (e.g. `leadEmployeeId` referencing an employee who belongs to a different pod; shifts referencing invalid assignments).
2. **ACID Transactions**: Roster regeneration and conflict synchronization require multi-table atomic transactions (`deleteMany` + `createMany` + conflict state derivation) to avoid partial updates.
3. **Array Data Types**: PostgreSQL natively supports `Int[]` for operating days (`workingDays: [1, 2, 3, 4, 5, 6]`), avoiding artificial join tables for simple 0–6 weekday sets.

---

## 4. Scheduling Engine Logic

The scheduling engine ([server/src/engine/generate.ts](file:///c:/Users/shubham%20yadav/Desktop/syncron/server/src/engine/generate.ts)) operates in pure TypeScript without I/O, database access, or system clocks.

### Steps
1. **Date Resolution**: Iterates through every day of the month using UTC midnight comparisons.
2. **Requirement Resolution**: Evaluates `resolveDailyRequirements`:
   - Checks if the brand operates on that weekday (`workingDays.includes(dayOfWeek)`).
   - Checks if the day is a public holiday and whether the brand operates on holidays (`operatesOnPublicHolidays`).
   - Resolves target staff count using hierarchical override: `date-specific` > `weekday-specific` > `default`.
3. **Scarcity Ordering**: Sorts requirements so single-resource brands and processes with the fewest qualified employees are scheduled first.
4. **Candidate Filtering & Hard Constraints**:
   - Must be assigned to that process (`Assignment`).
   - Must not have approved unavailability (`WEEKLY_OFF`, `LEAVE`, `COMP_OFF`).
   - Must not already be scheduled as `WORKING` on any other brand on that date (max 1 shift per day).
5. **Soft Rule (Workload Balancing)**:
   - *Workload balancing is the only soft rule implemented.*
   - If multiple qualified candidates are eligible, the engine sorts candidates by fewest working days assigned in the current month so far.
   - If workload is tied, deterministic employee ID ordering breaks the tie.
6. **Off-Duty Stamping**: For days where an employee is not working:
   - `LEAVE` if on approved leave.
   - `COMP_OFF` if on approved comp-off.
   - `WEEKLY_OFF` if on recurring weekly off.
   - `HOLIDAY_OFF` if brand is closed due to a public holiday.
   - `NOT_SCHEDULED` if brand is closed on a regular non-operating day and employee has no other reason.

### Validator Independence
The validator ([server/src/engine/validate.ts](file:///c:/Users/shubham%20yadav/Desktop/syncron/server/src/engine/validate.ts)) does not read the output conflicts from the generator. It takes raw `EngineInput` and `RosterEntryDraft[]`, independently recalculates daily requirements, inspects each shift, and asserts invariants (e.g. no more than one conflict per requirement).

---

## 5. Assumptions & System Decisions

1. **One Shift Per Day**: An employee cannot work multiple shifts on the same calendar day, even across different brands. A second shift triggers an `OVERLAP` conflict.
2. **Inclusive Date Ranges**: All leave and comp-off `startDate` and `endDate` fields are inclusive (e.g. `2026-12-07` to `2026-12-09` counts as 3 full calendar days).
3. **Pending Availability**: Availability records with status `PENDING` are ignored by the scheduler and validator; only `APPROVED` records affect schedules.
4. **Holiday Scoping**: A brand operating calendar determines whether the brand opens on public holidays (`operatesOnPublicHolidays: boolean`). Regional holiday scoping is tracked for auditing, but brand operating calendars override regional variations.
5. **Brand Calendar vs Employee Availability**: Brand operating days and employee working days are separate concepts. An employee's designated weekly off (e.g. Sunday) does not close the brand if the brand operates 7 days.
6. **Replacement Eligibility**: A replacement candidate must be assigned to the required process on any brand, must not have approved leave or weekly off on that date, and must not already be working on that date.

---

## 6. Automated vs Human-Controlled Responsibilities

| Dimension | Automated (Engine) | Human-Controlled (Manager) |
| :--- | :--- | :--- |
| **Baseline Generation** | Calculates shift allocations and flags coverage gaps | Initiates generation and decides when to publish |
| **Constraint Enforcement** | Rejects unapproved double-booking and leave violations | Can explicitly override hard constraints with `{ override: true }` |
| **Conflict Replacement** | Ranks eligible cross-brand candidates by workload fairness | Clicks "Assign" to execute the replacement |
| **Publishing Lock** | Blocks publishing when open conflicts exist | Evaluates gaps and can execute `{ force: true }` publish |

---

## 7. Local Setup Instructions

### Prerequisites
- Node.js v18+ and npm
- Docker Desktop (or local PostgreSQL 14+ on port 5432)

### Step 1: Database Setup
Start a PostgreSQL container:
```powershell
docker run --name syncron-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16-alpine
```

### Step 2: Backend Configuration
```powershell
cd server
cp .env.example .env
npm install
npm run migrate:deploy
npm run seed
```

### Step 3: Frontend Configuration
```powershell
cd ../client
cp .env.example .env
npm install
```

### Step 4: Run Application
In terminal 1 (Backend):
```powershell
cd server
npm run dev
```
In terminal 2 (Frontend):
```powershell
cd client
npm run dev
```
Open `http://localhost:3000/roster?month=12&year=2026`.

---

## 8. Testing & Test Database Safety Requirement

### Test Database Safety Guard
All server integration tests and Playwright E2E tests include a safety guard ([server/src/lib/testDbSafety.ts](file:///c:/Users/shubham%20yadav/Desktop/syncron/server/src/lib/testDbSafety.ts)). The test runner refuses to execute unless the target database name ends in `_test`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/roster_db_test"
```
If executed against `roster_db` or a production database, the runner immediately terminates with an error.

### Running Engine & API Tests
```powershell
cd server
npm test
```
*Current test suite: 39 tests (16 engine unit tests + 23 REST API integration tests) across 2 test files.*

### Running End-to-End Playwright Tests
```powershell
cd client
npx playwright test
```
*Executes the complete core flow in headless Chromium against the isolated test database.*

---

## 9. Demo Reset API & CLI

To restore the demo data to its clean baseline without dropping the database:
- **CLI**:
  ```powershell
  cd server
  npm run reset:demo
  ```
- **API**:
  ```http
  POST /api/admin/reset-demo
  Header: x-admin-token: <ADMIN_TOKEN>
  ```
  Returns `403 Forbidden` if `ADMIN_TOKEN` is unset or if the token header is invalid.

---

## 10. Known Limitations

1. **Shift Times & Granularity**: Operates on whole calendar day granularity (`WORKING` or off-duty), not hourly shifts (e.g. 9 AM - 5 PM vs night shifts).
2. **Authentication & RBAC**: The application uses token verification for admin reset, but general user roles (employee vs supervisor vs admin) are not gated behind user login.
3. **Single Timezone**: Engine comparisons operate strictly on UTC dates (`YYYY-MM-DD`). Timezone offsets across geographies are not dynamically adjusted per employee.
4. **Regional Holiday Matching**: Public holidays apply globally across all brands operating on that date; regional jurisdiction matching is not filtered per employee location.

---

## 11. AI Tool Usage Disclosure

AI assistance (Antigravity agent) was used during development for:
- Drafting initial repetitive seed data fixtures.
- Generating boilerplate Express CRUD route wrappers and TypeScript interfaces.
- Formatting Markdown tables and documentation drafts.
- Root cause diagnosis of requirement deduplication behavior.

All engine scheduling logic, constraints, validator invariants, test assertions, and data integrity checks were implemented and verified through empirical test execution.

---

## 12. Tell Us How You Think (Placeholder)

```markdown
### Question 1: System Evolution Under 10x Scale (360 Employees, 150 Brands)
[Candidate's written response to be inserted here]

### Question 2: Trade-offs in Pure Function Engine vs. DB Stored Procedures
[Candidate's written response to be inserted here]

### Question 3: Handling Real-Time Shift Swaps & Peer Requests
[Candidate's written response to be inserted here]
```
