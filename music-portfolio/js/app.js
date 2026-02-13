// ============================================================
// music-portfolio/js/app.js
// FULL DROP-IN REPLACEMENT (NO LAZY LOAD — SHOW ALL)
// ============================================================

const BUSINESS_EMAIL = "gilbertalipui@gmail.com";
const CURRENCY = "USD";
const TEST_PRICE_USD = "0.10";

// CHANGE THIS to match how many MP3s you actually uploaded (e.g. 12 right now)
const BLAKATS_COUNT = 12;

// Cloudflare Worker base (DO NOT use root path / for anything)
const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const PAYPAL_IPN_URL = `${CLOUDFLARE_BASE}/api/paypal/ipn`;
const PAYPAL_RETURN_URL = `${CLOUDFLARE_BASE}/pay/return`;
const PAYPAL_CANCEL_URL = `${CLOUDFLARE_BASE}/pay/cancel`;

const TABS = ["pop", "rock", "jazz"];

// ================================
// DATA
// ================================
const musicData = {
  pop: Array.from({ length: BLAKATS_COUNT }, (_, i) => {
    const n = i + 1;
    const sku = `blakats_cd_${String(n).padStart(2, "0")}`;
    return {
      title: `BlaKats CD ${String(n).padStart(2, "0")}`,
      artist: `BlaKats — CD #${n}`,
      price: TEST_PRICE_USD,
      sku,
      cover: "assets/pop-cover.jpg",
      preview: "assets/previews/blakats-song-1.mp3",
    };
  }),

  rock: Array.from({ length: 50 }, (_, i) => ({
    title: `Rock Song ${i + 1}`,
    artist: `Rock Artist ${i + 1}`,
    price: "1.29",
    sku: `rock_${String(i + 1).padStart(2, "0")}`,
    cover: "assets/rock-cover.jpg",
  })),

  jazz: Array.from({ length: 50 }, (_, i) => ({
    title: `Jazz Song ${i + 1}`,
    artist: `Jazz Artist ${i + 1}`,
    price: "1.29",
    sku: `jazz_${String(i + 1).padStart(2, "0")}`,
    cover: "assets/jazz-cover.jpg",
  })),
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
 * FIX: return includes nonce so Worker can redirect even when PayPal omits tx.
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
// RENDER (SHOW ALL ITEMS)
// ================================
function renderAllItems(tab) {
  const container = document.getElementById(`tab-${tab}`);
  if (!container) return;

  container.innerHTML = "";

  for (const item of musicData[tab]) {
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