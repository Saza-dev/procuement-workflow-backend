import { RequestStatus } from "@prisma/client";
import { prisma } from "../config/db.js";

// --- 1. Create Smart Basket ---
export const createRequest = async (req, res) => {
  try {
    const { title, justification, requesterId } = req.body;

    const request = await prisma.requestHeader.create({
      data: {
        title,
        justification,
        requesterId, // In a real app, get this from req.user.id
        status: RequestStatus.DRAFT,
        version: 1,
      },
    });

    return res.status(201).json(request);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create request" });
  }
};

// --- 2. Add Line Item + Urgency Logic ---
export const addItem = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const { description, quantity, targetDate, isHighPriority } =
      req.body;

    // Check if Request is editable
    const header = await prisma.requestHeader.findUnique({
      where: { id: requestId },
    });
    if (!header || header.status !== "DRAFT") {
      return res
        .status(403)
        .json({ error: "Request is locked or does not exist" });
    }

    // Urgency Logic: Date < 3 days away AND High Priority flag
    const daysUntilTarget =
      (new Date(targetDate).getTime() - new Date().getTime()) /
      (1000 * 3600 * 24);
    const triggersUrgency = isHighPriority && daysUntilTarget < 3;

    // Transaction: Add Item + Update Header Totals/Urgency
    const [newItem, updatedHeader] = await prisma.$transaction([
      prisma.requestItem.create({
        data: {
          requestId,
          description,
          quantity,
          targetDate: new Date(targetDate),
        },
      }),
      prisma.requestHeader.update({
        where: { id: requestId },
        data: {
          // If this specific item triggers urgency, mark the whole request urgent
          isUrgent: triggersUrgency ? true : undefined,
        },
      }),
    ]);

    return res
      .status(201)
      .json({ item: newItem, isUrgent: updatedHeader.isUrgent });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to add item" });
  }
};

// --- 3. Edit Line Item ---
export const editItem = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    const data = req.body;

    // Check if Request is editable
    const header = await prisma.requestHeader.findUnique({
      where: { id: requestId },
    });
    if (!header || header.status !== "DRAFT") {
      return res
        .status(403)
        .json({ error: "Cannot edit items in a submitted request" });
    }

    const updatedItem = await prisma.requestItem.update({
      where: { id: itemId },
      data: {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
    });

    // Note: In a production app, you would recalculate the Header.totalEstValue here

    return res.json(updatedItem);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update item" });
  }
};

// --- 4. Remove Line Item ---
export const deleteItem = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);

    const header = await prisma.requestHeader.findUnique({
      where: { id: requestId },
    });
    if (!header || header.status !== "DRAFT") {
      return res
        .status(403)
        .json({ error: "Cannot delete items in a submitted request" });
    }

    await prisma.requestItem.delete({
      where: { id: itemId },
    });

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete item" });
  }
};

// --- 5. Submit (Finalize Phase 1) ---
export const submitRequest = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);

    // 1. Fetch full request data
    const request = await prisma.requestHeader.findUnique({
      where: { id: requestId },
      include: { items: true },
    });

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "DRAFT")
      return res.status(400).json({ error: "Request already submitted" });

    // 2. Validate Justification (Required for Submit)
    if (!request.justification || request.justification.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Justification is required before submitting." });
    }

    // 3. Perform the "Lock" & "Snapshot" Transaction
    const result = await prisma.$transaction(async (tx) => {
      // A. Create the Ghost Snapshot (V1)
      await tx.requestSnapshot.create({
        data: {
          requestId: request.id,
          version: 1,
          data: JSON.parse(JSON.stringify(request)), // Store exact state of Header + Items
        },
      });

      // B. Update Status to SUBMITTED (Locks the request)
      return await tx.requestHeader.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.SUBMITTED,
          version: 1,
        },
      });
    });

    // 4. Log Audit
    await prisma.auditLog.create({
      data: {
        requestId,
        actorId: request.requesterId,
        action: "SUBMITTED",
        details: "Phase 1 Initation Complete. Version 1 Created.",
      },
    });

    return res.json({
      message: "Request submitted successfully",
      request: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Submission failed" });
  }
};
