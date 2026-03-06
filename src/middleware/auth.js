const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "gatling-demo-secret-key-change-in-prod";
const JWT_EXPIRY = "1h";

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Express middleware: checks Authorization header or cookie for JWT.
 */
function authMiddleware(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    // For browser requests, redirect to login
    if (req.headers.accept && req.headers.accept.includes("text/html")) {
      return res.redirect("/login");
    }
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    if (req.headers.accept && req.headers.accept.includes("text/html")) {
      return res.redirect("/login");
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { generateToken, verifyToken, authMiddleware, JWT_SECRET };
