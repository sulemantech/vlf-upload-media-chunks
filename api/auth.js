const jwt = require("jsonwebtoken");

const User = require("./models/usermangement/user")(sequelize);
const Role = require("./models/usermangement/role")(sequelize);
const UserRole = require("./models/usermangement/userRole")(sequelize);

const jwtOptions = {
  secret: "my_secret_key",
};

const generateToken = (user) => {
  const payload = { id: user.id };
  const token = jwt.sign(payload, jwtOptions.secret);
  return token;
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

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user || user.password !== password) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }
  const token = generateToken(user);
  res.status(200).json({ token });
};

module.exports = {
  authMiddleware,
  hasRole,
  login,
};
