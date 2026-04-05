const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect routes via JWT Bearer token.
 * Attaches req.user if the token is valid.
 */
async function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized — no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-refreshToken');

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized — user not found' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized — invalid or expired token' });
  }
}

module.exports = { protect };
