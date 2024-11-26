const express = require("express");
const router = express.Router();

const doctorController = require("../controllers/doctorController.js");
const {
  doctorRegistrationValidationRules,
  doctorLoginValidationRules,
  validate,
  passwordValidationRule,
} = require("../middlewares/doctorValidator");
const { upload } = require("../middlewares/upload.js");
const authorize = require("../middlewares/authorize.js");

// Doctor registration route with validation
router.post(
  "/register",
  upload.single("profile"),
  doctorRegistrationValidationRules,
  validate,
  doctorController.register
);

// Doctor login route with validation
router.post(
  "/login",
  doctorLoginValidationRules,
  validate,
  doctorController.login
);

router.post(
  "/accept-terms-and-conditions",
  authorize,
  doctorController.acceptTermsAndConditions
);

router.post("/verify-email/:token", doctorController.verifyEmail);

router.post("/forgot-password", doctorController.forgotPassword);

// Reset password route (using reset token)
router.post(
  "/reset-password",
  passwordValidationRule,
  validate,
  doctorController.resetPassword
);

router.post("/change-password", authorize, doctorController.changePassword);

router.post("/fees", authorize, doctorController.setFees);

router.get("/fees", authorize, doctorController.getFees);

router.post(
  "/payment-qr",
  authorize,
  upload.single("paymentQr"),
  doctorController.paymentScanner
);

router.post(
  "/add-signature",
  authorize,
  upload.single("signature"),
  doctorController.addSignature
);

router.put(
  "/set-check-in-out-time",
  authorize,
  doctorController.setCheckInOutTime
);

router.get(
  "/get-check-in-out-time",
  authorize,
  doctorController.getCheckInCheckOutTime
);

router.get("/payment-qr", authorize, doctorController.getPaymentScanner);

router.get("/get-signature", authorize, doctorController.getSignature);

router.put(
  "/",
  upload.single("profile"),
  authorize,
  doctorController.editDoctor
);

router.delete("/", authorize, doctorController.removeDoctor);

router.get("/get-doctor", authorize, doctorController.getDoctor);

router.get(
  "/appointments-stats",
  authorize,
  doctorController.getAppointmentStatisticsByDoctor
);

router.get("/age-group-counts", authorize, doctorController.getAgeGroupCounts);

router.get(
  "/gender-percentage",
  authorize,
  doctorController.getGenderPercentage
);

router.get("/revenue", authorize, doctorController.getRevenueByMonth);

router.get("/revenue-by-year", authorize, doctorController.getRevenueByYear);

module.exports = router;
