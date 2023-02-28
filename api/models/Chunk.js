const {
    DataTypes
} = require('sequelize');
const db = require('../config/db');
const File = require('./file');
const sequelize = db.sequelize;
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