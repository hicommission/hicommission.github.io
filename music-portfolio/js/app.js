// ============================================================
// music-portfolio/js/app.js
// 12 items + Worker-backed PayPal link generation
// NO popups, NO target=_blank
// ============================================================

const CLOUDFLARE_BASE = "https://cliquetraxx.com";
const CREATE_URL = `${CLOUDFLARE_BASE}/api/paypal/create`;
const TEST_PRICE_USD = "0.10";

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

function setBusy(btn, busy) {
  if (!btn) return;
  btn.disabled = busy;
  btn.style.opacity = busy ? "0.6" : "1";
  btn.textContent = busy ? "Loading…" : "Buy & Download";
}

async function createPayPalLink({ sku, title, amount }) {
  const res = await fetch(CREATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku, title, amount }),
  });

  if (!res.ok) throw new Error("Create failed");

  const data = await res.json();
  if (!data.url) throw new Error("Missing PayPal URL");

  return data.url;
}

function renderAll() {
  const container = document.getElementById("tab-pop");
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
      <button class="download-btn"
         data-sku="${item.sku}"
         data-title="${item.title}"
         data-amount="${item.price}">
        Buy & Download
      </button>
    `;

    container.appendChild(div);
  }
}

function attachClickHandler() {
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button.download-btn");
    if (!btn) return;

    if (btn.disabled) return;

    const sku = btn.dataset.sku;
    const title = btn.dataset.title;
    const amount = btn.dataset.amount;

    setBusy(btn, true);

    try {
      const paypalUrl = await createPayPalLink({ sku, title, amount });

      // SAME TAB navigation (no popup blockers)
      window.location.href = paypalUrl;
    } catch (err) {
      console.error(err);
      alert("Payment link failed to generate. Please try again.");
      setBusy(btn, false);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  attachClickHandler();
});