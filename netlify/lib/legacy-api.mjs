function normalizeHeaders(requestHeaders) {
  const output = Object.create(null);
  for (const [name, value] of requestHeaders.entries()) output[name.toLowerCase()] = value;
  Object.defineProperty(output, "get", {
    enumerable: false,
    value(name) { return output[String(name).toLowerCase()] ?? null; },
  });
  return output;
}

function createResponseShim() {
  const state = { statusCode: 200, headers: {}, body: "", ended: false };
  const res = {
    get statusCode() { return state.statusCode; },
    set statusCode(code) { state.statusCode = Number(code) || 200; },
    setHeader(name, value) {
      state.headers[String(name)] = Array.isArray(value) ? value.join(", ") : String(value);
      return this;
    },
    getHeader(name) {
      const target = String(name).toLowerCase();
      const entry = Object.entries(state.headers).find(([key]) => key.toLowerCase() === target);
      return entry?.[1];
    },
    set(name, value) {
      if (name && typeof name === "object") {
        for (const [key, entry] of Object.entries(name)) this.setHeader(key, entry);
      } else this.setHeader(name, value);
      return this;
    },
    status(code) { state.statusCode = Number(code) || 200; return this; },
    writeHead(code, headers = {}) { this.status(code); this.set(headers); return this; },
    json(value) {
      if (!this.getHeader("content-type")) this.setHeader("Content-Type", "application/json; charset=utf-8");
      state.body = JSON.stringify(value); state.ended = true; return this;
    },
    send(value) { state.body = typeof value === "string" ? value : JSON.stringify(value ?? ""); state.ended = true; return this; },
    end(value = "") { state.body = value == null ? "" : String(value); state.ended = true; return this; },
  };
  return { res, state };
}

export async function invokeLegacyApi(request, context, apiHandler) {
  const url = new URL(request.url);
  const rawBody = request.method === "GET" || request.method === "HEAD" ? "" : await request.text();
  let body = rawBody;
  if (rawBody && String(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    try { body = JSON.parse(rawBody); } catch { /* Let the endpoint validate malformed JSON. */ }
  } else if (!rawBody) body = undefined;

  const query = Object.fromEntries(url.searchParams.entries());
  const req = {
    method: request.method,
    headers: normalizeHeaders(request.headers),
    body,
    rawBody,
    url: url.pathname + url.search,
    originalUrl: url.pathname + url.search,
    path: url.pathname,
    query,
    queryStringParameters: query,
  };
  const { res, state } = createResponseShim();

  try {
    const result = await apiHandler(req, res, context);
    if (result instanceof Response) return result;
    let status = state.statusCode;
    let headers = state.headers;
    let responseBody = state.body;
    if (!state.ended && result !== undefined) responseBody = typeof result === "string" ? result : JSON.stringify(result);
    for (const name of ["content-length", "transfer-encoding", "connection", "keep-alive"]) {
      for (const key of Object.keys(headers)) if (key.toLowerCase() === name) delete headers[key];
    }
    const outHeaders = new Headers(headers);
    if ([204, 205, 304].includes(status)) responseBody = null;
    return new Response(responseBody, { status, headers: outHeaders });
  } catch (error) {
    console.error("[KatLearn Netlify API]", error?.name || "Error");
    const status = Number(error?.statusCode || error?.status) || 500;
    return Response.json(
      { ok: false, error: "Máy chủ không thể xử lý yêu cầu." },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
