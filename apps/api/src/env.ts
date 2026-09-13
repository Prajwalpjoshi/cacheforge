import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // Defaulted rather than required: Phase 2 only pings Redis for health
  // reporting, so a missing/unreachable Redis must degrade, not crash startup.
  REDIS_URL: z.string().default("redis://localhost:6379"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      "Invalid environment configuration:",
      parsed.error.flatten().fieldErrors,
    );
    process.exit(1);
  }

  return parsed.data;
}
