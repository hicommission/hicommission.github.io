// ============================================================
// music-portfolio/js/app.js
// FINAL DROP-IN (bulletproof PayPal link: server creates nonce)
// ============================================================

const TEST_PRICE_USD = "0.10";

// IMPORTANT: do NOT use root / for anything
const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const CREATE_URL = `${CLOUDFLARE_BASE}/api/paypal/create`;

const TABS = ["pop", "rock", "jazz"];

// ================================
// DATA (edit counts here only)
// ================================
const musicData = {
  pop: Array.from({ length: 12 }, (_, i) => {   // <-- set to 12 if you have 12 mp3s
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
  jazz: [],
};

// ================================
// RENDER
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
      <button class="download-btn js-buy"
              data-sku="${item.sku}"
              data-title="${item.title}"
              data-amount="${item.price}">
        Buy & Download
      </button>
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
// BUY HANDLER (server returns PayPal URL)
// ================================
async function createPayPalUrl({ sku, title, amount }) {
  const res = await fetch(CREATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku, title, amount }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Create checkout failed (${res.status}): ${t}`);
  }

  const data = await res.json();
  if (!data.url) throw new Error("Missing PayPal URL from server.");
  return data.url;
}

function attachBuyHandler() {
  // Event delegation (works for all items)
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".js-buy");
    if (!btn) return;

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Opening PayPal…";

    try {
      const sku = btn.getAttribute("data-sku");
      const title = btn.getAttribute("data-title");
      const amount = btn.getAttribute("data-amount");

      const paypalUrl = await createPayPalUrl({ sku, title, amount });

      // open PayPal in new tab
      window.open(paypalUrl, "_blank", "noopener");

      btn.textContent = original;
    } catch (err) {
      console.error(err);
      alert("Payment link failed to generate. Please try again.");
      btn.textContent = original;
    } finally {
      btn.disabled = false;
    }
  });
}

// ================================
// INIT
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const tabsEl = document.querySelector(".tabs");
  if (tabsEl) tabsEl.addEventListener("click", handleTabClick);

  attachBuyHandler();

  // Default tab
  renderAllItems("pop");
  TABS.slice(1).forEach((tab) => {
    const el = document.getElementById(`tab-${tab}`);
    if (el) el.classList.add("hidden");
  });
});