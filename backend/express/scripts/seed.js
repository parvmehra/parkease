import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import User from "../model/userModel.js";
import parkingLot from "../model/parkingLotModel.js";
import parkingSlot from "../model/parkingSlot.js";
import Booking from "../model/bookingModel.js";
import Notification from "../model/notificationModel.js";
import { ROLES, SLOT_STATUS, SLOT_TYPE, BOOKING_STATUS, BOOKING_TYPE } from "../constants/index.js";

const DEMO_PASSWORD = "Demo@1234";
const hour = 60 * 60 * 1000;
const day = 24 * hour;

async function seed() {
    await mongoose.connect(env.mongoUri);
    await Promise.all([
        User.deleteMany({}),
        parkingLot.deleteMany({}),
        parkingSlot.deleteMany({}),
        Booking.deleteMany({}),
        Notification.deleteMany({}),
    ]);

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const [vendor, customer] = await User.create([
        { username: "Demo Vendor", email: "vendor@parkease.demo", password: passwordHash, type: ROLES.VENDOR },
        { username: "Demo Customer", email: "customer@parkease.demo", password: passwordHash, type: ROLES.CUSTOMER },
    ]);

    const lots = await parkingLot.create([
        {
            name: "Connaught Place Parking",
            description: "Multi-level parking near Connaught Place",
            createdBy: vendor._id,
            hourlyRates: 40,
            boundary: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 30 }, { x: 0, y: 30 }],
            meta: { location: { addressLine: "Block A, Connaught Place", area: "Connaught Place", city: "New Delhi", state: "Delhi", pincode: "110001" } },
        },
        {
            name: "Koramangala Hub Parking",
            description: "Covered parking near Koramangala Hub",
            createdBy: vendor._id,
            hourlyRates: 30,
            boundary: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 0, y: 20 }],
            meta: { location: { addressLine: "80 Feet Road, 5th Block", area: "Koramangala", city: "Bengaluru", state: "Karnataka", pincode: "560095" } },
        },
        {
            name: "Indiranagar Metro Parking",
            description: "Open-air parking beside the metro station",
            createdBy: vendor._id,
            hourlyRates: 25,
            boundary: [{ x: 0, y: 0 }, { x: 36, y: 0 }, { x: 36, y: 18 }, { x: 0, y: 18 }],
            meta: { location: { addressLine: "100 Feet Road", area: "Indiranagar", city: "Bengaluru", state: "Karnataka", pincode: "560038" } },
        },
    ]);

    const slotBlueprint = [SLOT_TYPE.NORMAL, SLOT_TYPE.NORMAL, SLOT_TYPE.COMPACT, SLOT_TYPE.LARGE, SLOT_TYPE.EV, SLOT_TYPE.ACCESSIBLE];

    const lotSlots = [];
    for (const lot of lots) {
        const slots = await parkingSlot.create(
            slotBlueprint.map((slotType, index) => ({
                lotId: lot._id,
                name: `${lot.name.split(" ")[0].slice(0, 2).toUpperCase()}-${index + 1}`,
                slotType,
                status: index === slotBlueprint.length - 1 ? SLOT_STATUS.UNAVAILABLE : SLOT_STATUS.AVAILABLE,
                vertices: [
                    { x: index * 6 + 2, y: 4 },
                    { x: index * 6 + 6, y: 4 },
                    { x: index * 6 + 6, y: lot.boundary[2].y - 4 },
                    { x: index * 6 + 2, y: lot.boundary[2].y - 4 },
                ],
            }))
        );
        lotSlots.push({ lot, slots });
    }

    const now = new Date();
    const bookings = [];

    function addBooking({ lot, slot, startTime, endTime, status, bookingType = BOOKING_TYPE.ONLINE }) {
        const amount = Math.ceil((endTime - startTime) / hour) * lot.hourlyRates;
        bookings.push({ userId: customer._id, lotId: lot._id, slotId: slot._id, startTime, endTime, amount, status, bookingType });
    }

    const { lot: cpLot, slots: cpSlots } = lotSlots[0];
    const { lot: koLot, slots: koSlots } = lotSlots[1];
    const { lot: inLot, slots: inSlots } = lotSlots[2];

    const upcomingStart = new Date(now.getTime() + 3 * hour);
    addBooking({ lot: cpLot, slot: cpSlots[0], startTime: upcomingStart, endTime: new Date(upcomingStart.getTime() + 2 * hour), status: BOOKING_STATUS.UPCOMING });

    const activeStart = new Date(now.getTime() - hour);
    addBooking({ lot: cpLot, slot: cpSlots[1], startTime: activeStart, endTime: new Date(activeStart.getTime() + 3 * hour), status: BOOKING_STATUS.ACTIVE });

    const cancelledStart = new Date(now.getTime() + 5 * hour);
    addBooking({ lot: cpLot, slot: cpSlots[3], startTime: cancelledStart, endTime: new Date(cancelledStart.getTime() + hour), status: BOOKING_STATUS.CANCELLED });

    const historyLots = [
        { lot: cpLot, slots: cpSlots },
        { lot: koLot, slots: koSlots },
        { lot: inLot, slots: inSlots },
    ];
    for (let dayOffset = 1; dayOffset <= 6; dayOffset++) {
        historyLots.forEach(({ lot, slots }, lotIndex) => {
            const bookingsThatDay = 1 + ((dayOffset + lotIndex) % 3);
            for (let n = 0; n < bookingsThatDay; n++) {
                const slot = slots[(dayOffset + n) % (slots.length - 1)];
                const startTime = new Date(now.getTime() - dayOffset * day + (n * 3 + lotIndex) * hour);
                const durationHours = 1 + ((dayOffset + n) % 4);
                const endTime = new Date(startTime.getTime() + durationHours * hour);
                addBooking({ lot, slot, startTime, endTime, status: BOOKING_STATUS.COMPLETED });
            }
        });
    }

    const manualStart = new Date(now.getTime() - 2 * hour);
    addBooking({ lot: koLot, slot: koSlots[2], startTime: manualStart, endTime: new Date(manualStart.getTime() + hour), status: BOOKING_STATUS.COMPLETED, bookingType: BOOKING_TYPE.MANUAL });

    const created = await Booking.insertMany(bookings);
    const activeBooking = created.find((b) => b.status === BOOKING_STATUS.ACTIVE);
    if (activeBooking) {
        await parkingSlot.findByIdAndUpdate(activeBooking.slotId, { status: SLOT_STATUS.OCCUPIED, currentbookingId: activeBooking._id });
    }

    await Notification.create([
        {
            userId: customer._id,
            type: "BOOKING_CONFIRMED",
            title: "Booking confirmed",
            message: `Your booking at ${cpLot.name} is confirmed.`,
            metadata: { lotId: cpLot._id },
        },
        {
            userId: vendor._id,
            type: "NEW_BOOKING",
            title: "New booking",
            message: `A customer booked a slot at ${cpLot.name}.`,
            metadata: { lotId: cpLot._id },
        },
    ]);

    console.log("Seed data created.");
    console.log("Demo vendor login:   vendor@parkease.demo /", DEMO_PASSWORD);
    console.log("Demo customer login: customer@parkease.demo /", DEMO_PASSWORD);
    console.log(`Seeded ${lots.length} lots, ${lotSlots.reduce((sum, l) => sum + l.slots.length, 0)} slots, ${created.length} bookings.`);

    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
});
