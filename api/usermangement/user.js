const {
    DataTypes
} = require('sequelize');
const {
    sequelize
} = require('../config/db');
const User = sequelize.define('user', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

//User.hasMany(UserCommunity);

module.exports = User;