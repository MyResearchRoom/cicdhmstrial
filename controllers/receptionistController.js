const {
  Doctor,
  Receptionist,
  ReceptionistDocument,
  Attendance,
  sequelize,
} = require("../models");
const bcrypt = require("bcryptjs");
const moment = require("moment");
const { Op } = require("sequelize");

const generateUniqueReceptionistId = async (name) => {
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
    const existingDoctor = await Receptionist.findOne({
      where: { receptionistId: uniqueId },
    });

    // If the ID doesn't exist, it's unique
    if (!existingDoctor) {
      isUnique = true;
    }
  }

  return uniqueId;
};

const receptionistController = {
  async addReceptionist(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const {
      name,
      mobileNumber,
      address,
      email,
      age,
      dateOfJoining,
      gender,
      qualification,
      password,
    } = req.body;

    const documents = req.files["documents[]"];
    if (!documents) {
      return res
        .status(400)
        .json({ error: "Please provide at least one document" });
    }

    const transaction = await sequelize.transaction();
    try {
      const existingDoctor = await Doctor.findOne({
        where: { email },
        transaction,
      });
      const existingReceptionist = await Receptionist.findOne({
        where: { email },
        transaction,
      });

      if (existingDoctor || existingReceptionist) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ error: "Email is already registered with another user." });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      const receptionistId = await generateUniqueReceptionistId(name);

      let profile, profileContentType;
      if (req.files?.profile && req.files?.profile?.length > 0) {
        profile = req.files?.profile[0]?.buffer;
        profileContentType = req.files?.profile[0]?.mimetype;
      }

      // Create the receptionist
      const newReceptionist = await Receptionist.create(
        {
          name,
          mobileNumber,
          address,
          email,
          age,
          dateOfJoining,
          gender,
          qualification,
          receptionistId,
          profile: profile || null,
          profileContentType: profileContentType || null,
          password: hashedPassword,
          doctorId: req.user.id,
        },
        { transaction }
      );

      // Store each document associated with the receptionist
      for (const file of documents) {
        await ReceptionistDocument.create(
          {
            document: file.buffer,
            contentType: file.mimetype,
            receptionistId: newReceptionist.id,
          },
          { transaction }
        );
      }

      newReceptionist.password = "";

      await transaction.commit();
      return res.status(201).json({
        message: "Receptionist added successfully!",
        newReceptionist,
      });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({
        error: "Failed to add receptionist",
        details: error.message,
      });
    }
  },

  async editReceptionist(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const receptionistId = req.params.id;
    const {
      name,
      mobileNumber,
      address,
      email,
      age,
      dateOfJoining,
      gender,
      qualification,
      password,
    } = req.body;

    const documents = req.files["documents[]"];

    const transaction = await sequelize.transaction();
    try {
      // Check if receptionist exists
      const receptionist = await Receptionist.findOne({
        where: { id: receptionistId },
        transaction,
      });

      if (!receptionist) {
        await transaction.rollback();
        return res.status(404).json({ error: "Receptionist not found" });
      }

      // // Check if email is already used by another user (doctor or receptionist)
      // const existingDoctor = await Doctor.findOne({
      //   where: { email },
      //   transaction,
      // });
      // const existingReceptionist = await Receptionist.findOne({
      //   where: { email, id: { [Op.ne]: receptionistId } },
      //   transaction,
      // });

      // if (existingDoctor || existingReceptionist) {
      //   await transaction.rollback();
      //   return res
      //     .status(400)
      //     .json({ error: "Email is already registered with another user." });
      // }

      // Update hashed password if a new password is provided
      // let hashedPassword;
      // if (password) {
      //   hashedPassword = await bcrypt.hash(password, 10);
      // }

      // Update profile picture if provided
      let profile, profileContentType;
      if (req.files?.profile && req.files?.profile.length > 0) {
        profile = req.files.profile[0].buffer;
        profileContentType = req.files.profile[0].mimetype;
      }

      // Update receptionist information
      await receptionist.update(
        {
          name: name || receptionist.name,
          mobileNumber: mobileNumber || receptionist.mobileNumber,
          address: address || receptionist.address,
          // email: email || receptionist.email,
          age: age || receptionist.age,
          dateOfJoining: dateOfJoining || receptionist.dateOfJoining,
          gender: gender || receptionist.gender,
          qualification: qualification || receptionist.qualification,
          // password: hashedPassword || receptionist.password,
          profile: profile || receptionist.profile,
          profileContentType:
            profileContentType || receptionist.profileContentType,
        },
        { transaction }
      );

      // If new documents are provided, update receptionist documents
      if (documents && documents.length > 0) {
        // Delete old documents
        await ReceptionistDocument.destroy({
          where: { receptionistId: receptionist.id },
          transaction,
        });

        // Add new documents
        for (const file of documents) {
          await ReceptionistDocument.create(
            {
              document: file.buffer,
              contentType: file.mimetype,
              receptionistId: receptionist.id,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();

      receptionist.password = "";
      return res.status(200).json({
        message: "Receptionist updated successfully!",
        receptionist,
      });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({
        error: "Failed to update receptionist",
        details: error.message,
      });
    }
  },

  async removeReceptionist(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const receptionistId = req.params.id;

    const transaction = await sequelize.transaction();
    try {
      // Check if the receptionist exists
      const receptionist = await Receptionist.findOne({
        where: { id: receptionistId },
        transaction,
      });

      if (!receptionist) {
        await transaction.rollback();
        return res.status(404).json({ error: "Receptionist not found" });
      }

      // Delete all documents associated with the receptionist
      // await ReceptionistDocument.destroy({
      //   where: { receptionistId },
      //   transaction,
      // });

      // Delete the receptionist
      await receptionist.destroy({ transaction });

      await transaction.commit();
      return res
        .status(200)
        .json({ message: "Receptionist removed successfully!" });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({
        error: "Failed to remove receptionist",
        details: error.message,
      });
    }
  },

  async getAllReceptionists(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" }); // Unauthorized
    }

    try {
      // Get all receptionists for the logged-in doctor
      const receptionists = await Receptionist.findAll({
        where: {
          doctorId: req.user.id,
        },
        attributes: ["id", "receptionistId", "name", "dateOfJoining"],
      });

      const today = new Date().toISOString().split("T")[0];

      const endOfToday = moment().endOf("day").toDate(); // End of today

      // Fetch today's attendance for each receptionist
      const receptionistWithAttendance = await Promise.all(
        receptionists.map(async (receptionist) => {
          const attendance = await Attendance.findOne({
            where: {
              receptionistId: receptionist.id,
              date: {
                [Op.eq]: today,
              },
            },
          });

          // Set availability status based on whether attendance record exists
          const availabilityStatus = attendance ? "Available" : "Not Available";

          return {
            ...receptionist.dataValues,
            availabilityStatus, // Add the availability status for each receptionist
          };
        })
      );

      res.status(200).json({ receptionists: receptionistWithAttendance });
    } catch (error) {
      res.status(500).json({
        error: "Failed to retrieve receptionists",
        details: error.message,
      });
    }
  },

  async changePassword(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" }); // Unauthorized
    }

    const receptionistId = req.params.id;
    const { newPassword } = req.body;

    try {
      const receptionist = await Receptionist.findByPk(receptionistId);

      if (!receptionist) {
        return res.status(404).json({ error: "Receptionist not found" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      receptionist.password = hashedPassword;

      await receptionist.save();

      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to change password", details: error.message });
    }
  },

  async getReceptionistById(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" }); // Unauthorized
    }

    try {
      const receptionist = await Receptionist.findOne({
        where: { id: req.params.id },
        include: [
          {
            model: ReceptionistDocument,
            as: "documents",
            attributes: ["document", "contentType"],
          },
        ],
      });

      if (!receptionist) {
        return res.status(404).json({ error: "Receptionist not found" });
      }

      receptionist.password = "";

      res.status(200).json({ receptionist });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to get receptionist", details: error.message });
    }
  },

  async getMe(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    try {
      if (req.user.role === "receptionist") {
        const admin = await Receptionist.findOne({
          where: { id: req.user.id },
          include: [
            {
              model: ReceptionistDocument,
              as: "documents",
              attributes: ["document", "contentType"],
            },
            {
              model: Doctor,
              as: "doctor",
              attributes: ["clinicName"],
            },
            {
              model: Attendance,
              where: {
                date: {
                  [Op.between]: [
                    new Date().setHours(0, 0, 0, 0),
                    new Date().setHours(23, 59, 59, 59),
                  ],
                },
              },
              as: "atendances",
              required: false,
            },
          ],
        });

        if (!admin) {
          return res.status(404).json({ error: "Receptionist not found" });
        }

        res.status(200).json({ admin });
      } else {
        const admin = await Doctor.findOne({ where: { id: req.user.id } });
        if (!admin) {
          return res.status(404).json({ error: "Doctor not found" });
        }
        res.status(200).json({ admin });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to get user", details: error.message });
    }
  },

  async changeProfile(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    try {
      let user;

      if (req.user.role === "receptionist") {
        user = await Receptionist.findOne({
          where: { id: req.user.id },
        });
      } else {
        user = await Doctor.findOne({
          where: { id: req.user.id },
        });
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      user.profile = req.file.buffer;
      user.profileContentType = req.file.mimetype;

      user.save();

      res.status(200).json({
        message: "Profile updated successfully",
        profile: user.profile,
        contentType: user.profileContentType,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to check in", details: error.message });
    }
  },

  async checkIn(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const receptionistId = req.user.id;

    try {
      // Ensure receptionist has not already checked in for today
      const today = new Date().toISOString().slice(0, 10); // Get today's date in YYYY-MM-DD
      const alreadyCheckedIn = await Attendance.findOne({
        where: {
          receptionistId,
          date: today,
        },
      });

      if (alreadyCheckedIn) {
        return res.status(400).json({ error: "Already checked in today" });
      }

      // Create new attendance record for check-in
      const attendance = await Attendance.create({
        receptionistId,
        checkInTime: new Date(),
        date: today,
      });

      return res.status(200).json({ message: "Checked in successfully" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to check in", details: error.message });
    }
  },

  async checkOut(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const receptionistId = req.user.id;

    const today = new Date().toISOString().slice(0, 10); // Get today's date

    try {
      // Find the receptionist's attendance record for today
      const attendance = await Attendance.findOne({
        where: {
          receptionistId,
          date: today,
        },
      });

      if (!attendance) {
        return res.status(404).json({ error: "Check-in not found for today" });
      }

      if (attendance.checkOutTime) {
        return res.status(400).json({ error: "Already checked out today" });
      }

      // Update the attendance record with check-out time
      attendance.checkOutTime = new Date();
      await attendance.save();

      return res.status(200).json({ message: "Checked out successfully" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to check out", details: error.message });
    }
  },

  async getReceptionistAttendanceStats(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const receptionistId = req.params.id;

    try {
      // Fetch all attendance records for the given receptionist
      const receptionist = await Receptionist.findOne({
        where: { id: receptionistId },
        attributes: [
          "name",
          "email",
          "mobileNumber",
          "receptionistId",
          "profile",
          "profileContentType",
        ],
        include: [
          {
            model: Attendance,
            as: "atendances",
            attributes: ["date", "checkInTime", "checkOutTime"],
          },
        ],
      });

      const attendanceRecords = receptionist.atendances;

      if (attendanceRecords.length === 0) {
        return res.status(200).json({
          totalAttendance: 0,
          avgCheckInTime: 0,
          avgCheckOutTime: 0,
          receptionist,
        });
      }

      // Total attendance count
      const totalAttendance = attendanceRecords.length;

      // Calculate average check-in and check-out times
      let totalCheckInTime = 0;
      let totalCheckOutTime = 0;
      let totalCheckOutCount = 0;

      attendanceRecords.forEach((record) => {
        // Calculate average check-in time
        totalCheckInTime += new Date(record.checkInTime).getTime();

        // Only consider check-out times that are present
        if (record.checkOutTime) {
          totalCheckOutTime += new Date(record.checkOutTime).getTime();
          totalCheckOutCount++;
        }
      });

      // Calculate averages (converting milliseconds to human-readable time)
      const avgCheckInTime = new Date(totalCheckInTime / totalAttendance)
        .toISOString()
        .slice(11, 19); // HH:MM:SS
      const avgCheckOutTime =
        totalCheckOutCount > 0
          ? new Date(totalCheckOutTime / totalCheckOutCount)
              .toISOString()
              .slice(11, 19)
          : null;

      return res.status(200).json({
        totalAttendance,
        avgCheckInTime,
        avgCheckOutTime: avgCheckOutTime || "No check-out records found",
        receptionist,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Internal Server Error",
        details: error.message,
      });
    }
  },

  async getAttendanceHistoryByMonth(req, res) {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const receptionistId = req.params.id;
    const { month, year, status } = req.query;

    try {
      const selectedMonth = month ? parseInt(month) : new Date().getMonth() + 1;
      const selectedYear = year ? parseInt(year) : new Date().getFullYear();

      const startDate = moment(`${selectedYear}-${selectedMonth}-01`);
      let endDate = moment(`${selectedYear}-${selectedMonth}-01`).endOf(
        "month"
      );

      // If the current month is requested, limit the end date to the end of yesterday
      if (moment().isSame(startDate, "month")) {
        endDate = moment().subtract(1, "day").endOf("day"); // Set endDate to the end of yesterday (23:59:59)
      }

      const doctor = await Doctor.findOne({ id: req.user.id });

      // Fetch all attendance records for the receptionist in the given month
      const attendanceRecords = await Attendance.findAll({
        where: {
          receptionistId,
          checkInTime: {
            [Op.between]: [startDate.toDate(), endDate.toDate()],
          },
        },
        order: [["checkInTime", "ASC"]],
      });

      // Define working hours (for checking late or on-time status)
      const expectedCheckInTime = doctor.checkInTime || "09:00:00";
      const expectedCheckOutTime = doctor.checkOutTime || "17:00:00";

      // Create a map for attendance records, keyed by date
      const attendanceMap = {};
      attendanceRecords.forEach((record) => {
        const recordDate = moment(record.checkInTime).format("YYYY-MM-DD");
        attendanceMap[recordDate] = record;
      });

      // Loop through each day of the month and build attendance history
      const attendanceHistory = [];
      for (
        let day = startDate;
        day.isSameOrBefore(endDate);
        day.add(1, "days")
      ) {
        const currentDate = day.format("YYYY-MM-DD");
        const record = attendanceMap[currentDate];

        if (record) {
          // If an attendance record exists for the current date
          const checkIn = moment(record.checkInTime).format(
            "YYYY-MM-DD HH:mm:ss"
          );
          const checkOut = record.checkOutTime
            ? moment(record.checkOutTime).format("YYYY-MM-DD HH:mm:ss")
            : "00:00:00";

          // Determine status (on time or late)
          let recordStatus = "On Time";
          if (
            moment(record.checkInTime).isAfter(
              `${currentDate} ${expectedCheckInTime}`
            )
          ) {
            recordStatus = "Late";
          }

          attendanceHistory.push({
            date: currentDate,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            status: recordStatus,
          });
        } else {
          // If no attendance record exists for the current date, mark as "Leave"
          attendanceHistory.push({
            date: currentDate,
            checkInTime: "00:00:00",
            checkOutTime: "00:00:00",
            status: "Leave",
          });
        }
      }

      // Apply the status filter if provided
      let filteredAttendanceHistory = attendanceHistory;
      if (status) {
        filteredAttendanceHistory = attendanceHistory.filter(
          (entry) => entry.status.toLowerCase() === status.toLowerCase()
        );
      }

      return res.status(200).json({
        attendanceHistory: filteredAttendanceHistory.reverse(),
      });
    } catch (error) {
      return res.status(500).json({
        error: "Failed to retrieve attendance history",
        details: error.message,
      });
    }
  },
};

module.exports = receptionistController;
