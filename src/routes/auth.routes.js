import express from "express";

import { login, logout, getMe } from "../controllers/auth.controller.js";
import { loginUserSchema } from "../validators/auth.schema.js";
import { validate } from "../middleware/validate.js";
import {authMiddleware} from "../middleware/authMiddleware.js"

const router = express.Router();

router.post("/login", validate(loginUserSchema), login);
router.get("/me",authMiddleware, getMe);
router.post("/logout",authMiddleware, logout);

export default router;
