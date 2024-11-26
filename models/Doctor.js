"use strict";

module.exports = (sequelize, DataTypes) => {
  const Doctor = sequelize.define("Doctor", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    clinicName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    doctorId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobileNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^[0-9]+$/, // Ensure only numbers are entered
        len: [10, 15], // Mobile number should be between 10-15 digits
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
        isEmail: true, // Email validation
      },
    },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    age: {
      type: DataTypes.VIRTUAL, // Virtual field, not saved in DB
      get() {
        if (this.dateOfBirth) {
          const today = new Date();
          const birthDate = new Date(this.dateOfBirth);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())
          ) {
            age--;
          }
          return age;
        }
        return null;
      },
    },
    gender: {
      type: DataTypes.ENUM("male", "female", "other"),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 100], // Password must be at least 8 characters long
        is: /^(?=.*[a-zA-Z])(?=.*[0-9])/, // Password must contain at least one letter and one number
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
    signature: {
      type: DataTypes.BLOB("long"),
      allowNull: true,
    },
    signatureContentType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    medicalLicenceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    registrationAuthority: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dateOfRegistration: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    medicalDegree: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    governmentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    paymentQr: {
      type: DataTypes.BLOB("long"),
      allowNull: true,
    },
    qrContentType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    patientRegQr: {
      type: DataTypes.BLOB("long"),
      allowNull: true,
    },
    regQrType: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // hidden
    fees: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    acceptedTAndC: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    checkInTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    checkOutTime: {
      type: DataTypes.TIME,
      allowNull: true,
    },
  });
  Doctor.associate = (models) => {
    // A doctor can have multiple receptionists
    Doctor.hasMany(models.Receptionist, {
      foreignKey: "doctorId",
      as: "receptionists",
    });
  };

  return Doctor;
};
