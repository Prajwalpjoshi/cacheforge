import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";

describe("GET /api/health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with an ok status and a request-id header", async () => {
    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBeTruthy();

    const body = response.json();
    expect(body.status).toBe("ok");
    expect(typeof body.uptimeSec).toBe("number");
    expect(body.uptimeSec).toBeGreaterThanOrEqual(0);
  });

  it("rejects an unknown route with a 404", async () => {
    const response = await app.inject({ method: "GET", url: "/api/nope" });
    expect(response.statusCode).toBe(404);
  });
});
