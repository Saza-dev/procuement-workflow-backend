import { z } from "zod";

export const getApprovalsSchema = z.object({
  query: z.object({
    role: z.enum(["FM", "OM", "CEO"], {
      required_error: "Role is required to fetch approvals",
    }),
    approverId: z.string().transform(Number), 
  }),
});

export const diffSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
});

export const approveSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z
    .object({
      approverId: z.number().int(),
      role: z.enum(["FM", "OM", "CEO"]),
      decision: z.enum(["APPROVE", "REJECT"]),
      comment: z.string().optional(),
    })
    .refine(
      (data) => {
        if (
          data.decision === "REJECT" &&
          (!data.comment || data.comment.trim() === "")
        ) {
          return false;
        }
        return true;
      },
      {
        message: "A comment is strictly required when rejecting a request.",
        path: ["comment"],
      },
    ),
});

export const resubmitSchema = z.object({
  params: z.object({
    id: z.string().transform(Number),
  }),
  body: z.object({
    actorId: z.number().int(),
  }),
});
