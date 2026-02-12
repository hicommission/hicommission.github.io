// music-portfolio/js/app.js

// ================================
// DATA
// ================================
const musicData = {
  pop: Array.from({ length: 50 }, (_, i) => {
    const n = i + 1;
    const sku = `blakats_cd_${String(n).padStart(2, "0")}`; // blakats_cd_01, blakats_cd_02, ...
    return {
      title: `BlaKats CD ${String(n).padStart(2, "0")}`,
      artist: `BlaKats — CD #${n}`,
      price: "14.99",
      sku, // IMPORTANT: used by PayPal + Worker + R2
      cover: "assets/pop-cover.jpg",
      preview: "assets/previews/blakats-song-1.mp3",
    };
  }),

  // placeholders
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

const TABS = ["pop", "rock", "jazz"];
const ITEMS_PER_LOAD = 10;

let tabState = { pop: 0, rock: 0, jazz: 0 };

// ================================
// CLOUDFLARE WORKER ENDPOINTS
// ================================
const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const PAYPAL_IPN_URL = `${CLOUDFLARE_BASE}/api/paypal/ipn`;
const PAYPAL_RETURN_URL = `${CLOUDFLARE_BASE}/pay/return`;
const PAYPAL_CANCEL_URL = `${CLOUDFLARE_BASE}/pay/cancel`;

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
 * Creates a standard PayPal "Buy Now" link (_xclick) with:
 * - custom=sku|nonce   (your Worker reads this)
 * - notify_url         (IPN to your Worker)
 * - return/cancel      (to your Worker pages)
 * - rm=2               (POST back variables; harmless)
 */
function getPayPalLink(item) {
  const businessEmail = "gilbertalipui@gmail.com";
  const currency = "USD";

  if (!item.sku) {
    console.warn("Missing sku for item:", item);
  }

  const custom = `${item.sku}|${randomNonce(20)}`;

  return (
    `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick` +
    `&business=${encodeURIComponent(businessEmail)}` +
    `&item_name=${encodeURIComponent(item.title)}` +
    `&amount=${encodeURIComponent(item.price)}` +
    `&currency_code=${encodeURIComponent(currency)}` +
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
        <div style="font-size: 0.9em; opacity: 0.8;">$${item.price} • SKU: ${item.sku}</div>
      </div>
      <a class="download-btn" href="${getPayPalLink(item)}" target="_blank" rel="noopener">
        Buy & Download
      </a>
    `;

    container.appendChild(div);
  }

  tabState[tab] = end;
}

function handleTabClick(e) {
  if (!e.target.classList.contains("tab")) return;

  document.querySelectorAll(".tab").forEach((btn) => btn.classList.remove("active"));
  e.target.classList.add("active");

  TABS.forEach((tab) => {
    const el = document.getElementById(`tab-${tab}`);
    if (el) el.classList.add("hidden");
  });

  const currentTab = e.target.dataset.tab;
  const currentEl = document.getElementById(`tab-${currentTab}`);
  if (currentEl) currentEl.classList.remove("hidden");

  renderItems(currentTab, true);
}

function handleScroll(tab) {
  const container = document.getElementById(`tab-${tab}`);
  if (!container) return;

  container.onscroll = function () {
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 10) {
      renderItems(tab);
    }
  };
}

// ================================
// INIT
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const tabsEl = document.querySelector(".tabs");
  if (tabsEl) tabsEl.addEventListener("click", handleTabClick);

  // Render first tab only, hide others
  renderItems("pop", true);
  handleScroll("pop");

  TABS.slice(1).forEach((tab) => {
    const el = document.getElementById(`tab-${tab}`);
    if (el) el.classList.add("hidden");
    // still attach scroll handlers so when user switches tabs it works
    handleScroll(tab);
  });
});