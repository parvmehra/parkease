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

test('vendor overview reflects real slot and booking counts', async () => {
  if (!global.__MONGO_READY__) return;

  const vendor = await createUser(User, bcrypt, { username: 'overview-vendor', email: 'overview-vendor@example.com', type: 'Vendor' });
  const lot = await parkingLot.create({
    name: 'Overview Lot', createdBy: vendor._id, hourlyRates: 25,
    boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
    meta: { location: { addressLine: 'A', city: 'C', state: 'S', pincode: '000000' } },
  });
  const [slotA, slotB] = await parkingSlot.create([
    { lotId: lot._id, name: 'S1', status: 'AVAILABLE' },
    { lotId: lot._id, name: 'S2', status: 'OCCUPIED' },
  ]);
  const customer = await createUser(User, bcrypt, { username: 'overview-cust', email: 'overview-cust@example.com', type: 'Customer' });

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const activeStart = new Date(Math.max(startOfDay.getTime() + 60000, now.getTime() - 3600000));
  await Booking.create({
    userId: customer._id, lotId: lot._id, slotId: slotB._id,
    startTime: activeStart, endTime: new Date(now.getTime() + 3600000),
    amount: 50, status: 'ACTIVE', bookingType: 'MANUAL',
  });

  const token = makeToken({ userId: vendor._id.toString(), role: 'Vendor' });
  const res = await request(app).get('/api/vendors/overview').set('Authorization', `Bearer ${token}`);

  expect(res.statusCode).toBe(200);
  expect(res.body.data.totalLots).toBe(1);
  expect(res.body.data.totalSlots).toBe(2);
  expect(res.body.data.occupiedSlots).toBe(1);
  expect(res.body.data.availableSlots).toBe(1);
  expect(res.body.data.activeSessions).toBe(1);
  expect(res.body.data.todaysRevenue).toBe(50);
});
