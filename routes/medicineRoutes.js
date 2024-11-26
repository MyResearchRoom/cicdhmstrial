const express = require("express");
const router = express.Router();

const medicineController = require("../controllers/medicineController.js");

const {
  validate,
  medicineValidationRule,
} = require("../middlewares/doctorValidator.js");
const authorize = require("../middlewares/authorize.js");

router.post(
  "/add",
  authorize,
  medicineValidationRule,
  validate,
  medicineController.addMedicine
);

router.get("/", authorize, medicineController.getAllMedicines);

router.put("/:id", authorize, medicineController.editMedicine);

router.delete("/:id", authorize, medicineController.deleteMedicine);

module.exports = router;
