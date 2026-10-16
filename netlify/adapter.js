"use strict";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://lms-katlearn.netlify.app",
  "https://teacher-katlearn.netlify.app",
  "http://localhost:3000",
  "http://localhost:5173"
];

function normaliseHeaders(input) {
  const output = {};
  for (const [name, value] of Object.entries(input || {})) {
    if (value == null) continue;
    output[String(name).toLowerCase()] = Array.isArray(value)
      ? value.join(", ")
      : String(value);
  }
  return output;
}

function parseBody(event, headers) {
  if (event.body == null || event.body === "") return undefined;
  let raw = String(event.body);
  if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
  const contentType = String(headers["content-type"] || "").toLowerCase();
  if (contentType.includes("application/json") || /^[\s]*[\[{]/.test(raw)) {
    try { return JSON.parse(raw); } catch (_) { return raw; }
  }
  return raw;
}

function allowedOrigins() {
  const configured = String(process.env.KATLEARN_ALLOWED_ORIGINS || "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  return new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(process.env.URL ? [String(process.env.URL).replace(/\/+$/, "")] : []),
    ...(process.env.KATLEARN_LMS_SITE_URL ? [String(process.env.KATLEARN_LMS_SITE_URL).replace(/\/+$/, "")] : []),
    ...(process.env.KATLEARN_TEACHER_SITE_URL ? [String(process.env.KATLEARN_TEACHER_SITE_URL).replace(/\/+$/, "")] : []),
    ...configured
  ]);
}

function corsHeaders(origin) {
  if (!origin || !allowedOrigins().has(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, accept",
    "access-control-max-age": "600",
    "vary": "Origin"
  };
}

function createHandler(apiHandler) {
  return async function netlifyHandler(event = {}, context = {}) {
    const headers = normaliseHeaders(event.headers);
    const origin = headers.origin || "";
    const cors = corsHeaders(origin);
    const method = String(event.httpMethod || event.requestContext?.http?.method || "GET").toUpperCase();

    if (method === "OPTIONS") {
      return { statusCode: 204, headers: { ...cors, "cache-control": "no-store" }, body: "" };
    }

    const query = event.queryStringParameters || {};
    const rawQuery = String(event.rawQuery || "");
    if (!Object.keys(query).length && rawQuery) {
      for (const [key, value] of new URLSearchParams(rawQuery)) query[key] = value;
    }

    const req = {
      method,
      headers,
      body: parseBody(event, headers),
      query,
      path: event.path || "/",
      url: event.rawUrl || event.path || "/",
      originalUrl: event.rawUrl || event.path || "/",
      ip: headers["x-nf-client-connection-ip"] || headers["x-forwarded-for"] || "",
      socket: { remoteAddress: headers["x-nf-client-connection-ip"] || "" },
      get(name) { return headers[String(name).toLowerCase()]; }
    };

    const state = { statusCode: 200, headers: { "cache-control": "no-store" }, body: "", ended: false };
    const res = {
      get statusCode() { return state.statusCode; },
      set statusCode(value) { state.statusCode = Number(value) || 200; },
      status(code) { state.statusCode = Number(code) || 200; return this; },
      set(name, value) {
        if (name && typeof name === "object") {
          for (const [key, item] of Object.entries(name)) this.setHeader(key, item);
        } else if (name != null) {
          this.setHeader(name, value);
        }
        return this;
      },
      header(name, value) { this.setHeader(name, value); return this; },
      setHeader(name, value) {
        if (name != null && value != null) state.headers[String(name).toLowerCase()] = String(value);
        return this;
      },
      getHeader(name) { return state.headers[String(name).toLowerCase()]; },
      writeHead(code, headersToSet) {
        state.statusCode = Number(code) || state.statusCode;
        if (headersToSet) this.set(headersToSet);
        return this;
      },
      json(value) {
        if (!state.headers["content-type"]) state.headers["content-type"] = "application/json; charset=utf-8";
        state.body = JSON.stringify(value);
        state.ended = true;
        return this;
      },
      send(value) {
        if (value != null && typeof value === "object" && !Buffer.isBuffer(value)) return this.json(value);
        if (!state.headers["content-type"]) state.headers["content-type"] = "text/html; charset=utf-8";
        state.body = value == null ? "" : String(value);
        state.ended = true;
        return this;
      },
      end(value) {
        if (value != null) state.body = Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
        state.ended = true;
        return this;
      }
    };

    try {
      const returned = await apiHandler(req, res, context);
      if (returned instanceof Response) {
        state.statusCode = returned.status;
        returned.headers.forEach((value, key) => { state.headers[String(key).toLowerCase()] = value; });
        state.body = await returned.text();
        state.ended = true;
      } else if (!state.ended && returned != null) {
        if (typeof returned === "object" && "statusCode" in returned) {
          state.statusCode = Number(returned.statusCode) || state.statusCode;
          Object.assign(state.headers, normaliseHeaders(returned.headers));
          state.body = returned.body == null ? "" : String(returned.body);
        } else {
          state.body = typeof returned === "string" ? returned : JSON.stringify(returned);
        }
        state.ended = true;
      }
    } catch (error) {
      console.error("[KatLearn Netlify API]", error);
      if (!state.ended) {
        state.statusCode = Number(error?.status) || 500;
        state.headers["content-type"] = "application/json; charset=utf-8";
        state.body = JSON.stringify({
          ok: false,
          error: state.statusCode >= 500
            ? "Server gặp lỗi khi xử lý yêu cầu. Hãy thử lại sau."
            : String(error?.message || "Yêu cầu không hợp lệ.")
        });
        state.ended = true;
      }
    }

    const finalHeaders = { ...normaliseHeaders(state.headers), ...cors };
    if (!state.ended && state.statusCode !== 204) {
      finalHeaders["content-type"] ||= "application/json; charset=utf-8";
      state.body = JSON.stringify({ ok: false, error: "API không tạo được phản hồi." });
      state.statusCode = 500;
    }
    if (state.statusCode === 204 || state.statusCode === 304) state.body = "";
    return { statusCode: state.statusCode, headers: finalHeaders, body: state.body || "" };
  };
}

module.exports = { createHandler };
