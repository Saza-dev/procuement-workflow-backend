import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  confirmReceiptSchema,
  historySchema,
} from "../validators/final.schema.js";
import {
  confirmReceipt,
  getMasterHistory,
  getUserHistory,
} from "../controllers/final.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/RBACMiddleware.js";

const router = Router();

// confirm-receipt
router.post(
  "/requests/:id/confirm-receipt",
  authMiddleware,
  authorize("DH , ADMIN"),
  validate(confirmReceiptSchema),
  confirmReceipt,
);

// history
router.get(
  "/requests/:id/history",
  authMiddleware,
  authorize("OM , HR , CEO , DH, ADMIN"),
  validate(historySchema),
  getMasterHistory,
);

// history by user
router.get(
  "/requests/history",
  authMiddleware,
  authorize("DH , ADMIN"),
  getUserHistory,
);

export default router;
