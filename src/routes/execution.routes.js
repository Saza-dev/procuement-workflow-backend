import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  purchaseSchema,
  getInventorySchema,
  receiveItemSchema,
  handoverSchema,
} from "../validators/execution.schema.js";
import {
  finalizePurchase,
  getArrivingItems,
  receiveAsset,
  handoverItems,
} from "../controllers/execution.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/RBACMiddleware.js";

const router = Router();

// purchase
router.post(
  "/:id/purchase",
  authMiddleware,
  authorize("PE , ADMIN"),
  validate(purchaseSchema),
  finalizePurchase,
);

// GET /api/inventory?status=PURCHASED
router.get(
  "/inventory",
  authMiddleware,
  authorize("HR, ADMIN"),
  validate(getInventorySchema),
  getArrivingItems,
);

// receive
router.post(
  "/:id/items/:itemId/receive",
  authMiddleware,
  authorize("HR, ADMIN"),
  validate(receiveItemSchema),
  receiveAsset,
);

// POST handover
router.post(
  "/:id/handover",
  authMiddleware,
  authorize("HR , DH, ADMIN"),
  validate(handoverSchema),
  handoverItems,
);

export default router;
