// cloudfworker.js (Cloudflare Worker) — FULL DROP-IN REPLACEMENT
// Requires bindings:
//   - R2 bucket binding name: MP3_BUCKET
//   - KV namespace binding name: PURCHASES
//
// Endpoints:
//   POST /api/paypal/ipn      (PayPal IPN receiver + verifier)
//   GET/POST /pay/return      (PayPal return landing; redirects to /download?token=<tx> if present)
//   GET/POST /pay/cancel
//   GET  /download?token=...  (single-use download, served from R2)
//   GET  /                   (health check)
//
// IMPORTANT (Cloudflare Routes):
//   Add these routes to THIS worker:
//     cliquetraxx.com/api/*
//     cliquetraxx.com/pay/*
//     cliquetraxx.com/download*
//   Do NOT route *.cliquetraxx.com/* (too broad)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ----------------------------
    // Helpers
    // ----------------------------
    const text = (msg, status = 200, headers = {}) =>
      new Response(msg, {
        status,
        headers: { "Content-Type": "text/plain; charset=utf-8", ...headers },
      });

    const html = (body, status = 200, headers = {}) =>
      new Response(body, {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8", ...headers },
      });

    // Parse POST form body if needed
    async function readFormParams(req) {
      const ct = req.headers.get("content-type") || "";
      const raw = await req.text();
      // PayPal IPN and rm=2 return are urlencoded
      if (ct.includes("application/x-www-form-urlencoded") || raw.includes("=")) {
        return new URLSearchParams(raw);
      }
      // Fallback: try anyway
      return new URLSearchParams(raw);
    }

    // ----------------------------
    // 1) PAYPAL IPN HANDLER
    // ----------------------------
    if (url.pathname === "/api/paypal/ipn") {
      // PayPal sends POST. If you browse this URL in a browser (GET), return something harmless.
      if (request.method !== "POST") return text("OK", 200);

      const body = await request.text();

      // Verify IPN with PayPal (LIVE endpoint)
      const verifyRes = await fetch("https://ipnpb.paypal.com/cgi-bin/webscr", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "cmd=_notify-validate&" + body,
      });

      const verifyText = (await verifyRes.text()).trim();
      if (verifyText !== "VERIFIED") {
        // Return 200 or 400? 400 is OK; PayPal may retry.
        return text("Invalid IPN", 400);
      }

      const params = new URLSearchParams(body);

      // Common IPN fields:
      const paymentStatus = params.get("payment_status"); // "Completed"
      const txnId = params.get("txn_id"); // transaction id (token we use)
      const custom = params.get("custom"); // sku|nonce (from your link)
      const receiverEmail = params.get("receiver_email") || null;

      // If it's not a completed payment, ignore (but 200 so PayPal doesn't spam retries)
      if (paymentStatus !== "Completed" || !txnId) {
        return text("Ignored", 200);
      }

      // custom is optional (depends on your button/link); if missing, still store record
      let sku = null;
      let nonce = null;
      if (custom) {
        const parts = custom.split("|");
        sku = parts[0] || null;
        nonce = parts[1] || null;
      }

      const now = Date.now();
      const record = {
        sku,          // must match R2 object key prefix (objectKey = `${sku}.mp3`)
        nonce,
        used: false,
        created: now,
        txnId,
        receiverEmail,
        paymentStatus,
      };

      // Idempotent: overwrites on IPN retries
      await env.PURCHASES.put(txnId, JSON.stringify(record));

      return text("OK", 200);
    }

    // ----------------------------
    // 2) PAYPAL RETURN / CANCEL
    //    MUST accept GET and POST (PayPal can POST when rm=2)
    //    PayPal may send tx OR only PayerID, depending on flow.
    // ----------------------------
    if (url.pathname === "/pay/return") {
      let tx = url.searchParams.get("tx");

      // If PayPal posts variables (rm=2), parse form body
      if (!tx && request.method === "POST") {
        const params = await readFormParams(request);
        tx = params.get("tx");
      }

      // If tx present, redirect to download
      if (tx) {
        return new Response(null, {
          status: 302,
          headers: { Location: `/download?token=${encodeURIComponent(tx)}` },
        });
      }

      // Otherwise show a helpful page (PayerID-only returns happen)
      return html(`<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment received</title></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:28px;max-width:720px;margin:0 auto">
  <h2>Payment received ✅</h2>
  <p>Thanks! Your payment went through.</p>
  <p><b>Next step:</b> PayPal may not have provided a <code>tx</code> parameter on return.</p>
  <p>Within a minute, IPN should create your purchase record. If you have your PayPal <b>Transaction ID</b>, you can download immediately at:</p>
  <p><code>${url.origin}/download?token=&lt;TransactionID&gt;</code></p>
  <p>If you don’t know it, check the PayPal receipt email for “Transaction ID”.</p>
</body>
</html>`);
    }

    if (url.pathname === "/pay/cancel") {
      return html(`<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment canceled</title></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:28px;max-width:720px;margin:0 auto">
  <h2>Payment canceled</h2>
  <p>No worries — you weren’t charged.</p>
</body>
</html>`);
    }

    // ----------------------------
    // 3) SECURE DOWNLOAD ENDPOINT (single-use)
    //    GET /download?token=<txnId>
    // ----------------------------
    if (url.pathname === "/download" && request.method === "GET") {
      const token = url.searchParams.get("token");
      if (!token) return text("Missing token.", 400);

      const purchaseData = await env.PURCHASES.get(token);
      if (!purchaseData) return text("Download expired or invalid.", 403);

      let purchase;
      try {
        purchase = JSON.parse(purchaseData);
      } catch {
        return text("Corrupt purchase record.", 500);
      }

      // Optional expiration window (30 minutes)
      const MAX_AGE_MS = 30 * 60 * 1000;
      if (typeof purchase.created === "number" && Date.now() - purchase.created > MAX_AGE_MS) {
        return text("Download expired or invalid.", 403);
      }

      if (purchase.used) return text("Link already used.", 403);

      if (!purchase.sku) {
        return text("Purchase record missing SKU (custom field not received).", 500);
      }

      const objectKey = `${purchase.sku}.mp3`;
      const obj = await env.MP3_BUCKET.get(objectKey);
      if (!obj) return text(`File not found: ${objectKey}`, 404);

      // Mark single-use BEFORE streaming back (prevents double-click racing)
      purchase.used = true;
      await env.PURCHASES.put(token, JSON.stringify(purchase));

      const headers = new Headers();
      headers.set("Content-Type", "audio/mpeg");
      headers.set("Content-Disposition", `attachment; filename="${objectKey}"`);
      headers.set("Cache-Control", "no-store");

      return new Response(obj.body, { headers });
    }

    // ----------------------------
    // 4) DEFAULT / HEALTH
    // ----------------------------
    if (url.pathname === "/" && request.method === "GET") {
      return text("OK (cloudfworker)");
    }

    return text("Not Found", 404);
  },
};