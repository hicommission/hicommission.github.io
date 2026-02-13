// music-portfolio/js/app.js
// FULL DROP-IN REPLACEMENT
// - Generates PayPal Buy Now links with custom=sku|nonce
// - Uses Cloudflare Worker endpoints for notify_url / return / cancel
// - Renders ITEMS_PER_LOAD at a time and lazy-loads on BOTH:
//     (a) tab container scroll (if it scrolls), and
//     (b) window/page scroll (if the page scrolls instead)
// - Adds a visible "Load more" button fallback so you can ALWAYS reach item 11/12+
// - Default test price: 0.10 (change TEST_PRICE_USD below)

// ================================
// CONFIG
// ================================
const BUSINESS_EMAIL = "gilbertalipui@gmail.com";
const CURRENCY = "USD";

// IMPORTANT: change to "0.01" if PayPal allows for your account/button type
const TEST_PRICE_USD = "0.10";

// Cloudflare Worker base
const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const PAYPAL_IPN_URL = `${CLOUDFLARE_BASE}/api/paypal/ipn`;
const PAYPAL_RETURN_URL = `${CLOUDFLARE_BASE}/pay/return`;
const PAYPAL_CANCEL_URL = `${CLOUDFLARE_BASE}/pay/cancel`;

// How many items to render per "page"
const ITEMS_PER_LOAD = 10;

// Tabs
const TABS = ["pop", "rock", "jazz"];

// ================================
// DATA
// ================================
const musicData = {
  pop: Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const sku = `blakats_cd_${String(n).padStart(2, "0")}`; // blakats_cd_01 ...
    return {
      title: `BlaKats CD ${String(n).padStart(2, "0")}`,
      artist: `BlaKats — CD #${n}`,
      price: TEST_PRICE_USD,
      sku, // object key in R2 should be `${sku}.mp3`
      cover: "assets/pop-cover.jpg",
      preview: "assets/previews/blakats-song-1.mp3",
    };
  }),

  // placeholders
  rock: Array.from({ length: 0 }, (_, i) => ({
    title: `Rock Song ${i + 1}`,
    artist: `Rock Artist ${i + 1}`,
    price: "1.29",
    sku: `rock_${String(i + 1).padStart(2, "0")}`,
    cover: "assets/rock-cover.jpg",
  })),

  jazz: Array.from({ length: 0 }, (_, i) => ({
    title: `Jazz Song ${i + 1}`,
    artist: `Jazz Artist ${i + 1}`,
    price: "1.29",
    sku: `jazz_${String(i + 1).padStart(2, "0")}`,
    cover: "assets/jazz-cover.jpg",
  })),
};

const tabState = { pop: 0, rock: 0, jazz: 0 };

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
 * Standard PayPal "Buy Now" link (_xclick)
 * Includes:
 *  - custom=sku|nonce  (Worker reads this from IPN)
 *  - notify_url        (IPN endpoint on your Worker)
 *  - return/cancel     (Worker landing endpoints)
 *  - rm=2              (helps PayPal send variables back; harmless)
 */
function getPayPalLink(item) {
  if (!item || !item.sku) console.warn("Missing item or sku:", item);

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

function getActiveTab() {
  const activeBtn = document.querySelector(".tab.active");
  return activeBtn?.dataset?.tab || "pop";
}

function ensureLoadMoreButton(tab) {
  const container = document.getElementById(`tab-${tab}`);
  if (!container) return;

  // Remove any existing button first (avoid duplicates)
  const existing = container.parentElement?.querySelector(`.load-more[data-tab="${tab}"]`);
  if (existing) existing.remove();

  const total = musicData[tab]?.length ?? 0;
  const loaded = tabState[tab] ?? 0;

  // If everything is loaded, no button needed
  if (loaded >= total) return;

  const btn = document.createElement("button");
  btn.className = "load-more";
  btn.dataset.tab = tab;
  btn.type = "button";
  btn.textContent = `Load more (${total - loaded} remaining)`;

  // Basic inline styling so it looks OK even without CSS changes
  btn.style.display = "block";
  btn.style.margin = "18px auto 0";
  btn.style.padding = "10px 14px";
  btn.style.borderRadius = "8px";
  btn.style.border = "1px solid #ccc";
  btn.style.background = "#fff";
  btn.style.cursor = "pointer";

  btn.addEventListener("click", () => {
    renderItems(tab);
  });

  // Place after the tab content container
  container.parentElement?.appendChild(btn);
}

function updateLoadMoreUI(tab) {
  ensureLoadMoreButton(tab);
}

// ================================
// RENDER
// ================================
function renderItems(tab, reset = false) {
  const container = document.getElementById(`tab-${tab}`);
  if (!container) return;

  if (!musicData[tab] || !Array.isArray(musicData[tab])) return;

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
        <div style="font-size: 0.9em; opacity: 0.8;">$${item.price}</div>
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
  updateLoadMoreUI(tab);
}

// ================================
// TABS
// ================================
function handleTabClick(e) {
  if (!e.target.classList.contains("tab")) return;

  document.querySelectorAll(".tab").forEach((btn) => btn.classList.remove("active"));
  e.target.classList.add("active");

  TABS.forEach((t) => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.classList.add("hidden");

    // remove load-more buttons for other tabs
    const otherBtn = el?.parentElement?.querySelector(`.load-more[data-tab="${t}"]`);
    if (otherBtn) otherBtn.remove();
  });

  const currentTab = e.target.dataset.tab;
  const currentEl = document.getElementById(`tab-${currentTab}`);
  if (currentEl) currentEl.classList.remove("hidden");

  renderItems(currentTab, true);
}

// ================================
// SCROLL LOADING (container + window)
// ================================
function attachContainerScroll(tab) {
  const container = document.getElementById(`tab-${tab}`);
  if (!container) return;

  container.onscroll = function () {
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 10) {
      renderItems(tab);
    }
  };
}

function attachWindowScroll() {
  // Works if your page scrolls (common), not the tab container
  window.addEventListener(
    "scroll",
    () => {
      const tab = getActiveTab();
      const total = musicData[tab]?.length ?? 0;
      const loaded = tabState[tab] ?? 0;
      if (loaded >= total) return;

      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 80;

      if (nearBottom) renderItems(tab);
    },
    { passive: true }
  );
}

// ================================
// INIT
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const tabsEl = document.querySelector(".tabs");
  if (tabsEl) tabsEl.addEventListener("click", handleTabClick);

  // Hide other tabs by default
  TABS.slice(1).forEach((tab) => {
    const el = document.getElementById(`tab-${tab}`);
    if (el) el.classList.add("hidden");
  });

  // Attach scroll handlers
  TABS.forEach((tab) => attachContainerScroll(tab));
  attachWindowScroll();

  // Render first tab
  renderItems("pop", true);
});