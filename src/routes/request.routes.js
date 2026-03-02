import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  createRequestSchema,
  addItemSchema,
  editItemSchema,
  submitRequestSchema,
} from "../validators/request.schema.js";
import {
  createRequest,
  addItem,
  editItem,
  deleteItem,
  submitRequest,
} from "../controllers/request.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/RBACMiddleware.js";

const router = Router();

// Create Basket
router.post(
  "/",
  authMiddleware,
  authorize("DH , ADMIN"),
  validate(createRequestSchema),
  createRequest,
);

// Add Item
router.post(
  "/:id/items",
  authMiddleware,
  authorize("DH , ADMIN"),
  validate(addItemSchema),
  addItem,
);

//  Edit Item
router.put(
  "/:id/items/:itemId",
  authMiddleware,
  authorize("DH , ADMIN"),
  validate(editItemSchema),
  editItem,
);

// Remove Item
router.delete(
  "/:id/items/:itemId",
  authMiddleware,
  authorize("DH , ADMIN"),
  deleteItem,
);

// Finalize
router.post(
  "/:id/submit",
  authMiddleware,
  authorize("DH , ADMIN"),
  validate(submitRequestSchema),
  submitRequest,
);

export default router;
