# Syncron - Smart Roster Management System

> DataStraw AI Tech Internship Assessment - Production-Grade Roster Scheduling Engine & REST API

Syncron is an intelligent, automated workforce rostering and conflict resolution system built for multi-brand e-commerce and support operations. It features a normalized PostgreSQL schema, a pure TypeScript scheduling engine operating on fairness and scarcity heuristics, atomic differential conflict synchronization, and an Express REST API.

---

## 🏗️ Architecture Overview

The system is architected into three distinct, decoupled layers:

```
┌────────────────────────────────────────────────────────┐
│                   Express REST API                     │
│  Controllers, Zod Validation, Referential Integrity    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│              Pure TypeScript Engine                    │
│  Deterministic, Scarcity-First Allocation & Validator  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             PostgreSQL + Prisma ORM                    │
│  Normalized Schema, Idempotent Seed, Audit Conflicts   │
└────────────────────────────────────────────────────────┘
```

1. **Database Layer (Prisma + PostgreSQL)**: Normalized models decoupling brand operating calendars from employee availability, enforcing strict multi-column unique constraints and indexing.
2. **Pure Scheduling Engine (`/server/src/engine`)**: Zero I/O, zero database dependencies, pure UTC arithmetic. Implements scarcity-first allocation, fair shift distribution, independent double-check validation, and cross-brand replacement ranking.
3. **API & Change Handling Layer (`/server/src`)**: Express + TypeScript with Zod request validation, CORS, referential integrity guards (409), and differential conflict reconciliation (`syncConflicts`).

---

## 🚀 Tech Stack

* **Runtime**: Node.js (v20+)
* **Language**: TypeScript (v5.7+)
* **Database**: PostgreSQL 16+
* **ORM**: Prisma ORM (v5.22+)
* **Framework**: Express.js
* **Validation**: Zod (v3.x / v4.x)
* **Testing**: Vitest (Unit & Integration) + Supertest
* **Date Utilities**: date-fns (Pure UTC calculations)

---

## 📦 Getting Started

### 1. Prerequisites
* Node.js v20 or higher
* PostgreSQL running locally or in Docker:
  ```bash
  docker run --name syncron-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=roster_db -p 5432:5432 -d postgres:16-alpine
  ```

### 2. Environment Setup
Navigate to `/server` and configure environment variables:
```bash
cd server
cp .env.example .env
```

Ensure `.env` matches your database configuration:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/roster_db?schema=public"
PORT=4000
CLIENT_URL="http://localhost:3000"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Migrations & Idempotent Seed
```bash
npm run prisma:migrate
npm run prisma:seed
```

### 5. Start Development Server
```bash
npm run dev
```

---

## 🧪 Testing & Verification Scripts

The codebase comes equipped with automated suites verifying every invariant and business rule:

```bash
# Run all unit and API integration tests (35/35 passing)
npm test

# Verify seed invariants, relations, and test traps (16/16 checks)
npm run verify

# Verify December 2026 engine allocation, idempotency, and parity
npm run generate:december

# Run the live stage demonstration flow (end-to-end change simulation)
npm run demo
```

---

## 📡 Key REST API Endpoints

### Health & Analytics
* `GET /api/health` - Service health status
* `GET /api/dashboard?month=12&year=2026` - Executive KPI metrics (coverage %, required vs filled slots, conflict distribution)

### Roster Management
* `POST /api/rosters/generate` - Generates a monthly roster via the pure engine and persists draft records
* `GET /api/rosters` - Lists rosters with summary statistics
* `GET /api/rosters/:id` - Detailed roster summary
* `GET /api/rosters/:id/employee-view` - 31-day mapped grid view per active employee
* `GET /api/rosters/:id/brand-view` - Operational brand coverage status (`OK`, `GAP`, `PARTIAL`)
* `GET /api/rosters/:id/conflicts` - Filterable conflict audit log
* `POST /api/rosters/:id/publish` - Publishes draft roster (guards against open conflicts unless `{ force: true }`)

### Change Handling & Conflict Resolution
* `GET /api/conflicts/:id/replacements` - Finds eligible cross-brand replacements sorted by fewest working days
* `POST /api/conflicts/:id/assign` - Assigns replacement candidate and automatically marks conflict as `RESOLVED`
* `PATCH /api/roster-entries/:id` - Manual shift adjustments with hard constraint checks (`422` unless `{ override: true }`)
* `DELETE /api/roster-entries/:id` - Unassigns shift to `WEEKLY_OFF` and resyncs conflicts

---

## 🛡️ License

MIT License. Designed and built for the DataStraw AI Tech Internship assessment.
