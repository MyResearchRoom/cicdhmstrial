const { check, validationResult, body } = require("express-validator");

const receptionistRegistrationValidationRules = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters long"),

  body("mobileNumber")
    .notEmpty()
    .withMessage("Mobile number is required")
    .isLength({ min: 10, max: 15 })
    .withMessage("Mobile number must be between 10 and 15 digits")
    .isNumeric()
    .withMessage("Mobile number must contain only numbers"),

  body("address").notEmpty().withMessage("Address is required"),

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email"),

  body("age").notEmpty().withMessage("Age is required"),

  body("dateOfJoining")
    .optional()
    .isDate()
    .withMessage("Please provide a valid date of birth"),

  body("gender")
    .notEmpty()
    .withMessage("Gender is required")
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be 'male', 'female', or 'other'"),

  body("qualification").notEmpty().withMessage("Qualification is required"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
    .withMessage("Password must contain at least one letter and one number"),
];

const doctorRegistrationValidationRules = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters long"),

  body("clinicName")
    .notEmpty()
    .withMessage("Clinic name is required")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters long"),

  body("mobileNumber")
    .notEmpty()
    .withMessage("Mobile number is required")
    .isLength({ min: 10, max: 15 })
    .withMessage("Mobile number must be between 10 and 15 digits")
    .isNumeric()
    .withMessage("Mobile number must contain only numbers"),

  body("address").notEmpty().withMessage("Address is required"),

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email"),

  body("dateOfBirth")
    .optional()
    .isDate()
    .withMessage("Please provide a valid date of birth"),

  body("gender")
    .notEmpty()
    .withMessage("Gender is required")
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be 'male', 'female', or 'other'"),

  body("medicalLicenceNumber")
    .notEmpty()
    .withMessage("medical licence number is required"),
  body("registrationAuthority")
    .notEmpty()
    .withMessage("Registration authority is required"),
  body("dateOfRegistration")
    .notEmpty()
    .withMessage("Date of registration is required"),
  body("medicalDegree").notEmpty().withMessage("Medical degree is required"),
  body("governmentId").notEmpty().withMessage("Government ID is required"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
    .withMessage("Password must contain at least one letter and one number"),
];

const doctorLoginValidationRules = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email"),

  check("password").notEmpty().withMessage("Password is required"),
];

const passwordValidationRule = [
  check("newPassword")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
    .withMessage("Password must contain at least one letter and one number"),
];

const patientRegistrationValidationRule = [
  check("name").notEmpty().withMessage("Name is required"),
  check("mobileNumber").notEmpty().withMessage("Mobile number is required"),
  check("age").notEmpty().withMessage("Age is required"),
  check("dateOfBirth").notEmpty().withMessage("Date of birth is required"),
  check("bloodGroup").notEmpty().withMessage("Blood group is required"),
  check("gender").notEmpty().withMessage("Gender is required"),
  check("reason").notEmpty().withMessage("Reason is required"),
  check("process").notEmpty().withMessage("Process is required"),
  check("date").notEmpty().withMessage("Appointment date is required"),
];

const patientAppointmentValidationRule = [
  check("reason").notEmpty().withMessage("Reason is required"),
  check("process").notEmpty().withMessage("Process is required"),
  check("date").notEmpty().withMessage("Appointment date is required"),
];

const medicineValidationRule = [
  check("name").notEmpty().withMessage("Name is required"),
  check("strength").notEmpty().withMessage("Strength is required"),
  check("form").notEmpty().withMessage("Form is required"),
  check("category").notEmpty().withMessage("Category is required"),
  check("brand").notEmpty().withMessage("Brand is required"),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  doctorRegistrationValidationRules,
  receptionistRegistrationValidationRules,
  patientRegistrationValidationRule,
  patientAppointmentValidationRule,
  doctorLoginValidationRules,
  passwordValidationRule,
  medicineValidationRule,
  validate,
};
