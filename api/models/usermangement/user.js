const {
    DataTypes
} = require('sequelize');
const
    db
        = require('../../config/db');
module.exports = (db) => {
    const User = db.sequelize.define('user', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        // options
        schema: 'common' // specify the schema name here as well
    });
    return User;
}

//User.hasMany(UserCommunity);

//module.exports = User;