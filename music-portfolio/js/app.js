/* ============================================================
   music-portfolio/js/app.js  (FULL DROP-IN REPLACEMENT)

   ✅ PayPal works for ALL tracks
   ✅ Stripe works for ALL tracks
   ✅ BlaKats CD:
        - PayPal = $0.10
        - Stripe = $0.50 (Stripe minimum requirement)
   ============================================================ */

const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const PAYPAL_CREATE_URL = `${CLOUDFLARE_BASE}/api/paypal/create`;
const STRIPE_CREATE_URL = `${CLOUDFLARE_BASE}/api/stripe/create`;

const PREVIEW_SECONDS = 30;
const PREVIEW_BASE = "assets/previews";

const BLAKATS_BARCODE_IMG_URL = "assets/downloads/blakats_barcode.png";

/** Stripe Payment Links (optional) */
const STRIPE_LINKS = {
  blakats_cd_01: "https://buy.stripe.com/7sY8wP0G8bGF4j7ercfjG01",
};

/** Catalog */
const CATALOG = [
  {
    id: "blakats",
    label: "BlaKats",
    themeClass: "theme-blakats",
    tracks: [
      { sku: "blakats_cd_01", title: "01. Can't Take It Back (Remix)", artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_01_preview.mp3" },
      { sku: "blakats_cd_02", title: "02. Don't Feed The Animals", artist: "BlaKats", amount: "0.10", thumb: "assets/pop-cover.jpg", previewFile: "blakats_cd_02_preview.mp3" },
    ],
  }
];

/* ============================================================
   Helpers
============================================================ */

function $(sel, root = document) { return root.querySelector(sel); }

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeAmount(amountStr) {
  const n = Number(String(amountStr || "").trim());
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid amount: ${amountStr}`);
  return n.toFixed(2);
}

async function postJsonExpectJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`${url} failed: HTTP ${res.status}\n\n${raw}`.trim());

  return JSON.parse(raw);
}

/* ============================================================
   Payment Helpers
============================================================ */

async function createPayPalLink(track) {
  const payload = {
    sku: track.sku,
    title: `${track.artist} — ${track.title}`,
    amount: normalizeAmount(track.amount),
  };
  const data = await postJsonExpectJson(PAYPAL_CREATE_URL, payload);
  return data.url;
}

async function createStripeLinkViaWorker(track) {
  const payload = {
    sku: track.sku,
    title: `${track.artist} — ${track.title}`,
    amount: normalizeAmount(track.amount),
  };
  const data = await postJsonExpectJson(STRIPE_CREATE_URL, payload);
  return data.url;
}

/* ============================================================
   Render
============================================================ */

function render() {
  const container = document.querySelector(".tab-panels");
  container.innerHTML = "";

  const panel = document.createElement("section");
  panel.className = "panel active theme-blakats";

  const header = document.createElement("div");
  header.className = "panel-header";
  header.textContent = "BlaKats";
  panel.appendChild(header);

  /* ============================
     Hero placeholder (unchanged)
  ============================ */

  const hero = document.createElement("div");
  hero.className = "hero-media";
  hero.innerHTML = `
    <div style="padding:40px;text-align:center;font-weight:900;">
      BlaKats — Hero Video
    </div>
  `;
  panel.appendChild(hero);

  /* ============================
     CD Tools Row
  ============================ */

  const tools = document.createElement("div");
  tools.className = "panel-tools below-hero";

  const cdLabel = document.createElement("div");
  cdLabel.className = "cd-label";
  cdLabel.textContent = 'BlaKats "Wild" CD $0.10';

  const barcodeBtn = document.createElement("button");
  barcodeBtn.className = "tool-btn secondary";
  barcodeBtn.textContent = "Barcode";

  /* ===== PayPal CD ($0.10) ===== */
  const cdPayPalBtn = document.createElement("button");
  cdPayPalBtn.className = "buy-btn";
  cdPayPalBtn.textContent = "Buy Wild CD (PayPal)";
  cdPayPalBtn.onclick = async () => {
    const cdItem = {
      sku: "blakats_wild_cd",
      title: 'BlaKats "Wild" CD',
      artist: "BlaKats",
      amount: "0.10"  // PayPal stays $0.10
    };
    const url = await createPayPalLink(cdItem);
    window.location.href = url;
  };

  /* ===== Stripe CD ($0.50 MINIMUM) ===== */
  const cdStripeBtn = document.createElement("button");
  cdStripeBtn.className = "buy-btn stripe-btn";
  cdStripeBtn.textContent = "Pay w/ Stripe (Wild CD)";
  cdStripeBtn.onclick = async () => {
    const cdItem = {
      sku: "blakats_wild_cd",
      title: 'BlaKats "Wild" CD',
      artist: "BlaKats",
      amount: "0.50"  // 🔥 Stripe minimum
    };

    const direct = STRIPE_LINKS[cdItem.sku];
    if (direct) {
      window.location.href = direct;
      return;
    }

    const url = await createStripeLinkViaWorker(cdItem);
    window.location.href = url;
  };

  tools.appendChild(cdLabel);
  tools.appendChild(barcodeBtn);
  tools.appendChild(cdPayPalBtn);
  tools.appendChild(cdStripeBtn);

  panel.appendChild(tools);
  container.appendChild(panel);
}

document.addEventListener("DOMContentLoaded", render);