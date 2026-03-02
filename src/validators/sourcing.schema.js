import { z } from "zod";

export const getRequestsSchema = z.object({
  query: z.object({
    status: z
      .enum([
        "SUBMITTED",
        "PENDING_APPROVALS",
        "REJECTED_REVISION_REQUIRED",
        "APPROVED",
        "HANDED_OVER",
      ])
      .default("SUBMITTED"),
  }),
});

export const updateSourcingSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
    itemId: z.string().transform(Number),
  }),
  body: z.object({
    actualPrice: z.number().positive("Actual price must be positive"),
  }),
});

export const splitRequestSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    itemIds: z
      .array(z.number().int())
      .min(1, "Select at least one item to split"),
  }),
});

export const dispatchSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    actorId: z.number().int(),
  }),
});
