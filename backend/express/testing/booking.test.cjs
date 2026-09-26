const request = require('supertest');
const bcrypt = require('bcryptjs');
const { makeToken, createUser } = require('./helpers.cjs');

let app, User, parkingLot, parkingSlot, Booking;
beforeAll(async () => {
  app = (await import('../server.js')).default;
  User = (await import('../model/userModel.js')).default;
  parkingLot = (await import('../model/parkingLotModel.js')).default;
  parkingSlot = (await import('../model/parkingSlot.js')).default;
  Booking = (await import('../model/bookingModel.js')).default;
});

async function makeLotWithSlot(hourlyRates = 50) {
  const vendor = await createUser(User, bcrypt, { username: 'vendor', email: `vendor${Date.now()}@example.com`, type: 'Vendor' });
  const lot = await parkingLot.create({
    name: `Lot ${Date.now()}`, createdBy: vendor._id, hourlyRates,
    boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
    meta: { location: { addressLine: 'A', city: 'C', state: 'S', pincode: '000000' } },
  });
  const slot = await parkingSlot.create({ lotId: lot._id, name: 'S1', status: 'AVAILABLE' });
  return { vendor, lot, slot };
}

describe('Booking creation', () => {
  test('creates a booking with a correctly calculated amount', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot, slot } = await makeLotWithSlot(50);
    const customer = await createUser(User, bcrypt, { username: 'cust', email: 'bookcust1@example.com', type: 'Customer' });
    const token = makeToken({ userId: customer._id.toString(), role: 'Customer' });

    const start = new Date(Date.now() + 3600000);
    const end = new Date(start.getTime() + 2.5 * 3600000);

    const res = await request(app)
      .post(`/api/customers/bookslot/${lot._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ slotids: [slot._id.toString()], startTimeVar: start.toISOString(), endTimeVar: end.toISOString() });

    expect(res.statusCode).toBe(201);
    expect(res.body.data[0].amount).toBe(150);
  });

  test('rejects a booking for a nonexistent slot', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot } = await makeLotWithSlot();
    const customer = await createUser(User, bcrypt, { username: 'cust2', email: 'bookcust2@example.com', type: 'Customer' });
    const token = makeToken({ userId: customer._id.toString(), role: 'Customer' });

    const start = new Date(Date.now() + 3600000);
    const end = new Date(start.getTime() + 3600000);
    const fakeSlotId = '507f1f77bcf86cd799439011';

    const res = await request(app)
      .post(`/api/customers/bookslot/${lot._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ slotids: [fakeSlotId], startTimeVar: start.toISOString(), endTimeVar: end.toISOString() });

    expect(res.statusCode).toBe(400);
  });

  test('rejects an overlapping booking on the same slot', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot, slot } = await makeLotWithSlot();
    const customer = await createUser(User, bcrypt, { username: 'cust3', email: 'bookcust3@example.com', type: 'Customer' });
    const token = makeToken({ userId: customer._id.toString(), role: 'Customer' });

    const start = new Date(Date.now() + 3600000);
    const end = new Date(start.getTime() + 2 * 3600000);
    await request(app).post(`/api/customers/bookslot/${lot._id}`).set('Authorization', `Bearer ${token}`)
      .send({ slotids: [slot._id.toString()], startTimeVar: start.toISOString(), endTimeVar: end.toISOString() });

    const overlappingStart = new Date(start.getTime() + 3600000);
    const overlappingEnd = new Date(overlappingStart.getTime() + 3600000);
    const res = await request(app).post(`/api/customers/bookslot/${lot._id}`).set('Authorization', `Bearer ${token}`)
      .send({ slotids: [slot._id.toString()], startTimeVar: overlappingStart.toISOString(), endTimeVar: overlappingEnd.toISOString() });

    expect(res.statusCode).toBe(409);
  });

  test('rejects a booking that starts in the past', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot, slot } = await makeLotWithSlot();
    const customer = await createUser(User, bcrypt, { username: 'cust4', email: 'bookcust4@example.com', type: 'Customer' });
    const token = makeToken({ userId: customer._id.toString(), role: 'Customer' });

    const start = new Date(Date.now() - 3600000);
    const end = new Date(Date.now() + 3600000);
    const res = await request(app).post(`/api/customers/bookslot/${lot._id}`).set('Authorization', `Bearer ${token}`)
      .send({ slotids: [slot._id.toString()], startTimeVar: start.toISOString(), endTimeVar: end.toISOString() });

    expect(res.statusCode).toBe(400);
  });

  test('rejects a booking where end time is before start time', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot, slot } = await makeLotWithSlot();
    const customer = await createUser(User, bcrypt, { username: 'cust5', email: 'bookcust5@example.com', type: 'Customer' });
    const token = makeToken({ userId: customer._id.toString(), role: 'Customer' });

    const start = new Date(Date.now() + 7200000);
    const end = new Date(Date.now() + 3600000);
    const res = await request(app).post(`/api/customers/bookslot/${lot._id}`).set('Authorization', `Bearer ${token}`)
      .send({ slotids: [slot._id.toString()], startTimeVar: start.toISOString(), endTimeVar: end.toISOString() });

    expect(res.statusCode).toBe(400);
  });
});

describe('Booking cancellation', () => {
  test('cancels an upcoming booking', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot, slot } = await makeLotWithSlot();
    const customer = await createUser(User, bcrypt, { username: 'cust6', email: 'bookcust6@example.com', type: 'Customer' });
    const booking = await Booking.create({
      userId: customer._id, lotId: lot._id, slotId: slot._id,
      startTime: new Date(Date.now() + 3600000), endTime: new Date(Date.now() + 7200000),
      amount: 50, status: 'UPCOMING', bookingType: 'ONLINE',
    });
    const token = makeToken({ userId: customer._id.toString(), role: 'Customer' });

    const res = await request(app).patch(`/api/customers/cancelbooking/${booking._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  test('does not allow cancelling a completed booking', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot, slot } = await makeLotWithSlot();
    const customer = await createUser(User, bcrypt, { username: 'cust7', email: 'bookcust7@example.com', type: 'Customer' });
    const booking = await Booking.create({
      userId: customer._id, lotId: lot._id, slotId: slot._id,
      startTime: new Date(Date.now() - 7200000), endTime: new Date(Date.now() - 3600000),
      amount: 50, status: 'COMPLETED', bookingType: 'ONLINE',
    });
    const token = makeToken({ userId: customer._id.toString(), role: 'Customer' });

    const res = await request(app).patch(`/api/customers/cancelbooking/${booking._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });
});
