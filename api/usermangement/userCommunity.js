const {
    DataTypes
} = require('sequelize');

const User = require('./user');

const sequelize = require('../config/db');

const UserCommunity = sequelize.define('usercommunity', {
    ags: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    remark: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    county: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    groupId: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});

UserCommunity.belongsTo(User);

module.exports = UserCommunity;