// music-portfolio/js/app.js
// FRONTEND VERSION (GitHub Pages)
// DO NOT PUT CLOUDFARE WORKER CODE HERE

// ================================
// CONFIG
// ================================
const BUSINESS_EMAIL = "gilbertalipui@gmail.com";
const CURRENCY = "USD";
const TEST_PRICE_USD = "0.10";

const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const PAYPAL_IPN_URL = `${CLOUDFLARE_BASE}/api/paypal/ipn`;
const PAYPAL_RETURN_URL = `${CLOUDFLARE_BASE}/pay/return`;
const PAYPAL_CANCEL_URL = `${CLOUDFLARE_BASE}/pay/cancel`;

const ITEMS_PER_LOAD = 10;
const TABS = ["pop", "rock", "jazz"];

// ================================
// DATA
// ================================
const musicData = {
  pop: Array.from({ length: 50 }, (_, i) => {
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
  rock: [],
  jazz: []
};

const tabState = { pop: 0, rock: 0, jazz: 0 };

// ================================
// HELPERS
// ================================
function randomNonce(len = 20) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function getPayPalLink(item) {
  const custom = `${item.sku}|${randomNonce(20)}`;

  return (
    `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=${encodeURIComponent(BUSINESS_EMAIL)}` +
    `&item_name=${encodeURIComponent(item.title)}` +
    `&amount=${encodeURIComponent(item.price)}` +
    `&currency_code=${encodeURIComponent(CURRENCY)}` +
    `&custom=${encodeURIComponent(custom)}` +
    `&notify_url=${encodeURIComponent(PAYPAL_IPN_URL)}` +
    `&return=${encodeURIComponent(PAYPAL_RETURN_URL)}` +
    `&cancel_return=${encodeURIComponent(PAYPAL_CANCEL_URL)}` +
    `&rm=2`
  );
}

// ================================
// RENDER
// ================================
function renderItems(tab, reset = false) {
  const container = document.getElementById(`tab-${tab}`);
  if (!container) return;

  if (reset) {
    container.innerHTML = "";
    tabState[tab] = 0;
  }

  const start = tabState[tab];
  const end = Math.min(start + ITEMS_PER_LOAD, musicData[tab].length);

  for (let i = start; i < end; i++) {
    const item = musicData[tab][i];

    const div = document.createElement("div");
    div.className = "music-item";

    div.innerHTML = `
      <img src="${item.cover}" alt="${item.title}">
      <div class="music-details">
        <div class="music-title">${item.title}</div>
        <div class="music-artist">${item.artist}</div>
        <div style="font-size:0.9em;opacity:0.7">$${item.price}</div>
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

  tabState[tab] = end;
}

document.addEventListener("DOMContentLoaded", () => {
  renderItems("pop", true);
});