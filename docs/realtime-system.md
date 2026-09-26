# Realtime System

## Transport

```
Express API ──publish──► Redis ──subscribe──► backend/ws ──WebSocket──► browser
```

`backend/shared/events.js` is the single source of truth for event names (`booking.created`, `booking.cancelled`, `booking.started`, `booking.completed`, `slot.status.updated`, `parking.lot.updated`, `notification.created`), imported by both `backend/express` (publisher) and `backend/ws` (subscriber) so the two processes can never drift out of sync on channel names.

Events are only ever published **after** the database write that caused them has committed — every publish call in `services/bookingService.js`, `services/slotService.js`, and `extras/scheduling.js` happens outside (after) the `withTransaction(...)` block, never inside it. A failed transaction throws before any `publishEvent` call is reached, so a client never sees a `booking.created` event for a booking that doesn't actually exist in the database.

## Connecting

The browser opens `ws://localhost:4445?token=<jwt>&lotId=<optional>`. `backend/ws/server.js` verifies the JWT the same way the REST API does, and tracks each open socket under two maps: by `userId` (always) and by `lotId` (only if the client passed one, e.g. because it's currently viewing that lot's page).

## Authorization: who receives what

This is deliberately **not** a single broadcast-to-everyone-in-the-room model, because a booking event carries private information (who booked, at what price):

- **Booking lifecycle events** (`booking.created`, `booking.cancelled`, `booking.started`, `booking.completed`) and **notifications** (`notification.created`) are delivered only to the sockets belonging to the specific `userId` and `vendorId` named in the event payload — i.e. the customer who made the booking and the vendor who owns the lot. A second customer who happens to have the same lot's page open does **not** receive these.
- **Lot-wide events** (`slot.status.updated`, `parking.lot.updated`) carry no private data (just `lotId`, `slotId`, `status`) and are broadcast to everyone subscribed to that `lotId`, which is what lets a customer's slot map update live when someone else books or cancels a slot they're looking at, without exposing who did it.

This split is enforced in one place, `backend/ws/server.js`'s `LOT_BROADCAST_EVENTS` set — only `slot.status.updated` and `parking.lot.updated` are eligible for the lot-wide fan-out; everything else is user-scoped only.

## Frontend consumption

`hooks/useRealtime.js` opens (and auto-reconnects, with backoff) a WebSocket scoped to the current page — `ParkingLotDetails`/`VendorLotDetails` pass a `lotId` to also subscribe to that lot's broadcasts. `hooks/useNotifications.js` uses the same hook without a `lotId` (so it only ever receives events addressed to the current user) and appends any `notification.created` payload straight into local state, incrementing the unread badge without a re-fetch.

## Graceful degradation

Redis being unavailable does not crash either backend process:

- `backend/shared/index.js` creates the Redis clients with a bounded reconnect strategy and calls `.connect()` without awaiting it at module load, so a missing Redis never blocks server startup.
- `publishEvent` (`backend/express/services/notifications.js`) wraps every publish in a try/catch and only logs on failure — a booking still succeeds even if the event can't be broadcast.
- `backend/ws/server.js` only subscribes to channels once the Redis client actually reaches its `ready` state, and logs (rather than throws) if that never happens.

In this state, all REST functionality (including booking, cancelling, and reading notifications on refresh) continues to work; only the live push updates are unavailable until Redis comes back.
