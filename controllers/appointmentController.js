const { Op } = require("sequelize");
const { Patient, Appointment, Receptionist, sequelize } = require("../models");
const { io } = require("../socket/socket");

const patientController = {
  async addExtraCharges(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const appointmentId = req.params.id;
    const { charges } = req.body;

    if (charges <= 0) {
      return res.status(400).json({ error: "Invalid charges" });
    }

    try {
      const appointment = await Appointment.findByPk(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      if (appointment.date > new Date()) {
        return res
          .status(400)
          .json({ error: "Cannot add extra charges to future appointments" });
      }

      appointment.fees = appointment.fees + charges;

      await appointment.save();

      res.status(200).json({ message: "Extra charges added successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to add extra charges", details: error.message });
    }
  },

  async addParameters(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const appointmentId = req.params.id;
    const { parameters } = req.body;

    try {
      const appointment = await Appointment.findByPk(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      if (appointment.date > new Date()) {
        return res
          .status(400)
          .json({ error: "Cannot add parameters to future appointments" });
      }

      appointment.parameters = parameters;

      await appointment.save();

      io.emit("parametersUpdated", {
        appointmentId,
        parameters,
        hospitalId: req.user.hospitalId,
      });

      res.status(200).json({ message: "Parameters added successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to add parameters", details: error.message });
    }
  },

  async addPaymentMode(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const appointmentId = req.params.id;
    const { paymentMode } = req.body;

    if (paymentMode !== "Cash" && paymentMode !== "Online") {
      return res.status(400).json({ error: "Invalid payment mode" });
    }

    try {
      const appointment = await Appointment.findByPk(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      if (appointment.date > new Date()) {
        return res
          .status(400)
          .json({ error: "Cannot add payment mode to future appointments" });
      }
      appointment.paymentMode = paymentMode;

      await appointment.save();

      res.status(200).json({ message: "Payment mode updated successfully" });
    } catch (error) {
      res.status(500).json({
        error: "Failed to update payment mode",
        details: error.message,
      });
    }
  },

  async addPrescription(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const appointmentId = req.params.id;

    // Check if either a file or base64 data is provided
    if (!req.file && !req.body.base64Image) {
      return res.status(400).json({ error: "No file or image data uploaded" });
    }

    try {
      const appointment = await Appointment.findByPk(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      if (appointment.date > new Date()) {
        return res
          .status(400)
          .json({ error: "Cannot add prescription for future appointments" });
      }

      let fileBuffer;
      let fileType;

      if (req.file) {
        // Handle uploaded file via Multer
        fileBuffer = req.file.buffer;
        fileType = req.file.mimetype;
      } else if (req.body.base64Image) {
        // Handle base64-encoded image
        const base64Image = req.body.base64Image;
        const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ error: "Invalid base64 image format" });
        }
        fileType = matches[1]; // Extract MIME type (e.g., image/jpeg)
        const base64Data = matches[2]; // Extract base64 data
        fileBuffer = Buffer.from(base64Data, "base64"); // Convert base64 to binary
      }

      // Save file or photo in the database
      appointment.document = fileBuffer;
      appointment.documentType = fileType;

      await appointment.save();

      res.status(200).json({
        message: "Prescription added successfully",
        documentType: fileType,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to add prescription",
        details: error.message,
      });
    }
  },

  async submitPrescription(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const { prescription } = req.body;
    const appointmentId = req.params.id;

    try {
      const appointment = await Appointment.findByPk(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Ensure prescription is an array and stringify it
      if (!Array.isArray(prescription)) {
        return res.status(400).json({ error: "Prescription must be an array" });
      }

      if (appointment.date > new Date()) {
        return res.status(400).json({
          error: "Cannot submit prescription for future appointments",
        });
      }

      appointment.prescription = prescription;

      await appointment.save();
      res.status(200).json({ message: "Prescription submitted successfully" });
    } catch (error) {
      res.status(500).json({
        error: "Failed to submit prescription",
        details: error.message,
      });
    }
  },

  async submitAppointment(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { followUp, note, fees, investigation } = req.body;

    if (fees) {
      const parsedFees = parseFloat(fees);

      if (Number.isNaN(parsedFees) || parsedFees <= 0) {
        return res
          .status(400)
          .json({ error: "Fees must be a valid number greater than 0" });
      }
    }

    const followUpDate = new Date(followUp);

    if (followUpDate < new Date()) {
      return res
        .status(400)
        .json({ error: "Follow-up date cannot be in the past" });
    }

    const appointmentId = req.params.id;

    try {
      const appointment = await Appointment.findByPk(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      if (appointment.date > new Date()) {
        return res
          .status(400)
          .json({ error: "Cannot submit future appointments" });
      }
      appointment.note = note || null;
      appointment.followUp = followUp || null;
      appointment.investigation = investigation || null;
      if (fees && appointment.status !== "out") {
        appointment.fees = appointment.fees + parseInt(fees, 10);
      }

      appointment.status = "out";

      await appointment.save();

      io.emit("updatedAppointment", {
        appointment: {
          appointmentId: appointment.id,
          fees: appointment.fees,
          followUp: appointment.followUp,
          note: appointment.note,
          prescription: appointment.prescription,
        },
        hospitalId: req.user.hospitalId,
      });

      res.status(200).json({ message: "Prescription submitted successfully" });
    } catch (error) {
      res.status(500).json({
        error: "Failed to add prescription",
        details: error.message,
      });
    }
  },

  async getTodaysAppointments(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { searchTerm, date } = req.query;

    try {
      const patientWhere = {
        doctorId: req.user.hospitalId,
      };

      if (searchTerm) {
        patientWhere.name = { [Op.like]: `%${searchTerm}%` };
      }

      let startDate = new Date().setHours(0, 0, 0, 0);
      let endDate = new Date().setHours(23, 59, 59, 999);

      if (date) {
        startDate = new Date(date).setHours(0, 0, 0, 0);
        endDate = new Date(date).setHours(23, 59, 59, 999);
      }

      const appointments = await Appointment.findAll({
        where: {
          date: {
            [Op.between]: [startDate, endDate],
          },
        },
        include: [
          {
            model: Patient,
            where: patientWhere,
            as: "patient",
          },
        ],

        order: [
          [
            sequelize.literal(
              `CASE WHEN status IS NULL THEN 1 WHEN status = 'out' THEN 2 ELSE 0 END`
            ),
            "ASC",
          ],
          ["createdAt", "ASC"],
        ],
      });

      res.status(200).json({ appointments });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to get appointments", details: error.message });
    }
  },

  async getPatientAppointments(req, res) {
    if (req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const patientId = req.params.id;

    try {
      const appointments = await Patient.findOne({
        where: { id: patientId },
        include: [
          {
            model: Appointment,
            as: "appointments",
          },
        ],
      });

      if (!appointments) {
        return res.status(404).json({ error: "Patient not found" });
      }

      res.status(200).json({ appointments });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to get appointments", details: error.message });
    }
  },

  async setCurrentAppointment(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const appointmentId = req.params.id;

    try {
      const appointment = await Appointment.findOne({
        where: {
          id: appointmentId,
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      appointment.status = "in";

      await appointment.save();

      res.status(200).json({ message: "Appointment status updated" });
    } catch (error) {
      res
        .status(500)
        .json({ error: "Failed to get appointments", details: error.message });
    }
  },

  async setAppointmentStatus(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const appointmentId = req.params.id;
    const { status } = req.body;

    if (!["in", "out"].includes(status)) {
      return res.status(400).json({ error: "Invalid status provided." });
    }

    try {
      const appointment = await Appointment.findByPk(appointmentId, {
        include: [{ model: Patient, as: "patient" }],
      });

      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found." });
      }

      if (appointment.status === null && status === "out") {
        return res.status(400).json({
          error: "Cannot set status to out if it's not set to in first.",
        });
      }

      if (appointment.status === "out") {
        return res.status(400).json({ error: "Appointment is already out." });
      }

      // If setting status to "in", check if another appointment is already "in"
      // if (status === "in" && req.user.role === "receptionist") {
      //   // Set the current "in" appointment to "out"
      //   await Appointment.update(
      //     { status: "out" },
      //     { where: { status: "in" } } // Update the current "in" appointment
      //   );
      // } else {
      //   await Appointment.update(
      //     { status: null },
      //     { where: { status: "in" } } // Update the current "in" appointment
      //   );
      // }

      // Set the current "in" appointment to "out"
      await Appointment.update(
        { status: "out" },
        { where: { status: "in" } } // Update the current "in" appointment
      );

      // Update the appointment status
      appointment.status = status;
      await appointment.save();

      io.emit(
        "appointmentUpdated",
        status === "in"
          ? { appointment, hospitalId: req.user.hospitalId }
          : null
      );

      return res.status(200).json({
        message: `Appointment status updated to ${status}.`,
        appointment,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        error: "Failed to update appointment status",
        details: error.message,
      });
    }
  },

  async getFirstAppointment(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    try {
      const doctorId = req.user.hospitalId;
      const options = req.user.role === "doctor" ? ["in"] : ["in", null];

      let appointment;

      appointment = await Appointment.findOne({
        where: {
          date: {
            [Op.between]: [
              new Date().setHours(0, 0, 0, 0),
              new Date().setHours(23, 59, 59, 59),
            ], // Start of the day
          },
          status: {
            [Op.or]: options,
          }, // Status not set yet
        },
        include: [
          {
            model: Patient,
            as: "patient",
            where: {
              doctorId: doctorId,
            },
          },
        ], // Include associated patient
        order: [
          ["status", "DESC"], // 'in' comes before null as 'in' > null in string comparison
          ["date", "ASC"], // Order by earliest appointment
        ],
      });

      if (!appointment) {
        appointment = await Appointment.findOne({
          where: {
            status: {
              [Op.eq]: "in",
            },
          },
          include: [
            {
              model: Patient,
              as: "patient",
              where: {
                doctorId: doctorId,
              },
            },
          ], // Include associated patient
          order: [
            ["status", "DESC"], // 'in' comes before null as 'in' > null in string comparison
            ["date", "ASC"], // Order by earliest appointment
          ],
        });

        if (!appointment) {
          return res.status(404).json({ error: " No appointment to attend" });
        }
      }

      return res.status(200).json({ firstAppointment: appointment });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to retrieve appointments",
        details: error.message,
      });
    }
  },
};

module.exports = patientController;
