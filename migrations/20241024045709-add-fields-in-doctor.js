"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Doctors", "clinicName", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("Doctors", "paymentQr", {
      type: Sequelize.BLOB("long"),
      allowNull: true,
    });
    await queryInterface.addColumn("Doctors", "qrContentType", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Doctors", "patientRegQr", {
      type: Sequelize.BLOB("long"),
      allowNull: true,
    });
    await queryInterface.addColumn("Doctors", "regQrType", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Doctors", "acceptedTAndC", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Doctors", "clinicName");
    await queryInterface.removeColumn("Doctors", "paymentQr");
    await queryInterface.removeColumn("Doctors", "qrContentType");
    await queryInterface.removeColumn("Doctors", "patientRegQr");
    await queryInterface.removeColumn("Doctors", "regQrType");
    await queryInterface.removeColumn("Doctors", "acceptedTAndC");
  },
};
