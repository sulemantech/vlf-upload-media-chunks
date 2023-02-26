const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');
const File = require('./File');

module.exports = (sequelize) => {
    const Chunk = sequelize.define('chunk', {
        id: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        fileid: {
            type: DataTypes.UUID,
            allowNull: false,
            // references: {
            //     model: 'Files',
            //     key: 'id'
            // }
        },
        chunknumber: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        // options
        schema: 'common' // specify the schema name here as well
    });

    return Chunk;
};

