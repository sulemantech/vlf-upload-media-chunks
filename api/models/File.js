const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');

module.exports = (sequelize) => {
    const File = sequelize.define('file', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        size: {
            type: DataTypes.BIGINT,
            allowNull: false
        },
        totalchunks: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        uploadedchunks: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    }, {
        // options
        schema: 'common' // specify the schema name here as well
    });

    return File;
};
