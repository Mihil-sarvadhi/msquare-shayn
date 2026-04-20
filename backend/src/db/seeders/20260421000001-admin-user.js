'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const password_hash = await bcrypt.hash('Shayn@2026', 12);
    await queryInterface.sequelize.query(
      `INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
       VALUES (:name, :email, :password_hash, :role, TRUE, NOW(), NOW())
       ON CONFLICT (email) DO NOTHING;`,
      {
        replacements: {
          name: 'SHAYN Admin',
          email: 'admin@shayn.in',
          password_hash,
          role: 'ADMIN',
        },
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM users WHERE email = 'admin@shayn.in';`,
    );
  },
};
