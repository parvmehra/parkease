const request = require('supertest');
const bcrypt = require('bcryptjs');
const { makeToken, createUser } = require('./helpers.cjs');

let app, User, parkingLot, Booking;
beforeAll(async () => {
  app = (await import('../server.js')).default;
  User = (await import('../model/userModel.js')).default;
  parkingLot = (await import('../model/parkingLotModel.js')).default;
  Booking = (await import('../model/bookingModel.js')).default;
});

describe('Authorization', () => {
  test('customer cannot access vendor-only routes', async () => {
    if (!global.__MONGO_READY__) return;
    const customer = await createUser(User, bcrypt, { username: 'cust', email: 'cust1@example.com', type: 'Customer' });
    const token = makeToken({ userId: customer._id.toString(), role: 'Customer' });

    const res = await request(app).get('/api/vendors/lots').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });

  test('vendor cannot access another vendor\'s lot', async () => {
    if (!global.__MONGO_READY__) return;
    const vendorA = await createUser(User, bcrypt, { username: 'vendorA', email: 'vendorA@example.com', type: 'Vendor' });
    const vendorB = await createUser(User, bcrypt, { username: 'vendorB', email: 'vendorB@example.com', type: 'Vendor' });

    const lot = await parkingLot.create({
      name: 'Lot A', createdBy: vendorA._id, hourlyRates: 20,
      boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      meta: { location: { addressLine: 'A', city: 'C', state: 'S', pincode: '000000' } },
    });

    const tokenB = makeToken({ userId: vendorB._id.toString(), role: 'Vendor' });
    const res = await request(app).get(`/api/vendors/lot/${lot._id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(res.statusCode).toBe(404);
  });

  test('customer cannot cancel another customer\'s booking', async () => {
    if (!global.__MONGO_READY__) return;
    const vendor = await createUser(User, bcrypt, { username: 'vendorC', email: 'vendorC@example.com', type: 'Vendor' });
    const owner = await createUser(User, bcrypt, { username: 'ownerCust', email: 'ownerCust@example.com', type: 'Customer' });
    const intruder = await createUser(User, bcrypt, { username: 'intruder', email: 'intruder@example.com', type: 'Customer' });

    const lot = await parkingLot.create({
      name: 'Lot B', createdBy: vendor._id, hourlyRates: 20,
      boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      meta: { location: { addressLine: 'A', city: 'C', state: 'S', pincode: '000000' } },
    });

    const booking = await Booking.create({
      userId: owner._id, lotId: lot._id, slotId: owner._id, startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 7200000), amount: 40, status: 'UPCOMING', bookingType: 'ONLINE',
    });

    const intruderToken = makeToken({ userId: intruder._id.toString(), role: 'Customer' });
    const res = await request(app).patch(`/api/customers/cancelbooking/${booking._id}`).set('Authorization', `Bearer ${intruderToken}`);
    expect(res.statusCode).toBe(404);
  });
});
