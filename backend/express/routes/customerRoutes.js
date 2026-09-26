import { Router } from "express";
import { showLots, bookingSlot, viewBookings, cancelbooking } from "../controllers/customerController.js";
import { authenticate, requireCustomer } from "../middleware/auth.js";
import { validate } from "../validators/validate.js";
import { createBookingSchema } from "../validators/bookingValidators.js";

const router = Router();

router.get("/showlots", authenticate, requireCustomer, showLots);
router.post("/bookslot/:lotid", authenticate, requireCustomer, validate(createBookingSchema), bookingSlot);
router.get("/mybookings", authenticate, requireCustomer, viewBookings);
router.patch("/cancelbooking/:bookingid", authenticate, requireCustomer, cancelbooking);

export default router;
