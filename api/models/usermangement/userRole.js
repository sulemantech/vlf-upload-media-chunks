const {
    DataTypes
} = require('sequelize');

module.exports = (sequelize)=> {
    const UserRole = sequelize.define('userrole', {
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
    }, {
        // options
        schema: 'common' // specify the schema name here as well
    });
    return UserRole;
};