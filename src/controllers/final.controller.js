import { prisma } from "../config/db.js";

// FINAL HANDSHAKE
export const confirmReceipt = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { actorId } = req.body;

    const request = await prisma.requestHeader.findUnique({
      where: { id: requestId },
    });

    if (!request || request.status !== "HANDED_OVER") {
      return res
        .status(400)
        .json({ error: "Request is not ready for final confirmation." });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Close the loop
      await tx.requestHeader.update({
        where: { id: requestId },
        data: { status: "DONE" },
      });

      // 2. Final Audit Entry
      await tx.auditLog.create({
        data: {
          requestId,
          actorId,
          action: "CONFIRMED_RECEIPT",
          details:
            "Department Head confirmed physical receipt of all items. Workflow complete.",
        },
      });
    });

    return res.json({ message: "Receipt confirmed. Workflow is now DONE." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to confirm receipt" });
  }
};

// AUDIT & ADMIN
export const getMasterHistory = async (req, res) => {
  try {
    const requestId = Number(req.params.id);

    // 1. Fetch all audit logs for the request
    const logs = await prisma.auditLog.findMany({
      where: { requestId },
      include: { actor: { select: { role: true } } },
      orderBy: { timestamp: "asc" },
    });

    // 2. Fetch all version snapshots
    const snapshots = await prisma.requestSnapshot.findMany({
      where: { requestId },
      orderBy: { createdAt: "asc" },
    });

    // 3. Merge and format for the UI Timeline
    const timeline = [
      ...logs.map((log) => ({
        type: "AUDIT_LOG",
        timestamp: log.timestamp,
        role: log.actor.role,
        action: log.action,
        details: log.details,
      })),
      ...snapshots.map((snap) => ({
        type: "VERSION_SNAPSHOT",
        timestamp: snap.createdAt,
        version: snap.version,
        data: snap.data, // The UI can use this to let users "view" past states
      })),
    ];

    // Sort the combined array chronologically
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return res.json({ requestId, timeline });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate master history" });
  }
};

export const getUserHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const logs = await prisma.requestHeader.findMany({
      where: {
        requesterId: userId,
      },
    });
    return res.json(logs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate history" });
  }
};
