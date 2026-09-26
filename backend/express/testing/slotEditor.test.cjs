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

async function makeVendorLot() {
  const vendor = await createUser(User, bcrypt, { username: 'editor-vendor', email: `editor-vendor${Date.now()}@example.com`, type: 'Vendor' });
  const lot = await parkingLot.create({
    name: `Editor Lot ${Date.now()}`, createdBy: vendor._id, hourlyRates: 20,
    boundary: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
    meta: { location: { addressLine: 'A', city: 'C', state: 'S', pincode: '000000' } },
  });
  return { vendor, lot, token: makeToken({ userId: vendor._id.toString(), role: 'Vendor' }) };
}

describe('Parking layout editor', () => {
  test('vendor can add a slot to their lot', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot, token } = await makeVendorLot();

    const res = await request(app)
      .post(`/api/vendors/lot/${lot._id}/slots`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A01', slotType: 'ev', vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }] });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.name).toBe('A01');
    expect(res.body.data.slotType).toBe('ev');
  });

  test('vendor can move/resize and retype a slot', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot, token } = await makeVendorLot();
    const slot = await parkingSlot.create({ lotId: lot._id, name: 'A01', vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }] });

    const res = await request(app)
      .patch(`/api/vendors/lot/${lot._id}/slots/${slot._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A02', slotType: 'large', vertices: [{ x: 5, y: 5 }, { x: 9, y: 5 }, { x: 9, y: 9 }, { x: 5, y: 9 }] });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe('A02');
    expect(res.body.data.slotType).toBe('large');
    expect(res.body.data.vertices[0]).toEqual({ x: 5, y: 5 });
  });

  test('vendor can delete a slot with no active bookings', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot, token } = await makeVendorLot();
    const slot = await parkingSlot.create({ lotId: lot._id, name: 'A01', vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }] });

    const res = await request(app).delete(`/api/vendors/lot/${lot._id}/slots/${slot._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(await parkingSlot.findById(slot._id)).toBeNull();
  });

  test('vendor cannot delete a slot with an active booking', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot, token } = await makeVendorLot();
    const customer = await createUser(User, bcrypt, { username: 'editor-cust', email: `editor-cust${Date.now()}@example.com`, type: 'Customer' });
    const slot = await parkingSlot.create({ lotId: lot._id, name: 'A01', vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }] });
    await Booking.create({
      userId: customer._id, lotId: lot._id, slotId: slot._id,
      startTime: new Date(Date.now() + 3600000), endTime: new Date(Date.now() + 7200000),
      amount: 20, status: 'UPCOMING', bookingType: 'ONLINE',
    });

    const res = await request(app).delete(`/api/vendors/lot/${lot._id}/slots/${slot._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(409);
    expect(await parkingSlot.findById(slot._id)).not.toBeNull();
  });

  test('vendor cannot edit a slot on another vendor\'s lot', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot } = await makeVendorLot();
    const slot = await parkingSlot.create({ lotId: lot._id, name: 'A01', vertices: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }] });
    const other = await createUser(User, bcrypt, { username: 'editor-other', email: `editor-other${Date.now()}@example.com`, type: 'Vendor' });
    const otherToken = makeToken({ userId: other._id.toString(), role: 'Vendor' });

    const res = await request(app)
      .patch(`/api/vendors/lot/${lot._id}/slots/${slot._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Hijacked' });

    expect(res.statusCode).toBe(404);
  });
});
