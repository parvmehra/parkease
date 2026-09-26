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

async function bookAndReturn(customerToken, lotId, slotId) {
  const start = new Date(Date.now() + 3600000).toISOString();
  const end = new Date(Date.now() + 7200000).toISOString();
  return request(app)
    .post(`/api/customers/bookslot/${lotId}`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ slotids: [slotId], startTimeVar: start, endTimeVar: end });
}

test('booking creates notifications for both customer and vendor, unread counts work, and mark-read/mark-all-read work', async () => {
  if (!global.__MONGO_READY__) return;

  const vendor = await createUser(User, bcrypt, { username: 'notif-vendor', email: 'notif-vendor@example.com', type: 'Vendor' });
  const customer = await createUser(User, bcrypt, { username: 'notif-cust', email: 'notif-cust@example.com', type: 'Customer' });
  const lot = await parkingLot.create({
    name: 'Notification Lot', createdBy: vendor._id, hourlyRates: 20,
    boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
    meta: { location: { addressLine: 'A', city: 'C', state: 'S', pincode: '000000' } },
  });
  const slot = await parkingSlot.create({ lotId: lot._id, name: 'S1', status: 'AVAILABLE' });

  const customerToken = makeToken({ userId: customer._id.toString(), role: 'Customer' });
  const vendorToken = makeToken({ userId: vendor._id.toString(), role: 'Vendor' });

  const bookRes = await bookAndReturn(customerToken, lot._id, slot._id);
  expect(bookRes.statusCode).toBe(201);

  const customerNotifs = await request(app).get('/api/notifications').set('Authorization', `Bearer ${customerToken}`);
  expect(customerNotifs.statusCode).toBe(200);
  expect(customerNotifs.body.data.unreadCount).toBe(1);
  expect(customerNotifs.body.data.items[0].type).toBe('BOOKING_CONFIRMED');

  const vendorNotifs = await request(app).get('/api/notifications').set('Authorization', `Bearer ${vendorToken}`);
  expect(vendorNotifs.statusCode).toBe(200);
  expect(vendorNotifs.body.data.unreadCount).toBe(1);
  expect(vendorNotifs.body.data.items[0].type).toBe('NEW_BOOKING');

  const notificationId = customerNotifs.body.data.items[0]._id;
  const markReadRes = await request(app)
    .patch(`/api/notifications/${notificationId}/read`)
    .set('Authorization', `Bearer ${customerToken}`);
  expect(markReadRes.statusCode).toBe(200);
  expect(markReadRes.body.data.read).toBe(true);

  const afterMarkRead = await request(app).get('/api/notifications').set('Authorization', `Bearer ${customerToken}`);
  expect(afterMarkRead.body.data.unreadCount).toBe(0);

  await bookAndReturn(customerToken, lot._id, slot._id).catch(() => {});
  const cancelRes = await request(app)
    .patch(`/api/customers/cancelbooking/${bookRes.body.data[0]._id}`)
    .set('Authorization', `Bearer ${customerToken}`);
  expect(cancelRes.statusCode).toBe(200);

  const markAllRes = await request(app).patch('/api/notifications/read-all').set('Authorization', `Bearer ${customerToken}`);
  expect(markAllRes.statusCode).toBe(200);

  const finalNotifs = await request(app).get('/api/notifications').set('Authorization', `Bearer ${customerToken}`);
  expect(finalNotifs.body.data.unreadCount).toBe(0);
});

test('a customer cannot mark another customer\'s notification as read', async () => {
  if (!global.__MONGO_READY__) return;
  const vendor = await createUser(User, bcrypt, { username: 'notif-vendor2', email: 'notif-vendor2@example.com', type: 'Vendor' });
  const owner = await createUser(User, bcrypt, { username: 'notif-owner', email: 'notif-owner@example.com', type: 'Customer' });
  const intruder = await createUser(User, bcrypt, { username: 'notif-intruder', email: 'notif-intruder@example.com', type: 'Customer' });
  const lot = await parkingLot.create({
    name: 'Notification Lot 2', createdBy: vendor._id, hourlyRates: 20,
    boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
    meta: { location: { addressLine: 'A', city: 'C', state: 'S', pincode: '000000' } },
  });
  const slot = await parkingSlot.create({ lotId: lot._id, name: 'S1', status: 'AVAILABLE' });
  const ownerToken = makeToken({ userId: owner._id.toString(), role: 'Customer' });
  const intruderToken = makeToken({ userId: intruder._id.toString(), role: 'Customer' });

  await bookAndReturn(ownerToken, lot._id, slot._id);
  const ownerNotifs = await request(app).get('/api/notifications').set('Authorization', `Bearer ${ownerToken}`);
  const notificationId = ownerNotifs.body.data.items[0]._id;

  const res = await request(app).patch(`/api/notifications/${notificationId}/read`).set('Authorization', `Bearer ${intruderToken}`);
  expect(res.statusCode).toBe(404);
});
