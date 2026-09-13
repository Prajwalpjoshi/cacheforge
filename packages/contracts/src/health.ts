import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  uptimeSec: z.number().nonnegative(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
