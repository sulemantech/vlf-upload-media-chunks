const {
    DataTypes
} = require('sequelize');
const {
    sequelize
} = require('../config/db');

module.exports = (db) => {
    const UserRole = db.sequelize.define('UserRole', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    });
    return UserRole;
};