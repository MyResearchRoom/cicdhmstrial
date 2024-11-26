"use strict";

module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define("Appointment", {
    reason: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100], // Name must be between 2 and 100 characters
      },
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    process: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fees: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("in", "out"),
      allowNull: true,
    },
    paymentStatus: {
      type: DataTypes.ENUM("pending", "completed", "cancelled"),
      defaultValue: "pending",
    },
    document: {
      type: DataTypes.BLOB("long"),
      allowNull: true,
    },
    documentType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentMode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    note: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    investigation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    prescription: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    followUp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.Patient, {
      foreignKey: "patientId",
      as: "patient",
    });
  };

  return Appointment;
};
