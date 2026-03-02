import { z } from "zod";

// Phase 4
export const purchaseSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    invoiceNumber: z.string().min(1, "Invoice number is required"),
    finalTotalCost: z.number().positive("Final cost must be positive"),
    actorId: z.number().int(), // The PE processing the purchase
  }),
});

// Phase 5
export const getInventorySchema = z.object({
  query: z.object({
    status: z
      .enum(["PURCHASED", "FINANCE_RECHECK_REQUIRED"])
      .default("PURCHASED"),
  }),
});

export const receiveItemSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
    itemId: z.string().transform(Number),
  }),
  body: z.object({
    assetId: z.string().min(1, "Asset ID is required"),
    condition: z.enum(["GOOD", "DAMAGED"]),
  }),
});

export const handoverSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    actorId: z.number().int(), // HR / Store Keeper ID
  }),
});
