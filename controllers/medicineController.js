const { Op, where } = require("sequelize");
const { Medicine, Doctor, Receptionist, sequelize } = require("../models");

const medicineController = {
  async addMedicine(req, res) {
    if (!req.user || req.user.role !== "receptionist") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const { name, strength, form, category, brand } = req.body;

    try {
      const medicineWithName = await Medicine.findOne({
        where: { name, strength, form, brand },
      });

      if (medicineWithName) {
        return res
          .status(400)
          .json({ error: "Medicine with same specifications already exists" });
      }

      const medicine = await Medicine.create({
        name,
        strength,
        form,
        category,
        brand,
        doctorId: req.user.hospitalId,
      });

      res
        .status(200)
        .json({ message: "Medicine added successfully", medicine });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to add medicine", details: error.message });
    }
  },

  async getAllMedicines(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const searchTerm = req.query.searchTerm;

    try {
      let whereClause = { doctorId: req.user.hospitalId };
      if (searchTerm) {
        whereClause.name = {
          [Op.like]: `%${searchTerm}%`,
        };
      }

      const medicines = await Medicine.findAll({
        where: whereClause,
        order: [["name", "ASC"]],
      });
      res.status(200).json({ medicines });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to get medicines", details: error.message });
    }
  },

  async editMedicine(req, res) {
    if (!req.user || req.user.role !== "receptionist") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const { id } = req.params; // Medicine ID to be updated
    const { name, strength, form, category, brand } = req.body;

    try {
      const medicineWithName = await Medicine.findOne({
        where: { name, strength, form, brand },
      });

      if (medicineWithName) {
        return res
          .status(400)
          .json({ error: "Medicine with same specifications already exists" });
      }

      const medicine = await Medicine.findOne({
        where: { id, doctorId: req.user.hospitalId },
      });

      if (!medicine) {
        return res.status(404).json({ error: "Medicine not found" });
      }

      // Update medicine details
      medicine.name = name || medicine.name;
      medicine.strength = strength || medicine.strength;
      medicine.form = form || medicine.form;
      medicine.category = category || medicine.category;
      medicine.brand = brand || medicine.brand;

      await medicine.save();

      res
        .status(200)
        .json({ message: "Medicine updated successfully", medicine });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to update medicine", details: error.message });
    }
  },

  async deleteMedicine(req, res) {
    if (!req.user || req.user.role !== "receptionist") {
      return res.status(401).json({ error: "Unauthorized request" });
    }

    const { id } = req.params;

    try {
      const medicine = await Medicine.findOne({
        where: { id, doctorId: req.user.hospitalId },
      });

      if (!medicine) {
        return res.status(404).json({ error: "Medicine not found" });
      }

      await medicine.destroy();

      res.status(200).json({ message: "Medicine deleted successfully" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Failed to delete medicine", details: error.message });
    }
  },
};

module.exports = medicineController;
