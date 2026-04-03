// HEADY_BRAND:BEGIN
// HEADY SYSTEMS :: SACRED GEOMETRY
// FILE: tests/unit/heady-manager.test.js
// LAYER: tests
// HEADY_BRAND:END

const http = require("http");
const path = require("path");

describe("heady-manager.js", () => {
  let server;

  beforeAll((done) => {
    // Stub out modules that may not be available in test environment
    jest.mock(path.join(__dirname, "..", "..", "src", "nexus_protocol"), () => {
      return class NexusProtocol {
        async routeInput(body) { return { routed: true, body }; }
      };
    });
    jest.mock(path.join(__dirname, "..", "..", "src", "heady_maid"), () => ({
      HEADY_MAID_CONFIG: { test: true },
    }));
    jest.mock(path.join(__dirname, "..", "..", "src", "graceful_shutdown"), () => ({
      GracefulShutdownManager: class {
        middleware() { return (_req, _res, next) => next(); }
        attach() {}
      },
    }));
    jest.mock(path.join(__dirname, "..", "..", "src", "structured_logger"), () => ({
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        requestLogger: () => (_req, _res, next) => next(),
      },
    }));

    // Use a random port to avoid conflicts
    process.env.PORT = "0";
    // Clear module cache so heady-manager picks up mocks
    delete require.cache[require.resolve("../../heady-manager")];

    // Capture the server that heady-manager creates
    const origListen = http.Server.prototype.listen;
    http.Server.prototype.listen = function (...listenArgs) {
      server = this;
      return origListen.apply(this, listenArgs);
    };
    require("../../heady-manager");
    http.Server.prototype.listen = origListen;

    // Wait for server to be ready
    const waitForReady = () => {
      if (server && server.address()) {
        done();
      } else {
        setTimeout(waitForReady, 50);
      }
    };
    waitForReady();
  });

  afterAll((done) => {
    if (server) server.close(done);
    else done();
  });

  function request(method, urlPath, body) {
    return new Promise((resolve, reject) => {
      const addr = server.address();
      const options = {
        hostname: "127.0.0.1",
        port: addr.port,
        path: urlPath,
        method,
        headers: { "Content-Type": "application/json" },
      };
      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on("error", reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  describe("GET /api/health", () => {
    it("returns ok status", async () => {
      const res = await request("GET", "/api/health");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.service).toBe("heady-manager");
      expect(res.body.ts).toBeDefined();
    });
  });

  describe("GET /api/maid/config", () => {
    it("returns maid config", async () => {
      const res = await request("GET", "/api/maid/config");
      expect(res.status).toBe(200);
      expect(res.body.test).toBe(true);
    });
  });

  describe("POST /api/conductor/orchestrate", () => {
    it("returns 400 when request is missing", async () => {
      const res = await request("POST", "/api/conductor/orchestrate", {});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it("accepts valid input and calls conductor", async () => {
      const res = await request("POST", "/api/conductor/orchestrate", { request: "test" });
      // May succeed or fail depending on Python/conductor availability - just ensure no 400
      expect(res.status).not.toBe(400);
    });
  });

  describe("GET /api/conductor/query", () => {
    it("returns 400 when q is missing", async () => {
      const res = await request("GET", "/api/conductor/query");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });
  });

  describe("POST /api/conductor/workflow", () => {
    it("returns 400 when workflow is missing", async () => {
      const res = await request("POST", "/api/conductor/workflow", {});
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/conductor/node", () => {
    it("returns 400 when node is missing", async () => {
      const res = await request("POST", "/api/conductor/node", {});
      expect(res.status).toBe(400);
    });
  });

  describe("input validation", () => {
    it("rejects non-string input", async () => {
      const res = await request("POST", "/api/conductor/orchestrate", { request: 12345 });
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/must be a string/i);
    });

    it("rejects oversized input", async () => {
      const longInput = "a".repeat(10001);
      const res = await request("POST", "/api/conductor/orchestrate", { request: longInput });
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/exceeds maximum length/i);
    });

    it("rejects input with null bytes", async () => {
      const res = await request("POST", "/api/conductor/orchestrate", { request: "test\x00inject" });
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/control characters/i);
    });
  });
});
