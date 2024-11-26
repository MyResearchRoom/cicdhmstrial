const jwt = require("jsonwebtoken");

// Authorization Middleware
const authorize = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1]; // Expecting 'Bearer <token>'

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Ensure the secret matches the one used during login
    if (
      decoded.role === "doctor" &&
      decoded.acceptedTAndC === false &&
      req.originalUrl !== "/api/doctors/accept-terms-and-conditions"
    ) {
      return res.status(401).json({
        error: "Access denied. You have not accepted the terms & conditions.",
      });
    }

    req.user = decoded;

    next(); // User is authorized, proceed to the next middleware or route handler
  } catch (error) {
    return res.status(400).json({
      message: "Invalid Or expired token, please login again.",
      details: error.message,
    });
  }
};

module.exports = authorize;
