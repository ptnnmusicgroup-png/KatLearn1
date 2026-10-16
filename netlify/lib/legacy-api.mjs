import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const runLegacyHandler = require("../../cloudflare-api/legacy-handler.cjs");

export async function invokeLegacyApi(request, context, apiHandler) {
  const url = new URL(request.url);
  const rawBody = request.method === "GET" || request.method === "HEAD"
    ? ""
    : await request.text();

  const event = {
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    rawUrl: request.url,
    rawQuery: url.search.startsWith("?") ? url.search.slice(1) : url.search,
    path: url.pathname,
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    body: rawBody,
    isBase64Encoded: false,
  };

  const result = await runLegacyHandler(event, context, apiHandler);
  const status = Number(result?.statusCode) || 200;
  const headers = new Headers();

  for (const [name, value] of Object.entries(result?.headers || {})) {
    if (value == null) continue;
    headers.set(name, Array.isArray(value) ? value.map(String).join(", ") : String(value));
  }
  for (const name of ["content-length", "transfer-encoding", "connection", "keep-alive"]) {
    headers.delete(name);
  }

  const body = [204, 205, 304].includes(status) ? null : (result?.body ?? "");
  return new Response(body, { status, headers });
}
