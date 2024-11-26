const {
  Doctor,
  Receptionist,
  Appointment,
  Patient,
  sequelize,
} = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { transporter } = require("../services/emailService");
const { Op, fn, literal, col } = require("sequelize");
const moment = require("moment");
const crypto = require("crypto");

const generateUniqueDoctorId = async (name) => {
  const nameParts = name.split(" ");
  const initials = nameParts
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  let uniqueId;
  let isUnique = false;

  // Loop until a unique ID is generated
  while (!isUnique) {
    const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5-digit random number
    uniqueId = `${initials}${randomDigits}`;

    // Check if this ID already exists in the database
    const existingDoctor = await Doctor.findOne({
      where: { doctorId: uniqueId },
    });

    // If the ID doesn't exist, it's unique
    if (!existingDoctor) {
      isUnique = true;
    }
  }

  return uniqueId;
};

const doctorController = {
  async register(req, res) {
    const {
      name,
      clinicName,
      mobileNumber,
      address,
      email,
      dateOfBirth,
      gender,
      password,
      medicalLicenceNumber,
      registrationAuthority,
      dateOfRegistration,
      medicalDegree,
      governmentId,
    } = req.body;

    try {
      // Check if doctor already exists
      const existingDoctor = await Doctor.findOne({ where: { email } });
      const existingReceptionist = await Receptionist.findOne({
        where: { email },
      });

      // If email exists in either Doctor or Receptionist
      if (existingDoctor || existingReceptionist) {
        return res
          .status(400)
          .json({ error: "Email is already registered with another user." });
      }

      // Hash the password using bcryptjs
      const hashedPassword = await bcrypt.hash(password, 10);
      const token = crypto.randomBytes(32).toString("hex");

      // Generate unique doctor ID
      const doctorId = await generateUniqueDoctorId(name);

      // Create the doctor
      await Doctor.create({
        name,
        clinicName,
        doctorId,
        mobileNumber,
        address,
        email,
        dateOfBirth,
        gender,
        medicalLicenceNumber,
        registrationAuthority,
        dateOfRegistration,
        medicalDegree,
        governmentId,
        profile: req.file?.buffer || null,
        profileContentType: req.file?.mimetype || null,
        password: hashedPassword, // Save hashed password
        verificationToken: token,
      });

      // Send verification email
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Verify your email",
        html: `<p>Click <a href="${process.env.CLIENT_URL}/api/auth/verify/${token}">here</a> to verify your email.</p>`,
      };

      await transporter.sendMail(mailOptions);

      return res.status(201).json({
        message: "Doctor registered successfully, Please verify your email.",
        doctorId,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Registration failed", details: error.message });
    }
  },

  async verifyEmail(req, res) {
    const { token } = req.params;

    try {
      // Find the user by the verification token
      const user = await Doctor.findOne({
        where: { verificationToken: token },
      });

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      user.verified = true;
      await user.save();

      return res.status(200).json({ message: "Email verified successfully" });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to verify email",
        details: error.message,
      });
    }
  },

  // Doctor login
  async login(req, res) {
    const { email, password } = req.body;

    try {
      let user;
      let userType;
      let acceptedTAndC;
      let hospitalId;

      // Check if the email exists in the Doctor model
      user = await Doctor.findOne({ where: { email } });
      if (user) {
        userType = "doctor";
        acceptedTAndC = user.acceptedTAndC;
        hospitalId = user.id;
      }

      // If not found in Doctor model, check in Receptionist model
      if (!user) {
        user = await Receptionist.findOne({ where: { email } });
        if (user) {
          userType = "receptionist";
          hospitalId = user.doctorId;
        }
      }

      // If no user is found in either model, return error
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (userType === "doctor" && user.verified === false) {
        return res.status(400).json({ error: "Please verify your email" });
      }

      // Compare password using bcryptjs
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate JWT token with userType
      const payload = {
        id: user.id,
        email: user.email,
        role: userType,
        hospitalId,
      };
      if (userType === "doctor") {
        payload.acceptedTAndC = acceptedTAndC;
      }
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      return res.status(200).json({
        message: "Login successful!",
        token,
        hospitalId,
        role: userType,
        acceptedTAndC,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Login failed", details: error.message });
    }
  },

  async acceptTermsAndConditions(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    try {
      const doctor = await Doctor.findOne({
        where: { id: req.user.id },
      });

      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }

      doctor.acceptedTAndC = true;

      await doctor.save();

      const payload = {
        id: doctor.id,
        email: doctor.email,
        role: "doctor",
        acceptedTAndC: doctor.acceptedTAndC,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      return res.status(200).json({
        message: "Terms and conditions accepted",
        token,
        acceptedTAndC: true,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to retrieve appointments",
        details: error.message,
      });
    }
  },

  // Forgot password
  async forgotPassword(req, res) {
    const { email } = req.body;

    try {
      // Check if doctor exists
      let user;
      let userType;

      // Check if the email exists in the Doctor model
      user = await Doctor.findOne({ where: { email } });
      if (user) {
        userType = "doctor";
      }

      // If not found in Doctor model, check in Receptionist model
      if (!user) {
        user = await Receptionist.findOne({ where: { email } });
        if (user) {
          userType = "receptionist";
        }
      }

      // If no user is found in either model, return error
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate a reset token
      const resetToken = jwt.sign(
        { id: user.id, email: user.email, role: userType },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Password Reset Request",
        html: `<p>You requested for a password reset. Click <a href="${process.env.CLIENT_URL}/reset-password/${resetToken}">here</a> to reset your password. The link will expire in 1 hour.</p>`,
      };

      await transporter.sendMail(mailOptions);

      return res
        .status(200)
        .json({ message: "Password reset email sent successfully." });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Error in sending email", details: error.message });
    }
  },

  // Reset password
  async resetPassword(req, res) {
    const { token, newPassword } = req.body;

    try {
      // Verify the reset token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let user;

      if (decoded.role === "doctor") {
        user = await Doctor.findOne({ where: { id: decoded.id } });
      } else {
        user = await Receptionist.findOne({ where: { id: decoded.id } });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the doctor's password
      await user.update(
        { password: hashedPassword },
        { where: { id: user.id } }
      );

      return res.status(200).json({ message: "Password reset successfully!" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Invalid or expired token.", details: error.message });
    }
  },

  async setFees(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" }); // Unauthorized
    }

    const { fees } = req.body;

    // Check if fees is provided
    if (!fees) {
      return res.status(400).json({ error: "Fees cannot be empty" });
    }

    // Check if fees is a number
    if (isNaN(fees)) {
      return res.status(400).json({ error: "Fees must be a valid number" });
    }

    // Convert fees to a number if it's a string
    const feesValue = parseFloat(fees);

    // Check if fees is a positive number
    if (feesValue <= 0) {
      return res.status(400).json({ error: "Fees must be a positive value" });
    }

    try {
      const doctor = await Doctor.findOne({ where: { id: req.user.id } });
      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      await doctor.update(
        { fees: fees },
        {
          where: { id: req.user.id },
        }
      );
      return res.status(200).json({ message: "Fees updated successfully!" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to add fee", details: error.message });
    }
  },

  async getFees(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" }); // Unauthorized
    }

    try {
      const doctor = await Doctor.findByPk(req.user.id);
      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }

      res.status(200).json({ fees: doctor.fees });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to get fees", details: error.message });
    }
  },

  async changePassword(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" }); // Unauthorized
    }

    const { oldPassword, newPassword } = req.body;

    try {
      const doctor = await Doctor.findByPk(req.user.id);

      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }

      const isValidPassword = await bcrypt.compare(
        oldPassword,
        doctor.password
      );

      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid old password" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      doctor.password = hashedPassword;

      await doctor.save();

      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to change password", details: error.message });
    }
  },

  async paymentScanner(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    try {
      const doctor = await Doctor.findByPk(req.user.hospitalId);

      doctor.paymentQr = req.file.buffer;
      doctor.qrContentType = req.file.mimetype;

      await doctor.save();

      res.status(200).json({
        message: "Payment QR updated successfully",
        paymentQr: doctor.paymentQr,
        qrContentType: doctor.qrContentType,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to upload  payment QR",
        details: error.message,
      });
    }
  },

  async addSignature(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    try {
      const doctor = await Doctor.findByPk(req.user.id);

      doctor.signature = req.file.buffer;
      doctor.signatureContentType = req.file.mimetype;

      await doctor.save();

      res.status(200).json({
        message: "Signature added successfully",
        signature: doctor.signature,
        signatureContentType: doctor.signatureContentType,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to upload  signature", details: error.message });
    }
  },

  async setCheckInOutTime(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const doctorId = req.user.id;
    const { checkInTime, checkOutTime } = req.body; // Optional, or set default to current time
    if (!checkInTime && !checkOutTime) {
      return res.status(400).json({
        error: "Please provide atleast one of checkInTime or checkOutTime",
      });
    }

    try {
      // Check if doctor exists
      const doctor = await Doctor.findOne({ where: { id: doctorId } });
      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }

      // Update check-in and check-out times
      await doctor.update({
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
      });

      return res.status(200).json({
        message: "Check-in and check-out times updated successfully!",
        doctor: {
          doctorId: doctor.doctorId,
          checkInTime: doctor.checkInTime,
          checkOutTime: doctor.checkOutTime,
        },
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to set check-in and check-out times",
        details: error.message,
      });
    }
  },

  async getCheckInCheckOutTime(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" });
    }
    const doctorId = req.user.id;
    try {
      const doctor = await Doctor.findOne({ where: { id: doctorId } });
      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      return res.status(200).json({
        checkInTime: doctor?.checkInTime,
        checkOutTime: doctor?.checkOutTime,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to set check-in and check-out times",
        details: error.message,
      });
    }
  },

  async getPaymentScanner(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    try {
      const doctor = await Doctor.findByPk(req.user.hospitalId);

      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }

      res.status(200).json({
        paymentQr: doctor.paymentQr,
        qrContentType: doctor.qrContentType,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to change password", details: error.message });
    }
  },

  async getSignature(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    try {
      const doctor = await Doctor.findByPk(req.user.id);

      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }

      res.status(200).json({
        signature: doctor.signature,
        signatureContentType: doctor.signatureContentType,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to change password", details: error.message });
    }
  },

  async editDoctor(req, res) {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized request" });
    }
    const doctorId = req.user.id;
    const {
      name,
      clinicName,
      mobileNumber,
      address,
      email,
      dateOfBirth,
      gender,
      password,
      medicalLicenceNumber,
      registrationAuthority,
      dateOfRegistration,
      medicalDegree,
      governmentId,
    } = req.body;

    const transaction = await sequelize.transaction();
    try {
      // Check if doctor exists
      const doctor = await Doctor.findOne({
        where: { id: doctorId },
        transaction,
      });

      if (!doctor) {
        await transaction.rollback();
        return res.status(404).json({ error: "Doctor not found" });
      }

      // // Check if email is used by another user (Doctor or Receptionist)
      // const existingDoctor = await Doctor.findOne({
      //   where: { email, id: { [Op.ne]: doctor.id } },
      //   transaction,
      // });
      // const existingReceptionist = await Receptionist.findOne({
      //   where: { email },
      //   transaction,
      // });

      // if (existingDoctor || existingReceptionist) {
      //   await transaction.rollback();
      //   return res
      //     .status(400)
      //     .json({ error: "Email is already registered with another user." });
      // }

      // // Update hashed password if a new password is provided
      // let hashedPassword;
      // if (password) {
      //   hashedPassword = await bcrypt.hash(password, 10);
      // }

      // Update doctor information
      await doctor.update(
        {
          name: name || doctor.name,
          clinicName: clinicName || doctor.clinicName,
          mobileNumber: mobileNumber || doctor.mobileNumber,
          address: address || doctor.address,
          // email: email || doctor.email,
          dateOfBirth: dateOfBirth || doctor.dateOfBirth,
          gender: gender || doctor.gender,
          medicalLicenceNumber:
            medicalLicenceNumber || doctor.medicalLicenceNumber,
          registrationAuthority:
            registrationAuthority || doctor.registrationAuthority,
          dateOfRegistration: dateOfRegistration || doctor.dateOfRegistration,
          medicalDegree: medicalDegree || doctor.medicalDegree,
          governmentId: governmentId || doctor.governmentId,
          // password: hashedPassword || doctor.password,
        },
        { transaction }
      );

      await transaction.commit();
      return res.status(200).json({
        message: "Doctor information updated successfully!",
        doctorId: doctor.doctorId,
      });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({
        error: "Failed to update doctor information",
        details: error.message,
      });
    }
  },

  async removeDoctor(req, res) {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized request" });
    }
    const doctorId = req.user.id;

    const transaction = await sequelize.transaction();
    try {
      // Check if doctor exists
      const doctor = await Doctor.findOne({
        where: { id: doctorId },
        transaction,
      });
      if (!doctor) {
        await transaction.rollback();
        return res.status(404).json({ error: "Doctor not found" });
      }

      // Delete the doctor record
      await doctor.destroy({ transaction });

      await transaction.commit();
      return res.status(200).json({ message: "Doctor removed successfully!" });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({
        error: "Failed to remove doctor",
        details: error.message,
      });
    }
  },

  async getDoctor(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    try {
      const doctor = await Doctor.findByPk(req.user.hospitalId);
      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }
      doctor.password = "";
      res.status(200).json({ doctor });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to change password", details: error.message });
    }
  },

  async getAppointmentStatisticsByDoctor(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const doctorId = req.user.hospitalId;

    try {
      // Get total number of appointments for the doctor
      const totalAppointments = await Appointment.count({
        where: {
          date: {
            [Op.between]: [
              new Date().setHours(0, 0, 0, 0), // Start of the day
              new Date().setHours(23, 59, 59, 59), // End of the day
            ],
          },
        },

        include: [
          {
            model: Patient,
            as: "patient",
            where: { doctorId },
          },
        ],
      });

      // Get total number of completed appointments (status = 'in') for the doctor
      const totalCompletedAppointments = await Appointment.count({
        include: [
          {
            model: Patient,
            as: "patient",
            where: { doctorId },
          },
        ],
        where: {
          status: {
            [Op.in]: ["in", "out"],
          },
          date: {
            [Op.between]: [
              new Date().setHours(0, 0, 0, 0), // Start of the day
              new Date().setHours(23, 59, 59, 59), // End of the day
            ],
          },
        },
      });

      // Get total number of pending appointments (status is null) for the doctor
      const totalPendingAppointments = await Appointment.count({
        include: [
          {
            model: Patient,
            as: "patient",
            where: { doctorId },
          },
        ],
        where: {
          status: {
            [Op.is]: null, // Status is null
          },
          date: {
            [Op.between]: [
              new Date().setHours(0, 0, 0, 0), // Start of the day
              new Date().setHours(23, 59, 59, 59), // End of the day
            ],
          },
        },
      });

      return res.status(200).json({
        stats: {
          totalAppointments,
          totalCompletedAppointments,
          totalPendingAppointments,
        },
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to change password", details: error.message });
    }
  },

  async getAgeGroupCounts(req, res) {
    // Check if user is a doctor
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const { month, year } = req.query;

    const currentMonth = month || moment().month() + 1; // Default to current month
    const currentYear = year || moment().year(); // Default to current year

    try {
      const startOfMonth = moment(`${currentYear}-${currentMonth}-01`)
        .startOf("month")
        .toDate();
      const endOfMonth = moment(`${currentYear}-${currentMonth}-01`)
        .endOf("month")
        .toDate();

      // Get patients associated with the doctor for the given month and year
      const ageGroupCounts = await Patient.findAll({
        where: {
          createdAt: {
            [Op.between]: [startOfMonth, endOfMonth], // Filtering by the specified month and year
          },
          doctorId: req.user.id, // Only fetch patients for the logged-in doctor
        },
      });

      // Count patients by age groups
      const youngCount = ageGroupCounts.filter(
        (patient) => patient.age <= 17
      ).length;
      const adultCount = ageGroupCounts.filter(
        (patient) => patient.age >= 18 && patient.age <= 49
      ).length;
      const seniorCount = ageGroupCounts.filter(
        (patient) => patient.age >= 50
      ).length;

      return res.status(200).json({
        data: {
          youngCount,
          adultCount,
          seniorCount,
        },
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to retrieve age group counts",
        details: error.message,
      });
    }
  },

  async getGenderPercentage(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" });
    }
    const { month, year } = req.query;

    const currentMonth = month || moment().month() + 1; // Default to current month
    const currentYear = year || moment().year(); // Default to current year

    try {
      const startOfMonth = moment(`${currentYear}-${currentMonth}-01`)
        .startOf("month")
        .toDate();
      const endOfMonth = moment(`${currentYear}-${currentMonth}-01`)
        .endOf("month")
        .toDate();

      const patients = await Patient.findAll({
        where: {
          createdAt: {
            [Op.between]: [startOfMonth, endOfMonth],
          },
          doctorId: req.user.id,
        },
      });

      const totalPatients = patients.length;

      const maleCount = patients.filter(
        (patient) => patient.gender === "male"
      ).length;
      const femaleCount = patients.filter(
        (patient) => patient.gender === "female"
      ).length;
      const otherCount = patients.filter(
        (patient) => patient.gender === "other"
      ).length;

      const malePercentage = totalPatients
        ? ((maleCount / totalPatients) * 100).toFixed(2)
        : 0;
      const femalePercentage = totalPatients
        ? ((femaleCount / totalPatients) * 100).toFixed(2)
        : 0;
      const otherPercentage = totalPatients
        ? ((otherCount / totalPatients) * 100).toFixed(2)
        : 0;

      return res.status(200).json({
        data: {
          malePercentage,
          femalePercentage,
          otherPercentage,
        },
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to retrieve gender percentages",
        details: error.message,
      });
    }
  },

  async getRevenueByMonth(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const { month, year } = req.query;
    const currentMonth = month || moment().month() + 1; // Default to current month
    const currentYear = year || moment().year(); // Default to current year

    try {
      // Calculate start and end dates for the given month and year
      const startOfMonth = moment(`${currentYear}-${currentMonth}-01`)
        .startOf("month")
        .toDate();
      const endOfMonth = moment(`${currentYear}-${currentMonth}-01`)
        .endOf("month")
        .toDate();

      // Query the database for appointments within the specified month and year
      const revenue = await Appointment.sum("fees", {
        where: {
          date: {
            [Op.between]: [startOfMonth, endOfMonth], // Filter by date range (start and end of the month)
          },
        },
        include: [
          {
            model: Patient,
            as: "patient",
            where: { doctorId: req.user.id }, // Filter appointments by doctor's ID
            attributes: [], // Don't return patient data, just filter by doctorId
          },
        ],
      });

      // If revenue is null or undefined, return 0
      return res.status(200).json({ revenue: revenue || 0 });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to calculate revenue",
        details: error.message,
      });
    }
  },

  async getRevenueByYear(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const { year } = req.query;
    const currentYear = year || moment().year(); // Default to current year

    try {
      // Query to calculate revenue by month for the given year
      const revenueByMonth = await Appointment.findAll({
        attributes: [
          [fn("MONTH", col("date")), "month"], // Extract month from the date
          [fn("SUM", col("fees")), "revenue"], // Sum of fees for each month
        ],
        where: {
          date: {
            [Op.between]: [
              new Date(`${currentYear}-01-01`),
              new Date(`${currentYear}-12-31`),
            ],
          },
        },
        include: [
          {
            model: Patient,
            as: "patient",
            where: { doctorId: req.user.id }, // Filter by doctor's ID
            attributes: [], // No need to return patient attributes
          },
        ],
        group: [literal("MONTH(date)")], // Group by month
        order: [[literal("MONTH(date)"), "ASC"]], // Order by month
      });

      // Transform the data into a more readable format
      const monthlyRevenue = Array(12).fill(0); // Initialize an array with 12 months set to 0
      revenueByMonth.forEach((item) => {
        const monthIndex = item.dataValues.month - 1; // Convert month to array index
        monthlyRevenue[monthIndex] = parseFloat(item.dataValues.revenue); // Store revenue in the correct month
      });

      return res.status(200).json({ year: currentYear, monthlyRevenue });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to calculate revenue by year",
        details: error.message,
      });
    }
  },
};

module.exports = doctorController;
