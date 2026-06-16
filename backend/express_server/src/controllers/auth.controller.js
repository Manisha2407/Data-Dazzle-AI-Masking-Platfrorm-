import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db/prisma.js";

export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: "Email already registered" });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });
    res.status(201).json({
      message: "User created successfully",
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });
    if (!user)
      return res.status(400).json({ message: "User not found" });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      accessToken,
      refreshToken,
      username: user.username
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({
      message: "No refresh token provided",
    });
  }
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );
    const newAccessToken = jwt.sign({
        id: decoded.id,
        email: decoded.email,
        username: decoded.username,
      },
      process.env.JWT_ACCESS_SECRET,{
        expiresIn: "15m",
      }
    );
    res.json({
      accessToken: newAccessToken,
    });
  } catch (err) {
    res.status(403).json({
      message: "Invalid or expired refresh token",
    });
  }
};