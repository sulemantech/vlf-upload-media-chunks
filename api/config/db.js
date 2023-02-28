const {
    Sequelize
} = require('sequelize');

const sequelize = new Sequelize(
    "postgres://postgres:root@localhost:5432/uploads", {
        dialect: "postgres",
        schema: 'common',
        logging: true, // disable logging
        dialectOptions: {
            ssl: false,
        },
        define: {
            timestamps: false,
        },
    });

var db = {};

db.sequelize = sequelize;
//db.Sequelize = Sequelize;

module.exports = db;