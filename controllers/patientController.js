const { Op } = require("sequelize");

const {
  Patient,
  Appointment,
  Receptionist,
  Doctor,
  sequelize,
} = require("../models");
const { io } = require("../socket/socket");

const generateUniquePatientId = async (name) => {
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
    const existingDoctor = await Patient.findOne({
      where: { patientId: uniqueId },
    });

    // If the ID doesn't exist, it's unique
    if (!existingDoctor) {
      isUnique = true;
    }
  }

  return uniqueId;
};

const patientController = {
  async addPatient(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" }); // Unauthorized
    }

    const {
      name,
      mobileNumber,
      address,
      email,
      age,
      gender,
      reason,
      process,
      date,
      dateOfBirth,
      bloodGroup,
    } = req.body;

    const appointmentDate = new Date(date);

    if (appointmentDate < new Date()) {
      return res
        .status(400)
        .json({ error: "Appointment date cannot be in the past" });
    }

    const transaction = await sequelize.transaction();

    try {
      const doctor = await Doctor.findOne({
        where: { id: req.user.hospitalId },
        attributes: ["fees"],
        transaction, // Include the transaction
      });

      const patientId = await generateUniquePatientId(name);

      const existingPatient = await Patient.findOne(
        {
          where: { name, mobileNumber },
        },
        { transaction }
      );

      if (existingPatient) {
        await transaction.rollback(); // Rollback the transaction if the patient already exists
        return res.status(400).json({ error: "Patient already exists" });
      }

      const patient = await Patient.create(
        {
          name,
          patientId,
          mobileNumber,
          address,
          email,
          age,
          gender,
          dateOfBirth,
          bloodGroup,
          doctorId: req.user.hospitalId,
        },
        { transaction } // Include the transaction
      );

      const appointment = await Appointment.create(
        {
          patientId: patient.id,
          reason,
          date,
          process,
          fees: doctor?.fees || 0,
        },
        { transaction } // Include the transaction
      );

      await transaction.commit(); // Commit the transaction if everything succeeds

      if (
        appointment.date >= new Date().setHours(0, 0, 0, 0) &&
        appointment.date <= new Date().setHours(23, 59, 59, 59)
      ) {
        io.emit("newAppointment", {
          appointment,
          patient,
          hospitalId: req.user.hospitalId,
        });
      }

      res.status(201).json({
        message: "Patient added successfully",
        appointment,
        patient,
      });
    } catch (error) {
      await transaction.rollback(); // Rollback the transaction in case of error
      console.error(error);
      res
        .status(500)
        .json({ error: "Failed to add patient", details: error.message });
    }
  },

  async bookAppointment(req, res) {
    if (!req.user || req.user.role !== "receptionist") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const patientId = req.params.id;
    const { reason, date, process } = req.body;

    const appointmentDate = new Date(date);

    if (appointmentDate < new Date()) {
      return res
        .status(400)
        .json({ error: "Appointment date cannot be in the past" });
    }

    try {
      const doctor = await Doctor.findOne({
        where: { id: req.user.hospitalId },
        attributes: ["fees"],
        transaction, // Include the transaction
      });

      const patient = await Patient.findOne({
        where: { id: patientId },
      });

      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      const appointment = await Appointment.create({
        reason,
        date,
        process,
        patientId,
        fees: doctor?.fees || 0,
      });

      if (
        appointment.date >= new Date().setHours(0, 0, 0, 0) &&
        appointment.date <= new Date().setHours(23, 59, 59, 59)
      ) {
        io.emit("newAppointment", {
          appointment,
          patient,
          hospitalId: req.user.hospitalId,
        });
      }

      res.status(201).json({
        message: "Appointment booked successfully",
        appointment,
        patient,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to book appointment", details: error.message });
    }
  },

  async getPatients(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const { date, searchTerm } = req.query;

    const patientWhereClause = { doctorId: req.user.id };
    if (searchTerm) {
      patientWhereClause.name = { [Op.like]: `%${searchTerm}%` };
    }

    try {
      const providedDate = new Date(date);
      const startOfDay = new Date(providedDate);
      startOfDay.setHours(0, 0, 0, 0); // Start of the provided date

      const endOfDay = new Date(providedDate);
      endOfDay.setHours(23, 59, 59, 999); // End of the provided date

      const patients = await Patient.findAll({
        where: patientWhereClause,
        include: [
          {
            model: Appointment,
            as: "appointments",
            where: {
              date: {
                [Op.between]: [startOfDay, endOfDay],
              },
            },
            required: true, // Ensures only patients with matching appointments are included
            order: [["date", "DESC"]],
          },
        ],
      });

      res.status(200).json({ patients });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to get patients", details: error.message });
    }
  },

  async getPatientsForAppointment(req, res) {
    if (!req.user || req.user.role !== "receptionist") {
      return res.status(401).json({ error: "Unauthorized request" });
    }
    const { searchTerm } = req.query;
    try {
      const patientWhereClause = { doctorId: req.user.hospitalId };
      if (searchTerm) {
        patientWhereClause[Op.or] = [
          {
            name: {
              [Op.like]: `%${searchTerm}%`,
            },
          },
          {
            mobileNumber: {
              [Op.like]: `%${searchTerm}%`,
            },
          },
        ];
      }

      const patients = await Patient.findAll({
        where: patientWhereClause,
        attributes: ["id", "name", "mobileNumber"],
      });

      res.status(200).json({ patients });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to get patients", details: error.message });
    }
  },

  async setToxicity(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const { id } = req.params;

    try {
      const patient = await Patient.findByPk(id);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      patient.toxicity = !patient.toxicity;
      await patient.save();
      res
        .status(200)
        .json({ message: "Patient spatial category status updated" });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to get patients", details: error.message });
    }
  },
};

module.exports = patientController;
