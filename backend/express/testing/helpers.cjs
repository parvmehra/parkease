const jwt = require('jsonwebtoken');

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function createUser(User, bcrypt, { username, email, type }) {
  const password = await bcrypt.hash('password123', 4);
  return User.create({ username, email, password, type });
}

module.exports = { makeToken, createUser };
