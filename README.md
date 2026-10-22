# ParkEase

Smart Parking Management System

## Overview

ParkEase connects customers looking for parking with vendors who run parking lots. Customers search lots by name/area/city, see live slot-by-slot availability on a visual layout, book a slot for a specific time window, and get real-time updates as availability changes. Vendors upload a DXF drawing of their lot to create it, manage its layout and slots (including a full add/move/resize/retype/delete editor), run walk-in ("manual") parking sessions from a front desk, and see real dashboard statistics and analytics — nothing on either dashboard is hardcoded; every number traces back to a MongoDB query.

The system deliberately does **not** integrate any map provider (no Google Maps, Mapbox, Leaflet, or geocoding). Parking locations are plain address data — name, address line, area/locality, city, state, pincode.

## Features

**Customer**
- Register/login, JWT-authenticated session
- Search parking lots by name, area, city, and max price, for a specific date/time window
- Visual, canvas-based slot map per lot with live availability (available / occupied / your booking / unavailable)
- Book one or more slots with a server-calculated price
- View bookings by status (upcoming / active / completed / cancelled) and cancel eligible ones
- Real-time notification center (bell icon with unread count) for booking confirmations, cancellations, start/completion
- Live slot-map updates when another customer books/cancels a slot you're viewing

**Vendor**
- Create a lot by uploading a DXF file (parsed server-side into a boundary + slots)
- Visual layout editor: select, inspect, add, move (drag), resize, rename, retype, and delete slots
- Manage slot availability (mark unavailable/available), which cancels affected bookings and notifies the customers
- Run walk-in ("manual") parking sessions: start a session, complete it, price calculated automatically
- Real overview dashboard (total lots/slots, available/occupied right now, today's bookings, active sessions, today's revenue) and an analytics page (bookings/revenue by day, status distribution, bookings by hour, top lots) built from Recharts and real MongoDB aggregations
- A live activity feed of real-time events for their own lots
- Notification center, same as the customer's

## Architecture

See [docs/architecture.md](docs/architecture.md) for a full breakdown (request flow, process layout, frontend/backend layering). In short:

```
React SPA  ⇄  Express API  ⇄  MongoDB (replica set, for transactions)
                  │
                  └─ publishes events ─► Redis ─► WebSocket server ─► React SPA (live updates)
```

## Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router, Axios, Recharts, Lucide icons
- **Backend**: Node.js, Express 5, Mongoose, JWT, bcryptjs, Zod validation, Multer (DXF upload), node-cron (scheduled booking transitions), `dxf-parser`
- **Realtime**: Redis pub/sub + a small `ws`-based WebSocket server
- **Testing**: Jest + Supertest + `mongodb-memory-server` (backend), Playwright (end-to-end)

## Customer Workflow

Login → search (name/area/city, date/time, max price) → open a lot → view the live slot map → select one or more available slots → see the calculated price → confirm → booking created, slot map and vendor dashboard update in real time → manage the booking from "My bookings" (cancel while still upcoming).

## Vendor Workflow

Login → dashboard (real stats) → upload a DXF to create a lot, or open an existing one → "Edit layout" to add/move/resize/retype/delete slots → mark slots unavailable for maintenance → start/complete walk-in sessions → check the Analytics page for trends → get notified and see the live activity feed as customers book/cancel.

## Booking Lifecycle

`UPCOMING → ACTIVE → COMPLETED`, or `UPCOMING → CANCELLED`. The first two transitions happen automatically via a cron job; cancellation is customer-initiated and only possible while `UPCOMING`. Full detail, including the exact overlap rule and price formula, in [docs/booking-system.md](docs/booking-system.md).

## Concurrency Handling

Two customers booking the same slot for an overlapping time window cannot both succeed: booking creation runs inside a MongoDB transaction with a deliberate write-conflict mechanism that guarantees exactly one of two simultaneous attempts commits, and the other retries and correctly sees a conflict. See [docs/booking-system.md](docs/booking-system.md) and the automated test at `backend/express/testing/concurrency.test.cjs`.

## Redis/WebSocket Architecture

Events are published to Redis only after the database write that caused them has committed, and are delivered over WebSocket only to the specific users each event concerns (not broadcast to everyone viewing a lot) — except non-private "slot availability changed" events, which are broadcast to everyone watching that lot. Full detail in [docs/realtime-system.md](docs/realtime-system.md).

## DXF Layout Processing

A vendor uploads a `.dxf` file with a `boundary` layer (the lot outline) and a `parkinglot` layer (one polyline per slot). The backend (`controllers/uploadController.js`, using `dxf-parser`) extracts both, creates the `parkingLot` document from the boundary plus the submitted address/rate form fields, and bulk-creates a `parkingSlot` document per detected slot polygon. From there, the visual layout editor lets the vendor add slots the DXF didn't capture, or fix up positions/sizes, without needing to re-upload.

## Notification System

A real `notification` collection (not a static list) — see [docs/database.md](docs/database.md) for the schema. Notifications are created server-side alongside the domain events that cause them (booking confirmed/cancelled/started/completed for customers; new booking/cancelled/manual session completed for vendors), pushed live over WebSocket, and also available via REST (`GET /api/notifications`, with unread count) so the list is correct even after a page refresh. The bell icon in the dashboard header shows an unread badge, a dropdown of recent notifications, and supports marking one or all as read.

## Database Design

See [docs/database.md](docs/database.md) for the full schema of all five collections, their indexes, and why availability is computed on read rather than stored as a separate field.

## Project Structure

```
backend/
  express/        Express API — controllers/ services/ model/ routes/ middleware/
                   validators/ utils/ constants/ scripts/ (seed, migrate) testing/
  ws/              WebSocket fan-out server
  shared/          Code shared by both backend processes (Redis clients, event names)
frontend/
  src/             components/ pages/ layouts/ services/ hooks/ context/ utils/
  e2e/             Playwright end-to-end tests
frontend-legacy/   The original vanilla-JS frontend (kept for reference, not maintained)
docs/              Architecture, booking system, realtime system, database design
scripts/           start-mongo-dev.ps1 — local MongoDB replica set for development
```

## Environment Variables

Copy `.env.example` (repo root) into `.env` files inside `backend/express` and `backend/ws`, and `frontend/.env.example` into `frontend/.env`. Never commit an actual `.env`.

| Variable | Used by | Purpose |
|---|---|---|
| `PORT` | express | API port (default 4444) |
| `MONGO_URI` | express | MongoDB connection string — **must** point at a replica set |
| `JWT_SECRET` | express, ws | Shared secret for signing/verifying tokens |
| `JWT_EXPIRES_IN` | express | Token lifetime (default `24h`) |
| `REDIS_URL` | express, ws (via `backend/shared`) | Redis connection string |
| `CLIENT_URL` | express | Allowed CORS origin |
| `WS_PORT` | ws | WebSocket server port (default 4445) |
| `VITE_API_BASE` | frontend | Base URL of the Express API |
| `VITE_WS_BASE` | frontend | Base URL of the WebSocket server |

## Installation

Requires Node.js 18+, a MongoDB binary available locally, and (optionally) Redis.

```powershell
cd backend\express; npm install; cd ..\ws; npm install; cd ..\..\frontend; npm install
```

## Running MongoDB

Booking creation, manual sessions, availability changes, and slot editing all run inside MongoDB transactions, which **require a replica set** — a standalone `mongod` rejects them outright with `Transaction numbers are only allowed on a replica set member or mongos`.

**Option A — local replica set (no Docker, no admin rights needed):**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-mongo-dev.ps1
```

This starts a second `mongod` (separate from any existing standalone Windows service) on port 27018 with `replSetName: rs0`, using a data directory under `.devdata/` in the repo, and initiates the replica set if needed. Point `MONGO_URI` at `mongodb://localhost:27018/parkease?replicaSet=rs0` (already the default in `.env.example`). Safe to re-run — it detects an already-running instance and does nothing.

**Option B — Docker Compose:**

```powershell
docker compose up -d mongo mongo-init redis
```

Starts MongoDB as a one-node replica set on the standard port 27017, plus Redis, using named volumes. Set `MONGO_URI=mongodb://localhost:27017/parkease?replicaSet=rs0` if you use this option instead.

**Option C — convert your existing MongoDB Windows service:** add `replication: { replSetName: rs0 }` to its `mongod.cfg`, restart the service (needs admin rights), then run `mongosh --eval "rs.initiate()"` once.

## Running Redis

Optional but recommended for live updates. `docker compose up -d redis`, or any local Redis install, or a Windows-compatible fork such as Memurai. The app runs and all REST functionality works without it — see [docs/realtime-system.md](docs/realtime-system.md#graceful-degradation) — only the live push updates are unavailable.

## Running Backend

```powershell
cd backend\express
npm start
```

Runs on `http://localhost:4444`.

## Running WebSocket Server

```powershell
cd backend\ws
node server.js
```

Runs on `ws://localhost:4445`.

## Running Frontend

```powershell
cd frontend
npm run dev
```

Runs on `http://localhost:5173`.

## Production Deployment

Deploy the frontend, REST API, and WebSocket server as three separate services. The frontend must be rebuilt after changing either `VITE_*` variable because Vite embeds those values at build time.

| Service | Host configuration | Required production configuration |
|---|---|---|
| Frontend | Vercel, root directory `frontend`, build command `npm run build`, output `dist` | `VITE_API_BASE=https://<api-host>` and `VITE_WS_BASE=wss://<ws-host>` |
| REST API | Render Web Service | Build: `npm install --prefix backend/shared && npm install --prefix backend/express`; start: `npm --prefix backend/express start`; set `MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV=production`, and `CLIENT_URL=https://<frontend-host>` |
| WebSocket server | Render Web Service | Build: `npm install --prefix backend/shared && npm install --prefix backend/ws`; start: `npm --prefix backend/ws start`; set `REDIS_URL`, `JWT_SECRET` (the exact same value used by the API), and `NODE_ENV=production` |

For Atlas, allow the Render outbound IP ranges before deploying the REST API. Use a managed Redis instance such as Upstash in production; a local Docker Redis container is only reachable from the computer running it. Do not run `npm run seed` against a production database because it deletes existing application data.

On Render's free plan, the API and WebSocket services can sleep after inactivity. The first request or socket connection can take roughly a minute while the service starts; the frontend reconnects to the WebSocket service automatically.

## Running Tests

```powershell
cd backend\express
npm test
```

Runs the full Jest + Supertest suite against an in-memory MongoDB replica set (auth, authorization/ownership, booking validation and concurrency, manual sessions, the layout editor, notifications, vendor analytics, and scheduled status transitions). If no system `mongod` binary is found, set `MONGOMS_SYSTEM_BINARY` to its path, or allow `mongodb-memory-server` to download one (`MONGOMS_RUNTIME_DOWNLOAD=true`).

```powershell
cd frontend
npm run test:e2e
```

Runs the Playwright end-to-end suite (`frontend/e2e/`) against a running backend + frontend + seeded database — start those first (see above), then run this. Covers: customer login/search/slot-map/booking through to a real `201` from the booking API, cancellation UI, vendor login/dashboard/layout editor (adding a slot end-to-end), and the analytics page.

## Seed Data

```powershell
cd backend\express
npm run seed
```

Creates one vendor, one customer, three parking lots (New Delhi and Bengaluru) with mixed slot types and statuses, and around 40 bookings spanning upcoming/active/completed/cancelled across the last week (so the analytics charts have real data to show). Destructive — clears existing users/lots/slots/bookings/notifications first, so only run it against a development database.

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Vendor | `vendor@parkease.demo` | `Demo@1234` |
| Customer | `customer@parkease.demo` | `Demo@1234` |

## Troubleshooting

- **Booking/manual-session/slot-edit requests fail with a transaction error** → MongoDB isn't running as a replica set. See "Running MongoDB" above.
- **Dashboard shows "Offline" / no live updates** → Redis isn't running, or the `backend/ws` process isn't running. The REST API and page-refresh data are unaffected.
- **`npm test` skips everything (0 assertions actually run)** → `mongodb-memory-server` couldn't start a `mongod`; set `MONGOMS_SYSTEM_BINARY` to a local MongoDB binary path or allow it to download one.
- **CORS errors in the browser console** → `CLIENT_URL` in `backend/express/.env` must match the origin the frontend is actually served from.
