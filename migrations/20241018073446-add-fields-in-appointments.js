"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Appointments", "note", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Appointments", "prescription", {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn("Appointments", "followUp", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Appointments", "note");
    await queryInterface.removeColumn("Appointments", "prescription");
    await queryInterface.removeColumn("Appointments", "followUp");
  },
};
