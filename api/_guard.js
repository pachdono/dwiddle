// Who is allowed to call the AI endpoints, and how often.
//
// These endpoints spend real quota on every call, so without a gate anyone who
// finds the URL can drain the account. This is the gate.

const WINDOW = 60 * 1000;
const buckets = new Map(); // ip -> { count, resetAt }

// Serverless instances come and go, so this counts per instance rather than
// globally. It stops casual scripting and accidental loops; it is not a
// defence against a determined distributed attacker. Requiring sign in is the
// durable answer if this ever needs to be airtight.
function tooMany(ip, limit) {
  const now = Date.now();
  const b = buckets.get(ip);

  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW });
    if (buckets.size > 5000) buckets.clear(); // never grow without bound
    return false;
  }

  b.count += 1;
  return b.count > limit;
}

function allowedOrigin(value) {
  if (!value) return true; // same origin browser requests often send nothing
  try {
    const host = new URL(value).host;
    const site = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "";
    return (
      host === site ||
      host.endsWith(".vercel.app") ||
      host === "localhost:5180" ||
      host.startsWith("localhost:") ||
      host.startsWith("127.0.0.1:")
    );
  } catch {
    return false;
  }
}

/**
 * Returns true when the request may proceed. Sends the response itself when not.
 *
 * @param limit requests per minute from one address
 */
export function allow(req, res, { limit = 12 } = {}) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Use POST" });
    return false;
  }

  // Block another site driving these endpoints from someone's browser.
  const origin = req.headers.origin || req.headers.referer;
  if (!allowedOrigin(origin)) {
    res.status(403).json({ error: "Not allowed from this origin" });
    return false;
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (tooMany(ip, limit)) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "That is a lot of requests. Wait a minute and try again." });
    return false;
  }

  return true;
}

// Endpoints that report on the account rather than doing work for a user.
export function admin(req, res) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    res.status(404).json({ error: "Not found" });
    return false;
  }
  const given = req.headers["x-admin-token"] || req.query?.token;
  if (given !== token) {
    res.status(404).json({ error: "Not found" });
    return false;
  }
  return true;
}
