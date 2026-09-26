# Database Design

MongoDB, accessed through Mongoose. Five collections: `users`, `parkinglots`, `parkingslots`, `bookings`, `notifications`.

## user

| Field | Type | Notes |
|---|---|---|
| `username` | String | |
| `email` | String | unique index |
| `password` | String | bcrypt hash, never returned in API responses |
| `type` | `"Customer"` \| `"Vendor"` | drives both UI routing and backend role checks |

## parkingLot

| Field | Type | Notes |
|---|---|---|
| `name`, `description` | String | |
| `createdBy` | ObjectId → `user` | the owning vendor; indexed |
| `units` | String | DXF drawing units (`mm`, `m`, …) |
| `boundary` | `{x,y}[]` | the lot's outline polygon, in drawing units |
| `hourlyRates` | Number | authoritative price input for `bookingService` |
| `isActive` | Boolean | soft "deactivate" flag instead of deleting a lot |
| `meta.location` | `{addressLine, area, city, state, pincode}` | plain address data — no coordinates, no map provider |

## parkingSlot

| Field | Type | Notes |
|---|---|---|
| `lotId` | ObjectId → `parkingLot` | indexed together with `status` |
| `name` | String | slot number/label, vendor-editable |
| `vertices` | `{x,y}[]` | the slot's polygon, same coordinate space as its lot's boundary |
| `slotType` | `normal` \| `compact` \| `large` \| `ev` \| `accessible` \| `other` | |
| `status` | `AVAILABLE` \| `OCCUPIED` \| `UNAVAILABLE` | the slot's own state; time-windowed availability for a specific search is computed on top of this (see below) |
| `currentbookingId` | ObjectId → `booking` \| `null` | set only for manual (walk-in) sessions |
| `reservationSeq` | Number | write-conflict counter used purely for the concurrency-safe booking transaction — see [booking-system.md](./booking-system.md) |

## booking

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → `user` | indexed |
| `lotId` | ObjectId → `parkingLot` | indexed |
| `slotId` | ObjectId → `parkingSlot` | indexed together with `status`/`startTime` for the overlap query |
| `startTime`, `endTime` | Date | both required — a booking always has a concrete duration |
| `status` | `UPCOMING` \| `ACTIVE` \| `COMPLETED` \| `CANCELLED` | |
| `bookingType` | `ONLINE` \| `MANUAL` | |
| `amount` | Number | server-calculated, never client-supplied |

## notification

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → `user` | indexed together with `createdAt` and with `read` |
| `type` | one of the `NOTIFICATION_TYPE` constants (e.g. `BOOKING_CONFIRMED`, `NEW_BOOKING`) | |
| `title`, `message` | String | |
| `read` | Boolean | |
| `metadata` | Mixed | usually `{bookingId, lotId, slotId}` for deep-linking later |

## Availability is computed, not stored

There's a deliberate design choice here: a slot's `status` field reflects its *own* state (available for booking / manually occupied / taken out of service), but whether it's free **for a specific requested time window** is computed on read via a MongoDB aggregation (`services/availabilityService.js`) that `$lookup`s overlapping `UPCOMING`/`ACTIVE` bookings for each slot and checks `booking.startTime < requestedEnd && booking.endTime > requestedStart`. This means the same slot can correctly show as available for a Tuesday afternoon booking and unavailable for a Tuesday morning one that's already booked, without needing to store or maintain a separate "availability calendar." This aggregation (not a per-slot loop) is also what keeps lot search and lot-detail endpoints from doing an N+1 query per slot as the number of lots/slots grows.

## Indexes

- `user.email` — unique, login lookups.
- `parkingLot.createdBy` — "show my lots."
- `parkingLot.meta.location.city` — city search.
- `parkingSlot.{lotId, status}` — layout/availability queries.
- `booking.{slotId, status, startTime}` — the overlap check that guards every booking creation.
- `booking.userId`, `booking.lotId` — "my bookings" / "this lot's bookings."
- `notification.{userId, createdAt}`, `notification.{userId, read}` — notification list and unread-count queries.
