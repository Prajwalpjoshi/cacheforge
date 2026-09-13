import type { Env } from "../env.js";

export function createLoggerOptions(env: Env) {
  if (env.NODE_ENV === "test") {
    return { level: "silent" };
  }

  if (env.NODE_ENV === "development") {
    return {
      level: "info",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
    };
  }

  return { level: "info" };
}
