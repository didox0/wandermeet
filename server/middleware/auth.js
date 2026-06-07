const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // 1. Get the ticket (token) from the request header
  const token = req.header('x-auth-token');

  // 2. Check if the traveler even has a ticket
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // 3. Verify the ticket
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 4. Add the traveler's ID to the request so other features know WHO is asking
    req.user = decoded.user;
    next(); // Let them pass to the next room!
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};