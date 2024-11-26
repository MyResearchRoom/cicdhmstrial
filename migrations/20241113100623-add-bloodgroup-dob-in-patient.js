"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Patients", "bloodGroup", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("Patients", "dateOfBirth", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Patients", "bloodGroup");
    await queryInterface.removeColumn("Patients", "dateOfBirth");
  },
};
