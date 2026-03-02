import { prisma } from "../config/db.js";

// --- 1. View Incoming Requests ---
export const getIncomingRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await prisma.requestHeader.findMany({
      where: { status },
      include: { items: true, requester: {}, approvals:true },
    });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch requests" });
  }
};

// --- 2. Update Sourcing Details & Auto-Calculate Variance ---
export const updateSourcing = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { actualPrice } = req.body;

    const updatedItem = await prisma.requestItem.update({
      where: { id: Number(itemId) },
      data: {
        actualPrice,
      },
    });

    return res.json({ message: "Sourcing updated", item: updatedItem });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update sourcing details" });
  }
};

// --- 3. Upload PDF Quote ---
export const uploadQuote = async (req, res) => {
  try {
    const { itemId } = req.params;

    // In a real app, req.file is populated by Multer or a cloud storage middleware (AWS S3/Cloudinary)
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Mocking the file URL that your storage service would return
    const quoteUrl = `/uploads/quotes/${req.file.filename}`;

    const updatedItem = await prisma.requestItem.update({
      where: { id: Number(itemId) },
      data: { quoteUrl },
    });

    return res.json({
      message: "Quote uploaded successfully",
      item: updatedItem,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to upload quote" });
  }
};

// "Split" Option ---
export const splitRequest = async (req, res) => {
  try {
    const oldRequestId = Number(req.params.id);
    const { itemIds } = req.body;

    const oldRequest = await prisma.requestHeader.findUnique({
      where: { id: oldRequestId },
    });
    if (
      !oldRequest ||
      (oldRequest.status !== "SUBMITTED" &&
        oldRequest.status !== "REJECTED_REVISION_REQUIRED")
    ) {
      return res
        .status(400)
        .json({ error: "Invalid request or incorrect status" });
    }

    // Execute everything in a single Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the new Child Request
      const newRequest = await tx.requestHeader.create({
        data: {
          title: `${oldRequest.title} (Split)`,
          justification: oldRequest.justification,
          attachmentUrl: oldRequest.attachmentUrl,
          requesterId: oldRequest.requesterId,
          status: "SUBMITTED",
          parentRequestId: oldRequestId,
          isUrgent: oldRequest.isUrgent,
        },
      });

      // 2. Move the selected items to the new Request ID
      await tx.requestItem.updateMany({
        where: { id: { in: itemIds }, requestId: oldRequestId },
        data: { requestId: newRequest.id },
      });

      // 3. Log the Audit Trail
      await tx.auditLog.create({
        data: {
          requestId: oldRequestId,
          actorId: oldRequest.requesterId,
          action: "SPLIT",
          details: `Items [${itemIds.join(", ")}] split into Request #${newRequest.id}`,
        },
      });

      return newRequest;
    });

    return res.json({
      message: "Request split successfully",
      newRequest: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to split request" });
  }
};

// --- 5. Dispatch to Approvers ---
export const dispatchToApprovers = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { actorId } = req.body;

    const request = await prisma.requestHeader.findUnique({
      where: { id: requestId },
      include: { items: true },
    });

    // 1. Check if all items have sourcing details
    const incompleteItems = request.items.filter(
      (item) => item.actualPrice === null,
    );
    if (incompleteItems.length > 0) {
      return res.status(400).json({
        error: "Cannot dispatch. All items must have a  Actual Price.",
        incompleteItemIds: incompleteItems.map((i) => i.id),
      });
    }

    // 2. Calculate Total Actual Value
    const totalValue = request.items.reduce((sum, item) => {
      return sum + Number(item.actualPrice) * item.quantity;
    }, 0);

    // 3. Dispatch Transaction
    await prisma.$transaction(async (tx) => {
      // A. Update Request Header
      const updatedHeader = await tx.requestHeader.update({
        where: { id: requestId },
        data: {
          status: "PENDING_APPROVALS",
          totalValue,
        },
        include: { items: true },
      });

      await tx.requestSnapshot.deleteMany({
        where: { requestId, version: request.version },
      });
      // Create the true "Dispatched" snapshot
      await tx.requestSnapshot.create({
        data: {
          requestId,
          version: request.version,
          data: JSON.parse(JSON.stringify(updatedHeader)),
        },
      });

      // Create 3 Approval Gates
      await tx.approval.createMany({
        data: [
          { requestId, role: "FM", version: request.version, approverId: 3 }, // Hardcoded user IDs for example
          { requestId, role: "OM", version: request.version, approverId: 4 },
          { requestId, role: "CEO", version: request.version, approverId: 5 },
        ],
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          requestId,
          actorId,
          action: "DISPATCHED_FOR_APPROVAL",
          details: `PE dispatched Version ${request.version} to FM, OM, and CEO.`,
        },
      });
    });

    return res.json({ message: "Successfully dispatched to approvers." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to dispatch" });
  }
};
