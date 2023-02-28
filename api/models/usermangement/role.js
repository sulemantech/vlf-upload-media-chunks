const {
    DataTypes
} = require('sequelize');

const
    db
        = require('../../config/db');

module.exports = (sequelize) => {
    const Role = sequelize.define('role', {
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
        level: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    }, {
        // options
        schema: 'common' // specify the schema name here as well
    });
    return Role;
}