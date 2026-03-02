import { prisma } from "../config/db.js";

export const finalizePurchase = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { invoiceNumber, finalTotalCost, actorId } = req.body;

    const request = await prisma.requestHeader.findUnique({
      where: { id: requestId },
    });

    if (!request || request.status !== "APPROVED") {
      return res
        .status(400)
        .json({ error: "Request is not in APPROVED state." });
    }

    const approvedValue = Number(request.totalActualValue);

    // Prevent division by zero just in case
    if (approvedValue === 0) {
      return res.status(400).json({ error: "Approved value cannot be zero." });
    }

    await prisma.$transaction(async (tx) => {
      // Always save the invoice data
      await tx.requestHeader.update({
        where: { id: requestId },
        data: { invoiceNumber },
      });

      await tx.requestHeader.update({
        where: { id: requestId },
        data: { status: "FINANCE_RECHECK_REQUIRED" },
      });

      // Create a specific re-approval gate for Finance
      await tx.approval.create({
        data: {
          requestId,
          role: "FM",
          version: request.version,
          approverId: 3, 
          status: "PENDING",
        },
      });

      // --- SAFE PURCHASE ---
      await tx.requestHeader.update({
        where: { id: requestId },
        data: { status: "PURCHASED" },
      });

      await tx.auditLog.create({
        data: {
          requestId,
          actorId,
          action: "PURCHASED",
          details: `Order finalized with Invoice #${invoiceNumber}.`,
        },
      });
    });

    return res.json({
      message: "Purchase finalized and moved to Inventory queue.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to process purchase" });
  }
};

export const getArrivingItems = async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await prisma.requestHeader.findMany({
      where: { status },
      include: { items: true },
    });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch inventory" });
  }
};

export const receiveAsset = async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const { assetId, condition } = req.body;

    const item = await prisma.requestItem.update({
      where: { id: itemId },
      data: { assetId, condition },
    });

    return res.json({ message: "Asset tagged successfully", item });
  } catch (error) {
    return res.status(500).json({ error: "Failed to tag asset" });
  }
};

export const handoverItems = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { actorId } = req.body;

    const request = await prisma.requestHeader.findUnique({
      where: { id: requestId },
      include: { items: true },
    });

    if (!request || request.status !== "PURCHASED") {
      return res
        .status(400)
        .json({ error: "Request is not ready for handover." });
    }

    // Validate that ALL items have been tagged by HR
    const untaggedItems = request.items.filter(
      (i) => !i.assetId || !i.condition,
    );
    if (untaggedItems.length > 0) {
      return res.status(400).json({
        error:
          "Cannot handover. All items must have an Asset ID and Condition.",
        untaggedItemIds: untaggedItems.map((i) => i.id),
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.requestHeader.update({
        where: { id: requestId },
        data: { status: "HANDED_OVER" },
      });

      await tx.auditLog.create({
        data: {
          requestId,
          actorId,
          action: "HANDED_OVER",
          details:
            "HR confirmed all physical items are tagged and ready for Department Head.",
        },
      });
    });

    return res.json({ message: "All items handed over successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Handover failed" });
  }
};
