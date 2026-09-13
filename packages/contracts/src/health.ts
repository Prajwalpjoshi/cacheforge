import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  postgres: z.enum(["up", "down"]),
  redis: z.enum(["up", "down"]),
  uptimeSec: z.number().nonnegative(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
