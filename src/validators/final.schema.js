import { z } from "zod";

export const confirmReceiptSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    actorId: z.number().int(),
  }),
});

export const historySchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});
