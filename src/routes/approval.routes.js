import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  getApprovalsSchema,
  diffSchema,
  approveSchema,
  resubmitSchema,
} from "../validators/approval.schema.js";
import {
  getPendingApprovals,
  getGhostDiff,
  processApproval,
  resubmitRequest,
} from "../controllers/approval.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/RBACMiddleware.js";

const router = Router();

// View pending tasks
router.get(
  "/",
  authMiddleware,
  authorize("OM , HR , CEO , ADMIN"),
  validate(getApprovalsSchema),
  getPendingApprovals,
);

//  The Ghost Diff
router.get(
  "/requests/:id/diff",
  authMiddleware,
  authorize("OM , HR , CEO , ADMIN"),
  validate(diffSchema),
  getGhostDiff,
);

// Approve or Reject
router.post(
  "/requests/:id/approve",
  authMiddleware,
  authorize("OM , HR , CEO , ADMIN"),
  validate(approveSchema),
  processApproval,
);

// Revision Pivot (PE)
router.post(
  "/requests/:id/resubmit",
  authMiddleware,
  authorize("PE , ADMIN"),
  validate(resubmitSchema),
  resubmitRequest,
);

export default router;
