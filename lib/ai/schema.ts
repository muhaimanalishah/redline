import { z } from "zod";

export const issueSchema = z.object({
  issues: z.array(z.object({
    type: z.enum(["grammar", "spelling", "clarity", "word-choice"]),
    original: z.string(),
    issue: z.string(),
    suggestion: z.string(),
  }))
});

export type ProofreadResult = z.infer<typeof issueSchema>;
