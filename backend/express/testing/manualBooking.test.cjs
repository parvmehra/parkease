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

async function makeVendorLotSlot() {
  const vendor = await createUser(User, bcrypt, { username: 'vendor', email: `manvendor${Date.now()}@example.com`, type: 'Vendor' });
  const lot = await parkingLot.create({
    name: `Manual Lot ${Date.now()}`, createdBy: vendor._id, hourlyRates: 30,
    boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
    meta: { location: { addressLine: 'A', city: 'C', state: 'S', pincode: '000000' } },
  });
  const slot = await parkingSlot.create({ lotId: lot._id, name: 'S1', status: 'AVAILABLE' });
  return { vendor, lot, slot };
}

describe('Manual (walk-in) parking sessions', () => {
  test('starting a session occupies the slot, completing it frees the slot and calculates an amount', async () => {
    if (!global.__MONGO_READY__) return;
    const { vendor, lot, slot } = await makeVendorLotSlot();
    const token = makeToken({ userId: vendor._id.toString(), role: 'Vendor' });

    const startRes = await request(app)
      .patch(`/api/vendors/lot/manualbooking/${lot._id}/${slot._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(startRes.statusCode).toBe(201);

    const occupied = await parkingSlot.findById(slot._id);
    expect(occupied.status).toBe('OCCUPIED');

    const completeRes = await request(app)
      .patch(`/api/vendors/lot/manualcomplete/${lot._id}/${slot._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(completeRes.statusCode).toBe(200);
    expect(completeRes.body.data.amount).toBeGreaterThan(0);

    const freed = await parkingSlot.findById(slot._id);
    expect(freed.status).toBe('AVAILABLE');
    expect(freed.currentbookingId).toBeNull();
  });

  test('cannot start a manual session on an already occupied slot', async () => {
    if (!global.__MONGO_READY__) return;
    const { vendor, lot, slot } = await makeVendorLotSlot();
    const token = makeToken({ userId: vendor._id.toString(), role: 'Vendor' });

    await request(app).patch(`/api/vendors/lot/manualbooking/${lot._id}/${slot._id}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).patch(`/api/vendors/lot/manualbooking/${lot._id}/${slot._id}`).set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(409);
  });

  test('vendor cannot start a manual session on another vendor\'s lot', async () => {
    if (!global.__MONGO_READY__) return;
    const { lot, slot } = await makeVendorLotSlot();
    const otherVendor = await createUser(User, bcrypt, { username: 'other', email: `othervendor${Date.now()}@example.com`, type: 'Vendor' });
    const token = makeToken({ userId: otherVendor._id.toString(), role: 'Vendor' });

    const res = await request(app).patch(`/api/vendors/lot/manualbooking/${lot._id}/${slot._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });
});

describe('Slot availability management', () => {
  test('vendor can mark a slot unavailable and it cancels active/upcoming bookings', async () => {
    if (!global.__MONGO_READY__) return;
    const { vendor, lot, slot } = await makeVendorLotSlot();
    const token = makeToken({ userId: vendor._id.toString(), role: 'Vendor' });

    const res = await request(app)
      .patch(`/api/vendors/lot/changestatus/${lot._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ slotIds: [slot._id.toString()], statusto: 'UNAVAILABLE' });

    expect(res.statusCode).toBe(200);
    const updated = await parkingSlot.findById(slot._id);
    expect(updated.status).toBe('UNAVAILABLE');
  });
});
