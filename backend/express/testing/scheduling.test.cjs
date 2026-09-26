const bcrypt = require('bcryptjs');
const { createUser } = require('./helpers.cjs');

let User, parkingLot, parkingSlot, Booking, transitionBookings;
beforeAll(async () => {
  User = (await import('../model/userModel.js')).default;
  parkingLot = (await import('../model/parkingLotModel.js')).default;
  parkingSlot = (await import('../model/parkingSlot.js')).default;
  Booking = (await import('../model/bookingModel.js')).default;
  ({ transitionBookings } = await import('../extras/scheduling.js'));
});

test('moves an upcoming booking to active and an active booking to completed at the right times', async () => {
  if (!global.__MONGO_READY__) return;

  const vendor = await createUser(User, bcrypt, { username: 'vendor', email: 'sched-vendor@example.com', type: 'Vendor' });
  const lot = await parkingLot.create({
    name: 'Scheduling Lot', createdBy: vendor._id, hourlyRates: 20,
    boundary: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
    meta: { location: { addressLine: 'A', city: 'C', state: 'S', pincode: '000000' } },
  });
  const customer = await createUser(User, bcrypt, { username: 'sched-cust', email: 'sched-cust@example.com', type: 'Customer' });

  const upcomingSlot = await parkingSlot.create({ lotId: lot._id, name: 'S1', status: 'AVAILABLE' });
  const activeSlot = await parkingSlot.create({ lotId: lot._id, name: 'S2', status: 'OCCUPIED' });

  const now = new Date();
  const upcomingBooking = await Booking.create({
    userId: customer._id, lotId: lot._id, slotId: upcomingSlot._id,
    startTime: new Date(now.getTime() - 60000), endTime: new Date(now.getTime() + 3600000),
    amount: 20, status: 'UPCOMING', bookingType: 'ONLINE',
  });
  const activeBooking = await Booking.create({
    userId: customer._id, lotId: lot._id, slotId: activeSlot._id,
    startTime: new Date(now.getTime() - 7200000), endTime: new Date(now.getTime() - 60000),
    amount: 40, status: 'ACTIVE', bookingType: 'ONLINE',
  });
  await parkingSlot.findByIdAndUpdate(activeSlot._id, { currentbookingId: activeBooking._id });

  await transitionBookings(now);

  const refreshedUpcoming = await Booking.findById(upcomingBooking._id);
  const refreshedActive = await Booking.findById(activeBooking._id);
  const refreshedUpcomingSlot = await parkingSlot.findById(upcomingSlot._id);
  const refreshedActiveSlot = await parkingSlot.findById(activeSlot._id);

  expect(refreshedUpcoming.status).toBe('ACTIVE');
  expect(refreshedUpcomingSlot.status).toBe('OCCUPIED');
  expect(refreshedActive.status).toBe('COMPLETED');
  expect(refreshedActiveSlot.status).toBe('AVAILABLE');
  expect(refreshedActiveSlot.currentbookingId).toBeNull();
}, 20000);
