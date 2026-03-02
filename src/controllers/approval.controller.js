import { prisma } from "../config/db.js";

// --- 1. View Pending Approvals (With SLA Alert) ---
export const getPendingApprovals = async (req, res) => {
  try {
    const { role, approverId } = req.query;

    const approvals = await prisma.approval.findMany({
      where: {
        role,
        approverId: Number(approverId),
        status: "PENDING",
        request: { status: "PENDING_APPROVALS" },
      },
      include: {
        request: {
          select: { title: true, totalValue: true, isUrgent: true, items:true },
        },
      },
    });

    // Calculate SLA Breach (> 48 hours)
    const now = new Date();
    const fortyEightHours = 48 * 60 * 60 * 1000;

    const response = approvals.map((app) => {
      const timeInQueue = now.getTime() - new Date(app.updatedAt).getTime();
      return {
        ...app,
        isSlaBreached: timeInQueue > fortyEightHours, // The Red Flag UI trigger
        timeInQueueHours: Math.round(timeInQueue / (1000 * 60 * 60)),
      };
    });

    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch approvals" });
  }
};

// --- 2. The Ghost Diff ---
export const getGhostDiff = async (req, res) => {
  try {
    const requestId = Number(req.params.id);

    const currentRequest = await prisma.requestHeader.findUnique({
      where: { id: requestId },
      include: { items: true },
    });

    if (!currentRequest)
      return res.status(404).json({ error: "Request not found" });
    if (currentRequest.version === 1)
      return res.json({ message: "No previous versions to compare." });

    // Fetch the Snapshot of Version N-1
    const previousSnapshot = await prisma.requestSnapshot.findFirst({
      where: { requestId, version: currentRequest.version - 1 },
    });

    if (!previousSnapshot)
      return res.status(404).json({ error: "Previous snapshot missing" });

    const oldData = previousSnapshot.data;
    const diff = { header: {}, items: [] };

    // Diff Header (e.g., Total Value Changes)
    if (Number(oldData.totalValue) !== Number(currentRequest.totalValue)) {
      diff.header.totalValue = {
        old: Number(oldData.totalValue),
        new: Number(currentRequest.totalValue),
      };
    }

    // Diff Items (e.g., Price or Vendor changes)
    currentRequest.items.forEach((currentItem) => {
      const oldItem = oldData.items.find((i) => i.id === currentItem.id);
      if (
        oldItem &&
        Number(oldItem.actualPrice) !== Number(currentItem.actualPrice)
      ) {
        diff.items.push({
          itemId: currentItem.id,
          description: currentItem.description,
          actualPrice: {
            old: Number(oldItem.actualPrice),
            new: Number(currentItem.actualPrice),
          },
        });
      }
    });

    return res.json({ currentVersion: currentRequest.version, diff });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate diff" });
  }
};

// --- 3. Approve or Reject ---
export const processApproval = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { approverId, role, decision, comment } = req.body;

    const currentRequest = await prisma.requestHeader.findUnique({
      where: { id: requestId },
    });
    if (!currentRequest || currentRequest.status !== "PENDING_APPROVALS") {
      return res
        .status(400)
        .json({ error: "Request is not pending approval." });
    }

    // Map the API 'decision' to the Prisma 'ApprovalStatus' Enum
    const dbStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";

    await prisma.$transaction(async (tx) => {
      // Added approverId to the where clause so OM can't approve FM's gate
      await tx.approval.updateMany({
        where: {
          requestId,
          role,
          approverId,
          version: currentRequest.version,
        },
        data: { status: dbStatus, comment },
      });

      if (dbStatus === "REJECTED") {
        // Immediate Reject
        await tx.requestHeader.update({
          where: { id: requestId },
          data: { status: "REJECTED_REVISION_REQUIRED" },
        });

        await tx.auditLog.create({
          data: {
            requestId,
            actorId: approverId,
            action: "REJECTED",
            details: `${role} rejected: ${comment}`,
          },
        });
      } else if (dbStatus === "APPROVED") {
        // Check if everyone has approved
        const allApprovals = await tx.approval.findMany({
          where: { requestId, version: currentRequest.version },
        });

        const allApproved = allApprovals.every((a) => a.status === "APPROVED");

        if (allApproved) {
          await tx.requestHeader.update({
            where: { id: requestId },
            data: { status: "APPROVED" },
          });

          await tx.auditLog.create({
            data: {
              requestId,
              actorId: approverId,
              action: "FULLY_APPROVED",
              details: "All 3 gates passed.",
            },
          });
        } else {
          await tx.auditLog.create({
            data: {
              requestId,
              actorId: approverId,
              action: "APPROVED",
              details: `${role} approved.`,
            },
          });
        }
      }
    });

    return res.json({ message: `Successfully processed ${dbStatus}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Approval processing failed" });
  }
};

// ---  Resubmit (Actor: PE) ---
export const resubmitRequest = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { actorId } = req.body;

    // Fetch the request with the newly updated items
    const request = await prisma.requestHeader.findUnique({
      where: { id: requestId },
      include: { items: true },
    });

    if (request.status !== "REJECTED_REVISION_REQUIRED") {
      return res
        .status(400)
        .json({ error: "Request does not require revision." });
    }

    const newVersion = request.version + 1;

    // 🐛 FIX: Recalculate the Header's totalValue based on the newly edited items
    const newTotalValue = request.items.reduce((sum, item) => {
      return sum + Number(item.actualPrice) * item.quantity;
    }, 0);

    // Update the in-memory object so the Snapshot gets the correct total
    request.totalValue = newTotalValue;

    await prisma.$transaction(async (tx) => {
      // 1. Update Header: increment version, return to queue, AND save new totalValue
      await tx.requestHeader.update({
        where: { id: requestId },
        data: {
          status: "PENDING_APPROVALS",
          version: newVersion,
          totalValue: newTotalValue, // <--- Saves to DB
        },
      });

      // 2. Create a Snapshot of the NEW fixed data (V2)
      await tx.requestSnapshot.create({
        data: {
          requestId,
          version: newVersion,
          data: JSON.parse(JSON.stringify(request)), // Snapshot now includes new total
        },
      });

      // 3. Reset Approvals: Clear old statuses and bind them to the new version
      await tx.approval.updateMany({
        where: { requestId },
        data: { status: "PENDING", comment: null, version: newVersion },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          requestId,
          actorId,
          action: "RESUBMITTED",
          details: `PE resubmitted as Version ${newVersion}`,
        },
      });
    });

    return res.json({
      message: `Resubmitted successfully as Version ${newVersion}`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to resubmit request" });
  }
};
