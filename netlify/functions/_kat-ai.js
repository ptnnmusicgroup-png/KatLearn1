const crypto = require("crypto");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

let initialized = false;
const buckets = new Map();

function firebaseAuth() {
  if (!initialized) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw Object.assign(new Error("KatLearn server auth chưa được cấu hình"), { status: 503 });
    let serviceAccount;
    try { serviceAccount = JSON.parse(raw); } catch (_) {
      throw Object.assign(new Error("FIREBASE_SERVICE_ACCOUNT_JSON không hợp lệ"), { status: 503 });
    }
    initializeApp({ credential: cert(serviceAccount) });
    initialized = true;
  }
  return getAuth();
}

async function requireUser(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw Object.assign(new Error("Bạn cần đăng nhập để dùng Kat AI."), { status: 401 });
  try {
    return await firebaseAuth().verifyIdToken(match[1]);
  } catch (_) {
    throw Object.assign(new Error("Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại."), { status: 401 });
  }
}

function rateLimit(uid, bucket, limit, windowMs = 60_000) {
  const now = Date.now();
  const key = uid + ":" + bucket;
  const old = buckets.get(key) || [];
  const fresh = old.filter(t => now - t < windowMs);
  if (fresh.length >= limit) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - fresh[0])) / 1000));
    const error = Object.assign(new Error("Bạn dùng Kat AI hơi nhanh. Thử lại sau " + retryAfter + " giây nhé."), { status: 429, retryAfter });
    buckets.set(key, fresh);
    throw error;
  }
  fresh.push(now);
  buckets.set(key, fresh);
}

function safetyIdentifier(uid) {
  return crypto.createHash("sha256").update(String(uid)).digest("hex").slice(0, 64);
}

function jsonHeaders(extra = {}) {
  return { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra };
}

module.exports = { requireUser, rateLimit, safetyIdentifier, jsonHeaders };
