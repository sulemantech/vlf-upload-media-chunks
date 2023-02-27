const File = require('./file');
const Chunk = require('./chunk');
const User = require('./user');

// Define associations
File.belongsTo(User);
User.hasMany(File);

Chunk.belongsTo(File);
File.hasMany(Chunk);
Chunk.belongsTo(User);
User.hasMany(Chunk);