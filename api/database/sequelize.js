const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    "postgres://postgres:root@localhost:5432/uploads", {
    dialect: "postgres",
    schema: 'common',
    dialectOptions: {
        ssl: false,
    },
    define: {
        timestamps: false,
    },
}
);

module.exports = sequelize;