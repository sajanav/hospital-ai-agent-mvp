import http from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { draftSummary } from "./agent.js";
import { assertEncounterRequest } from "./schema.js";

const port = Number(process.env.PORT || process.env.WEBSITES_PORT || 8787);
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const drafts = new Map();

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      return servePublicFile(res, "index.html");
    }

    if (req.method === "GET" && ["/app.js", "/styles.css"].includes(req.url)) {
      return servePublicFile(res, req.url.slice(1));
    }

    if (req.method === "GET" && req.url === "/health") {
      return sendJson(res, 200, {
        status: "ok",
        mode: process.env.OPENAI_API_KEY ? "openai" : "mock",
        accessCodeRequired: Boolean(process.env.APP_ACCESS_CODE),
        openAiKeyConfigured: Boolean(process.env.OPENAI_API_KEY)
      });
    }

    if (req.method === "POST" && req.url === "/api/drafts/discharge") {
      return handleDraft(req, res, "discharge");
    }

    if (req.method === "POST" && req.url === "/api/drafts/insurance") {
      return handleDraft(req, res, "insurance");
    }

    const approveMatch = req.url?.match(/^\/api\/drafts\/([^/]+)\/approve$/);
    if (req.method === "POST" && approveMatch) {
      return handleApprove(req, res, approveMatch[1]);
    }

    return sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Unexpected server error." });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use on ${host}.`);
    console.error(`Stop the existing server or start this one with another port: PORT=8788 npm start`);
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Hospital AI agent MVP listening at http://${host}:${port}`);
  console.log(`Mode: ${process.env.OPENAI_API_KEY ? "openai" : "mock"}`);
});

async function handleDraft(req, res, summaryType) {
  if (!isAuthorized(req)) {
    return sendJson(res, 401, { error: "Access code required." });
  }

  const body = await readJson(req);
  assertEncounterRequest(body, summaryType);

  let result;
  try {
    result = await draftSummary(summaryType, body);
  } catch (error) {
    return sendJson(res, 502, {
      error: error.message || "AI draft generation failed.",
      provider: "openai"
    });
  }

  const draftId = `draft_${randomUUID()}`;
  const record = {
    draftId,
    status: "needs_clinician_review",
    createdAt: new Date().toISOString(),
    approvedAt: null,
    approvedBy: null,
    request: {
      clinician: body.clinician || null
    },
    ...result
  };

  drafts.set(draftId, record);
  return sendJson(res, 201, record);
}

async function handleApprove(req, res, draftId) {
  if (!isAuthorized(req)) {
    return sendJson(res, 401, { error: "Access code required." });
  }

  const body = await readJson(req);
  const record = drafts.get(draftId);

  if (!record) {
    return sendJson(res, 404, { error: "Draft not found." });
  }

  if (!body.approvedBy || typeof body.approvedBy !== "string") {
    return sendJson(res, 400, { error: "approvedBy is required." });
  }

  record.status = "approved";
  record.approvedAt = new Date().toISOString();
  record.approvedBy = body.approvedBy;

  return sendJson(res, 200, record);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body is too large."));
      }
    });

    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}

function isAuthorized(req) {
  if (!process.env.APP_ACCESS_CODE) {
    return true;
  }

  return req.headers["x-app-access-code"] === process.env.APP_ACCESS_CODE;
}

async function servePublicFile(res, fileName) {
  const normalizedPath = normalize(join(publicDir, fileName));

  if (!normalizedPath.startsWith(publicDir)) {
    return sendJson(res, 400, { error: "Invalid file path." });
  }

  const content = await readFile(normalizedPath);
  const contentType = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8"
  }[normalizedPath.slice(normalizedPath.lastIndexOf("."))] || "application/octet-stream";

  res.writeHead(200, { "content-type": contentType });
  res.end(content);
}
