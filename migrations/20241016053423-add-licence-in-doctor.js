"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Doctors", "medicalLicenceNumber", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("Doctors", "registrationAuthority", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("Doctors", "dateOfRegistration", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("Doctors", "medicalDegree", {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn("Doctors", "governmentId", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Doctors", "medicalLicenceNumber");
    await queryInterface.removeColumn("Doctors", "registrationAuthority");
    await queryInterface.removeColumn("Doctors", "dateOfRegistration");
    await queryInterface.removeColumn("Doctors", "medicalDegree");
    await queryInterface.removeColumn("Doctors", "governmentId");
  },
};
