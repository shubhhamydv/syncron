# Production Deployment Guide — Syncron

This guide details the deployment options for the Syncron Smart Roster Management System.

---

## Option 1: One-Click Cloud Deployment (Render Blueprint)

The repository includes a ready-to-use `render.yaml` blueprint that deploys:
1. Managed PostgreSQL database (`syncron-db`)
2. Node.js Express backend (`syncron-server`) with automatic schema migration and seed execution
3. Vite + React frontend static site (`syncron-client`) with SPA rewrites

### Steps:
1. Fork or push your code to your GitHub account (already at `https://github.com/shubhhamydv/syncron.git`).
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect the repository `syncron`.
5. Render will detect `render.yaml` and provision:
   - PostgreSQL instance
   - Server web service (Build: `npm ci && npm run build`, Start: `npm run migrate:deploy && npm run seed && npm start`)
   - Client static site (Build: `npm ci && npm run build`, Publish: `dist`)
6. Click **Apply**. Once built, the application is live with HTTPS enabled.

---

## Option 2: Split Cloud Deployment (Vercel + Render/Railway/Neon)

### A. Database (Neon or Supabase or Render Postgres)
1. Create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Copy the connection string (e.g. `postgresql://user:pass@host/dbname?sslmode=require`).

### B. Backend (Render or Railway)
1. In Render or Railway, create a new **Web Service** pointing to the `server/` directory.
2. Configure settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run migrate:deploy && npm run seed && npm start`
3. Environment Variables:
   - `DATABASE_URL`: Your database connection string
   - `NODE_ENV`: `production`
   - `PORT`: `4000` (or leave default for Railway/Render)
   - `CLIENT_URL`: Your frontend URL (e.g. `https://syncron-client.vercel.app`) or `*`
   - `ADMIN_TOKEN`: A secure random secret string

### C. Frontend (Vercel)
1. In [Vercel](https://vercel.com), import the `syncron` repository.
2. Select **Framework Preset**: `Vite`.
3. Set **Root Directory**: `client`.
4. Environment Variables:
   - `VITE_API_URL`: `https://<your-backend-domain>/api` (e.g. `https://syncron-server.onrender.com/api`)
5. Click **Deploy**. Vercel will build the frontend using `client/vercel.json` for SPA route handling.

---

## Option 3: Docker Compose (Local, Self-Hosted VPS, or AWS EC2)

The repository provides a complete containerized stack in `docker-compose.yml`.

### Prerequisites:
- Docker and Docker Compose installed (`docker compose version >= 2.0`)

### Quick Start:
```bash
# Clone the repository
git clone https://github.com/shubhhamydv/syncron.git
cd syncron

# Launch the entire stack (PostgreSQL + Express Server + Nginx Client)
docker compose up -d --build
```

### Access Services:
- **Web App**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000/api`
- **Health Check**: `http://localhost:4000/api/health`
- **PostgreSQL**: `localhost:5432` (User: `postgres`, Pass: `postgres`, DB: `roster_db`)

### Seeding Data in Docker:
```bash
# Run seed inside the running server container
docker compose exec server npm run seed

# Or trigger via admin reset endpoint
curl -X POST http://localhost:4000/api/admin/reset-demo \
  -H "Authorization: Bearer datastraw-eval-secret-token"
```

---

## Environment Variables Reference

### Backend (`server/.env`)
| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | HTTP port for Express | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/roster_db?schema=public` |
| `NODE_ENV` | Environment mode | `production` |
| `CLIENT_URL` | Allowed CORS origins (comma-separated or `*`) | `https://my-app.vercel.app` |
| `ADMIN_TOKEN` | Bearer token for protected management endpoints | `your-secret-token` |

### Frontend (`client/.env`)
| Variable | Description | Example / Default |
|---|---|---|
| `VITE_API_URL` | Base URL of backend REST API | `https://my-api.onrender.com/api` |
