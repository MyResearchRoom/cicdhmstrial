"use strict";

module.exports = (sequelize, DataTypes) => {
  const Receptionist = sequelize.define("Receptionist", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    receptionistId: {
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
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    dateOfJoining: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM("male", "female", "other"),
      allowNull: false,
    },
    qualification: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 100],
        is: /^(?=.*[a-zA-Z])(?=.*[0-9])/,
      },
    },
    profile: {
      type: DataTypes.BLOB("long"),
      allowNull: true,
    },
    profileContentType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  Receptionist.associate = (models) => {
    // Each receptionist belongs to a doctor
    Receptionist.belongsTo(models.Doctor, {
      foreignKey: "doctorId",
      as: "doctor",
    });

    Receptionist.hasMany(models.Attendance, {
      foreignKey: "receptionistId",
      as: "atendances",
    });

    Receptionist.hasMany(models.ReceptionistDocument, {
      foreignKey: "receptionistId",
      as: "documents",
    });
  };

  return Receptionist;
};
