# Booking System

## Statuses

A booking moves through a strict state machine:

```
UPCOMING ──► ACTIVE ──► COMPLETED
    │
    └──────► CANCELLED
```

- `UPCOMING → ACTIVE` and `ACTIVE → COMPLETED` happen automatically. A cron job (`backend/express/extras/scheduling.js`, `node-cron`, every 30 seconds) finds bookings whose `startTime`/`endTime` has passed and transitions them inside a transaction, then publishes `booking.started` / `booking.completed` and creates the matching customer notification.
- `UPCOMING → CANCELLED` is the only customer-initiated transition (`PATCH /api/customers/cancelbooking/:id`), and only while the booking is still `UPCOMING` — the query that performs the update filters on `status: "UPCOMING"`, so an `ACTIVE` or `COMPLETED` booking simply doesn't match and the endpoint returns 404. There is no code path that can cancel a booking that has already started.
- A slot being marked `UNAVAILABLE` by its vendor cascades: any `UPCOMING`/`ACTIVE` bookings on that slot are force-cancelled in the same transaction, and the affected customers are notified why.

Two booking types share the same model: `ONLINE` (created by a customer through the search/booking flow) and `MANUAL` (a vendor starting a walk-in session directly, which begins life as `ACTIVE` rather than `UPCOMING` since the car is already parked).

## Price calculation

Price is always computed on the server, in `services/bookingService.js`, and the client-submitted amount (there isn't one — the create-booking request only carries `slotIds`/`startTime`/`endTime`) is never trusted:

```js
amount = Math.ceil((endTime - startTime) / (60 * 60 * 1000)) * lot.hourlyRates
```

Partial hours round up to the next full hour (2.5 hours at ₹50/hr → ₹150, not ₹125), matching how most real parking lots bill. A booking must be at least `MIN_BOOKING_MINUTES` (15) long, must not start in the past, and must have `endTime > startTime` — all enforced in `assertValidWindow` before any database write.

## Preventing double-booking

The naive approach — check for an overlapping booking, then insert — is a classic time-of-check-to-time-of-use race: two concurrent requests can both pass the check before either has inserted, and both succeed. This project closes that race with a MongoDB **multi-document transaction** plus a deliberate **write-conflict trick**:

1. Before checking anything, the transaction does `parkingSlot.findOneAndUpdate({_id: slotId}, {$inc: {reservationSeq: 1}}, {session})`. This write touches the slot document on *every* booking attempt for that slot, regardless of the requested time window.
2. If two transactions concurrently touch the same slot document, MongoDB's transaction protocol detects the write conflict and aborts one of them with a `TransientTransactionError`.
3. `utils/transaction.js`'s `withTransaction` helper catches that specific error and retries the whole operation (up to 3 times) with a fresh transaction.
4. The retried attempt now runs *after* the winner has committed, so its overlap check correctly sees the just-created booking and is rejected with `409 BOOKING_CONFLICT` — a real conflict response, not a silent double-booking.

This is verified by an automated test (`testing/concurrency.test.cjs`) that fires two booking requests for the same slot/time via `Promise.all` and asserts exactly one `201` and one `409` — not "usually one wins," but a real correctness guarantee backed by MongoDB's transaction isolation.

The same `reservationSeq` touch-and-transact pattern protects manual booking creation and manual-session completion, so a vendor accidentally double-clicking "start session" can't create two active sessions on the same slot either.

## Why MongoDB needs a replica set

Multi-document transactions are only available when MongoDB is running as a replica set (even a single-node one) — a standalone `mongod` rejects `session.withTransaction()` outright. See the root [README](../README.md#running-mongodb) for how local development is configured.
