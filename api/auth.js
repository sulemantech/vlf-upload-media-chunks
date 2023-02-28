const jwt = require("jsonwebtoken");

const User = require("./models/usermangement/user")(sequelize);
const Role = require("./models/usermangement/role")(sequelize);
const UserRole = require("./models/usermangement/userRole")(sequelize);

const jwtOptions = {
  secret: "my_secret_key",
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, jwtOptions.secret);
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: UserRole,
          include: [
            {
              model: Role,
            },
          ],
        },
      ],
    });
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

const hasRole = (role) => async (req, res, next) => {
  try {
    const userRoles = await UserRole.findAll({
      where: {
        user_id: req.user.id,
      },
      include: [
        {
          model: Role,
        },
      ],
    });
    const roleNames = userRoles.map((userRole) => userRole.role.name);
    if (!roleNames.includes(role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  authMiddleware,
  hasRole,
};
