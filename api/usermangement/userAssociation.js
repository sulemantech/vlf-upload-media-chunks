const {
    db
} = require('../config/db');

const User = require('./user');
const Role = require('./role');
const UserRole = require('./userRole');
// Define association between User and UserRole
//UserRole.belongsTo(User);
//UserRole.belongsTo(Role);
//User.hasMany(UserRole);
//Role.hasMany(UserRole);

//db.sequelize.sync();