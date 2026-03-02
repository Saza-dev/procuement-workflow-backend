import { z } from "zod";

const dateSchema = z.string().transform((str) => new Date(str));

export const createRequestSchema = z.object({
  body: z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    justification: z.string().optional(), 
    requesterId: z.number().int().positive(), 
  }),
});

export const addItemSchema = z.object({
  params: z.object({
    id: z.string().transform(Number), 
  }),
  body: z.object({
    description: z.string().min(3),
    quantity: z.number().int().positive(),
    targetDate: dateSchema,
    isHighPriority: z.boolean().default(false), 
  }),
});

export const editItemSchema = z.object({
  params: z.object({
    id: z.string().transform(Number), 
    itemId: z.string().transform(Number),
  }),
  body: z.object({
    description: z.string().min(3).optional(),
    quantity: z.number().int().positive().optional(),
    targetDate: dateSchema.optional(),
    estPrice: z.number().positive().optional(),
  }),
});

export const submitRequestSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});
