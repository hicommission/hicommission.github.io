// ============================================================
// Cloudflare Worker — FULL DROP-IN REPLACEMENT (NONCE FLOW)
// ============================================================
// Requires bindings:
//   - R2 bucket binding name: MP3_BUCKET
//   - KV namespace binding name: PURCHASES
//
// R2 object keys MUST be stored like:
//   mp3-downloads/blakats_cd_01.mp3
//   mp3-downloads/blakats_cd_12.mp3
//
// Endpoints:
//   POST    /api/paypal/create   (front-end calls this to get PayPal URL + nonce)
//   POST    /api/paypal/ipn      (PayPal IPN receiver + verifier)
//   GET     /pay/return          (landing; uses nonce and redirects when confirmed)
//   GET     /pay/cancel          (simple cancel page)
//   GET     /download?token=...  (token = nonce; serves mp3 from R2)
//
// Notes:
// - This is "nonce lookup only": downloads are keyed by NONCE (not txnId).
// - Browser-safe: /api/paypal/create includes CORS + OPTIONS.
// - Expiry: 24 hours from confirmation (confirmedAt). If not confirmed yet, download blocked.
// ============================================================

const PAYPAL_BUSINESS_EMAIL = "gilbertalipui@gmail.com";
const PAYPAL_CURRENCY = "USD";

const DOWNLOAD_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const DOWNLOAD_TTL_MS = DOWNLOAD_TTL_SECONDS * 1000;

// ----- Helpers -----
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function text(msg, status = 200, extraHeaders = {}) {
  return new Response(msg, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", ...extraHeaders },
  });
}

function html(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...extraHeaders },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function nonceHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function nowMs() {
  return Date.now();
}

// ------------------------------------------------------------
// PayPal Buy Now (_xclick) URL builder
// ------------------------------------------------------------
function buildPayPalUrl({ title, amount, nonce, ipnUrl, returnUrl, cancelUrl }) {
  const custom = `${nonce}`; // nonce-only custom (simple & reliable)

  const base = "https://www.paypal.com/cgi-bin/webscr";
  const params = new URLSearchParams({
    cmd: "_xclick",
    business: PAYPAL_BUSINESS_EMAIL,
    item_name: title,
    amount: String(amount),
    currency_code: PAYPAL_CURRENCY,
    custom, // contains nonce only
    notify_url: ipnUrl,
    return: returnUrl,
    cancel_return: cancelUrl,
    rm: "2", // PayPal posts/gets back; we accept GET on return anyway
  });

  return `${base}?${params.toString()}`;
}

// ============================================================
// Worker
// ============================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Global OPTIONS handler (for CORS preflights)
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // ------------------------------------------------------------
    // 0) Simple health checks
    // ------------------------------------------------------------
    if (path === "/" && request.method === "GET") {
      return text("OK (cliquetraxx worker)");
    }

    // ------------------------------------------------------------
    // 1) CREATE PAYPAL LINK (front-end -> Worker)
    //     POST /api/paypal/create
    // Body: { sku, title, amount }
    // Response: { url, nonce }
    // Stores KV record keyed by nonce with status CREATED.
    // ------------------------------------------------------------
    if (path === "/api/paypal/create" && request.method === "POST") {
      const headers = corsHeaders();

      const bodyText = await request.text();
      const body = safeJsonParse(bodyText);

      if (!body || !body.sku || !body.title || !body.amount) {
        return json(
          { error: "Missing required fields: sku, title, amount" },
          400,
          headers
        );
      }

      const nonce = nonceHex(16);
      const created = nowMs();

      // Record is keyed by NONCE
      const record = {
        nonce,
        sku: String(body.sku),
        title: String(body.title),
        amount: String(body.amount),
        currency: PAYPAL_CURRENCY,
        status: "CREATED", // becomes CONFIRMED on IPN
        used: false,
        created,
      };

      await env.PURCHASES.put(nonce, JSON.stringify(record));

      const ipnUrl = `${url.origin}/api/paypal/ipn`;
      const returnUrl = `${url.origin}/pay/return?nonce=${encodeURIComponent(nonce)}`;
      const cancelUrl = `${url.origin}/pay/cancel`;

      const paypalUrl = buildPayPalUrl({
        title: record.title,
        amount: record.amount,
        nonce,
        ipnUrl,
        returnUrl,
        cancelUrl,
      });

      return json({ url: paypalUrl, nonce }, 200, headers);
    }

    // ------------------------------------------------------------
    // 2) PAYPAL IPN HANDLER
    //     POST /api/paypal/ipn
    // Verifies with PayPal and marks KV record as CONFIRMED.
    // IMPORTANT: custom contains nonce only.
    // ------------------------------------------------------------
    if (path === "/api/paypal/ipn" && request.method === "POST") {
      const body = await request.text();

      // Verify IPN with PayPal
      const verifyRes = await fetch("https://ipnpb.paypal.com/cgi-bin/webscr", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "cmd=_notify-validate&" + body,
      });

      const verifyText = (await verifyRes.text()).trim();
      if (verifyText !== "VERIFIED") {
        return text("Invalid IPN", 400);
      }

      const params = new URLSearchParams(body);

      const paymentStatus = params.get("payment_status"); // "Completed"
      const txnId = params.get("txn_id");
      const customNonce = params.get("custom"); // nonce only
      const mcGross = params.get("mc_gross") || params.get("payment_gross");
      const receiverEmail = params.get("receiver_email");

      // Always return 200 for ignored cases so PayPal doesn't retry forever
      if (paymentStatus !== "Completed" || !txnId || !customNonce) {
        return text("Ignored", 200);
      }

      // Optional sanity check: make sure receiver matches your business email
      if (receiverEmail && receiverEmail.toLowerCase() !== PAYPAL_BUSINESS_EMAIL.toLowerCase()) {
        return text("Ignored", 200);
      }

      const nonce = String(customNonce).trim();
      if (!nonce) return text("Ignored", 200);

      const existing = await env.PURCHASES.get(nonce);
      if (!existing) {
        // If for some reason create wasn't called, still allow creating a minimal record
        const fallback = {
          nonce,
          sku: null,
          title: null,
          amount: null,
          currency: PAYPAL_CURRENCY,
          status: "CONFIRMED",
          used: false,
          created: nowMs(),
          txnId,
          confirmedAt: nowMs(),
          mcGross: mcGross ?? null,
        };
        await env.PURCHASES.put(nonce, JSON.stringify(fallback));
        return text("OK", 200);
      }

      const record = safeJsonParse(existing) || {};
      record.status = "CONFIRMED";
      record.txnId = txnId;
      record.confirmedAt = nowMs();
      record.mcGross = mcGross ?? record.mcGross ?? null;

      // Keep sku/title/amount from the original create record.
      await env.PURCHASES.put(nonce, JSON.stringify(record));

      return text("OK", 200);
    }

    // ------------------------------------------------------------
    // 3) PAYPAL RETURN
    //     GET /pay/return?nonce=...
    // If confirmed -> redirect to /download?token=<nonce>
    // Else shows a page that auto-refreshes for up to ~60 seconds.
    // ------------------------------------------------------------
    if (path === "/pay/return" && request.method === "GET") {
      const nonce = url.searchParams.get("nonce") || "";
      const payerId = url.searchParams.get("PayerID") || "";

      if (!nonce) {
        return html(
          `<!doctype html><html><body style="font-family:system-ui;padding:28px">
            <h2>Missing nonce</h2>
          </body></html>`,
          400
        );
      }

      const raw = await env.PURCHASES.get(nonce);
      const rec = raw ? safeJsonParse(raw) : null;

      if (rec && rec.status === "CONFIRMED" && rec.sku) {
        return new Response(null, {
          status: 302,
          headers: { Location: `/download?token=${encodeURIComponent(nonce)}` },
        });
      }

      // Not confirmed yet
      return html(
        `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta http-equiv="refresh" content="3">
  <title>Processing</title>
</head>
<body style="font-family: system-ui; padding: 28px;">
  <h1 style="margin:0 0 12px 0;">Payment received ✅</h1>
  <p>Your payment is being processed. This page will refresh automatically.</p>
  <p>If you are not redirected after ~30–60 seconds, contact support.</p>
  <hr/>
  <div style="opacity:.7">Debug: nonce=${nonce}${payerId ? ` • PayerID=${payerId}` : ""}</div>
</body>
</html>`
      );
    }

    // ------------------------------------------------------------
    // 4) PAYPAL CANCEL
    // ------------------------------------------------------------
    if (path === "/pay/cancel" && request.method === "GET") {
      return html(
        `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Payment canceled</title>
</head>
<body style="font-family: system-ui; padding: 28px;">
  <h2>Payment canceled</h2>
  <p>No worries — you weren’t charged.</p>
</body>
</html>`
      );
    }

    // ------------------------------------------------------------
    // 5) SECURE DOWNLOAD (token = nonce)
    //     GET /download?token=<nonce>
    //
    // REQUIRED BY YOU:
    //   const objectKey = `mp3-downloads/${purchase.sku}.mp3`;
    // ------------------------------------------------------------
    if (path === "/download" && request.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token) return text("Missing token.", 400);

      const purchaseData = await env.PURCHASES.get(token);
      if (!purchaseData) return text("Download expired or invalid.", 403);

      const purchase = safeJsonParse(purchaseData);
      if (!purchase) return text("Corrupt purchase record.", 500);

      // Must be confirmed before download
      if (purchase.status !== "CONFIRMED") {
        return text("Payment not confirmed yet.", 403);
      }

      // Must have sku
      if (!purchase.sku) {
        return text("Purchase record missing SKU.", 500);
      }

      // Expire 24 hours after confirmation (fallback to created if needed)
      const baseTime = typeof purchase.confirmedAt === "number" ? purchase.confirmedAt : purchase.created;
      if (typeof baseTime === "number" && nowMs() - baseTime > DOWNLOAD_TTL_MS) {
        return text("Download expired.", 403);
      }

      if (purchase.used) return text("Link already used.", 403);

      // >>> YOUR REQUIRED LINE <<<
      const objectKey = `mp3-downloads/${purchase.sku}.mp3`;

      const obj = await env.MP3_BUCKET.get(objectKey);
      if (!obj) return text(`File not found: ${objectKey}`, 404);

      // Mark used BEFORE streaming to prevent double-click
      purchase.used = true;
      purchase.usedAt = nowMs();
      await env.PURCHASES.put(token, JSON.stringify(purchase));

      const headers = new Headers();
      headers.set("Content-Type", "audio/mpeg");
      headers.set("Content-Disposition", `attachment; filename="${purchase.sku}.mp3"`);
      headers.set("Cache-Control", "no-store");

      return new Response(obj.body, { headers });
    }

    // ------------------------------------------------------------
    // IPN alive check (GET /api/paypal/ipn)
    // ------------------------------------------------------------
    if (path === "/api/paypal/ipn" && request.method === "GET") {
      return text("OK (ipn endpoint alive)", 200, corsHeaders());
    }

    return text("Not Found", 404);
  },
};