# Architecture

## System overview

```
┌────────────┐      HTTPS/JSON       ┌───────────────┐
│  React SPA │ ───────────────────►  │  Express API  │
│ (Vite,     │ ◄───────────────────  │  (backend/    │
│  Tailwind) │                       │   express)    │
└─────┬──────┘                       └───────┬───────┘
      │  WebSocket                           │ Mongoose
      │  (ws://…:4445)                       ▼
      │                              ┌───────────────┐
      ▼                              │   MongoDB     │
┌────────────┐   Redis pub/sub       │ (replica set) │
│  ws server │ ◄─────────────────────└───────────────┘
│ (backend/  │      publish/subscribe
│    ws)     │ ◄──────┐
└────────────┘        │
                ┌──────┴──────┐
                │    Redis     │
                └──────────────┘
```

The Express API is the only service that talks to MongoDB. It publishes domain events to Redis after a database write has committed. A separate, minimal WebSocket server subscribes to those Redis channels and fans events out to the browser sockets of the specific users (or lot subscribers) each event concerns. The two Node services never call each other directly — Redis is the only channel between them, so either can restart independently without the other needing to know.

## Why two backend processes

Splitting the HTTP API from the WebSocket server keeps each process small and single-purpose: the API only needs to handle request/response and database transactions, while the WS server only needs to hold open socket connections and route messages. Redis pub/sub decouples them so a busy API under load doesn't compete for the same event loop as thousands of idle open sockets.

## Request flow: creating an online booking

1. Browser sends `POST /api/customers/bookslot/:lotid` with the JWT in the `Authorization` header.
2. `middleware/auth.js` verifies the token and attaches `req.user`.
3. `validators/bookingValidators.js` (via the `validate` middleware) parses and coerces the request body with Zod.
4. `controllers/customerController.js` calls `services/bookingService.createOnlineBooking`.
5. The service runs entirely inside a MongoDB transaction (`utils/transaction.js`), which retries automatically on transient write conflicts. Availability is re-checked authoritatively inside that transaction — see [booking-system.md](./booking-system.md).
6. On commit, the service publishes `booking.created` and `slot.status.updated` to Redis, and creates in-app notifications for both the customer and the vendor.
7. The `backend/ws` process, subscribed to those Redis channels, pushes the events to the specific browser sockets they're relevant to.
8. The React app's `useRealtime` hook receives the message and triggers a re-fetch (or, for notifications, an in-memory state update) — no page refresh needed.

## Layering inside the Express app

```
routes/            → wires an HTTP method + path to middleware + a controller
middleware/         → authenticate, requireRole, loadOwnedLot, validate, errorHandler
controllers/        → translate HTTP ⇄ service calls, no business logic
services/           → all business logic and MongoDB access lives here
model/              → Mongoose schemas
validators/         → Zod request schemas
utils/               → small cross-cutting helpers (asyncHandler, transaction retry, AppError)
constants/           → single source of truth for enum-like string values
```

Controllers are intentionally thin. Anything that touches more than one collection, needs a transaction, or has a business rule (price calculation, overlap checking, ownership) lives in `services/`, so it can be unit-tested and reused without spinning up Express.

## Frontend layering

```
services/    → one file per backend resource, wraps axios, no React
context/     → AuthContext (session), ToastContext (global feedback)
hooks/       → useAuth, useToast, useAsync (fetch + loading/error state), useRealtime, useNotifications
components/  → small, reusable, presentational pieces (Button, Card, SlotMap, …)
layouts/     → PublicLayout, DashboardLayout (nav + realtime status + notifications)
pages/       → one file per route, composes services + hooks + components
```

`SlotMap` is the one genuinely non-trivial component: it renders parking slot polygons on an HTML canvas and does pixel-perfect hit-testing via an offscreen "index color" canvas (each slot is drawn in a unique flat color on a hidden canvas; a click reads the pixel color under the cursor and maps it back to a slot index). This avoids needing hundreds of individual DOM elements for slot hit-testing and is what both the read-only customer view and the vendor's editable layout editor are built on.

## Where things run

| Process | Port | Responsibility |
|---|---|---|
| `backend/express` | 4444 | REST API, auth, MongoDB, scheduled booking transitions |
| `backend/ws` | 4445 | WebSocket fan-out, subscribes to Redis |
| MongoDB | 27017 (service) or 27018 (dev replica set) | primary data store |
| Redis | 6379 | pub/sub transport between the two backend processes |
| `frontend` (Vite dev server) | 5173 | React SPA |
