import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "api");
const legacyAdapter = require(path.join(root, "cloudflare-api", "legacy-handler.cjs"));
const mode = process.env.KATLEARN_BACKEND_MODE === "teacher" ? "teacher" : "lms";
const port = Number(process.env.PORT || 8080);
const maxBodyBytes = 8 * 1024 * 1024;

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(payload);
}

async function readRawBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return "";
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function writeLegacyResult(res, result) {
  const status = Number(result?.statusCode) || 200;
  const headers = result?.headers && typeof result.headers === "object" ? result.headers : {};
  for (const [name, value] of Object.entries(headers)) {
    if (value == null) continue;
    try {
      res.setHeader(name, Array.isArray(value) ? value.map(String) : String(value));
    } catch {
      // Ignore invalid response headers instead of failing the complete response.
    }
  }
  res.statusCode = status;
  const body = result?.body == null ? "" : typeof result.body === "string" ? result.body : JSON.stringify(result.body);
  res.end(body);
}

async function dispatchTeacher(req, res, endpoint, url, rawBody) {
  const filename = path.join(apiDir, endpoint + ".js");
  let module;
  try {
    module = await import(pathToFileURL(filename).href);
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND" || error?.code === "MODULE_NOT_FOUND") {
      return sendJson(res, 404, { ok: false, error: "API endpoint not found." });
    }
    throw error;
  }
  const handler = module.default;
  if (!handler) return sendJson(res, 404, { ok: false, error: "API endpoint not found." });

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers || {})) {
    if (value != null) headers.set(name, Array.isArray(value) ? value.join(", ") : String(value));
  }
  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") init.body = rawBody;
  const request = new Request(url, init);
  const response = typeof handler.fetch === "function"
    ? await handler.fetch(request)
    : await handler(request);
  if (!(response instanceof Response)) {
    return sendJson(res, 502, { ok: false, error: "API handler returned an invalid response." });
  }
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function dispatch(req, res) {
  const host = String(req.headers.host || "container");
  const url = new URL(req.url || "/", "http://" + host);
  if (url.pathname === "/ping" || url.pathname === "/health") {
    return sendJson(res, 200, { ok: true, service: "katlearn-api", mode });
  }
  const match = /^\/api\/([a-z0-9-]+)\/?$/.exec(url.pathname);
  if (!match) return sendJson(res, 404, { ok: false, error: "Route not found." });

  const endpoint = match[1];
  const rawBody = await readRawBody(req);
  if (mode === "teacher") return dispatchTeacher(req, res, endpoint, url.href, rawBody);

  const filename = path.join(apiDir, endpoint + ".js");
  let apiHandler;
  try {
    apiHandler = require(filename);
  } catch (error) {
    if (error?.code === "MODULE_NOT_FOUND" || error?.code === "ERR_REQUIRE_ESM") {
      return sendJson(res, 404, { ok: false, error: "API endpoint not found." });
    }
    throw error;
  }
  if (typeof apiHandler !== "function") {
    return sendJson(res, 404, { ok: false, error: "API endpoint not found." });
  }

  const headers = Object.create(null);
  for (const [name, value] of Object.entries(req.headers || {})) {
    headers[String(name).toLowerCase()] = Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
  }
  const event = {
    httpMethod: String(req.method || "GET").toUpperCase(),
    headers,
    body: rawBody || null,
    isBase64Encoded: false,
    path: url.pathname,
    rawUrl: url.href,
    rawQuery: url.search.slice(1),
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
  };
  const result = await legacyAdapter(event, {}, apiHandler);
  return writeLegacyResult(res, result);
}

const server = http.createServer(async (req, res) => {
  try {
    await dispatch(req, res);
  } catch (error) {
    console.error("[KatLearn Cloudflare API]", error?.name || "Error");
    if (!res.headersSent) sendJson(res, Number(error?.statusCode) || 500, {
      ok: false,
      error: Number(error?.statusCode) === 413 ? "Request body is too large." : "The API could not process this request.",
    });
    else res.destroy();
  }
});
server.requestTimeout = 120_000;
server.headersTimeout = 30_000;
server.keepAliveTimeout = 5_000;
server.listen(port, "0.0.0.0", () => console.log("KatLearn API container listening on " + port));
