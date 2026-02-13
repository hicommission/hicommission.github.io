// ============================================================
// music-portfolio/js/app.js
// DROP-IN REPLACEMENT (FRONT-END ONLY, NO BACKEND CALLS)
// - Shows ONLY 12 BlaKats items (01–12)
// - Generates PayPal Buy Now links directly (no /api/paypal/create)
// - Uses nonce in return URL + custom=sku|nonce for Worker lookup
// ============================================================

const BUSINESS_EMAIL = "gilbertalipui@gmail.com";
const CURRENCY = "USD";
const TEST_PRICE_USD = "0.10";

// Cloudflare Worker base (we are NOT using / root for anything)
const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const PAYPAL_IPN_URL = `${CLOUDFLARE_BASE}/api/paypal/ipn`;
const PAYPAL_RETURN_URL = `${CLOUDFLARE_BASE}/pay/return`;
const PAYPAL_CANCEL_URL = `${CLOUDFLARE_BASE}/pay/cancel`;

// Tabs used by your page layout
const TABS = ["pop", "rock", "jazz"];

// ================================
// DATA (FIXED: ONLY 12 BlaKats)
// ================================
const musicData = {
  pop: Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const sku = `blakats_cd_${String(n).padStart(2, "0")}`;
    return {
      title: `BlaKats CD ${String(n).padStart(2, "0")}`,
      artist: `BlaKats — CD #${n}`,
      price: TEST_PRICE_USD,
      sku,
      cover: "assets/pop-cover.jpg",
    };
  }),

  // Keep these as-is (they won't show unless you click the tab)
  rock: Array.from({ length: 0 }, () => ({})),
  jazz: Array.from({ length: 0 }, () => ({})),
};

// ================================
// HELPERS
// ================================
function randomNonce(len = 20) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * PayPal Buy Now link (_xclick)
 * - custom = sku|nonce
 * - return includes ?nonce=... so Worker can resolve even if tx is missing
 */
function getPayPalLink(item) {
  const nonce = randomNonce(20);
  const custom = `${item.sku}|${nonce}`;
  const returnUrlWithNonce = `${PAYPAL_RETURN_URL}?nonce=${encodeURIComponent(nonce)}`;

  return (
    `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=${encodeURIComponent(BUSINESS_EMAIL)}` +
    `&item_name=${encodeURIComponent(item.title)}` +
    `&amount=${encodeURIComponent(item.price)}` +
    `&currency_code=${encodeURIComponent(CURRENCY)}` +
    `&custom=${encodeURIComponent(custom)}` +
    `&notify_url=${encodeURIComponent(PAYPAL_IPN_URL)}` +
    `&return=${encodeURIComponent(returnUrlWithNonce)}` +
    `&cancel_return=${encodeURIComponent(PAYPAL_CANCEL_URL)}` +
    `&rm=2`
  );
}

// ================================
// RENDER
// ================================
function renderAllItems(tab) {
  const container = document.getElementById(`tab-${tab}`);
  if (!container) return;

  container.innerHTML = "";

  const items = musicData[tab] || [];
  for (const item of items) {
    // Skip empty placeholders (rock/jazz are length 0)
    if (!item || !item.sku) continue;

    const div = document.createElement("div");
    div.className = "music-item";

    div.innerHTML = `
      <img src="${item.cover}" alt="${item.title}">
      <div class="music-details">
        <div class="music-title">${item.title}</div>
        <div class="music-artist">${item.artist}</div>
        <div style="font-size:0.9em; opacity:0.8;">$${item.price} • SKU: ${item.sku}</div>
      </div>
      <a class="download-btn"
         href="${getPayPalLink(item)}"
         target="_blank"
         rel="noopener">
        Buy & Download
      </a>
    `;

    container.appendChild(div);
  }
}

function handleTabClick(e) {
  if (!e.target.classList.contains("tab")) return;

  document.querySelectorAll(".tab").forEach((btn) => btn.classList.remove("active"));
  e.target.classList.add("active");

  TABS.forEach((t) => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.classList.add("hidden");
  });

  const currentTab = e.target.dataset.tab;
  const currentEl = document.getElementById(`tab-${currentTab}`);
  if (currentEl) currentEl.classList.remove("hidden");

  renderAllItems(currentTab);
}

// ================================
// INIT
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const tabsEl = document.querySelector(".tabs");
  if (tabsEl) tabsEl.addEventListener("click", handleTabClick);

  // Show POP by default, hide others
  renderAllItems("pop");
  TABS.slice(1).forEach((tab) => {
    const el = document.getElementById(`tab-${tab}`);
    if (el) el.classList.add("hidden");
  });
});