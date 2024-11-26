"use strict";

module.exports = (sequelize, DataTypes) => {
  const ReceptionistDocument = sequelize.define("ReceptionistDocument", {
    document: {
      type: DataTypes.BLOB("long"),
      allowNull: false,
    },
    contentType: {
      type: DataTypes.STRING,
      allowNull: false, // Can be null at the time of check-in
    },
  });

  ReceptionistDocument.associate = (models) => {
    // Each ReceptionistDocument belongs to a doctor
    ReceptionistDocument.belongsTo(models.Receptionist, {
      foreignKey: "receptionistId",
      as: "receptionist",
    });
  };

  return ReceptionistDocument;
};
