const request = require('supertest');
const bcrypt = require('bcryptjs');
const path = require('path');
const { makeToken, createUser } = require('./helpers.cjs');

let app, User, parkingLot, parkingSlot;
beforeAll(async () => {
  app = (await import('../server.js')).default;
  User = (await import('../model/userModel.js')).default;
  parkingLot = (await import('../model/parkingLotModel.js')).default;
  parkingSlot = (await import('../model/parkingSlot.js')).default;
});

describe('Customer lot search', () => {
  test('showlots returns lots filtered by city with available/total slot counts', async () => {
    if (!global.__MONGO_READY__) return;
    const vendor = await createUser(User, bcrypt, { username: 'vendor', email: 'avail-vendor@example.com', type: 'Vendor' });
    const lot = await parkingLot.create({
      name: 'Main Lot', createdBy: vendor._id, hourlyRates: 50,
      boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
      meta: { location: { addressLine: 'A', city: 'Testville', state: 'S', pincode: '000000' } },
    });
    await parkingSlot.create([
      { lotId: lot._id, name: 'S1', status: 'AVAILABLE' },
      { lotId: lot._id, name: 'S2', status: 'UNAVAILABLE' },
    ]);

    const customer = await createUser(User, bcrypt, { username: 'cust', email: 'avail-cust@example.com', type: 'Customer' });
    const token = makeToken({ userId: customer._id.toString(), role: 'Customer' });

    const res = await request(app)
      .get('/api/customers/showlots')
      .set('Authorization', `Bearer ${token}`)
      .query({ start: new Date().toISOString(), city: 'Testville' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].totalSlots).toBe(2);
    expect(res.body.data[0].availableSlots).toBe(1);
  });

  test('showlots requires a start time', async () => {
    if (!global.__MONGO_READY__) return;
    const customer = await createUser(User, bcrypt, { username: 'cust2', email: 'avail-cust2@example.com', type: 'Customer' });
    const token = makeToken({ userId: customer._id.toString(), role: 'Customer' });

    const res = await request(app).get('/api/customers/showlots').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });
});

describe('DXF lot upload', () => {
  test('rejects a non-DXF file', async () => {
    if (!global.__MONGO_READY__) return;
    const vendor = await createUser(User, bcrypt, { username: 'vendor2', email: 'upload-vendor@example.com', type: 'Vendor' });
    const token = makeToken({ userId: vendor._id.toString(), role: 'Vendor' });

    const res = await request(app)
      .post('/api/vendors/upload/')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Bad Upload')
      .field('hourlyRates', '10')
      .field('addressLine', 'A')
      .field('city', 'C')
      .field('state', 'S')
      .field('pincode', '000000')
      .attach('dxfFile', Buffer.from('not a dxf'), { filename: 'plan.txt', contentType: 'text/plain' });

    expect(res.statusCode).toBe(400);
  });
});
