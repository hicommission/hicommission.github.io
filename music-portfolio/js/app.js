// ============================================================
// music-portfolio/js/app.js
// FRONT-END DROP-IN (12 ITEMS, uses /api/paypal/create)
// ============================================================

const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const CREATE_URL = `${CLOUDFLARE_BASE}/api/paypal/create`;

const TEST_PRICE_USD = "0.10";

// Build the 12 SKUs you actually have in R2: blakats_cd_01 ... blakats_cd_12
const items = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1;
  const sku = `blakats_cd_${String(n).padStart(2, "0")}`;
  return {
    title: `BlaKats CD ${String(n).padStart(2, "0")}`,
    artist: `BlaKats — CD #${n}`,
    price: TEST_PRICE_USD,
    sku,
    cover: "assets/pop-cover.jpg",
  };
});

function el(id) {
  return document.getElementById(id);
}

function render() {
  const container = el("tab-pop");
  if (!container) return;

  container.innerHTML = "";

  for (const item of items) {
    const div = document.createElement("div");
    div.className = "music-item";

    div.innerHTML = `
      <img src="${item.cover}" alt="${item.title}">
      <div class="music-details">
        <div class="music-title">${item.title}</div>
        <div class="music-artist">${item.artist}</div>
        <div style="font-size:0.9em; opacity:0.8;">$${item.price} • SKU: ${item.sku}</div>
      </div>
      <button class="download-btn" data-sku="${item.sku}" data-title="${item.title}" data-amount="${item.price}">
        Buy & Download
      </button>
    `;

    container.appendChild(div);
  }
}

async function createPayPalLink({ sku, title, amount }) {
  const res = await fetch(CREATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // IMPORTANT: keep this small/clean
    body: JSON.stringify({ sku, title, amount }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`create failed: HTTP ${res.status} ${txt}`);
  }

  const data = await res.json();
  if (!data || !data.url || !data.nonce) {
    throw new Error("create failed: bad JSON response");
  }

  return data; // { url, nonce }
}

function attachHandlers() {
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button.download-btn");
    if (!btn) return;

    const sku = btn.dataset.sku;
    const title = btn.dataset.title;
    const amount = btn.dataset.amount;

    // 1) Open a tab immediately (avoids popup blockers)
    const payTab = window.open("", "_blank", "noopener,noreferrer");
    if (!payTab) {
      alert("Popup blocked. Please allow popups for this site and try again.");
      return;
    }

    // Show something in the new tab while we fetch
    payTab.document.write(`
      <doctype html>
      <html><head><meta charset="utf-8"><title>Preparing PayPal...</title></head>
      <body style="font-family:system-ui;padding:24px">
        <h2>Preparing PayPal…</h2>
        <p>Please wait…</p>
      </body></html>
    `);

    btn.disabled = true;

    try {
      const { url } = await createPayPalLink({ sku, title, amount });

      // 2) Navigate the already-open tab to PayPal URL
      payTab.location.href = url;
    } catch (err) {
      console.error(err);

      payTab.document.open();
      payTab.document.write(`
        <doctype html>
        <html><head><meta charset="utf-8"><title>Error</title></head>
        <body style="font-family:system-ui;padding:24px">
          <h2>Payment link failed to generate</h2>
          <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px">${String(err)}</pre>
          <p>Open DevTools → Console on the main page for more details.</p>
        </body></html>
      `);
      payTab.document.close();

      alert("Payment link failed to generate. Please try again.");
    } finally {
      btn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Show pop tab container, hide others if you have them
  render();
  attachHandlers();
});