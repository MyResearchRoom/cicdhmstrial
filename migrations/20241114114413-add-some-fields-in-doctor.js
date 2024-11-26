"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Doctors", "verified", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn("Doctors", "verificationToken", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Doctors", "checkInTime", {
      type: Sequelize.TIME,
      allowNull: true,
    });
    await queryInterface.addColumn("Doctors", "checkOutTime", {
      type: Sequelize.TIME,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Doctors", "verified");
    await queryInterface.removeColumn("Doctors", "verificationToken");
    await queryInterface.removeColumn("Doctors", "checkInTime");
    await queryInterface.removeColumn("Doctors", "checkOutTime");
  },
};
