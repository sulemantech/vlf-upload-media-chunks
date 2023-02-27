const {
    DataTypes
} = require('sequelize');
const sequelize = require('../config/db');
const File = require('./file');

module.exports = (db) => {
    const Chunk = db.sequelize.define('chunk', {
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