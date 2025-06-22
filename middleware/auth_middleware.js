import jwt from "jsonwebtoken";
import mysql_connection from "../lib/mysql_connection.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await mysql_connection.SELECT("user", {
      where: { id: decoded.userId },
    });

    if (user.length === 0) {
      return res.status(401).json({ message: "User is deleted." });
    }

    req.userId = decoded.userId;

    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

export default authMiddleware;
