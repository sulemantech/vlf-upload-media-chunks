const {
    DataTypes
} = require('sequelize');

const User = require('./user');

module.exports = (sequelize) => {
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
    }, {
        // options
        schema: 'common' // specify the schema name here as well
    });
    return UserCommunity;
};
//UserCommunity.belongsTo(User);

//module.exports = UserCommunity;