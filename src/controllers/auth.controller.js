import { prisma } from "../config/db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";

// login
const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!user) {
    return res.status(400).json({ message: "User does not exist" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = generateToken(user.id, res);

  return res.status(200).json({
    status: "Success",
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    },
  });
};

// logout
const logout = async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  return res
    .status(200)
    .json({ status: "success", message: "Logged out successfully" });
};

// Current user
const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(400).json({ message: "User does not exist" });
  }

  return res.status(200).json({
    status: "Success",
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
};

export { login, logout, getMe };
