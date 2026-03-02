import { Router } from "express";
import multer from "multer";
import { validate } from "../middleware/validate.js";
import {
  getRequestsSchema,
  updateSourcingSchema,
  splitRequestSchema,
  dispatchSchema,
} from "../validators/sourcing.schema.js";
import {
  getIncomingRequests,
  updateSourcing,
  uploadQuote,
  splitRequest,
  dispatchToApprovers,
  finalizePurchase
} from "../controllers/sourcing.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/RBACMiddleware.js";

const router = Router();

// Configure basic multer for PDF uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// View Incoming
router.get(
  "/",
  authMiddleware,
  authorize("PE ,DH, ADMIN"),
  validate(getRequestsSchema),
  getIncomingRequests,
);

//  Update Price
router.patch(
  "/:id/items/:itemId/sourcing",
  authMiddleware,
  authorize("PE , ADMIN"),
  validate(updateSourcingSchema),
  updateSourcing,
);

// Upload PDF Quote
router.post(
  "/:id/items/:itemId/quotes",
  authMiddleware,
  authorize("PE", "ADMIN"),
  upload.single("quoteFile"),
  uploadQuote,
);

// purchase route
router.post(
  "/:id/purchase",
  authMiddleware,
  authorize("PE", "ADMIN"),
  upload.single("quoteFile"), // This processes the file from the frontend
  finalizePurchase // We will create this controller function next
);

// The Split Option
router.post(
  "/:id/split",
  authMiddleware,
  authorize("PE , ADMIN"),
  validate(splitRequestSchema),
  splitRequest,
);

// Send to Approvers
router.post(
  "/:id/dispatch",
  authMiddleware,
  authorize("PE , ADMIN"),
  validate(dispatchSchema),
  dispatchToApprovers,
);

export default router;
