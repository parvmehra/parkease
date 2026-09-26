const request = require('supertest');
const bcrypt = require('bcryptjs');
const { makeToken, createUser } = require('./helpers.cjs');

let app, User, parkingLot, parkingSlot;
beforeAll(async () => {
  app = (await import('../server.js')).default;
  User = (await import('../model/userModel.js')).default;
  parkingLot = (await import('../model/parkingLotModel.js')).default;
  parkingSlot = (await import('../model/parkingSlot.js')).default;
});

test('only one of two simultaneous bookings for the same slot succeeds', async () => {
  if (!global.__MONGO_READY__) return;

  const vendor = await createUser(User, bcrypt, { username: 'vendor', email: 'concurrency-vendor@example.com', type: 'Vendor' });
  const lot = await parkingLot.create({
    name: 'Concurrency Lot', createdBy: vendor._id, hourlyRates: 20,
    boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
    meta: { location: { addressLine: 'A', city: 'C', state: 'S', pincode: '000000' } },
  });
  const slot = await parkingSlot.create({ lotId: lot._id, name: 'S1', status: 'AVAILABLE' });

  const customerA = await createUser(User, bcrypt, { username: 'custA', email: 'concurrency-a@example.com', type: 'Customer' });
  const customerB = await createUser(User, bcrypt, { username: 'custB', email: 'concurrency-b@example.com', type: 'Customer' });
  const tokenA = makeToken({ userId: customerA._id.toString(), role: 'Customer' });
  const tokenB = makeToken({ userId: customerB._id.toString(), role: 'Customer' });

  const start = new Date(Date.now() + 3600000).toISOString();
  const end = new Date(Date.now() + 7200000).toISOString();
  const body = { slotids: [slot._id.toString()], startTimeVar: start, endTimeVar: end };

  const [resA, resB] = await Promise.all([
    request(app).post(`/api/customers/bookslot/${lot._id}`).set('Authorization', `Bearer ${tokenA}`).send(body),
    request(app).post(`/api/customers/bookslot/${lot._id}`).set('Authorization', `Bearer ${tokenB}`).send(body),
  ]);

  const statuses = [resA.statusCode, resB.statusCode].sort();
  expect(statuses).toEqual([201, 409]);
}, 30000);
