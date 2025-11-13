const jwt = require('jsonwebtoken');

// Bad smell: inconsistent auth contract.
// This middleware sets BOTH req.user.id and req.userId.
// Different parts of the codebase read different shapes,
// which is fragile and easy to break.
module.exports = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token is not valid' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = { id: decoded.id };  // shape A
    req.userId = decoded.id;        // shape B (inconsistent)
    next();
  } catch {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

