"use strict";

module.exports = (sequelize, DataTypes) => {
  const Patient = sequelize.define("Patient", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    patientId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobileNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^[0-9]+$/,
        len: [10, 15],
      },
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    bloodGroup: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM("male", "female", "other"),
      allowNull: false,
    },
    toxicity: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  Patient.associate = (models) => {
    // Each Patient belongs to a doctor
    Patient.belongsTo(models.Doctor, {
      foreignKey: "doctorId",
      as: "doctor",
    });

    Patient.hasMany(models.Appointment, {
      foreignKey: "patientId",
      as: "appointments",
    });
  };

  return Patient;
};
