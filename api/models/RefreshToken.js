const {
    DataTypes
} = require('sequelize');

const db = require('../config/db');

const sequelize = db.sequelize;
module.exports = (sequelize) => {
const RefreshToken = sequelize.define('RefreshToken', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    token: {
      type: Sequelize.STRING,
      allowNull: false
    },
    expirationTime: {
      type: Sequelize.DATE,
      allowNull: false
    }
  });
  return RefreshToken;
};