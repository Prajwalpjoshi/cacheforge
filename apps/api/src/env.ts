import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // Optional in Phase 1: Prisma/Postgres integration lands in a later phase.
  DATABASE_URL: z.string().optional(),
  // Optional in Phase 1: Redis integration lands in a later phase.
  REDIS_URL: z.string().optional(),
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
