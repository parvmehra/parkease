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

test('vendor analytics aggregates real bookings by day and status', async () => {
  if (!global.__MONGO_READY__) return;

  const vendor = await createUser(User, bcrypt, { username: 'analytics-vendor', email: 'analytics-vendor@example.com', type: 'Vendor' });
  const customer = await createUser(User, bcrypt, { username: 'analytics-cust', email: 'analytics-cust@example.com', type: 'Customer' });
  const lot = await parkingLot.create({
    name: 'Analytics Lot', createdBy: vendor._id, hourlyRates: 10,
    boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
    meta: { location: { addressLine: 'A', city: 'C', state: 'S', pincode: '000000' } },
  });
  const slot = await parkingSlot.create({ lotId: lot._id, name: 'S1', status: 'AVAILABLE' });

  const today = new Date();
  await Booking.create([
    { userId: customer._id, lotId: lot._id, slotId: slot._id, startTime: today, endTime: new Date(today.getTime() + 3600000), amount: 10, status: 'COMPLETED', bookingType: 'ONLINE' },
    { userId: customer._id, lotId: lot._id, slotId: slot._id, startTime: today, endTime: new Date(today.getTime() + 7200000), amount: 20, status: 'CANCELLED', bookingType: 'ONLINE' },
  ]);

  const token = makeToken({ userId: vendor._id.toString(), role: 'Vendor' });
  const res = await request(app).get('/api/vendors/analytics').set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(200);
  expect(res.body.data.bookingsByDay.length).toBeGreaterThan(0);
  expect(res.body.data.bookingsByDay[0].revenue).toBe(10);
  expect(res.body.data.statusDistribution.some((row) => row.status === 'CANCELLED')).toBe(true);
  expect(res.body.data.topLots[0].name).toBe('Analytics Lot');
});
