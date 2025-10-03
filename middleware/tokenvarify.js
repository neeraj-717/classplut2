import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const tokenVerify = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if authorization header exists and starts with "Bearer"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ status: false, msg: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // add decoded token info to req
    next(); // allow request to proceed
  } catch (err) {
    return res.status(403).json({ status: false, msg: "Invalid or expired token." });
  }
};

export default tokenVerify;
